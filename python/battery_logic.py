"""
battery_logic.py — Simplified Battery ESS Module
Finnlines Superstar Hybrid System (5 MWh)

Propulsion consumers controlled by 4 levers:
  Lever 1: CPP Port        (main propulsion, max ~14,400 kW per shaft)
  Lever 2: CPP Starboard   (main propulsion)
  Lever 3: Bow Thruster PS (manoeuvring, max 2,500 kW)
  Lever 4: Bow Thruster SB (manoeuvring, max 2,500 kW)

Four operating modes with different battery behaviour:
  TRANSIT       — CPP high, thrusters off.  Battery charges from engine surplus.
  MANOEUVRE     — CPP low, thrusters active. Battery discharges to assist peaks.
  ZERO_EMISSION — All from battery. Engines off. Port operations.
  ECO           — CPP moderate, optimised.   Battery peak-shaves + slow charge.

Usage:
    from battery_logic import BatterySystem, LeverState

    batt = BatterySystem(initial_soc=0.80)

    levers = LeverState(cpp_port=70, cpp_stbd=70, thr_ps=0, thr_sb=0)
    result = batt.update(levers, mode="TRANSIT", dt_seconds=60)

    print(f"SOC: {batt.soc:.1%}")
    print(f"Battery power: {result['battery_kw']:+.0f} kW")
    print(f"Total propulsion: {result['total_propulsion_kw']:.0f} kW")
"""

from dataclasses import dataclass
from typing import Dict


# ═══════════════════════════════════════════════════════════════════════
# CONFIGURATION — edit these to match your vessel
# ═══════════════════════════════════════════════════════════════════════

BATTERY_DEFAULTS = {
    "capacity_kwh": 5000,        # Total ESS capacity
    "max_charge_kw": 3500,       # Max charging power (shaft gen limit)
    "max_discharge_kw": 4000,    # Max discharge power (multidrive limit)
    "efficiency": 0.92,          # Round-trip efficiency
    "soc_min": 0.15,             # Hard minimum
    "soc_max": 0.95,             # Hard maximum
    "initial_soc": 0.80,         # Shore-charged default
}

PROPULSOR_SPECS = {
    1: {"name": "CPP Port",        "type": "cpp", "max_kw": 14400},
    2: {"name": "CPP Starboard",   "type": "cpp", "max_kw": 14400},
    3: {"name": "Bow Thruster PS", "type": "thruster", "max_kw": 2500},
    4: {"name": "Bow Thruster SB", "type": "thruster", "max_kw": 2500},
}

# Mode-specific battery behaviour
# charge_frac:   fraction of engine surplus directed to battery (0–1)
# discharge_frac: fraction of propulsion demand battery can cover (0–1)
# max_charge:    mode-specific charge rate cap (kW)
# max_discharge: mode-specific discharge rate cap (kW)
MODE_CONFIG = {
    "SMART_NAV": {
        "charge_frac": 0.5,
        "discharge_frac": 0.4,
        "max_charge_kw": 3500,
        "max_discharge_kw": 4000,
        "description": "Highest efficiency. Smart balancing of sources.",
    },
    "HYBRID": {
        "charge_frac": 0.4,
        "discharge_frac": 0.5,
        "max_charge_kw": 3000,
        "max_discharge_kw": 4000,
        "description": "Balance between propulsion speed and energy efficiency.",
    },
    "ECO_MODE": {
        "charge_frac": 0.0,
        "discharge_frac": 1.0,
        "max_charge_kw": 0,
        "max_discharge_kw": 4000,
        "description": "Maximum energy conservation. Relies heavily on battery.",
    },
    "FULL_SPEED": {
        "charge_frac": 0.0,
        "discharge_frac": 1.0,
        "max_charge_kw": 0,
        "max_discharge_kw": 4000,
        "description": "Maximal propulsion power, ignoring battery conservation.",
    },
    "TRANSIT": {
        "charge_frac": 0.6,
        "discharge_frac": 0.0,
        "max_charge_kw": 3500,
        "max_discharge_kw": 0,
        "description": "CPP cruising. Battery charges from engine surplus via PTO.",
    },
    "MANOEUVRE": {
        "charge_frac": 0.0,
        "discharge_frac": 0.4,
        "max_charge_kw": 0,
        "max_discharge_kw": 4000,
        "description": "Port/harbour. Battery assists thruster peaks, smooths engine load.",
    },
    "ZERO_EMISSION": {
        "charge_frac": 0.0,
        "discharge_frac": 1.0,
        "max_charge_kw": 0,
        "max_discharge_kw": 4000,
        "description": "Battery-only operation. All engines stopped. Zero emissions in port.",
    },
    "ECO": {
        "charge_frac": 0.3,
        "discharge_frac": 0.2,
        "max_charge_kw": 2000,
        "max_discharge_kw": 2000,
        "description": "Eco transit. Mild charge + peak shave for optimal engine SFOC.",
    },
}


# ═══════════════════════════════════════════════════════════════════════
# LEVER STATE
# ═══════════════════════════════════════════════════════════════════════

@dataclass
class LeverState:
    """
    Current lever positions for all 4 propulsors.
    Range: -100 (full astern) to +100 (full ahead).
    Thrusters: -100 (full port) to +100 (full starboard).
    """
    cpp_port: float = 0.0     # Lever 1
    cpp_stbd: float = 0.0     # Lever 2
    thr_ps: float = 0.0       # Lever 3
    thr_sb: float = 0.0       # Lever 4

    def get(self, lever_id: int) -> float:
        return {1: self.cpp_port, 2: self.cpp_stbd,
                3: self.thr_ps, 4: self.thr_sb}[lever_id]


# ═══════════════════════════════════════════════════════════════════════
# BATTERY SYSTEM
# ═══════════════════════════════════════════════════════════════════════

class BatterySystem:
    """
    Single battery module (5 MWh ESS treated as one unit).

    Call update() every timestep with current lever positions and mode.
    The battery decides how much to charge or discharge based on:
      - Operating mode (TRANSIT / MANOEUVRE / ZERO_EMISSION / ECO)
      - Current lever demands (what the propulsors need)
      - SOC level (taper at extremes)
      - Mode-specific rate limits
    """

    def __init__(self, initial_soc: float = None, config: dict = None):
        cfg = {**BATTERY_DEFAULTS, **(config or {})}
        self.capacity = cfg["capacity_kwh"]
        self.max_chg = cfg["max_charge_kw"]
        self.max_dis = cfg["max_discharge_kw"]
        self.eta = cfg["efficiency"] ** 0.5  # one-way efficiency
        self.soc_min = cfg["soc_min"]
        self.soc_max = cfg["soc_max"]
        self.soc = initial_soc if initial_soc is not None else cfg["initial_soc"]
        self.energy_kwh = self.soc * self.capacity

        # Cumulative tracking
        self.total_charged_kwh = 0.0
        self.total_discharged_kwh = 0.0

    # ── Core methods ──

    def _taper_charge(self, mode_max: float) -> float:
        """Reduce charge rate as SOC approaches max (CC-CV behaviour)."""
        cap = min(mode_max, self.max_chg)
        if self.soc > 0.85:
            taper = (self.soc_max - self.soc) / (self.soc_max - 0.85)
            return cap * max(0.05, taper)
        return cap

    def _taper_discharge(self, mode_max: float) -> float:
        """Reduce discharge rate as SOC approaches min."""
        cap = min(mode_max, self.max_dis)
        if self.soc < 0.25:
            taper = (self.soc - self.soc_min) / (0.25 - self.soc_min)
            return cap * max(0.05, taper)
        return cap

    def _do_charge(self, power_kw: float, dt_h: float) -> float:
        """Charge the battery. Returns actual grid-side power consumed."""
        if power_kw <= 0 or dt_h <= 0:
            return 0.0
        stored = power_kw * self.eta * dt_h  # kWh entering battery
        room = (self.soc_max - self.soc) * self.capacity
        if stored > room:
            stored = room
            power_kw = stored / (self.eta * dt_h)
        self.energy_kwh += stored
        self.soc = self.energy_kwh / self.capacity
        self.total_charged_kwh += stored
        return power_kw

    def _do_discharge(self, power_kw: float, dt_h: float) -> float:
        """Discharge the battery. Returns delivered power (after losses)."""
        if power_kw <= 0 or dt_h <= 0:
            return 0.0
        drawn = power_kw * dt_h  # kWh leaving battery
        available = (self.soc - self.soc_min) * self.capacity
        if drawn > available:
            drawn = available
            power_kw = drawn / dt_h
        self.energy_kwh -= drawn
        self.soc = self.energy_kwh / self.capacity
        self.total_discharged_kwh += drawn
        return power_kw * self.eta  # delivered after efficiency loss

    # ── Propulsor power calculation ──

    @staticmethod
    def lever_to_power(lever_pct: float, lever_id: int) -> float:
        """
        Convert lever position to power demand (kW).
        CPP:      P = max_kw × (|lever| / 100)²  (quadratic, like real propeller)
        Thruster: P = max_kw × (|lever| / 100)    (linear, on/off character)
        """
        spec = PROPULSOR_SPECS[lever_id]
        frac = abs(lever_pct) / 100.0
        if spec["type"] == "cpp":
            return spec["max_kw"] * frac ** 2  # Propeller load ∝ speed²
        else:
            return spec["max_kw"] * frac        # Thruster: roughly linear

    # ── Main update ──

    def update(self, levers: LeverState, mode: str = "TRANSIT",
               dt_seconds: float = 60, hotel_kw: float = 5000,
               engine_available_kw: float = 28800, allow_charging: bool = True) -> Dict:
        """
        Run one timestep of the battery logic.

        Args:
            levers:             Current lever positions (all 4)
            mode:               TRANSIT / MANOEUVRE / ZERO_EMISSION / ECO
            dt_seconds:         Timestep in seconds (default 60 = 1 minute)
            hotel_kw:           Hotel + systems electrical demand
            engine_available_kw: Total engine power currently online

        Returns:
            Dict with full power breakdown and battery action taken.
        """
        dt_h = dt_seconds / 3600.0
        mcfg = MODE_CONFIG.get(mode, MODE_CONFIG["TRANSIT"])

        # Calculate power demand per lever
        powers = {}
        for lid in [1, 2, 3, 4]:
            powers[lid] = self.lever_to_power(levers.get(lid), lid)

        cpp_total = powers[1] + powers[2]
        thr_total = powers[3] + powers[4]
        propulsion_total = cpp_total + thr_total
        solar_kw = 850.0  # Simulated constant solar panel generation
        base_demand = propulsion_total + hotel_kw
        total_demand = max(0, base_demand - solar_kw)

        # ── Battery decision based on mode ──

        battery_kw = 0.0  # positive = discharge (battery → grid)
                          # negative = charge   (grid → battery)
        engine_kw = 0.0

        if mode in ["ZERO_EMISSION"]:
            # Everything from battery, engines off
            rate_limit = self._taper_discharge(mcfg["max_discharge_kw"])
            delivered = self._do_discharge(min(total_demand, rate_limit), dt_h)
            battery_kw = delivered
            engine_kw = max(0, total_demand - delivered)  # shortfall (should be 0)

        elif mode in ["MANOEUVRE"]:
            # Engines handle base load, battery assists peaks
            # Peak = thruster bursts + sudden CPP changes
            peak_portion = thr_total + cpp_total * 0.2  # thrusters + 20% of CPP
            base_portion = total_demand - peak_portion

            rate_limit = self._taper_discharge(mcfg["max_discharge_kw"])
            batt_target = min(peak_portion * mcfg["discharge_frac"], rate_limit)
            delivered = self._do_discharge(batt_target, dt_h)
            battery_kw = delivered
            engine_kw = total_demand - delivered

        elif mode in ["TRANSIT", "FULL_SPEED", "HYBRID"]:
            # Engines power everything, surplus charges battery
            engine_kw = total_demand
            surplus = engine_available_kw - total_demand
            if allow_charging and surplus > 500 and self.soc < 0.85:
                rate_limit = self._taper_charge(mcfg["max_charge_kw"])
                charge_target = min(surplus * mcfg["charge_frac"], rate_limit)
                consumed = self._do_charge(charge_target, dt_h)
                battery_kw = -consumed
                engine_kw += consumed  # engines produce extra to charge

        elif mode in ["ECO", "SMART_NAV", "HYBRID", "FULL_SPEED", "TRANSIT"]:
            # Engine covers base demand
            engine_kw = total_demand

            # Constant background charge (PTO) when engines are running and battery isn't full
            if allow_charging and self.soc < self.soc_max:
                rate_limit = self._taper_charge(1500)
                charge_target = min(600, rate_limit) # 600 kW steady slow-charge
                consumed = self._do_charge(charge_target, dt_h)
                battery_kw = -consumed
                engine_kw += consumed
                
        elif mode in ["ECO_MODE"]:
            # Rely heavily on battery: Engines only cover what battery cannot
            rate_limit = self._taper_discharge(mcfg["max_discharge_kw"])
            batt_target = min(total_demand, rate_limit)
            delivered = self._do_discharge(batt_target, dt_h)
            battery_kw = delivered
            engine_kw = max(0, total_demand - delivered)

        return {
            # Per-lever breakdown
            "lever_1_cpp_port_kw": round(powers[1]),
            "lever_2_cpp_stbd_kw": round(powers[2]),
            "lever_3_thr_ps_kw": round(powers[3]),
            "lever_4_thr_sb_kw": round(powers[4]),
            # Totals
            "cpp_total_kw": round(cpp_total),
            "thruster_total_kw": round(thr_total),
            "total_propulsion_kw": round(propulsion_total),
            "hotel_kw": round(hotel_kw),
            "total_demand_kw": round(total_demand),
            "solar_kw": round(solar_kw),
            # Battery
            "battery_kw": round(battery_kw),  # + discharge, - charge
            "battery_mode": ("CHARGING" if battery_kw < -10
                             else "DISCHARGING" if battery_kw > 10
                             else "IDLE"),
            "soc": round(self.soc, 4),
            "soc_pct": round(self.soc * 100, 1),
            "energy_kwh": round(self.energy_kwh, 1),
            "remaining_hours": round(
                (self.soc - self.soc_min) * self.capacity / max(1, battery_kw)
                if battery_kw > 10 else 99, 1),
            # Engine
            "engine_kw": round(engine_kw),
            # Mode
            "mode": mode,
        }

    # ── Utility ──

    def get_state(self) -> Dict:
        return {
            "soc": round(self.soc, 4),
            "soc_pct": round(self.soc * 100, 1),
            "energy_kwh": round(self.energy_kwh, 1),
            "total_charged_kwh": round(self.total_charged_kwh, 1),
            "total_discharged_kwh": round(self.total_discharged_kwh, 1),
        }

    def set_soc(self, soc: float):
        """Manually set SOC (e.g. after shore charging)."""
        self.soc = max(self.soc_min, min(self.soc_max, soc))
        self.energy_kwh = self.soc * self.capacity

    def reset(self, soc: float = None):
        self.soc = soc if soc is not None else BATTERY_DEFAULTS["initial_soc"]
        self.energy_kwh = self.soc * self.capacity
        self.total_charged_kwh = 0.0
        self.total_discharged_kwh = 0.0


# ═══════════════════════════════════════════════════════════════════════
# DEMO
# ═══════════════════════════════════════════════════════════════════════

if __name__ == "__main__":

    batt = BatterySystem(initial_soc=0.80)

    scenarios = [
        ("TRANSIT",       LeverState(cpp_port=75, cpp_stbd=75, thr_ps=0,  thr_sb=0),  5500),
        ("MANOEUVRE",     LeverState(cpp_port=20, cpp_stbd=20, thr_ps=60, thr_sb=50), 4500),
        ("ZERO_EMISSION", LeverState(cpp_port=15, cpp_stbd=15, thr_ps=80, thr_sb=70), 4000),
        ("ECO",           LeverState(cpp_port=60, cpp_stbd=60, thr_ps=0,  thr_sb=0),  5000),
    ]

    for mode, levers, hotel in scenarios:
        print(f"\n{'='*65}")
        print(f"  Mode: {mode}")
        print(f"  Levers: CPP={levers.cpp_port}/{levers.cpp_stbd}%  "
              f"THR={levers.thr_ps}/{levers.thr_sb}%")
        print(f"  Hotel: {hotel} kW | SOC before: {batt.soc:.1%}")
        print(f"{'='*65}")

        # Simulate 5 minutes
        for minute in range(5):
            r = batt.update(levers, mode=mode, dt_seconds=60,
                           hotel_kw=hotel, engine_available_kw=28800)

        print(f"  CPP:       {r['lever_1_cpp_port_kw']:>6} + {r['lever_2_cpp_stbd_kw']:>6} = "
              f"{r['cpp_total_kw']:>6} kW")
        print(f"  Thrusters: {r['lever_3_thr_ps_kw']:>6} + {r['lever_4_thr_sb_kw']:>6} = "
              f"{r['thruster_total_kw']:>6} kW")
        print(f"  Hotel:     {r['hotel_kw']:>6} kW")
        print(f"  Total:     {r['total_demand_kw']:>6} kW")
        print(f"  Battery:   {r['battery_kw']:>+6} kW [{r['battery_mode']}]")
        print(f"  Engine:    {r['engine_kw']:>6} kW")
        print(f"  SOC after: {batt.soc:.1%} ({batt.energy_kwh:.0f} kWh)")

    print(f"\n📋 Cumulative: {batt.get_state()}")
