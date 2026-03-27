import React from 'react';

const RpmGauge = ({ rpm }) => {
  const normalizedRpm = Math.max(0, Math.min(rpm, 500));
  // Map RPM from 0-500 range to an angle from -90 to +90 degrees for a semicircle
  const angle = (normalizedRpm / 500) * 180 - 90;

  return (
    <svg width="193" height="140" viewBox="0 0 193 140" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Background and static elements from Databoard.svg can be added here */}
      {/* For simplicity, we'll draw a basic gauge */}
      <defs>
        <linearGradient id="gaugeBg" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#C8CCD0" />
          <stop offset="100%" stopColor="#ABADB0" />
        </linearGradient>
      </defs>
      
      {/* Gauge Background Arc */}
      <path 
        d="M 30 110 A 65 65 0 0 1 163 110" 
        stroke="url(#gaugeBg)" 
        strokeWidth="20" 
        fill="none" 
        strokeLinecap="round"
      />

      {/* Ticks can be added here if needed */}
      
      {/* RPM Value Text */}
      <text
        x="96.5"
        y="95"
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize="28"
        fontWeight="bold"
        fill="#333"
      >
        {Math.round(normalizedRpm)}
      </text>
      <text
        x="96.5"
        y="115"
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize="14"
        fill="#555"
      >
        RPM
      </text>

      {/* Needle */}
      <g transform={`rotate(${angle} 96.5 110)`}>
        <path d="M 96.5 110 L 96.5 40" stroke="#53575A" strokeWidth="4" strokeLinecap="round" />
        <circle cx="96.5" cy="110" r="6" fill="#53575A" />
      </g>
      
       {/* Range Text */}
       <text x="30" y="125" textAnchor="middle" fontSize="12" fill="#555">0</text>
       <text x="163" y="125" textAnchor="middle" fontSize="12" fill="#555">500</text>
    </svg>
  );
};

export default RpmGauge;
