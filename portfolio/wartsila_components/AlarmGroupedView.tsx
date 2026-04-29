import React from 'react';
import groupedImgDesktop from '../wartsila_images/grouped/grouped_example.svg';
import groupedImgMobile from '../wartsila_images/grouped/grouped_example_phone.png';
import groupedDemoGif from '../wartsila_images/grouped/Grouped View - Alarm.gif';
import prototypeImg from '../wartsila_images/grouped/grouped_prototype.png';

export default function AlarmGroupedView() {
  return (
    <div className="pt-8 pb-12">
      {/* Title */}
      <h3 className="text-[#1561AB] text-sm sm:text-md font-light mb-2 tracking-wide uppercase">
        Solution Part 1: Grouped View
      </h3>
      
      {/* Subtitle */}
      <h2 className="text-xl sm:text-2xl font-bold text-[#1561AB] mb-4">
        Show Only the Root Cause That Matters
      </h2>

      {/* Paragraph */}
      <p className="text-gray-500 text-[13px] sm:text-sm leading-relaxed mb-10 w-full">
        Alarms are often interconnected—one root cause can trigger multiple downstream effects. This feature groups related alarms, highlights the root cause, and collapses secondary alerts, helping officers focus on what truly matters.
      </p>

      {/* Image */}
      <div className="mb-14">
        {/*  Mobile image */}
        <img 
          src={groupedImgMobile}
          alt="Grouped View Diagram Mobile"
          className="block sm:hidden w-full rounded-md object-contain"
        />

        {/*  Desktop image */}
        <img 
          src={groupedImgDesktop}
          alt="Grouped View Diagram Desktop"
          className="hidden sm:block w-full rounded-md object-contain"
        />
      </div>

      {/* Demo Section */}
      <div>
        <h2 className="text-xl font-bold text-[#1561AB] mb-6">
          Demo
        </h2>
        
        <div className="flex flex-col items-center">
          <img 
            src={groupedDemoGif} 
            alt="Grouped View Demo" 
            className="w-[90%] rounded-md object-contain shadow-sm border border-gray-100" 
          />
          <p className="text-gray-400 italic text-[13px] text-center mt-5 max-w-xl leading-snug">
            One failure triggers four subsequent alarms. AI analyzes them, highlighting the root cause with a darker background while grouping the rest.
          </p>
        </div>
      </div>

      {/* Prototype Section */}
      <div className="mt-14">
        <h2 className="text-xl font-bold text-[#1561AB] mb-6">
          Prototype
        </h2>
        <div className="flex flex-col items-center">
          <img 
            src={prototypeImg} 
            alt="Prototype Architecture Flow" 
            className="w-full rounded-md object-contain" 
          />
        </div>
      </div>
    </div>
  );
}