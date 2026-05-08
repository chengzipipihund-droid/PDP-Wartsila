import React from 'react';
import EnergyModeScenario from '../wartsila_images_Energy/UserScenario/EnergyModeScenario';
import energySystemSvg from '../wartsila_images_Energy/SystemDiagram/Energy System.svg';
import leverImg1 from '../wartsila_images_Energy/LeverGuidance/Mockup2-1.png';
import leverImg2 from '../wartsila_images_Energy/LeverGuidance/Mockup2-3.png';

export default function EnergyContent() {
  return (
    <div>
      {/* Section 1: System Design */}
      <div className="pt-8 pb-12">
        <h3 className="text-[#1561AB] text-sm sm:text-md font-light mb-2 tracking-wide uppercase">
          Systematic Analysis and Intervention Defining
        </h3>
        <h2 className="text-xl sm:text-2xl font-bold text-[#1561AB] mb-4">
          System Design
        </h2>
        {/* Sub-card: Topology Skeleton */}
        <div className="bg-[#F3F3F3] rounded-xl p-6 mt-6">
          <h4 className="text-[#1561AB] font-bold text-md mb-3">Topology Skeleton</h4>
          <p className="text-[#1f1f1f] text-xs leading-snug mb-6">
            We've researched current Wärtsilä Marine Hybrid Energy System and mapped out what are the main parts, where consume fuels, where can we intervene and what should we design. The layout visually separates the energy production layer (top-left), the storage and conversion layer (center), and the consumption layer (right and bottom), illustrating how power flows bidirectionally between the engine-generator sets, the battery pack, and the renewable source. These exact topology that the AI energy advisor optimizes across the four operating modes.
          </p>
          <img
            src={energySystemSvg}
            alt="Energy System Diagram"
            className="w-full object-contain"
          />
        </div>
      </div>

      {/* Section 2: Solution Part 1 - Energy Optimizer */}
      <div className="pt-8 pb-12">
        <h2 className="text-xl sm:text-2xl font-bold text-[#1561AB] mb-4">
          Solution Part1: Energy Optimizer
        </h2>
        <p className="text-[#1f1f1f] text-sm leading-relaxed mb-4">
          An AI-powered energy management system that optimizes the hybrid power distribution between engines, battery, and renewables in real time, reducing fuel consumption by up to 30% across varying voyage conditions.
        </p>

        {/* Sub-card: User Scenario */}
        <div className="mt-6">
          <h4 className="text-[#1561AB] font-bold text-md mb-4">User Scenario</h4>
          <EnergyModeScenario />
        </div>
      </div>

      {/* Section 3: Solution Part 2 */}
      <div className="pt-8 pb-12">
        <h2 className="text-xl sm:text-2xl font-bold text-[#1561AB] mb-4">
          Solution Part2: Lever Guidance
        </h2>
        <p className="text-[#1f1f1f] text-sm leading-relaxed mb-4">
          Real-time lever position guidance driven by the onboard AI model, recommending optimal thrust settings for each CPP and bow thruster to balance speed targets with fuel efficiency.
        </p>
        <div className="flex justify-center gap-4 mt-4">
          <img src={leverImg1} alt="Lever Guidance Mockup 1" className="w-[48%] object-contain rounded-lg" />
          <img src={leverImg2} alt="Lever Guidance Mockup 2" className="w-[48%] object-contain rounded-lg" />
        </div>
      </div>

      {/* Section 4: ML Model */}
      <div className="pt-8 pb-12">
        <h2 className="text-xl sm:text-2xl font-bold text-[#1561AB] mb-4">
          Machine Learning Model Building: Energy Pathway
        </h2>
      </div>
    </div>
  );
}
