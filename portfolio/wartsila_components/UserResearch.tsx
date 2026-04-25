import React, { useState } from 'react';
import alarmLogo from '../wartsila_images/user_research/alarm_logo.svg';
import research1 from '../wartsila_images/user_research/research_1.svg';
import research2 from '../wartsila_images/user_research/research_2.png';
import research3 from '../wartsila_images/user_research/research_3.png';

export default function UserResearch() {
  const images = [research1, research2, research3];
  const [currentIndex, setCurrentIndex] = useState(0);

  const handlePrev = () => {
    if (currentIndex > 0) setCurrentIndex(currentIndex - 1);
  };

  const handleNext = () => {
    if (currentIndex < images.length - 1) setCurrentIndex(currentIndex + 1);
  };

  return (
    <div className="pt-12 pb-6">
      {/* Title */}
      <h3 className="text-[#1561AB] text-sm sm:text-md font-light mb-2 tracking-wide uppercase">
        User Research
      </h3>
      
      {/* Subtitle */}
      <h2 className="text-xl sm:text-2xl font-bold text-[#1561AB] mb-2">
        Simulator Visit
      </h2>

      {/* Paragraph */}
      <p className="text-gray-500 text-[13px] sm:text-sm leading-relaxed mb-6">
        We participated in a simulator day on Oct 27, 2025 at a maritime training institute (XAMK/Ekami), where we explored ship bridge and engine room simulators to understand real-world vessel operations. We also conducted interviews with students and teachers from the institute, Wärtsilä experts, and ship professionals from Finnlines.
      </p>

      {/* Content Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-6 lg:gap-10 items-stretch">
        
        {/* Left Side: Summary + Cards */}
        <div className="flex flex-col justify-center gap-6">
          
          {/* Card 1 */}
          <div className="bg-[#F3F7FB] rounded-lg p-4">
            <h4 className="text-[#1561AB] font-bold text-md mb-1.5">Excessive Alarm Frequency</h4>
            <p className="text-[#1f1f1f] text-xs  leading-snug">
              Despite regulatory standards, operators reported too many alarms triggered by non-critical events, causing alarm fatigue and reduced attention to important signals.
            </p>
          </div>

          {/* Card 2 */}
          <div className="bg-[#F3F7FB] rounded-lg p-4">
            <h4 className="text-[#1561AB] font-bold text-md mb-1.5">Communication Friction</h4>
            <p className="text-[#1f1f1f] text-xs  leading-snug">
              Alarm response often requires coordination between bridge and ECR via VHF, but unclear audio and language barriers can slow down communication.
            </p>
          </div>

        </div>

        {/* Right Side: Text & Image carousel */}
        <div className="flex flex-col gap-6 justify-center mt-0 min-w-0">
          
          {/* Header row with icon */}
          <div className="flex items-center gap-3">
            <div className="shrink-0 flex items-center justify-center">
              <img src={alarmLogo} alt="Alarm Icon" className="h-8 w-8" />
            </div>
            <p className="text-[#1f1f1f] text-sm font-semibold leading-tight">
              Alarm Management is a critical pain point affecting both safety and efficiency.
            </p>
          </div>

          {/* Carousel */}
          <div className="flex flex-row items-center gap-4">
            
            {/* Left Arrow */}
          <button 
            onClick={handlePrev}
            disabled={currentIndex === 0}
            className={`shrink-0 p-2.5 rounded-full transition-colors flex items-center justify-center ${
              currentIndex === 0 
                ? 'bg-gray-100 text-gray-300 cursor-not-allowed' 
                : 'bg-[#F3F7FB] text-[#1561AB] hover:bg-[#e4ebf5] shadow-sm'
            }`}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6"/>
            </svg>
          </button>

          {/* Images Wrapper */}
          <div className="flex-1 w-full bg-white rounded-xl overflow-hidden flex items-center justify-center border border-gray-100 shadow-sm">
            <img 
              src={images[currentIndex]} 
              alt={`Simulator Visit ${currentIndex + 1}`} 
              className="w-full h-auto object-cover"
            />
          </div>

          {/* Right Arrow */}
          <button 
            onClick={handleNext}
            disabled={currentIndex === images.length - 1}
            className={`shrink-0 p-2.5 rounded-full transition-colors flex items-center justify-center ${
              currentIndex === images.length - 1 
                ? 'bg-gray-100 text-gray-300 cursor-not-allowed' 
                : 'bg-[#F3F7FB] text-[#1561AB] hover:bg-[#e4ebf5] shadow-sm'
            }`}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 18l6-6-6-6"/>
            </svg>
          </button>
        </div>

        </div>

      </div>
    </div>
  );
}