import React from 'react';
import aiOverviewImg from '../wartsila_images/ai/ai_overview.svg';
import aiGroupedImg from '../wartsila_images/ai/ai_grouped.svg';
import aiActionImg from '../wartsila_images/ai/ai_action.svg';

export default function Ai() {
  return (
    <div className="pt-8 pb-12">
      {/* Title / Subtitle tag */}
      <h3 className="text-[#1561AB] text-sm sm:text-md font-light mb-2 tracking-wide uppercase">
        AI OVERVIEW
      </h3>
      
      {/* Heading */}
      <h2 className="text-xl sm:text-2xl font-bold text-[#1561AB] mb-4">
        Edge AI, Running Locally on the Vessel
      </h2>

      {/* Paragraph */}
      <p className="text-gray-500 text-[13px] sm:text-sm leading-relaxed mb-10 w-full">
        To ensure data security, our AI model is primarily deployed and runs locally on the vessel. The overall implementation and update loop is illustrated in the diagram below.
      </p>

      {/* Image Sections */}
      <div className="flex flex-col gap-16 mt-12 w-full">
        <div className="flex flex-col items-center w-full">
          <img 
            src={aiOverviewImg} 
            alt="AI Overview Flowchart" 
            className="w-full object-contain" 
          />
        </div>
        
        <div className="w-full">
          <h2 className="text-xl font-bold text-[#1561AB] mb-6">
            AI Structure - Grouped View
          </h2>
          <img 
            src={aiGroupedImg} 
            alt="AI Structure - Grouped View Flowchart" 
            className="w-full object-contain" 
          />
        </div>

        <div className="w-full">
          <h2 className="text-xl font-bold text-[#1561AB] mb-6">
            AI Structure - AI Suggested Action
          </h2>
          <img 
            src={aiActionImg} 
            alt="AI Structure - AI Suggested Action Flowchart" 
            className="w-full object-contain" 
          />
        </div>
      </div>
    </div>
  );
}
