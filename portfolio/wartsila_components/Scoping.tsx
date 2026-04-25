import React from 'react';
import alarmActive from '../wartsila_images/scoping/alarm_active.svg';
import alarmInactive from '../wartsila_images/scoping/alarm_inactive.svg';
import energyActive from '../wartsila_images/scoping/energy_active.svg';
import energyInactive from '../wartsila_images/scoping/energy_inactve.svg';

type ScopingProps = {
  activeScope: 'alarm' | 'energy';
  setActiveScope: (scope: 'alarm' | 'energy') => void;
};

export default function Scoping({ activeScope, setActiveScope }: ScopingProps) {
  return (
    <div className="pt-8 pb-12">
      <style>
        {`
          @keyframes glow-pulse {
            0%, 100% {
              filter: drop-shadow(0 0 15px rgba(21, 97, 171, 0.3));
            }
            50% {
              filter: drop-shadow(0 0 35px rgba(21, 97, 171, 0.7));
            }
          }
          .animate-glow {
            animation: glow-pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite;
          }
        `}
      </style>

      {/* Title */}
      <h3 className="text-[#1561AB] text-sm sm:text-md font-light mb-2 tracking-wide uppercase">
        Scoping
      </h3>
      
      {/* Subtitle */}
      <h2 className="text-xl sm:text-2xl font-bold text-[#1561AB] mb-10">
        We narrowed our focus to the alarm and energy systems.
      </h2>

      {/* Selection Cards */}
      <div className="flex flex-row items-center justify-center gap-6 sm:gap-20 ">
        
        {/* Alarm Card */}
        <div 
          onClick={() => setActiveScope('alarm')}
          className={`cursor-pointer transition-all duration-500 rounded-2xl ${
            activeScope === 'alarm' ? 'animate-glow scale-[1.02]' : 'hover:scale-[1.01] opacity-70 hover:opacity-90'
          }`}
        >
          <img 
            src={activeScope === 'alarm' ? alarmActive : alarmInactive} 
            alt="Alarm System Scoping" 
            className="w-full max-w-[340px] sm:max-w-[400px] h-auto object-contain rounded-2xl"
          />
        </div>

        {/* Energy Card */}
        <div 
          onClick={() => setActiveScope('energy')}
          className={`cursor-pointer transition-all duration-500 rounded-2xl ${
            activeScope === 'energy' ? 'animate-glow scale-[1.02]' : 'hover:scale-[1.01] opacity-70 hover:opacity-90'
          }`}
        >
          <img 
            src={activeScope === 'energy' ? energyActive : energyInactive} 
            alt="Energy System Scoping" 
            className="w-full max-w-[340px] sm:max-w-[400px] h-auto object-contain rounded-2xl"
          />
        </div>

      </div>
    </div>
  );
}