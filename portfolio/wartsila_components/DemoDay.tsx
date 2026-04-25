import React from 'react';
import demoDayImg from '../wartsila_images/visitor/demo_day.svg';

export default function DemoDay() {
  return (
    <div className="pt-8 pb-12">
      {/* Title / Subtitle tag */}
      <h3 className="text-[#1561AB] text-sm sm:text-md font-light mb-2 tracking-wide uppercase">
        VISITOR FEEDBACK
      </h3>
      
      {/* Heading */}
      <h2 className="text-xl sm:text-2xl font-bold text-[#1561AB] mb-4">
        Demo Day
      </h2>

      {/* Paragraph */}
      <p className="text-gray-500 text-[13px] sm:text-sm leading-relaxed mb-10 w-full">
        We set up a booth during the demo day on April 1, 2026, to collect visitors' impressions on usability and AI trustworthiness. We gathered 12 responses for the Alarm feature and 19 for the Energy feature. Overall, the system was perceived as intuitive even by visitors without domain knowledge, and most participants, primarily young adults, showed an optimistic attitude toward AI and its future applications in the maritime domain.
      </p>

      {/* Image Sections */}
      <div className="flex flex-col items-center w-full">
        <img 
          src={demoDayImg} 
          alt="Demo Day Feedback" 
          className="w-full object-contain" 
        />
      </div>
    </div>
  );
}