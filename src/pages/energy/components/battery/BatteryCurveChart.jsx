import React from 'react';
import { useEnergyStore } from '../../stores/energyStore';

const BatteryCurveChart = ({ width = 300, height = 80 }) => {
  const chartData = useEnergyStore((state) => state.batteryLevelHistory) || [];

  if (chartData.length < 2) return null;

  // Auto-scale Y axis to definitively show micro slopes
  const dataMin = Math.min(...chartData);
  const dataMax = Math.max(...chartData);
  
  // Provide purely mathematical padding to accentuate the actual trend
  const min = dataMin - 0.005;
  const max = dataMax + 0.005;
  const range = max - min;
  
  const xStep = width / (chartData.length - 1);
  const getY = (val) => height - ((val - min) / range) * height;
  
  const pathD = `M 0 ${getY(chartData[0])} ` + chartData.map((d, i) => `L ${i * xStep} ${getY(d)}`).join(' ');
  const areaD = `${pathD} L ${width} ${height} L 0 ${height} Z`;

  // Trend detection
  const first = chartData[0];
  const last = chartData[chartData.length - 1];
  const diff = last - first;
  const isCharging = diff > 0.001;
  const isDraining = diff < -0.001;

  const color = isCharging ? '#4CAF50' : (isDraining ? '#F44336' : '#2196F3');
  const bgColor = isCharging ? 'rgba(76, 175, 80, 0.1)' : (isDraining ? 'rgba(244, 67, 54, 0.1)' : 'rgba(33, 150, 243, 0.1)');

  return (
    <div style={{ marginTop: '12px', background: '#FFFFFF', padding: '12px', borderRadius: '6px', border: '1px solid #DDDDDD' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', alignItems: 'center' }}>
        <div style={{ fontSize: '10px', color: '#888', fontWeight: 600, letterSpacing: '0.3px' }}>
          CAPACITY TREND (SOC %)
        </div>
        <div style={{ fontSize: '9px', color: color, fontWeight: 700 }}>
           {Math.abs(diff).toFixed(3)}% {isCharging ? '▲' : (isDraining ? '▼' : '■')}
        </div>
      </div>
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
        <path d={areaD} fill={bgColor} />
        <path d={pathD} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" />
        {/* Y-axis Labels */}
        <text x="2" y="10" fontSize="8" fill="#AAAAAA">{max.toFixed(2)}%</text>
        <text x="2" y={height - 4} fontSize="8" fill="#AAAAAA">{min.toFixed(2)}%</text>
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: '#AAA', marginTop: '4px' }}>
        <span>-30s</span>
        <span>Now</span>
      </div>
    </div>
  );
};

export default BatteryCurveChart;
