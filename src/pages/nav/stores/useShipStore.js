import { create } from 'zustand';
import { ROUTE, SPEED_PROFILE, CORRIDOR_WIDTH } from '../utils/constants';
import { leversToCommand } from '../utils/irMapping';
import { MOCK_ROUTES, interpolateRoute, routeHeading } from '../utils/maritimeLogic';

// ── canvasDraw bridge（游戏循环调用 Canvas 绘制，消除双 rAF 时序抖动）────
export const canvasDraw = { fn: null };

// ── Checkpoint thresholds (route progress values)
const CHECKPOINT_THRESHOLDS = [
  { progress: 0.50, name: 'WP-3', label: 'Innamo turn' },
  { progress: 0.82, name: 'WP-4', label: 'Naantali approach' },
];

function makeMockShips() {
  return [
    { id: 'TUG 1',   routeIdx: 0, progress: 0.01, speed: 0.000035, color: '#A1B1C2', alarmed: false, x: 0, y: 0 },
    { id: 'FERRY X', routeIdx: 1, progress: 0.55, speed: 0.00004, color: '#A1B1C2', alarmed: false, x: 0, y: 0 },
    { id: 'CARGO',   routeIdx: 2, progress: 0.02, speed: 0.000045, color: '#A1B1C2', alarmed: false, x: 0, y: 0 },
  ];
}

// ── Module-level physics ref（60fps 零 React 开销）────────────────────────
export const _physics = {
  portLever:    50,
  stbdLever:    50,
  prevPort:     50,
  prevStbd:     50,
  bowThruster:  0,   // combined bow effect (-1..1)
  bow1:         0,   // IR4 raw (-100..100)
  bow2:         0,   // IR5 raw (-100..100)
  // ship — start in Naantali Sound heading N toward berth (routeProgress 0.80)
  // Position ≈ between wp8(0.793,0.750) and wp9(0.800,0.710) at t=0.8
  routeProgress: 0.80,
  x: 0.799,
  y: 0.718,
  heading: 10,
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
  mockShips: makeMockShips(),
  collision: false,
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
    x: 0.799,
    y: 0.718,
    heading: 10,
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
  wp4Passed:       false, // true once WP-4 checkpoint fires → show auto-berth button
  collision:       false,
  mockShips:       [],

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
  // Constants for smooth berth deceleration in auto-mode
  // Ramp starts at 97% of route → gentle slide to near-stop before docking
  tick: (dt = 1 / 60) => {
    if (_physics.collision) return;

    // After docking: only keep RPM winding down (60 RPM/s), skip all movement
    if (_physics.docked) {
      const applyRpmStepDocked = (current, dt) => {
        const maxDelta = 60 * dt;
        return Math.max(0, current - maxDelta);
      };
      _physics.rpmPort = applyRpmStepDocked(_physics.rpmPort, dt);
      _physics.rpmStbd = applyRpmStepDocked(_physics.rpmStbd, dt);
      _physics.dockedTime += dt;
      _physics.shorePower = _physics.dockedTime >= 5 ? 2
        : _physics.dockedTime >= 2 ? 1 : 0;
      return;
    }

    // ── Update mock ships ────────────────────────────────────────
    _physics.mockShips.forEach(ms => {
      const route = MOCK_ROUTES[ms.routeIdx];
      ms.progress += ms.speed;
      if (ms.progress >= 1) ms.progress = 0;
      const pos = interpolateRoute(route, ms.progress);
      ms.x = pos.x;
      ms.y = pos.y;

      // Collision check
      const distSq = (ms.x - _physics.x) ** 2 + (ms.y - _physics.y) ** 2;
      if (distSq < 0.0015 ** 2) { // Closer collision threshold
        _physics.collision = true;
      }
    });

    if (_physics.collision) {
      get().addLog('Collision detected! Voyage will restart.', 'error');
      setTimeout(() => get().resetVoyage(), 2000); // Restart after 2s
      return;
    }

    // ── AUTO mode: override levers with AI target speed ──────────
    // Smooth berth ramp: starts at 97% of route, eases to near-zero kn by 100%
    const AUTO_DOCK_RAMP_START = 0.97;
    const AUTO_DOCK_FINAL_SPD  = 0.5; // kn (~16 RPM) — nearly stopped before hard-dock
    if (_physics.autoMode) {
      let targetSpeed = getRecommendedSpeed(_physics.routeProgress);
      if (_physics.routeProgress >= AUTO_DOCK_RAMP_START) {
        const t = Math.min(1, (_physics.routeProgress - AUTO_DOCK_RAMP_START) / (1 - AUTO_DOCK_RAMP_START));
        targetSpeed = AUTO_DOCK_FINAL_SPD + (targetSpeed - AUTO_DOCK_FINAL_SPD) * Math.max(0, 1 - Math.pow(t, 0.75));
      }
      const targetRpm   = (targetSpeed / 16) * 500;
      // percentToThrust(lever) = (lever-50)/50 → lever = thrust*50+50
      const targetLever = (targetRpm / 500) * 50 + 50;
      _physics.prevPort  = _physics.portLever;
      _physics.prevStbd  = _physics.stbdLever;
      _physics.portLever = Math.max(0, Math.min(100, targetLever));
      _physics.stbdLever = Math.max(0, Math.min(100, targetLever));
    }

    const cmd = leversToCommand(_physics.portLever, _physics.stbdLever);

    // ── 目标 RPM（lever 0~100 映射到 0~500 RPM，强制非负）──────────
    // 原逻辑 50 为中位支持倒车(负值)，现改为 0 最小
    const targetRpmPort = Math.max(0, cmd.port * 500);
    const targetRpmStbd = Math.max(0, cmd.stbd * 500);

    // ── 非对称 RPM 速率：加速 20 RPM/s，减速 60 RPM/s ────────────
    const applyRpmStep = (current, target, dt) => {
      const diff = target - current;
      const rate = Math.abs(target) < Math.abs(current) ? 60 : 20;
      const maxDelta = rate * dt;
      const next = current + Math.max(-maxDelta, Math.min(maxDelta, diff));
      return Math.max(0, next); // Ensure RPM never goes negative
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
    _physics.fuelRate   = 22 + thrustPct * 0.35; // Increased consumption for more realistic efficiency range
    const calculatedEfficiency = _physics.sog > 0.5
      ? (_physics.fuelRate * 1000 / 24) / _physics.sog
      : 0;
    // Clamp efficiency to 200-500 range as requested by user
    _physics.efficiency = calculatedEfficiency > 0 ? Math.max(200, Math.min(500, calculatedEfficiency)) : 0;

    // ── 靠港检测（routeProgress ≥ 1.00）─────────────────────────────
    // Set levers to neutral; RPM winds down naturally via the 60 RPM/s decel
    // (handled in the docked branch at top of tick) — no instant zeroing.
    if (_physics.routeProgress >= 1.0 && !_physics.docked) {
      _physics.docked    = true;
      _physics.portLever = 50;
      _physics.stbdLever = 50;
      _physics.sog       = 0;
      _physics.autoMode  = false;
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
      wp4Passed:       progress >= 0.82,
      collision:       _physics.collision,
      mockShips:       _physics.mockShips,
    });
  },

  /** AI 评分（约 4Hz），采用平滑指标体系避免大幅跳动 */
  updateAI: () => {
    const state = get();
    const { ship, portLever, stbdLever, prevPort, prevStbd, ai: prevAI } = state;

    // 1. Corridor Score: 安全区域权重。偏离中线 25% 宽度内不扣分
    const idealPt   = getRoutePoint(ship.routeProgress);
    const dist      = Math.sqrt((ship.x - idealPt.x) ** 2 + (ship.y - idealPt.y) ** 2);
    const corridorW = getCorridorWidthAt(ship.routeProgress) * 0.08;
    const errorPct  = dist / corridorW;
    const rawCorridor = errorPct < 0.2 ? 100 : Math.max(0, 100 - (errorPct - 0.2) * 125);

    // 2. Speed Score: 允许 ±1 kn 的死区。
    const recSpeed  = getRecommendedSpeed(ship.routeProgress);
    const speedDiff = Math.abs(ship.sog - recSpeed);
    const rawSpeed  = speedDiff < 1.0 ? 100 : Math.max(0, 100 - (speedDiff - 1.0) * 15);

    // 3. Fuel Efficiency: 考察单位航程油耗相对于该段基准的偏离程度
    const targetFuelRateAtRec = 22 + (recSpeed / 16 * 100) * 0.35;
    const fuelEff = Math.max(0, Math.min(100, 100 - ((_physics.fuelRate - targetFuelRateAtRec) / targetFuelRateAtRec) * 200));

    // 4. Smoothness: 累计杠杆变动率的移动平均（Leaky Integrator）
    const changeRate = (Math.abs(portLever - prevPort) + Math.abs(stbdLever - prevStbd)) / 2;
    const prevSmooth = prevAI.smoothness || 100;
    // 较小的变动不扣分，大的变动缓慢拉低分数，缓慢回升
    const rawSmooth = changeRate < 0.5 ? Math.min(100, prevSmooth + 0.5) : Math.max(0, prevSmooth - changeRate * 0.2);

    // 5. Overall: 使用 EMA (指数移动平均) 进一步平滑最终分数
    const lerp = (oldV, newV, f) => oldV + (newV - oldV) * f;
    const corridor = Math.round(lerp(prevAI.corridor || 100, rawCorridor, 0.4));
    const speedOpt = Math.round(lerp(prevAI.speedOpt || 100, rawSpeed, 0.4));
    const smoothness = Math.round(rawSmooth);
    const fuelScore = Math.round(lerp(prevAI.fuelEff || 100, fuelEff, 0.4));

    // 计算总分
    const total = Math.round(corridor * 0.3 + speedOpt * 0.3 + fuelScore * 0.25 + smoothness * 0.15);
    const grade = total >= 92 ? 'S' : total >= 80 ? 'A' : total >= 65 ? 'B' : total >= 50 ? 'C' : 'D';

    set({ ai: { corridor, speedOpt, timing: prevAI.timing || 100, fuelEff: fuelScore, smoothness, total, grade } });

    // ── 指导性日志输出 ──────────────────────────────────────────
    if (Date.now() % 5000 < 250) { // 每 5 秒尝试给出一次指导建议
      if (corridor < 80) state.addLog('Navigation: Vessel deviating from corridor. Adjust heading.', 'warning');
      else if (speedOpt < 80) state.addLog(`Efficiency: Sog ${ship.sog.toFixed(1)}kn differs from plan ${recSpeed.toFixed(1)}kn.`, 'info');
      else if (smoothness < 80) state.addLog('Handling: Level changes too frequent. Use gradual inputs.', 'info');
    }
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
    _physics.mockShips = makeMockShips();
    _physics.collision = false;

    set({
      portLever: 50, stbdLever: 50, prevPort: 50, prevStbd: 50,
      ship: {
        routeProgress: 0.80, x: 0.758, y: 0.512, heading: 229,
        sog: 0, rudderAngle: 0, pitchPort: 0, pitchStbd: 0,
        _thrust: 0, rpmPort: 0, rpmStbd: 0, rpmAlarm: false,
      },
      ai: { corridor: 100, speedOpt: 100, timing: 100, fuelEff: 100, smoothness: 100, total: 100, grade: 'S' },
      energy: { fuelRate: 28, efficiency: 83, batterySoc: 72, co2Saved: 2.4, mode: 'diesel' },
      autoMode: false, checkpointAlert: null, docked: false, shorePower: 0, wp4Passed: false,
      collision: false,
      mockShips: _physics.mockShips,
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
