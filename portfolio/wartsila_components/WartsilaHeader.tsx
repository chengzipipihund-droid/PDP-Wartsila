import React from 'react';
import Tag from '../Tag';
import wartsilaLogo from '../wartsila_images/header/wartsila_logo.svg';

type WartsilaHeaderProps = {
  showMedia?: boolean;
};

export default function WartsilaHeader({ showMedia = true }: WartsilaHeaderProps) {
  return (
    <div className="flex flex-col gap-8">

      <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex-1">
          <div className="mb-4 flex items-center gap-3">
            <img src={wartsilaLogo} alt="Wartsila logo" className="h-10 sm:h-14" />
          </div>

          <p className="text-gray-700 text-md mb-4">
            How to control future vessel? AI-Intergrated Maritime Control System
          </p>

          <div className="flex flex-wrap gap-3">
            <Tag label="UI/UX Design" />
            <Tag label="Sep 2025 - May 2026" />
            <Tag label="Team of 7" />
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-start gap-4 lg:items-end">
          <a
            href="https://github.com/chengzipipihund-droid/PDP-Wartsila"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-[#2f2f2f] transition-colors hover:text-black"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden="true">
              <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.866-.013-1.7-2.782.605-3.369-1.343-3.369-1.343-.455-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.091-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.447-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.565 9.565 0 0 1 12 6.844c.851.004 1.705.115 2.504.337 1.909-1.296 2.747-1.026 2.747-1.026.547 1.378.203 2.397.1 2.65.64.7 1.028 1.595 1.028 2.688 0 3.848-2.338 4.695-4.566 4.943.359.309.679.92.679 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0 0 22 12.017C22 6.484 17.523 2 12 2Z" />
            </svg>
            <span className="font-medium">GitHub</span>
          </a>
        </div>
      </div>
    </div>
  );
}
