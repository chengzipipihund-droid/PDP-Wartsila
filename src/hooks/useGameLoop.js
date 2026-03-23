import { useEffect } from 'react';
import { useStore, _physics, canvasDraw } from '../stores/useShipStore';
import { processKeyboard } from './useKeyboardSim';

export function useGameLoop() {
  const tick        = useStore(s => s.tick);
  const updateAI    = useStore(s => s.updateAI);
  const syncDisplay = useStore(s => s.syncDisplay);
  const setLevers   = useStore(s => s.setLevers);

  useEffect(() => {
    let animId;
    let lastTime  = performance.now();
    let aiTimer   = 0;
    let dispTimer = 0;

    function loop(now) {
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;

      // ① 键盘 → 杆位（AUTO 模式下跳过，零 React 开销）
      if (!_physics.autoMode && !_physics.docked) {
        const kb = processKeyboard(_physics.portLever, _physics.stbdLever, dt);
        if (kb) setLevers(kb.port, kb.stbd);
      }

      // ② 物理更新（写 _physics，零 React 开销）
      tick(dt);

      // ③ Canvas 绘制（与物理严格同帧，消除双 rAF 时序抖动）
      canvasDraw.fn?.();

      // ④ 显示同步 ~15fps（每 ~67ms 触发一次 React 重渲染）
      dispTimer += dt;
      if (dispTimer >= 1 / 15) {
        syncDisplay();
        dispTimer = 0;
      }

      // ⑤ AI 评分 ~4Hz
      aiTimer += dt;
      if (aiTimer > 0.25) {
        updateAI();
        aiTimer = 0;
      }

      animId = requestAnimationFrame(loop);
    }

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, []);
}
