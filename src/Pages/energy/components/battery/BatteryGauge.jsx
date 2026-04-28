/* ═══════════════════════════════════════════════════════════
   电池 SOC 仪表盘 | Battery SOC Gauge
   显示 State of Charge 百分比 (0-100%)
   绿色 (>30%), 黄色 (15-30%), 红色 (<15%)
   ═══════════════════════════════════════════════════════════ */
const BatteryGauge = ({ value = 76 }) => {
  const normalizedValue = Math.max(0, Math.min(value, 100));
  const angle = (normalizedValue / 100) * 180 - 90;

  // Determine color based on value
  let arcColor = '#4CAF50'; // green
  if (normalizedValue < 15) arcColor = '#F44336'; // red
  else if (normalizedValue < 30) arcColor = '#FFC107'; // yellow

  return (
    <svg width="100%" height="100%" viewBox="0 0 120 90" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="gaugeTrack" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#E0E0E0" />
          <stop offset="100%" stopColor="#D0D0D0" />
        </linearGradient>
      </defs>

      {/* Background Arc (Grey track) */}
      <path 
        d="M 10 80 A 50 50 0 0 1 110 80" 
        stroke="url(#gaugeTrack)" 
        strokeWidth="10" 
        fill="none" 
        strokeLinecap="round"
      />

      {/* Colored Arc (Active value) */}
      <path 
        d="M 10 80 A 50 50 0 0 1 110 80" 
        stroke={arcColor}
        strokeWidth="10" 
        fill="none" 
        strokeLinecap="round"
        strokeDasharray={`${(normalizedValue / 100) * (Math.PI * 100)} ${Math.PI * 100}`}
        opacity="0.9"
      />

      {/* Center Text - Percentage */}
      <text
        x="60"
        y="55"
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize="18"
        fontWeight="bold"
        fill="#333333"
      >
        {Math.round(normalizedValue)}%
      </text>

      {/* Label */}
      <text
        x="60"
        y="72"
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize="8"
        fill="#888888"
        letterSpacing="0.5"
      >
        STATE OF CHARGE
      </text>

      {/* Range Labels */}
      <text x="10" y="88" textAnchor="middle" fontSize="7" fill="#AAAAAA">0</text>
      <text x="110" y="88" textAnchor="middle" fontSize="7" fill="#AAAAAA">100</text>
    </svg>
  );
};

export default BatteryGauge;
