import { useEffect } from 'react';

// ── Module-level state (plain JS, no React, no Zustand) ──────────────────
// 键盘状态存在模块级变量里，由游戏循环在同一 rAF 帧内主动拉取，
// 彻底消除 setInterval 与 requestAnimationFrame 的时序错位。

let _enabled = false;
const _keys = {};
let _port = 50;
let _stbd = 50;

/**
 * 由游戏循环每帧调用，根据当前按键状态计算操纵杆目标值。
 * 返回 { port, stbd } 或 null（键盘未启用时）。
 *
 * @param {number} portCurrent  当前左杆值 0-100
 * @param {number} stbdCurrent  当前右杆值 0-100
 * @param {number} dt           帧时长（秒）
 */
export function processKeyboard(portCurrent, stbdCurrent, dt) {
  if (!_enabled) return null;

  // 帧率无关步长：60fps 时 step ≈ 2.5
  const step = 2.5 * dt * 60;

  let thrustCmd = 0;
  let turnCmd = 0;
  if (_keys['w']) thrustCmd += 1;
  if (_keys['s']) thrustCmd -= 1;
  if (_keys['a']) turnCmd -= 1; // 左转
  if (_keys['d']) turnCmd += 1; // 右转

  if (thrustCmd !== 0 || turnCmd !== 0) {
    // 右转(D): port 前进 (+turn), stbd 后退 (-turn)
    const tPortNorm = Math.max(-1, Math.min(1, thrustCmd + turnCmd));
    const tStbdNorm = Math.max(-1, Math.min(1, thrustCmd - turnCmd));
    const tPortPct  = tPortNorm * 50 + 50;
    const tStbdPct  = tStbdNorm * 50 + 50;

    _port = Math.max(0, Math.min(100, portCurrent + Math.sign(tPortPct - portCurrent) * step));
    _stbd = Math.max(0, Math.min(100, stbdCurrent + Math.sign(tStbdPct - stbdCurrent) * step));
  } else {
    // 无键按下 → 保持当前杆位（巡航模式：松键不减速，按 S 才减速）
    _port = portCurrent;
    _stbd = stbdCurrent;
  }

  return { port: _port, stbd: _stbd };
}

/**
 * React Hook：注册 keydown/keyup 监听，启用/禁用键盘控制。
 * 不再使用 setInterval —— 杆位更新完全由游戏循环驱动。
 */
export function useKeyboardSim(enabled = true) {
  useEffect(() => {
    _enabled = enabled;
    if (!enabled) {
      // 禁用时重置回中，避免残留状态
      _port = 50;
      _stbd = 50;
      return;
    }

    const onDown = (e) => {
      _keys[e.key.toLowerCase()] = true;
      if (['w', 's', 'a', 'd'].includes(e.key.toLowerCase())) {
        e.preventDefault(); // 阻止页面滚动
      }
    };
    const onUp = (e) => { delete _keys[e.key.toLowerCase()]; };

    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    return () => {
      _enabled = false;
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
    };
  }, [enabled]);
}
