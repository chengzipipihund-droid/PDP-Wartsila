import React from 'react';
import { useEnergyStore } from '../../stores/energyStore';

function DonutChart({ title, data, size = 120 }) {
  const total = data.reduce((sum, item) => sum + item.value, 0) || 1;
  const center = size / 2;
  const radius = center * 0.7;
  const strokeWidth = center * 0.25;
  
  let currentAngle = -90;
  
  const calculateArcD = (start, end) => {
    // If the slice is exactly 360, path won't draw properly as start=end, handled via circle outside
    const radStart = (start * Math.PI) / 180;
    const radEnd = (end * Math.PI) / 180;
    const x1 = center + radius * Math.cos(radStart);
    const y1 = center + radius * Math.sin(radStart);
    const x2 = center + radius * Math.cos(radEnd);
    const y2 = center + radius * Math.sin(radEnd);
    const largeArc = end - start > 180 ? 1 : 0;
    return `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', gap: '8px', padding: '10px 0' }}>
      <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#888', letterSpacing: '0.5px' }}>{title}</div>
      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '20px', width: '100%', justifyContent: 'center' }}>
        <svg width={size} height={size}>
          {data.map((item, idx) => {
            const angle = (item.value / total) * 360;
            const startAngle = currentAngle;
            const endAngle = currentAngle + angle;
            currentAngle = endAngle;
            
            if (angle === 360) {
               return <circle key={idx} cx={center} cy={center} r={radius} fill="none" stroke={item.color} strokeWidth={strokeWidth} />;
            }
            if (angle === 0) return null;

            return (
              <path
                key={idx}
                d={calculateArcD(startAngle, endAngle)}
                fill="none"
                stroke={item.color}
                strokeWidth={strokeWidth}
              />
            );
          })}
          {/* Total Value text in center */}
          <text x={center} y={center + 4} textAnchor="middle" dominantBaseline="middle" fontSize={size*0.18} fontWeight="bold" fill="#333">
             {Math.round(total)} kW
          </text>
        </svg>
        
        {/* Legend */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '10px', color: '#666', minWidth: '100px' }}>
           {data.map((item, idx) => (
             <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '10px', height: '10px', backgroundColor: item.color, borderRadius: '2px' }}></span>
                <span>{item.label} ({Math.round(item.value / total * 100)}%)</span>
             </div>
           ))}
        </div>
      </div>
    </div>
  );
}

export default function EnergyDistributionChart() {
  const { engineKw, batteryKw, solarKw, propulsionKw, hotelKw } = useEnergyStore();

  const isCharging = batteryKw < 0;
  const isDischarging = batteryKw > 0;
  
  const totalEngine = engineKw || 0;
  const totalSolar = Math.max(0, solarKw || 0); // clamp positive
  const batteryProvided = isDischarging ? batteryKw : 0;
  
  const sources = [
    { label: 'Main Engines (PTO)', value: totalEngine, color: '#4CAF50' },
    { label: 'Renewable (Solar)', value: totalSolar, color: '#FF9800' },
    { label: 'Battery Discharge', value: batteryProvided, color: '#2196F3' }
  ].filter(d => d.value > 0);

  if (sources.length === 0) sources.push({ label: 'Idling', value: 1, color: '#DDDDDD' });
  
  const totalPropulsion = propulsionKw || 0;
  const totalHotel = hotelKw || 0;
  const batteryCharging = isCharging ? Math.abs(batteryKw) : 0;
  
  const consumers = [
    { label: 'Propulsion', value: totalPropulsion, color: '#F44336' },
    { label: 'Hotel Load', value: totalHotel, color: '#9C27B0' },
    { label: 'Battery Charging', value: batteryCharging, color: '#FFC107' }
  ].filter(d => d.value > 0);

  if (consumers.length === 0) consumers.push({ label: 'Idling', value: 1, color: '#DDDDDD' });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%' }}>
      <DonutChart title="ENERGY SOURCES (kW)" data={sources} size={110} />
      <div style={{ height: '1px', backgroundColor: '#EEEEEE', width: '90%', margin: '0 auto' }}></div>
      <DonutChart title="ENERGY CONSUMERS (kW)" data={consumers} size={110} />
    </div>
  );
}
