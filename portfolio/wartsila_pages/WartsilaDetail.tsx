import React, { useState } from 'react';
import WartsilaHeader from '../wartsila_components/WartsilaHeader';
import UserResearch from '../wartsila_components/UserResearch';
import Scoping from '../wartsila_components/Scoping';
import Benchmarking from '../wartsila_components/AlarmBenchmarking';
import AlarmGroupedView from '../wartsila_components/AlarmGroupedView';
import AlarmAiSuggestedAction from '../wartsila_components/AlarmAiSuggestedAction';
import Ai from '../wartsila_components/Ai';
import DemoDay from '../wartsila_components/DemoDay';
import UserTest from '../wartsila_components/UserTest';
const teaserVideo = 'https://res.cloudinary.com/dye5jmqez/video/upload/v1777468318/cover_fw6qbt.mov';
import teaserImage from '../wartsila_images/header/Video_Teaser 1.png';
import pdpLogo from '../wartsila_images/header/pdp_logo.svg';

export default function WartsilaDetail() {
  const [activeScope, setActiveScope] = useState<'alarm' | 'energy'>('alarm');

  return (
    <div className="min-h-screen w-full bg-white">
      <div className="relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen bg-black h-[300px] sm:h-[540px] overflow-hidden">
        
        <img
          src={teaserImage}
          alt="Wartsila teaser"
          className="absolute inset-0 w-full h-full object-cover"
        />

        <div className="absolute inset-0 flex items-center justify-center">
          <video
            src={teaserVideo}
            autoPlay
            loop
            muted
            playsInline
            className="h-[85%] w-auto rounded-md shadow-lg"
          />
        </div>

      </div>

      <div className="w-full bg-white">
        <div className="mx-auto max-w-4xl px-4 py-8 sm:px-8 md:px-16">
          <WartsilaHeader />

          <div className="mt-12 rounded-xl border border-gray-200 p-6 ">
            <div className="flex items-center gap-2">
              <img src={pdpLogo} alt="PDP Logo" className="h-10 w-auto" />
              <h2 className="text-2xl font-bold text-[#1f1f1f]">PDP Challenge</h2>
            </div>
            <p className="mt-2 text-[15px] leading-snug text-[#1f1f1f]">
              This project is based on PDP course in Aalto and sponsored by Wärtsilä from September 2025 to May 2026 , and the general scope is explore how to control the vessel in the future.
            </p>
          </div>

          <UserResearch />
          
          <Scoping activeScope={activeScope} setActiveScope={setActiveScope} />

          {activeScope === 'alarm' && (
            <>
              <Benchmarking />
              <AlarmGroupedView />
              <AlarmAiSuggestedAction />
              <Ai />
            </>
          )}

          {/* Shown for both alarm and energy activeScope */}
          <DemoDay />
          <UserTest activeScope={activeScope} setActiveScope={setActiveScope} />

          <div className="mt-12 border-t border-gray-300" />

          <footer className="mb-16 mt-6 text-xs text-gray-400">
            @Wartsila Demo. {new Date().getFullYear()}
          </footer>
        </div>
      </div>
    </div>
  );
}
