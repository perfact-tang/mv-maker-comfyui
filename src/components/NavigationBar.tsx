import React from 'react';
import { StoryboardSegment } from '../types/mv-data';

interface NavigationBarProps {
  segments: StoryboardSegment[];
  activeSegmentId?: number;
}

export const NavigationBar: React.FC<NavigationBarProps> = ({ segments, activeSegmentId }) => {
  const scrollToSegment = (id: number) => {
    const el = document.getElementById(`segment-${id}`);
    if (el) {
      const headerOffset = 100;
      const elementPosition = el.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
  
      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth"
      });
    }
  };

  return (
    <nav className="sticky top-0 z-50 py-4 mb-8 bg-background/80 backdrop-blur-md border-b border-white/5">
      <div className="flex gap-4 overflow-x-auto pb-2 px-2 no-scrollbar">
        {segments.map((segment) => (
          <button
            key={segment.segment_id}
            onClick={() => scrollToSegment(segment.segment_id)}
            className={`
              flex-none px-4 py-2 rounded-lg text-xs transition whitespace-nowrap border
              ${activeSegmentId === segment.segment_id
                ? 'bg-neon-cyan/10 border-neon-cyan text-neon-cyan'
                : 'bg-white/5 border-white/10 text-gray-400 hover:bg-neon-cyan/5 hover:border-neon-cyan/50 hover:text-gray-200'}
            `}
          >
            <span className={`font-bold mr-2 ${activeSegmentId === segment.segment_id ? 'text-neon-cyan' : 'text-gray-500'}`}>
              #{segment.segment_id}
            </span> 
            {segment.movielength}
          </button>
        ))}
      </div>
    </nav>
  );
};
