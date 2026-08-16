import React from 'react';
import { AudioLines, Clapperboard, Users } from 'lucide-react';

export type ProjectPage = 'audio' | 'storyboard' | 'characters';

interface ProjectNavigationProps {
  activePage: ProjectPage;
  characterCount: number;
  onPageChange: (page: ProjectPage) => void;
}

export const ProjectNavigation: React.FC<ProjectNavigationProps> = ({ activePage, characterCount, onPageChange }) => {
  const items = [
    { id: 'audio' as const, label: '声音制作', detail: '千问配音 + Music 3 配乐', icon: AudioLines },
    { id: 'storyboard' as const, label: '分镜制作', detail: '脚本、音频与镜头生成', icon: Clapperboard },
    { id: 'characters' as const, label: '人物展示', detail: `${characterCount} 位人物图片`, icon: Users },
  ];

  return (
    <div className="sticky top-0 z-[70] border-b border-white/10 bg-background/90 px-4 py-3 backdrop-blur-xl md:px-8">
      <nav aria-label="项目页面" className="mx-auto grid max-w-6xl grid-cols-3 gap-1 rounded-2xl border border-white/10 bg-black/35 p-1.5 shadow-[0_12px_40px_rgba(0,0,0,0.35)]">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = activePage === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onPageChange(item.id)}
              aria-current={isActive ? 'page' : undefined}
              className={`flex min-w-0 items-center justify-center gap-3 rounded-xl px-3 py-3 text-left transition-all md:px-6 ${
                isActive
                  ? 'bg-white/[0.08] text-white shadow-[inset_0_0_0_1px_rgba(6,182,212,0.28)]'
                  : 'text-gray-500 hover:bg-white/[0.04] hover:text-gray-300'
              }`}
            >
              <Icon size={19} className={isActive ? 'text-neon-cyan' : ''} />
              <span className="min-w-0">
                <span className="block truncate text-sm font-bold">{item.label}</span>
                <span className="hidden truncate text-[10px] text-gray-500 sm:block">{item.detail}</span>
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};
