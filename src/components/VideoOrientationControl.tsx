import React from 'react';
import { Monitor, Smartphone } from 'lucide-react';
import { VideoOrientation } from '../types/mv-data';
import { VIDEO_DIMENSIONS } from '../utils/characterVideoWorkflow';

interface VideoOrientationControlProps {
  value: VideoOrientation;
  onChange: (orientation: VideoOrientation) => void;
}

export const VideoOrientationControl: React.FC<VideoOrientationControlProps> = ({ value, onChange }) => (
  <div className="grid grid-cols-2 gap-1 rounded-xl border border-white/10 bg-black/30 p-1" role="radiogroup" aria-label="视频方向">
    {(['landscape', 'portrait'] as VideoOrientation[]).map((orientation) => {
      const dimensions = VIDEO_DIMENSIONS[orientation];
      const Icon = orientation === 'landscape' ? Monitor : Smartphone;
      const isActive = value === orientation;
      return (
        <button
          key={orientation}
          type="button"
          role="radio"
          aria-checked={isActive}
          onClick={() => onChange(orientation)}
          className={`flex min-w-0 items-center gap-2 rounded-lg px-3 py-2 text-left transition-all ${
            isActive
              ? 'bg-neon-cyan/10 text-white shadow-[inset_0_0_0_1px_rgba(6,182,212,0.35)]'
              : 'text-gray-500 hover:bg-white/5 hover:text-gray-300'
          }`}
        >
          <Icon size={16} className={isActive ? 'text-neon-cyan' : ''} />
          <span className="min-w-0">
            <span className="block text-xs font-bold">{dimensions.label}</span>
            <span className="block font-mono text-[10px] text-gray-500">{dimensions.width} × {dimensions.height}</span>
          </span>
        </button>
      );
    })}
  </div>
);
