import React from 'react';
import { Printer, ChevronDown, Download, Sparkles } from 'lucide-react';
import { useGlobalSettings } from '../stores/useGlobalSettings';

interface HeaderProps {
  title: string;
  proposalId: number;
  onGenerateAll?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ title, proposalId, onGenerateAll }) => {
  const { selectedWorkflow, setSelectedWorkflow, mvData } = useGlobalSettings();

  const handleSaveJson = () => {
    if (!mvData) return;

    // Create a deep copy to ensure we don't accidentally mutate state (though we shouldn't be here)
    const dataToSave = JSON.stringify(mvData, null, 2);
    
    // Create blob and download link
    const blob = new Blob([dataToSave], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `mv_script_proposal_${String(proposalId).padStart(3, '0')}_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <header className="mb-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div className="flex flex-col items-start gap-6">
          <div>
            <h1 className="text-4xl font-bold tracking-tighter text-white mb-2 neon-text-shadow">
              {title}
            </h1>
            <p className="text-neon-cyan font-mono tracking-widest text-sm flex items-center gap-2 mb-0">
              <span className="w-2 h-2 bg-neon-cyan rounded-full animate-pulse" />
              提案 ID: {String(proposalId).padStart(3, '0')} / MV 分镜脚本
            </p>
          </div>

          <div className="glass-card bg-black/40 border border-white/10 rounded-lg p-3 inline-flex flex-col gap-2">
              <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 bg-neon-cyan/50 rounded-full"></div>
                AI 生成控制
              </label>
              <div className="flex items-center gap-3">
                <span className="text-[10px] text-gray-400 whitespace-nowrap">文生图 Workflow：</span>
                <div className="relative min-w-[180px]">
                  <select 
                    value={selectedWorkflow}
                    onChange={(e) => setSelectedWorkflow(e.target.value)}
                    className="bg-black/50 text-xs text-gray-300 border border-white/10 rounded px-2.5 py-1.5 w-full focus:outline-none focus:border-neon-cyan appearance-none pr-8 cursor-pointer hover:border-white/20 transition-colors"
                  >
                    <option value="Qwen-Image-2512">Qwen-Image-2512</option>
                    <option value="Z-Image-Turbo">Z-Image-Turbo</option>
                  </select>
                  <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              </div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-3">
          <button 
            onClick={onGenerateAll}
            className="bg-neon-magenta hover:bg-neon-magenta/80 text-white font-bold text-sm flex items-center gap-2 px-4 py-2 rounded shadow-[0_0_15px_rgba(255,0,255,0.3)] hover:shadow-[0_0_25px_rgba(255,0,255,0.5)] transition-all transform hover:-translate-y-0.5"
            title="按顺序生成项目中所有分段的视频"
          >
            <Sparkles size={16} />
            生成全片视频
          </button>
          
          <button 
            onClick={handleSaveJson}
            className="bg-neon-cyan hover:bg-neon-cyan/80 text-black font-bold text-sm flex items-center gap-2 px-4 py-2 rounded shadow-[0_0_15px_rgba(0,255,255,0.3)] hover:shadow-[0_0_25px_rgba(0,255,255,0.5)] transition-all transform hover:-translate-y-0.5"
            title="保存包含生成结果的 JSON"
          >
            <Download size={16} />
            保存项目 JSON
          </button>
        </div>
      </div>
    </header>
  );
};
