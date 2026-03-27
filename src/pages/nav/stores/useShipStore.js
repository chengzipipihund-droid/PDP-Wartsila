import { create } from 'zustand';
import { ROUTE, SPEED_PROFILE, CORRIDOR_WIDTH } from '../utils/constants';
import { leversToCommand } from '../utils/irMapping';

// ── canvasDraw bridge（游戏循环调用 Canvas 绘制，消除双 rAF 时序抖动）────
export const canvasDraw = { fn: null };

// ── Checkpoint thresholds (route progress values)
const CHECKPOINT_THRESHOLDS = [
  { progress: 0.50, name: 'WP-3', label: 'Innamo turn' },
  { progress: 0.87, name: 'WP-4', label: 'Naantali approach' },
];

// ── Module-level physics ref（60fps 零 React 开销）────────────────────────
export const _physics = {
  portLever:    50,
  stbdLever:    50,
  prevPort:     50,
  prevStbd:     50,
  bowThruster:  0,   // combined bow effect (-1..1)
  bow1:         0,   // IR4 raw (-100..100)
  bow2:         0,   // IR5 raw (-100..100)
  // ship — start near final approach (routeProgress 0.80), ~20s from berth
  routeProgress: 0.80,
  x: 0.758,
  y: 0.512,
  heading: 229,
  sog: 0,
  rudderAngle: 0,
  pitchPort: 0,
  pitchStbd: 0,
  _thrust: 0,
  // RPM physics model
  rpmPort:  0,
  rpmStbd:  0,
  rpmAlarm: false,
  // energy
  fuelRate:   28,
  efficiency: 83,
  // auto & docking
  autoMode:  false,
  docked:    false,
  dockedTime: 0,
  shorePower: 0,    // 0 = off, 1 = connecting, 2 = connected
  // checkpoint tracking — skip WP-3 since we start past it; WP-4 fires at 0.87
  lastCheckpointProgress: 0.79,
};

export const useStore = create((set, get) => ({
  // ── Lever state（syncDisplay 定期同步，供 AI 评分读取）──
  portLever: 50,
  stbdLever: 50,
  prevPort:  50,
  prevStbd:  50,
  bow1:      0,
  bow2:      0,

  // ── Ship display snapshot（约 15fps）──
  ship: {
    routeProgress: 0.80,
    x: 0.758,
    y: 0.512,
    heading: 229,
    sog: 0,
    rudderAngle: 0,
    pitchPort: 0,
    pitchStbd: 0,
    _thrust: 0,
    rpmPort:  0,
    rpmStbd:  0,
    rpmAlarm: false,
  },

  // ── AI scoring ──
  ai: {
    corridor:   100,
    speedOpt:   100,
    timing:     100,
    fuelEff:    100,
    smoothness: 100,
    total:      100,
    grade:      'S',
  },

  // ── Energy display snapshot ──
  energy: {
    fuelRate:   28,
    efficiency: 83,
    batterySoc: 72,
    co2Saved:   2.4,
    mode:       'diesel',
  },

  // ── Decision log ──
  log: [
    { ts: new Date(), msg: 'System initialized — awaiting lever input', type: '' },
  ],

  voyageStartTime: Date.now(),
  targetArrivalMs: Date.now() + 38 * 60 * 1000,

  // ── New state ──
  autoMode:        false,
  checkpointAlert: null,  // { name, label, etaMinutes, grade, recSpeed } | null
  docked:          false,
  shorePower:      0,     // 0 = off, 1 = connecting, 2 = connected

  // ═══════════════════════════════════════════════════════════════
  // ACTIONS
  // ═══════════════════════════════════════════════════════════════

  /** 只写 _physics，不触发 React 重渲染 */
  setLevers: (port, stbd) => {
    _physics.prevPort  = _physics.portLever;
    _physics.prevStbd  = _physics.stbdLever;
    _physics.portLever = port;
    _physics.stbdLever = stbd;
  },

  setAutoMode: (enabled) => {
    _physics.autoMode = enabled;
    set({ autoMode: enabled });
  },

  dismissCheckpoint: () => set({ checkpointAlert: null }),

  /**
   * 物理帧更新（60fps）
   *
   * Lever → 目标 RPM → 非对称速率爬升（加速 20 RPM/s，减速 60 RPM/s）
   *   • 加速：0→200 RPM ≈ 10 秒
   *   • 减速：200→0 RPM ≈ 3.3 秒（松杆后快速减速）
   *   • 最大 500 RPM；|RPM| > 400 触发超速警报
   */
  tick: (dt = 1 / 60) => {
    if (_physics.docked) return; // frozen after docking

    // ── AUTO mode: override levers with AI target speed ──────────
    if (_physics.autoMode) {
      const targetSpeed = getRecommendedSpeed(_physics.routeProgress);
      const targetRpm   = (targetSpeed / 16) * 500;
      // percentToThrust(lever) = (lever-50)/50 → lever = thrust*50+50
      const targetLever = (targetRpm / 500) * 50 + 50;
      _physics.prevPort  = _physics.portLever;
      _physics.prevStbd  = _physics.stbdLever;
      _physics.portLever = Math.max(0, Math.min(100, targetLever));
      _physics.stbdLever = Math.max(0, Math.min(100, targetLever));
    }

    const cmd = leversToCommand(_physics.portLever, _physics.stbdLever);

    // ── 目标 RPM（lever -1~+1 映射到 -500~+500 RPM）────────────────
    const targetRpmPort = cmd.port * 500;
    const targetRpmStbd = cmd.stbd * 500;

    // ── 非对称 RPM 速率：加速 20 RPM/s，减速 60 RPM/s ────────────
    const applyRpmStep = (current, target, dt) => {
      const diff = target - current;
      // Decelerate faster when target magnitude is smaller than current
      const rate = Math.abs(target) < Math.abs(current) ? 60 : 20;
      const maxDelta = rate * dt;
      return current + Math.max(-maxDelta, Math.min(maxDelta, diff));
    };

    _physics.rpmPort = applyRpmStep(_physics.rpmPort, targetRpmPort, dt);
    _physics.rpmStbd = applyRpmStep(_physics.rpmStbd, targetRpmStbd, dt);

    // ── 超速警报（>400 RPM）──────────────────────────────────────────
    _physics.rpmAlarm = Math.abs(_physics.rpmPort) > 400 || Math.abs(_physics.rpmStbd) > 400;

    // ── 从 RPM 计算运动 ──────────────────────────────────────────────
    const avgRpm = (_physics.rpmPort + _physics.rpmStbd) / 2;

    const sog = (avgRpm / 500) * 16;   // 500 RPM → 16 kn
    _physics._thrust = avgRpm / 500;

    const progressDelta = Math.max(0, avgRpm / 500) * 0.0002 * dt * 60;
    _physics.routeProgress = Math.min(1, _physics.routeProgress + progressDelta);

    // ── 船头始终朝向当前航线方向（平滑插值，约 0.25s 对齐）────────
    const p0 = getRoutePoint(_physics.routeProgress);
    const p1 = getRoutePoint(Math.min(1, _physics.routeProgress + 0.01));
    const rdx = p1.x - p0.x;
    const rdy = p1.y - p0.y; // screen y: positive = south
    if (rdx !== 0 || rdy !== 0) {
      // atan2(east, north) = atan2(dx, -dy) for screen coords
      const targetHeading = (Math.atan2(rdx, -rdy) * 180 / Math.PI + 90 + 360) % 360;
      const diff = ((targetHeading - _physics.heading + 540) % 360) - 180;
      // Route-following + manual bow thruster overlay (max ±8 deg/s)
      const bowTurn = _physics.bowThruster * 8 * dt;
      _physics.heading = (_physics.heading + diff * Math.min(1, dt * 4) + bowTurn + 360) % 360;
      _physics.rudderAngle = Math.max(-35, Math.min(35, diff * 0.4 + _physics.bowThruster * 35));
    }

    const routePt = getRoutePoint(_physics.routeProgress);
    const rad = (_physics.heading - 90) * Math.PI / 180;
    const offX = _physics.x + Math.cos(rad) * Math.abs(sog) * 0.00008 * dt * 60;
    const offY = _physics.y - Math.sin(rad) * Math.abs(sog) * 0.00008 * dt * 60;
    const bf = 0.92;
    _physics.x = Math.max(0.02, Math.min(0.98, routePt.x * bf + offX * (1 - bf)));
    _physics.y = Math.max(0.05, Math.min(0.95, routePt.y * bf + offY * (1 - bf)));

    _physics.sog       = Math.abs(sog);
    _physics.pitchPort = _physics.rpmPort;
    _physics.pitchStbd = _physics.rpmStbd;

    // ── 燃油（t/d）及效率（kg/NM）────────────────────────────────────
    const thrustPct     = Math.abs(avgRpm / 500) * 100;
    _physics.fuelRate   = 22 + thrustPct * 0.28;
    _physics.efficiency = _physics.sog > 0.5
      ? (_physics.fuelRate * 1000 / 24) / _physics.sog
      : 0;

    // ── 靠港检测（routeProgress ≥ 0.97）─────────────────────────────
    if (_physics.routeProgress >= 0.97 && !_physics.docked) {
      _physics.docked    = true;
      _physics.rpmPort   = 0;
      _physics.rpmStbd   = 0;
      _physics.portLever = 50;
      _physics.stbdLever = 50;
      _physics.sog       = 0;
      _physics.autoMode  = false;
    }

    // ── 岸电定时器 ──────────────────────────────────────────────────
    if (_physics.docked) {
      _physics.dockedTime += dt;
      _physics.shorePower = _physics.dockedTime >= 5 ? 2
        : _physics.dockedTime >= 2 ? 1
        : 0;
    }
  },

  /**
   * 将 _physics 推送到 Zustand，约 15fps 触发一次 React 重渲染。
   * 同时检测 checkpoint 是否需要弹窗。
   */
  syncDisplay: () => {
    const state    = get();
    const progress = _physics.routeProgress;

    // ── 检查点检测 ────────────────────────────────────────────────
    let checkpointAlert = state.checkpointAlert;
    for (const cp of CHECKPOINT_THRESHOLDS) {
      if (progress >= cp.progress && _physics.lastCheckpointProgress < cp.progress) {
        _physics.lastCheckpointProgress = cp.progress;
        const remainDist   = 1 - progress;
        const etaMinutes   = _physics.sog > 0.5
          ? Math.round(remainDist * 120 / _physics.sog * 16)
          : null;
        const nextSegSpeed = Math.round(
          getRecommendedSpeed(Math.min(1, progress + 0.1)) * 10
        ) / 10;
        checkpointAlert = {
          name:       cp.name,
          label:      cp.label,
          etaMinutes,
          grade:      state.ai.grade,
          recSpeed:   nextSegSpeed,
        };
        break; // show one checkpoint at a time
      }
    }

    set({
      portLever: _physics.portLever,
      stbdLever: _physics.stbdLever,
      prevPort:  _physics.prevPort,
      prevStbd:  _physics.prevStbd,
      bow1:      _physics.bow1,
      bow2:      _physics.bow2,
      ship: {
        routeProgress: _physics.routeProgress,
        x:             _physics.x,
        y:             _physics.y,
        heading:       _physics.heading,
        sog:           _physics.sog,
        rudderAngle:   _physics.rudderAngle,
        pitchPort:     _physics.pitchPort,
        pitchStbd:     _physics.pitchStbd,
        _thrust:       _physics._thrust,
        rpmPort:       _physics.rpmPort,
        rpmStbd:       _physics.rpmStbd,
        rpmAlarm:      _physics.rpmAlarm,
      },
      energy: {
        ...state.energy,
        fuelRate:   _physics.fuelRate,
        efficiency: _physics.efficiency,
      },
      autoMode:        _physics.autoMode,
      docked:          _physics.docked,
      shorePower:      _physics.shorePower,
      checkpointAlert,
    });
  },

  /** AI 评分（约 4Hz），读取 Zustand 显示快照 */
  updateAI: () => {
    const state = get();
    const { ship, portLever, stbdLever, prevPort, prevStbd } = state;

    const idealPt   = getRoutePoint(ship.routeProgress);
    const dist      = Math.sqrt((ship.x - idealPt.x) ** 2 + (ship.y - idealPt.y) ** 2);
    const corridorW = getCorridorWidthAt(ship.routeProgress);
    const corridor  = Math.max(0, Math.round(100 - (dist / (corridorW * 0.08)) * 100));

    const recSpeed  = getRecommendedSpeed(ship.routeProgress);
    const speedOpt  = Math.max(0, Math.round(100 - Math.abs(ship.sog - recSpeed) * 8));

    const remainDist = 1 - ship.routeProgress;
    const etaMinutes = ship.sog > 0.5 ? (remainDist * 120 / ship.sog * 16) : 999;
    const timing     = Math.max(0, Math.round(100 - Math.abs(etaMinutes - 38) * 3));

    const optimalThrust = recSpeed / 16;
    const actualThrust  = (portLever + stbdLever) / 2 / 100;
    const fuelEff       = Math.max(0, Math.round(100 - Math.abs(actualThrust - (optimalThrust * 0.5 + 0.5)) * 150));

    const changeRate = Math.abs(portLever - prevPort) + Math.abs(stbdLever - prevStbd);
    const smoothness = Math.max(0, Math.round(100 - changeRate * 2));

    const total = Math.round(
      corridor * 0.25 + speedOpt * 0.20 + timing * 0.20 + fuelEff * 0.20 + smoothness * 0.15
    );
    const grade = total >= 92 ? 'S' : total >= 80 ? 'A' : total >= 65 ? 'B' : total >= 50 ? 'C' : 'D';

    set({ ai: { corridor, speedOpt, timing, fuelEff, smoothness, total, grade } });
  },

  /** 重置全部航行状态（回到初始出发位置）*/
  resetVoyage: () => {
    // 重置物理层
    _physics.portLever  = 50;  _physics.stbdLever  = 50;
    _physics.prevPort   = 50;  _physics.prevStbd   = 50;
    _physics.routeProgress = 0.80;
    _physics.x          = 0.758; _physics.y = 0.512;
    _physics.heading    = 229;
    _physics.sog        = 0;    _physics.rudderAngle = 0;
    _physics.pitchPort  = 0;   _physics.pitchStbd  = 0;
    _physics._thrust    = 0;
    _physics.rpmPort    = 0;   _physics.rpmStbd    = 0;
    _physics.rpmAlarm   = false;
    _physics.fuelRate   = 28;  _physics.efficiency  = 83;
    _physics.autoMode   = false;
    _physics.docked     = false; _physics.dockedTime = 0;
    _physics.shorePower = 0;
    _physics.lastCheckpointProgress = 0.79;

    set({
      portLever: 50, stbdLever: 50, prevPort: 50, prevStbd: 50,
      ship: {
        routeProgress: 0.80, x: 0.758, y: 0.512, heading: 229,
        sog: 0, rudderAngle: 0, pitchPort: 0, pitchStbd: 0,
        _thrust: 0, rpmPort: 0, rpmStbd: 0, rpmAlarm: false,
      },
      ai: { corridor: 100, speedOpt: 100, timing: 100, fuelEff: 100, smoothness: 100, total: 100, grade: 'S' },
      energy: { fuelRate: 28, efficiency: 83, batterySoc: 72, co2Saved: 2.4, mode: 'diesel' },
      autoMode: false, checkpointAlert: null, docked: false, shorePower: 0,
      log: [{ ts: new Date(), msg: 'Voyage reset — ready for new approach', type: '' }],
      voyageStartTime: Date.now(),
      targetArrivalMs: Date.now() + 38 * 60 * 1000,
    });
  },

  addLog: (msg, type = '') => set(prev => ({
    log: [{ ts: new Date(), msg, type }, ...prev.log].slice(0, 50),
  })),
}));

// ── Helper functions ──

function getRoutePoint(t) {
  const n = ROUTE.length - 1;
  const seg = Math.min(Math.floor(t * n), n - 1);
  const lt  = t * n - seg;
  const a   = ROUTE[seg];
  const b   = ROUTE[Math.min(seg + 1, n)];
  return { x: a.x + (b.x - a.x) * lt, y: a.y + (b.y - a.y) * lt };
}

export function getRecommendedSpeed(t) {
  const n   = SPEED_PROFILE.length - 1;
  const seg = Math.min(Math.floor(t * n), n - 1);
  const lt  = t * n - seg;
  return SPEED_PROFILE[seg] + (SPEED_PROFILE[Math.min(seg + 1, n)] - SPEED_PROFILE[seg]) * lt;
}

function getCorridorWidthAt(t) {
  const n   = CORRIDOR_WIDTH.length - 1;
  const seg = Math.min(Math.floor(t * n), n - 1);
  const lt  = t * n - seg;
  return CORRIDOR_WIDTH[seg] + (CORRIDOR_WIDTH[Math.min(seg + 1, n)] - CORRIDOR_WIDTH[seg]) * lt;
}
