import React from 'react';

interface BasicsSectionProps {
  basics: {
    outline: string;
    shooting_method: string;
    art_style_description: string;
  };
}

export const BasicsSection: React.FC<BasicsSectionProps> = ({ basics }) => {
  return (
    <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
      <div className="glass-card p-6 rounded-xl neon-border-cyan md:col-span-2">
        <h3 className="text-neon-cyan text-xs font-bold mb-4 uppercase tracking-widest flex items-center gap-2">
          <span className="w-1.5 h-1.5 bg-neon-cyan rounded-sm"></span>
          核心方案
        </h3>
        <p 
          contentEditable
          suppressContentEditableWarning
          className="text-lg leading-relaxed text-gray-200 focus:outline-none focus:bg-white/5 rounded px-1 -mx-1 transition-colors"
        >
          {basics.outline}
        </p>
      </div>
      
      <div className="glass-card p-6 rounded-xl border border-white/10 flex flex-col justify-between">
        <div>
          <h3 className="text-neon-magenta text-xs font-bold mb-4 uppercase tracking-widest flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-neon-magenta rounded-sm"></span>
            艺术风格
          </h3>
          <p 
            contentEditable
            suppressContentEditableWarning
            className="text-sm text-gray-400 mb-2 leading-relaxed focus:outline-none focus:bg-white/5 rounded px-1 -mx-1 transition-colors"
          >
            {basics.art_style_description}
          </p>
        </div>
        
        <div className="mt-6 pt-6 border-t border-white/5">
          <h3 className="text-white/50 text-[10px] font-bold mb-2 uppercase tracking-widest">
            技术手段
          </h3>
          <p 
            contentEditable
            suppressContentEditableWarning
            className="text-xs italic text-gray-500 focus:outline-none focus:bg-white/5 rounded px-1 -mx-1 transition-colors"
          >
            {basics.shooting_method}
          </p>
        </div>
      </div>
    </section>
  );
};
