import { useState } from 'react';
import type { VoiceBatchMode } from '../utils/batchGeneration';

interface Props {
  totalShots: number;
  spokenCount: number;
  completedCount: number;
  firstPendingShot: number;
  onClose: () => void;
  onConfirm: (mode: VoiceBatchMode, startShot: number) => void;
}

export const VoiceGenerationConfirmModal = ({ totalShots, spokenCount, completedCount, firstPendingShot, onClose, onConfirm }: Props) => {
  const [start, setStart] = useState(String(firstPendingShot));
  const startShot = Number(start);
  const valid = Number.isInteger(startShot) && startShot >= 1 && startShot <= totalShots;
  return <div role="dialog" aria-modal="true" aria-labelledby="voice-generation-title" className="fixed inset-0 z-[130] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm">
    <div className="w-full max-w-lg space-y-4 rounded-2xl border border-cyan-300/30 bg-[#111827] p-6 text-sm text-gray-300 shadow-2xl">
      <h3 id="voice-generation-title" className="text-xl font-bold text-white">批量配音生成方式</h3>
      <p>共 {totalShots} 个镜头，{spokenCount} 段对白；已生成 {completedCount} 段，待生成 {spokenCount - completedCount} 段。</p>
      <button type="button" onClick={() => onConfirm('continue', 1)} className="w-full rounded-lg border border-cyan-300/40 bg-cyan-500/10 p-3 text-left text-cyan-100">
        <strong className="block">继续生成</strong><span className="mt-1 block text-xs">跳过已有配音，仅补齐未生成的镜头。</span>
      </button>
      <div className="space-y-3 rounded-lg border border-white/15 p-3">
        <label className="flex items-center gap-3">从第几段开始
          <input aria-label="起始镜头序号" type="number" min={1} max={totalShots} step={1} value={start} onChange={(event) => setStart(event.target.value)} className="w-24 rounded border border-white/20 bg-black/40 px-2 py-1 text-white" />
        </label>
        <p className="text-xs text-gray-400">按页面镜头顺序编号（包含无对白镜头），例如 94、194。从该镜头起补齐缺失配音，已有配音仍保留。</p>
        {!valid && <p role="alert" className="text-xs text-red-300">请输入 1 至 {totalShots} 之间的整数。</p>}
        <button type="button" disabled={!valid} onClick={() => onConfirm('from', startShot)} className="w-full rounded bg-white/10 p-2 text-cyan-200 disabled:opacity-40">从指定段开始</button>
      </div>
      <button type="button" onClick={() => onConfirm('restart', 1)} className="w-full rounded-lg border border-amber-300/25 bg-amber-500/5 p-3 text-left text-amber-100">
        <strong className="block">从头开始</strong><span className="mt-1 block text-xs">重新生成所有对白。每段成功后才替换该段旧配音；失败或尚未处理的配音保留。</span>
      </button>
      <p className="text-xs text-gray-400">修改语言、音色、文本或人物图片不会清空已生成配音。如需应用新设置，请单独重生成该段，或选择从头开始。</p>
      <button type="button" onClick={onClose} className="w-full rounded py-2 text-gray-400 hover:bg-white/10">取消</button>
    </div>
  </div>;
};
