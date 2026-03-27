/* ═══════════════════════════════════════════════════════════
   浮窗：AI 能源优化器 | Energy Optimizer Widget
   位置：主仪表盘右下角，搜索框正上方。

   ── 状态流 ──
     idle  →  click  →  thinking  →  results  →  idle

   ── 功能 ──
   • 模拟 AI 分析思考过程（逐步流式显示）
   • 在思考完成后显示推荐能源模式与节省指标
   • 通过 onMarkersChange 回调把优化标记传给 EnergyIndex
   • 用户点击"Accept & Apply"一键接受优化

   ── TODO ──
   • 将 FAKE_RESULT 替换为 Python RL 模型的实际输出
   ═══════════════════════════════════════════════════════════ */
import { useState, useRef, useEffect } from 'react';
import './EnergyOptimizer.css';

/* ── Fake AI thinking steps (placeholder for RL model output) ── */
const THINKING_STEPS = [
  "Scanning energy consumption patterns...",
  "Battery SOC analysis — buffer sufficient",
  "H₂ → ESS transfer efficiency: 74% (below optimum)",
  "Main Engine load distribution: imbalance detected",
  "Hotel & Bow Thruster load profiles evaluated",
  "Computing Pareto-optimal energy routing...",
  "Reinforcement learning model converged (confidence: 95.3%)",
  "✓ Analysis complete — 3 optimizations identified",
];

/* ── Fake optimization result (placeholder for RL model output) ── */
export const FAKE_RESULT = {
  markers: [
    { connectionId: 'h2-ess',    saving: '+18%', label: 'H₂ Boost'        },
    { connectionId: 'eng-ess',   saving: '+12%', label: 'Engine Re-route'  },
    { connectionId: 'ess-hotel', saving: '−8%',  label: 'Load Reduction'   },
  ],
  recommendedMode: 'Eco Mode 2',
  fuelSaving: '14.2%',
  emissionReduction: '18.6%',
  rangeBoost: '+42 nm',
};

/* ── Color tokens ── */
const C = {
  dark:    '#1C2A1C',
  panel:   '#1E2D1E',
  border:  '#2A412A',
  green:   '#4FBF65',
  green2:  '#3DA852',
  amber:   '#FFB347',
  text:    '#D4EED4',
  dim:     '#7A9A7A',
  dimBg:   'rgba(79,191,101,0.08)',
};

/* ═══════════════ Main Component ═══════════════ */
export default function EnergyOptimizer({ onMarkersChange }) {
  const [phase, setPhase]           = useState('idle');   // idle | thinking | results
  const [visibleSteps, setVisibleSteps] = useState([]);
  const [result, setResult]         = useState(null);
  const [accepted, setAccepted]     = useState(false);
  const stepsEndRef = useRef(null);
  const timerRefs  = useRef([]);

  /* Auto-scroll step list */
  useEffect(() => {
    stepsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [visibleSteps]);

  /* Clean up timers on unmount */
  useEffect(() => () => timerRefs.current.forEach(clearTimeout), []);

  const clearTimers = () => {
    timerRefs.current.forEach(clearTimeout);
    timerRefs.current = [];
  };

  /* ── Start analysis ── */
  const startAnalysis = () => {
    if (phase !== 'idle') return;
    clearTimers();
    setPhase('thinking');
    setVisibleSteps([]);
    setResult(null);
    setAccepted(false);
    onMarkersChange?.(null);

    THINKING_STEPS.forEach((step, i) => {
      const t = setTimeout(() => {
        setVisibleSteps(prev => [...prev, step]);
        if (i === THINKING_STEPS.length - 1) {
          const t2 = setTimeout(() => {
            setPhase('results');
            setResult(FAKE_RESULT);
            onMarkersChange?.(FAKE_RESULT.markers);
          }, 500);
          timerRefs.current.push(t2);
        }
      }, 400 + i * 680);
      timerRefs.current.push(t);
    });
  };

  /* ── Accept optimization ── */
  const handleAccept = () => {
    setAccepted(true);
    const t = setTimeout(() => {
      reset();
    }, 1800);
    timerRefs.current.push(t);
  };

  /* ── Dismiss ── */
  const handleDismiss = reset;

  function reset() {
    clearTimers();
    setPhase('idle');
    setVisibleSteps([]);
    setResult(null);
    setAccepted(false);
    onMarkersChange?.(null);
  }

  /* ─────────────────── Render ─────────────────── */
  return (
    <div style={{
      position: 'absolute',
      bottom: 8,
      right: 8,
      zIndex: 50,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-end',
      gap: 8,
      fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
      pointerEvents: 'none',
    }}>

      {/* ══════════════ Analysis Panel ══════════════ */}
      {phase !== 'idle' && (
        <div style={{
          width: 290,
          background: C.dark,
          border: `1px solid ${C.border}`,
          borderRadius: 12,
          overflow: 'hidden',
          boxShadow: '0 8px 32px rgba(0,0,0,0.55)',
          pointerEvents: 'auto',
          animation: 'eo-slide-up 0.25s ease',
        }}>

          {/* ── Header ── */}
          <div style={{
            padding: '9px 14px',
            borderBottom: `1px solid ${C.border}`,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: 'rgba(79,191,101,0.06)',
          }}>
            {phase === 'thinking' ? <ThinkingDots /> : (
              <span style={{ color: C.green, fontSize: 12 }}>●</span>
            )}
            <span style={{ color: C.text, fontSize: 11, fontWeight: 700, letterSpacing: 0.6 }}>
              {phase === 'thinking' ? 'AI ANALYSIS RUNNING' : 'ANALYSIS COMPLETE'}
            </span>
          </div>

          {/* ── Thinking steps log ── */}
          <div style={{
            maxHeight: 148,
            overflowY: 'auto',
            padding: '8px 14px',
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
          }}>
            {visibleSteps.map((step, i) => {
              const isFinal   = i === visibleSteps.length - 1;
              const isDone    = !isFinal || phase === 'results';
              const isCurrent = isFinal && phase === 'thinking';
              return (
                <div key={i} style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 7,
                  animation: 'eo-step-in 0.22s ease',
                }}>
                  <span style={{
                    fontSize: 10,
                    marginTop: 2,
                    color: isDone ? C.green : isCurrent ? C.amber : C.dim,
                    flexShrink: 0,
                    fontWeight: 700,
                  }}>
                    {isDone ? '✓' : isCurrent ? '›' : '·'}
                  </span>
                  <span style={{
                    fontSize: 10.5,
                    color: isDone ? C.text : C.dim,
                    lineHeight: 1.45,
                  }}>
                    {step}
                  </span>
                </div>
              );
            })}
            <div ref={stepsEndRef} />
          </div>

          {/* ── Recommendation section (results only) ── */}
          {phase === 'results' && result && (
            <>
              <div style={{ height: 1, background: C.border }} />
              <div style={{ padding: '10px 14px 12px' }}>

                <div style={{
                  color: C.dim, fontSize: 9, fontWeight: 700,
                  letterSpacing: 1, marginBottom: 5,
                }}>
                  RECOMMENDED MODE
                </div>

                <div style={{
                  color: C.green, fontSize: 17, fontWeight: 800,
                  marginBottom: 9, letterSpacing: 0.3,
                }}>
                  {result.recommendedMode}
                </div>

                <div style={{
                  background: C.dimBg,
                  borderRadius: 7,
                  padding: '7px 10px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4,
                  marginBottom: 10,
                }}>
                  <MetricRow label="Fuel saving"          value={`↓ ${result.fuelSaving}`}       color={C.green} />
                  <MetricRow label="Emission reduction"   value={`↓ ${result.emissionReduction}`} color={C.green} />
                  <MetricRow label="Estimated range boost" value={`↑ ${result.rangeBoost}`}      color="#64B5F6" />
                </div>

                {accepted ? (
                  <div style={{
                    color: C.green, fontSize: 12, fontWeight: 700,
                    textAlign: 'center', padding: '6px 0',
                    animation: 'eo-flash 0.3s ease',
                  }}>
                    ✓ Eco Mode 2 applied successfully
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      onClick={handleAccept}
                      style={{
                        flex: 1,
                        background: C.green2,
                        border: 'none',
                        borderRadius: 6,
                        color: '#fff',
                        fontSize: 11,
                        fontWeight: 700,
                        padding: '7px 0',
                        cursor: 'pointer',
                        letterSpacing: 0.3,
                        fontFamily: 'inherit',
                      }}
                    >
                      ✓ Accept &amp; Apply
                    </button>
                    <button
                      onClick={handleDismiss}
                      style={{
                        background: 'rgba(255,255,255,0.05)',
                        border: `1px solid ${C.border}`,
                        borderRadius: 6,
                        color: C.dim,
                        fontSize: 11,
                        fontWeight: 600,
                        padding: '7px 12px',
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                      }}
                    >
                      Dismiss
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* ══════════════ Trigger Button ══════════════ */}
      <button
        onClick={startAnalysis}
        disabled={phase !== 'idle'}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 7,
          padding: '8px 16px',
          background: phase !== 'idle' ? 'rgba(28,42,28,0.92)' : C.dark,
          border: `1.5px solid ${phase !== 'idle' ? C.border : C.green}`,
          borderRadius: 20,
          color: phase !== 'idle' ? C.dim : C.green,
          fontSize: 12,
          fontWeight: 700,
          cursor: phase !== 'idle' ? 'default' : 'pointer',
          letterSpacing: 0.4,
          pointerEvents: 'auto',
          animation: phase === 'idle' ? 'eo-pulse 2.8s ease-in-out infinite' : 'none',
          transition: 'border-color 0.2s, color 0.2s',
          fontFamily: 'inherit',
          userSelect: 'none',
        }}
      >
        <BoltIcon color={phase !== 'idle' ? C.dim : C.green} />
        {phase === 'idle'     ? 'Energy Optimizer' :
         phase === 'thinking' ? 'Analyzing...'      :
                                'View Results'}
      </button>
    </div>
  );
}

/* ── Sub-components ── */

function ThinkingDots() {
  return (
    <span style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
      {[0, 1, 2].map(i => (
        <span key={i} style={{
          width: 5, height: 5,
          borderRadius: '50%',
          background: '#4FBF65',
          display: 'inline-block',
          animation: `eo-dot 1.2s ease-in-out ${i * 0.2}s infinite`,
        }} />
      ))}
    </span>
  );
}

function MetricRow({ label, value, color }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ color: '#7A9A7A', fontSize: 10 }}>{label}</span>
      <span style={{ color: color || '#D4EED4', fontSize: 11, fontWeight: 700 }}>{value}</span>
    </div>
  );
}

function BoltIcon({ color }) {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill={color} />
    </svg>
  );
}
