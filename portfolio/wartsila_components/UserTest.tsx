import React, { useState } from 'react';
import bridgeImg from '../wartsila_images/test/bridge.png';
import ecrImg from '../wartsila_images/test/ecr.png';
import locationLogo from '../wartsila_images/test/location_logo.svg';
import alarmDemoImg from '../wartsila_images/test/alarm_demo.svg';
import energyDemoImg from '../wartsila_images/test/energy_demo.svg';
import goodLogo from '../wartsila_images/test/good_logo.svg';
import starLogo from '../wartsila_images/test/star.svg';
import logo1 from '../wartsila_images/test/1_logo.svg';
import logo2 from '../wartsila_images/test/2_logo.svg';
import current1Img from '../wartsila_images/test/current_1.svg';
import current2Img from '../wartsila_images/test/current_2.svg';
import current3Img from '../wartsila_images/test/current_3.svg';
import touchpadImg from '../wartsila_images/test/touchpad.svg';
import focusImg from '../wartsila_images/test/focus.svg';

interface UserTestProps {
  activeScope: 'alarm' | 'energy';
  setActiveScope: (scope: 'alarm' | 'energy') => void;
}

export default function UserTest({ activeScope, setActiveScope }: UserTestProps) {
  const [currentImgIndex, setCurrentImgIndex] = useState(1);
  const currentImages = [current1Img, current2Img, current3Img];
  
  const handlePrev = () => {
    setCurrentImgIndex((prev) => (prev > 0 ? prev - 1 : prev));
  };

  const handleNext = () => {
    setCurrentImgIndex((prev) => (prev < 2 ? prev + 1 : prev));
  };

  return (
    <div className="pt-8 pb-12">
      <style>
        {`
          @keyframes border-glow-pulse {
            0%, 100% {
              box-shadow: 0 0 8px rgba(21, 97, 171, 0.4);
            }
            50% {
              box-shadow: 0 0 20px rgba(21, 97, 171, 0.8);
            }
          }
          .animate-border-glow {
            animation: border-glow-pulse 2.5s cubic-bezier(0.4, 0, 0.6, 1) infinite;
          }
        `}
      </style>
      {/* Common Part: Shows for both Alarm and Energy */}
      
      {/* Title / Subtitle tag */}
      <h3 className="text-[#1561AB] text-sm sm:text-md font-light mb-2 tracking-wide uppercase">
        USER TEST
      </h3>
      
      {/* Heading */}
      <h2 className="text-xl sm:text-2xl font-bold text-[#1561AB] mb-4">
        Ferry Visit
      </h2>

      {/* Paragraph */}
      <p className="text-gray-500 text-[13px] sm:text-sm leading-relaxed mb-6 w-full">
        The team conducted a ferry visit on a Finnlines vessel with the support of sponsor on Apr 10, 2026. We visited both the bridge and the engine room, presented our demo, and collected feedback directly from end users.
      </p>

      {/* Images Section */}
      <div className="bg-[#F8FAFC] rounded-2xl p-8 flex flex-col md:flex-row items-center justify-center gap-12 md:gap-16 w-full">
        
        {/* Left Column (Bridge - Text at bottom) */}
        <div className="flex flex-col items-center gap-3 w-full ">
          <img 
            src={bridgeImg} 
            alt="Bridge Visit" 
            className="w-full max-w-[360px] rounded-lg shadow-sm object-cover" 
          />
          <div className="flex flex-row items-center gap-3">
            <span className="flex items-center text-[#1f1f1f] text-[13px] sm:text-[14px] font-bold gap-1 mt-1">
              <img src={locationLogo} className="w-3.5 h-3.5" alt="Location" /> 
              Bridge
            </span>
            <span className="text-[#1f1f1f] text-[13px] sm:text-[14px] font-medium mt-1">
              Captain & Navigation Officer
            </span>
          </div>
        </div>

        {/* Right Column (Engine Room - Text at top) */}
        <div className="flex flex-col-reverse sm:flex-col items-center gap-3 w-full ">
          <div className="flex flex-row items-center justify-center gap-3 w-full">
            <span className="flex items-center text-[#1f1f1f] text-[13px] sm:text-[14px] font-bold gap-1 mb-1">
              <img src={locationLogo} className="w-3.5 h-3.5" alt="Location" /> 
              Engine Room
            </span>
            <span className="text-[#1f1f1f] text-[13px] sm:text-[14px] font-medium mb-1">
              Engineer
            </span>
          </div>
          <img 
            src={ecrImg} 
            alt="Engine Room Visit" 
            className="w-full max-w-[360px] rounded-lg shadow-sm object-cover" 
          />
        </div>
        
      </div>

      {/* Presentation & User Interview */}
      <div className="mt-14">
        <h2 className="text-xl sm:text-2xl font-bold text-[#1561AB] mb-3">
          Presentation & User Interview
        </h2>
        <p className="text-gray-500 text-[13px] sm:text-sm leading-relaxed mb-8 w-full">
          We presented our demos to 2 captains, 1 navigation officer and 1 chief engineer.
        </p>

        {/* Demo Toggles */}
        <div className="flex flex-col md:flex-row items-center justify-center gap-10 md:gap-12 w-full">
          
          {/* Alarm Demo Option */}
          <div className="flex flex-col items-center gap-3">
            <div 
              onClick={() => setActiveScope('alarm')}
              className={`cursor-pointer transition-all duration-300 rounded-2xl 
              ${activeScope === 'alarm' ? 'animate-border-glow scale-[1.02]' : 'hover:scale-[1.01] hover:shadow-md opacity-80 hover:opacity-100'} 
              `}
            >
              <img 
                src={alarmDemoImg} 
                alt="Alarm Demo" 
                className="w-full max-w-[400px] h-auto rounded-2xl object-cover" 
              />
            </div>
            <span className="text-[#1f1f1f] text-[13px] sm:text-[14px]">Alarm Demo</span>
          </div>

          {/* Energy Demo Option */}
          <div className="flex flex-col items-center gap-3">
            <div 
              onClick={() => setActiveScope('energy')}
              className={`cursor-pointer transition-all duration-300 rounded-2xl 
              ${activeScope === 'energy' ? 'animate-border-glow scale-[1.02]' : 'hover:scale-[1.01] hover:shadow-md opacity-80 hover:opacity-100'} 
              `}
            >
              <img 
                src={energyDemoImg} 
                alt="Energy Demo" 
                className="w-full max-w-[400px] h-auto rounded-2xl object-cover" 
              />
            </div>
            <span className="text-[#1f1f1f] text-[13px] sm:text-[14px]">Energy Demo</span>
          </div>

        </div>

        {/* Scope-specific Feedback Section */}
        {activeScope === 'alarm' && (
          <div className="mt-14 w-full">
            {/* General Positive Feedback */}
            <div className="mb-10">
              <h3 className="flex items-center gap-3 text-lg sm:text-xl font-bold text-[#1561AB] mb-4">
                <img src={goodLogo} className="w-6 h-6 object-contain" alt="Thumbs Up" /> 
                General Positive Feedback
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
                <div className="flex flex-col gap-2">
                  <h4 className="text-[#1f1f1f] font-bold text-[14px] sm:text-[15px]">Good Function</h4>
                  <p className="text-gray-500 italic text-[13px] text-justify leading-tight">
                    "I would call this a great engine diagnostics tool, like a car diagnostic tool, but very intelligent. With this, we could save a lot of working hours, overtime, and even unnecessary spare parts."
                  </p>
                </div>
                <div className="flex flex-col gap-2">
                  <h4 className="text-[#1f1f1f] font-bold text-[14px] sm:text-[15px]">AI Trust & Potential</h4>
                  <p className="text-gray-500 italic text-[13px] text-justify leading-tight">
                    "Over time, AI will become smarter, that's very good for decisions. Generally, I think AI is good and helpful. If it's connected to the internet — no, so it's better to keep it local."
                  </p>
                </div>
              </div>
            </div>

            {/* Confirmed by Users */}
            <div className="mb-10">
              <h3 className="flex items-center gap-2 text-lg sm:text-xl font-bold text-[#1561AB] mb-4">
                <img src={starLogo} className="w-8 h-8 object-contain" alt="Star" /> 
                Confirmed by Users
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
                <div className="flex flex-col gap-3">
                  <h4 className="text-[#1f1f1f] font-bold text-[14px] sm:text-[15px]">Root Cause Identification</h4>
                  <p className="text-gray-500 italic text-[13px] text-justify leading-tight">
                    "If a pump fails, that failure shows first, but within seconds, many secondary alarms appear concurrently, and you don't know which one is the root cause."
                  </p>
                  <div className="bg-[#F3F7FB] p-4 rounded-xl mt-1">
                    <p className="text-[#1561AB] text-[12.5px] leading-tight">
                      Users confirmed that alarms often cascade, making it difficult to identify the true root cause, validating the need for root-cause-based grouping.
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <h4 className="text-[#1f1f1f] font-bold text-[14px] sm:text-[15px]">Real-time Sync</h4>
                  <p className="text-gray-500 italic text-[13px] text-justify leading-tight">
                    "Now we usually have to call the engineer when we see an alarm... but it can be disturbing — sometimes engineers get annoyed, and honestly, we don't want to call."
                  </p>
                  <div className="bg-[#F3F7FB] p-4 rounded-xl mt-1">
                    <p className="text-[#1561AB] text-[12.5px] leading-tight">
                      Users confirmed the need for a shared, real-time log, allowing bridge and engine room to stay aligned, reducing unnecessary calls and interruptions.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Needs to improve */}
            <div className="mb-10">
              <h3 className="flex items-center gap-2 text-lg sm:text-xl font-bold text-[#1561AB] mb-4">
                <img src={starLogo} className="w-8 h-8 object-contain" alt="Star" /> 
                Needs to improve
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
                <div className="flex flex-col gap-2">
                  <h4 className="text-[#1f1f1f] font-bold text-[14px] sm:text-[15px] flex items-center gap-2">
                    <span className="flex items-center justify-center bg-[#E5F0FA] text-[#1561AB] text-[11px] font-bold w-[18px] h-[18px] rounded-sm">1</span>
                    Text-heavy
                  </h4>
                  <p className="text-gray-500 italic text-[13px] text-justify leading-tight">
                    "We don't have time to read — it should be something visual rather than text. When we forget something, we refer to drawings."
                  </p>
                </div>
                <div className="flex flex-col gap-2">
                  <h4 className="text-[#1f1f1f] font-bold text-[14px] sm:text-[15px] flex items-center gap-2">
                    <span className="flex items-center justify-center bg-[#E5F0FA] text-[#1561AB] text-[11px] font-bold w-[18px] h-[18px] rounded-sm">2</span>
                    Information Overload
                  </h4>
                  <p className="text-gray-500 italic text-[13px] text-justify leading-tight">
                    "There's too much, we cannot take any more alarms. Our main focus is navigation. In critical situations, there is no time."
                  </p>
                </div>
              </div>
            </div>

            {/* Areas for Future Improvement */}
            <div className="mt-16 mb-10 pt-2">
              <h2 className="text-xl sm:text-2xl font-bold text-[#1561AB] mb-12">
                Areas for Future Improvement
              </h2>

              {/* 1 Touchpad Extension */}
              <div className="mb-20">
                <h3 className="flex items-center text-[15px] sm:text-[16px] font-bold text-[#1f1f1f] mb-6 gap-3">
                  <img src={logo1} className="w-[22px] h-[22px] object-contain" alt="1" />
                  Touchpad Extension for Engineer
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 mb-10 w-full items-start">
                  <div className="flex flex-col gap-4 text-gray-500 text-[13px] leading-snug text-justify">
                    <p>Engineers are already familiar with using a touch pad as part of their daily workflow, and this interaction model works well for them, especially for navigating complex systems.</p>
                    <p>They also naturally rely on P&ID (Piping & Instrumentation Diagrams) when dealing with alarms and troubleshooting. These diagrams serve as their primary reference point for understanding system structure and locating issues quickly, rather than relying on text-based information.</p>
                  </div>

                  <div className="flex flex-col items-center gap-3 w-full mt-2 lg:-mt-6">
                    <div className="flex items-center gap-3 md:gap-4 w-full justify-center">
                      <button 
                        onClick={handlePrev} 
                        disabled={currentImgIndex === 0}
                        className={`shrink-0 p-2.5 rounded-full transition-colors flex items-center justify-center ${
                            currentImgIndex === 0 
                            ? 'bg-gray-100 text-gray-300 cursor-not-allowed' 
                            : 'bg-[#F3F7FB] text-[#1561AB] hover:bg-[#e4ebf5] shadow-sm'
                        }`}
                        >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M15 18l-6-6 6-6"/>
                        </svg>
                        </button>
                      <img src={currentImages[currentImgIndex]} alt="Current System" className="w-[70%] sm:w-[80%] rounded-xl object-contain drop-shadow" />
                        <button 
                        onClick={handleNext} 
                        disabled={currentImgIndex === 2}
                        className={`shrink-0 p-2.5 rounded-full transition-colors flex items-center justify-center ${
                            currentImgIndex === 2 
                            ? 'bg-gray-100 text-gray-300 cursor-not-allowed' 
                            : 'bg-[#F3F7FB] text-[#1561AB] hover:bg-[#e4ebf5] shadow-sm'
                        }`}
                        >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M9 18l6-6-6-6"/>
                        </svg>
                        </button>
                    </div>
                    <span className="text-[#1f1f1f] font-medium text-[13px]">Current System</span>
                  </div>
                </div>

                <div className="flex flex-col items-center gap-4 mt-8 w-full">
                  <div className="w-full flex items-center justify-center">
                    <img src={touchpadImg} alt="Possible Future Solution" className="w-[85%] md:w-[70%] object-contain" />
                  </div>
                  <span className="text-gray-400 font-medium text-[13px]">Possible Future Solution</span>
                </div>
              </div>

              {/* 2 Role-based Alarm Prioritization */}
              <div className="mb-10 mt-8">
                <h3 className="flex items-center text-[15px] sm:text-[16px] font-bold text-[#1f1f1f] mb-4 gap-3">
                  <img src={logo2} className="w-[22px] h-[22px] object-contain" alt="2" />
                  Role-based Alarm Prioritization
                </h3>

                <div className="flex flex-col gap-8 pb-4">
                    {/* 上方两列：文字说明 + Possible Future Direction */}
                    <div className="flex flex-col md:flex-row gap-10 md:gap-14 items-start">
                        <p className="text-gray-500 text-[13px] leading-snug text-justify w-full md:w-1/2">
                        Navigation officers can access all alarms and real-time logs, which they find useful, but their primary focus is safe navigation rather than system monitoring; however, current severity-based alarm categorization does not always reflect what is most relevant in their context, as urgency differs by role.
                        </p>

                        <div className="flex flex-col gap-2 text-[13px] w-full md:w-1/2">
                        <span className="font-bold text-[#1f1f1f]">Possible Future Direction</span>
                        <ul className="text-[#1f1f1f] space-y-1.5 pl-[14px] list-disc marker:text-gray-800 marker:text-[10px] leading-snug">
                            <li>AI highlights "focus now" actions instead of full alarm lists</li>
                            <li>Re-rank alarms based on different contexts (e.g. harbour vs. open sea)</li>
                        </ul>
                        </div>
                    </div>

                    {/* 下方单独一行：图片 */}
                    <div className="flex flex-col items-center gap-4 w-full">
                        <img src={focusImg} alt="Role-based Prioritization" className="w-full md:w-[60%] object-contain" />
                        <span className="text-gray-400 font-medium text-[13px]">Possible Future Solution</span>
                    </div>
                    </div>
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
