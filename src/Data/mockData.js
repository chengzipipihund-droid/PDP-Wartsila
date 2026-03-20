const shipData = {
  mainEngines: [
    { id: "ME 1", status: "RUN",     type: "W8V31", rpm: 750, kw: 1130, load: 25 },
    { id: "ME 2", status: "RUN",     type: "W8V31", rpm: 750, kw: 1130, load: 34 },
    { id: "ME 3", status: "STANDBY", type: "W8V31", rpm: 0,   kw: 0,   load: 0  },
    { id: "ME 4", status: "STANDBY", type: "W8V31", rpm: 0,   kw: 0,   load: 0  },
  ],
  battery: { cells: [74, 70, 81, 74], totalPercent: 76, remainingHours: 20.6 },
  energyConsumption: { greenEnergy: 160, lfoDiesel: 60, lngGas: 60 },
  autopilot: { active: true, duration: "9h42min" },
  energyIndex: {
    renewable: { solar: true, hydrogen: true },
    bridge: { powerKw: 12, status: "active" },
    hotel: { powerKw: 85, status: "active" },
    mainEngine: { powerKw: 2260, fuelType: "LNG" },
    ess: { soc: 76, powerKw: 150, charging: true },
    cpp: { rpm: 500, pitch: 45, mode: "Co-Pilot" },
    bowThruster: { powerKw: 0, status: "standby" },
  },
};
export default shipData;
