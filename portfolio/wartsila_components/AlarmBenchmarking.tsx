import React from 'react';
import funuroImg from '../wartsila_images/benchmarking/Funuro.svg';
import blueCtrlImg from '../wartsila_images/benchmarking/BlueCtrl.svg';
import treeImg from '../wartsila_images/benchmarking/Tree.svg';
import openIcon from '../wartsila_images/benchmarking/open.svg';
import starIcon from '../wartsila_images/benchmarking/star.svg';

export default function AlarmBenchmarking() {
  return (
    <div className="hidden sm:block pt-8 pb-12">
      {/* Competitor Analysis Section */}
      <div className="mb-16">
        <h3 className="text-[#1561AB] text-sm sm:text-md font-light mb-2 tracking-wide uppercase">
          Benchmarking
        </h3>
        
        <h2 className="text-xl sm:text-2xl font-bold text-[#1561AB] mb-4">
          Competitor Analysis
        </h2>

        <p className="text-gray-500 text-[13px] sm:text-sm leading-relaxed mb-10">
          We studied alarm systems in the industry, including both large maritime technology companies and startups. Some existing systems already provide preliminary decision support and display alarms along their lifecycle, from trigger to resolution. We drew inspiration from these approaches to inform the next direction of our design.
        </p>

        <div className="flex flex-col gap-12">
          {/* Card 1: Funuro */}
          <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-6 lg:gap-10 items-start">
            <div className="flex flex-col gap-3">
              <img src={funuroImg} alt="Funuro Alarm System" className="w-full rounded-md object-contain border border-gray-100 shadow-sm" />
              <a href="https://www.furuno.com/en/merchant/voyager/?utm_source=chatgpt.com" target="_blank" rel="noopener noreferrer" className="inline-flex items-start gap-1.5 self-center mt-1 hover:opacity-[0.85] transition-opacity group">
                <img src={openIcon} alt="Open link" className="w-[18px] h-[18px] shrink-0 mt-0.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                <span className="text-[#1561AB] text-[13px] font-medium underline underline-offset-[3px] decoration-[#1561AB]/40 hover:decoration-[#1561AB]">Furuno Voyager (Japan)</span>
              </a>
            </div>
            
            <div className="flex flex-col gap-4 mt-2">
              <div className="inline-flex items-center gap-1 bg-[#F3F7FB] pl-2 px-3 py-1.5 rounded-md self-start">
                <img src={starIcon} alt="Star" className="w-6 h-6" />
                <span className="text-[#1f1f1f] text-sm font-bold">Inspiration - AI Suggestion</span>
              </div>

               <div className="mt-2">
                <h4 className="text-[#1561AB] font-bold text-sm mb-1.5">What Works Well</h4>
                <p className="text-[#333333] text-[13px] leading-snug">
                   The Decision Support area not only explains the nature of the selected alert in more detail, but also provides recommended actions to resolve it.
                </p>
              </div>
              
              <div className="mt-2">
                <h4 className="text-[#FF7B27] font-bold text-sm mb-1.5">What Needs Improvement</h4>
                <p className="text-[#333333] text-[13px] leading-snug">
                  Increase AI trust and decision accuracy by providing more evidence and transparency.
                </p>
              </div>
            </div>
          </div>

          {/* Card 2: BlueCtrl */}
          <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-6 lg:gap-10 items-start">
            <div className="flex flex-col gap-3">
              <img src={blueCtrlImg} alt="BlueCtrl Alarm System" className="w-full rounded-md object-contain border border-gray-100 shadow-sm" />
              <a href="https://bluectrl.io/blue-alarm-monitoring-system#:~:text=INTEGRATED%20INFORMATION,with%20additional%20rules%20and%20regulations" target="_blank" rel="noopener noreferrer" className="inline-flex items-start gap-1.5 self-center mt-1 hover:opacity-[0.85] transition-opacity group">
                <img src={openIcon} alt="Open link" className="w-[18px] h-[18px] shrink-0 mt-0.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                <span className="text-[#1561AB] text-[13px] font-medium underline underline-offset-[3px] decoration-[#1561AB]/40 hover:decoration-[#1561AB]">BlueCtrl (Norway)</span>
              </a>
            </div>
            
            <div className="flex flex-col gap-4 mt-2">
              <div className="inline-flex items-center gap-1 bg-[#F3F7FB] pl-2 px-3 py-1.5 rounded-md self-start">
                <img src={starIcon} alt="Star" className="w-6 h-6" />
                <span className="text-[#1f1f1f] text-sm font-bold">Inspiration - Real-time Log</span>
              </div>
              
              <div className="mt-2">
                <h4 className="text-[#1561AB] font-bold text-sm mb-1.5">What Works Well</h4>
                <p className="text-[#333333] text-[13px] leading-snug">
                  The logs are currently divided into multiple sections, making it difficult for the captain to get a clear timeline-based overview of the vessel's status.
                </p>
              </div>
              
              <div className="mt-2">
                <h4 className="text-[#FF7B27] font-bold text-sm mb-1.5">What Needs Improvement</h4>
                <p className="text-[#333333] text-[13px] leading-snug">
                  The current approach requires a high level of understanding. A more intuitive design divides alarms into a detailed timeline, allowing the captain to track each alarm from trigger to resolution with greater clarity and control.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Academic Research Section */}
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-[#1561AB] mb-4">
          Academic Research
        </h2>

        <p className="text-gray-500 text-[13px] sm:text-sm leading-relaxed mb-5">
          While reviewing literature, we identified professional methods for analyzing alarms, which provided inspiration for our design.
        </p>

        {/* Card 3: Tree */}
        <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-6 lg:gap-10 items-start">
          <div className="flex flex-col gap-3">
            <img src={treeImg} alt="Fault Tree Analysis" className="w-full rounded-md object-contain border border-gray-100 shadow-sm" />
            <a href="https://www.mdpi.com/2077-1312/8/12/1004" target="_blank" rel="noopener noreferrer" className="inline-flex items-start gap-2 self-center mt-1 hover:opacity-[0.85] transition-opacity group px-2">
              <img src={openIcon} alt="Open link" className="w-[18px] h-[18px] shrink-0 mt-[2px] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              <span className="text-[#1561AB] text-[12px] sm:text-[13px] leading-relaxed font-medium underline underline-offset-[3px] decoration-[#1561AB]/40 hover:decoration-[#1561AB] text-center">
                Fault tree analysis and failure diagnosis of marine diesel engine turbocharger system.
              </span>
            </a>
          </div>
          
          <div className="flex flex-col gap-4 ">
            <div className="inline-flex items-center gap-1 bg-[#F3F7FB] pl-2 pr-3 py-1.5 rounded-md self-start ">
              <img src={starIcon} alt="Star" className="w-6 h-6" />
              <span className="text-[#1f1f1f] text-sm font-bold">Inspiration - Find Root Cause</span>
            </div>
            
            <div className="mt-2">
              <h4 className="text-[#1561AB] font-bold text-sm mb-1.5">What we can Learn From</h4>
              <p className="text-[#333333] text-[13px] leading-snug">
                Many maritime system failures follow a hierarchical tree structure. By applying Fault Tree Analysis (FTA) to pinpoint the root cause, operators can transition from trial-and-error troubleshooting to targeted diagnostic-led maintenance.
              </p>
            </div>
            
            <div className="mt-2">
              <h4 className="text-[#FF7B27] font-bold text-sm mb-1.5">What we can Apply</h4>
              <p className="text-[#333333] text-[13px] leading-snug">
                We can group related alarms and suppress secondary alarms to highlight only the root cause. This reduces "alarm fatigue" and enables precision diagnostics.
              </p>
            </div>
          </div>
        </div>
      </div>
      
    </div>
  );
}