import React from 'react';
import { X, Play, RotateCcw, FastForward } from 'lucide-react';

interface GenerationConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (mode: 'continue' | 'restart') => void;
  hasGeneratedContent: boolean;
  totalCount: number;
  scope?: string;
  unit?: string;
}

export const GenerationConfirmModal: React.FC<GenerationConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  hasGeneratedContent,
  totalCount,
  scope = "分段",
  unit = "视频"
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#1a1a1a] border border-neon-cyan/30 rounded-xl p-6 max-w-md w-full shadow-[0_0_30px_rgba(0,255,255,0.1)] relative">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
        >
          <X size={20} />
        </button>

        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <span className="w-1 h-6 bg-neon-cyan rounded-full"></span>
          批量生成确认
        </h3>

        <div className="text-gray-300 text-sm mb-8 space-y-2">
          {hasGeneratedContent ? (
            <p>
              检测到该{scope}已有生成内容（共 {totalCount} 个{unit}）。
              <br />
              请选择生成策略：
            </p>
          ) : (
            <p>
              准备生成该{scope}所有 {totalCount} 个{unit}。
              <br />
              这将按顺序依次执行生图和生视频操作，请保持页面开启。
            </p>
          )}
        </div>

        <div className="space-y-3">
          {hasGeneratedContent ? (
            <>
              <button
                onClick={() => onConfirm('continue')}
                className="w-full flex items-center justify-center gap-2 bg-neon-cyan/10 hover:bg-neon-cyan/20 border border-neon-cyan/50 text-neon-cyan py-3 rounded-lg transition-all font-bold group"
              >
                <FastForward size={18} className="group-hover:translate-x-0.5 transition-transform" />
                跳过已完成部分继续生成
              </button>
              
              <button
                onClick={() => onConfirm('restart')}
                className="w-full flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-neon-magenta/50 text-gray-300 hover:text-neon-magenta py-3 rounded-lg transition-all group"
              >
                <RotateCcw size={18} className="group-hover:-rotate-180 transition-transform duration-500" />
                重新生成所有 (覆盖现有)
              </button>
            </>
          ) : (
            <button
              onClick={() => onConfirm('restart')} // 'restart' treats as start from 0
              className="w-full flex items-center justify-center gap-2 bg-neon-cyan/10 hover:bg-neon-cyan/20 border border-neon-cyan/50 text-neon-cyan py-3 rounded-lg transition-all font-bold"
            >
              <Play size={18} />
              开始生成
            </button>
          )}

          <button
            onClick={onClose}
            className="w-full text-gray-500 hover:text-white py-2 text-sm transition-colors"
          >
            取消
          </button>
        </div>
      </div>
    </div>
  );
};
