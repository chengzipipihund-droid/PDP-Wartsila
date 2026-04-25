import React from 'react';
import scenarioImg from '../wartsila_images/action/user_scenario.svg';
import flowImg from '../wartsila_images/action/user_flow.svg';
import reduceLogo from '../wartsila_images/action/reduce_logo.svg';
import syncLogo from '../wartsila_images/action/two_logo.svg';
import demoGif from '../wartsila_images/action/Alarm - sync log.gif';
import phoneImg from '../wartsila_images/action/phone.png';
import databaseImg from '../wartsila_images/action/database.png';

export default function AlarmAiSuggestedAction() {
  return (
    <div className="pt-8 pb-12">
      {/* Title */}
      <h3 className="text-[#1561AB] text-sm sm:text-md font-light mb-2 tracking-wide uppercase">
        Solution Part 2: AI Suggested Action
      </h3>
      
      {/* Subtitle */}
      <h2 className="text-xl sm:text-2xl font-bold text-[#1561AB] mb-4">
        Unified Alarm Visibility and AI-Assisted Resolution
      </h2>

      {/* Paragraph */}
      <p className="text-gray-500 text-[13px] sm:text-sm leading-relaxed mb-10 w-full ">
        We focus on a common operational scenario where engineers work in the Engine Control Room (ECR) to resolve alarms, while captains or bridge operators still require a clear, real-time overview of vessel-wide alarm status. AI assists engineers by providing analysis and actionable recommendations to support efficient alarm resolution.
      </p>

      {/* Images & Flow */}
      <div className="flex flex-col items-center gap-10 mb-14">
        <img 
          src={scenarioImg} 
          alt="User Scenario Diagram" 
          className="w-full object-contain" 
        />
        
        <img 
          src={flowImg} 
          alt="User Flow Diagram" 
          className="w-full object-contain" 
        />
        
        {/* Two Benefits Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 w-full mt-2">
          {/* Card 1 */}
          <div className="bg-[#F3F7FB] rounded-xl p-5 sm:p-6 flex flex-row items-start gap-4">
            <img src={reduceLogo} alt="Reduce cognitive load" className="w-9 h-9 shrink-0 mt-0.5" />
            <div className="flex flex-col gap-1.5">
              <h4 className="text-[#1561AB] font-bold text-[14px] sm:text-[15px]">Reduces cognitive load</h4>
              <p className="text-[#1561AB] text-[12px] sm:text-[13px] leading-snug">
                Acts as an AI copilot that analyzes situations and provides context-aware suggested actions based on maintenance manuals, reducing memory load and cognitive pressure.
              </p>
            </div>
          </div>

          {/* Card 2 */}
          <div className="bg-[#F3F7FB] rounded-xl p-5 sm:p-6 flex flex-row items-start gap-4">
            <img src={syncLogo} alt="Improves information synchronization" className="w-11 h-11 shrink-0 mt-0.5" />
            <div className="flex flex-col gap-1.5">
              <h4 className="text-[#1561AB] font-bold text-[14px] sm:text-[15px]">Improves info synchronization</h4>
              <p className="text-[#1561AB] text-[12px] sm:text-[13px] leading-snug">
                Enables real-time visibility of engineers' actions through synchronized logs, allowing the captain on the bridge to maintain full situational awareness of vessel-wide alarms.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Demo Section */}
      <div>
        <h2 className="text-xl font-bold text-[#1561AB]">
          Demo
        </h2>
        
        <div className="flex flex-col items-center">
          <img 
            src={demoGif} 
            alt="AI Suggested Action Demo" 
            className="w-full rounded-md " 
          />
          <p className="text-gray-400 italic text-[13px] text-center max-w-xl leading-snug">
            When engineers follow the steps on their device, the bridge interface displays real-time actions and feedback in sync.
          </p>
        </div>
      </div>

      {/* Prototype Section */}
      <div className="mt-14">
        <h2 className="text-xl font-bold text-[#1561AB] mb-6">
          Prototype
        </h2>
        <div className="flex flex-col items-center gap-20">
          <img 
            src={phoneImg} 
            alt="Mobile UI Prototype" 
            className="w-[90%] rounded-md object-contain" 
          />
          <img 
            src={databaseImg} 
            alt="Database Prototype" 
            className="w-full rounded-md object-contain" 
          />
        </div>
      </div>
    </div>
  );
}