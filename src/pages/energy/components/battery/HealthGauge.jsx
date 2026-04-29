/* ═══════════════════════════════════════════════════════════
   电池健康仪表盘 | Battery Health (SOH) Gauge
   显示 State of Health 百分比
   ═══════════════════════════════════════════════════════════ */
const HealthGauge = ({ value = 94 }) => {
  const normalizedValue = Math.max(0, Math.min(value, 100));
  const angle = (normalizedValue / 100) * 180 - 90;

  let arcColor = '#4CAF50';
  if (normalizedValue < 50) arcColor = '#FFC107';
  if (normalizedValue < 30) arcColor = '#F44336';

  return (
    <svg width="100%" height="100%" viewBox="0 0 120 90" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="healthTrack" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#E0E0E0" />
          <stop offset="100%" stopColor="#D0D0D0" />
        </linearGradient>
      </defs>

      {/* Background Arc */}
      <path
        d="M 15 75 A 45 45 0 0 1 105 75"
        stroke="url(#healthTrack)"
        strokeWidth="10"
        fill="none"
        strokeLinecap="round"
      />

      {/* Colored Arc */}
      <path
        d="M 15 75 A 45 45 0 0 1 105 75"
        stroke={arcColor}
        strokeWidth="10"
        fill="none"
        strokeLinecap="round"
        strokeDasharray={`${(normalizedValue / 100) * (Math.PI * 90)} ${Math.PI * 90}`}
        opacity="0.9"
      />

      {/* Center Text */}
      <text
        x="60"
        y="48"
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize="18"
        fontWeight="bold"
        fill="#333333"
      >
        {Math.round(normalizedValue)}%
      </text>

      <text
        x="60"
        y="65"
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize="8"
        fill="#888888"
        letterSpacing="0.5"
      >
        STATE OF HEALTH
      </text>
    </svg>
  );
};

export default HealthGauge;
