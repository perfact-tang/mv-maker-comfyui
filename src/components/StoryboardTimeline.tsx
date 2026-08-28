import React, { useRef, useImperativeHandle, forwardRef, useState, useMemo, useEffect } from 'react';
import { StoryboardSegment, MVScriptData } from '../types/mv-data';
import { SegmentCard, SegmentCardHandle } from './SegmentCard';
import { useGlobalSettings } from '../stores/useGlobalSettings';

interface StoryboardTimelineProps {
  storyboard: StoryboardSegment[];
  basics: MVScriptData['basics'];
}

export interface StoryboardTimelineHandle {
  generateAllSegments: () => Promise<void>;
  generateAllFrames: () => Promise<void>;
}

export const StoryboardTimeline = forwardRef<StoryboardTimelineHandle, StoryboardTimelineProps>(({ storyboard, basics }, ref) => {
  const audioPlan = useGlobalSettings((state) => state.mvData?.director_plan?.audio_plan);
  const segmentRefs = useRef<(SegmentCardHandle | null)[]>([]);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [startSegmentInput, setStartSegmentInput] = useState('');
  const [skipGenerated, setSkipGenerated] = useState(true);
  const [validationError, setValidationError] = useState('');
  const [isGeneratingGlobally, setIsGeneratingGlobally] = useState(false);

  const orderedStoryboard = useMemo(
    () => [...storyboard].sort((a, b) => Number(a.segment_id) - Number(b.segment_id)),
    [storyboard],
  );
  const [segmentTailFrames, setSegmentTailFrames] = useState<Record<number, string>>(() => {
    const initial: Record<number, string> = {};
    storyboard.forEach((segment) => {
      const tail = segment.mvinfo.at(-1)?.generated_assets?.last_frame;
      if (tail) initial[segment.segment_id] = tail;
    });
    return initial;
  });

  useEffect(() => {
    setSegmentTailFrames((previous) => {
      const next = { ...previous };
      storyboard.forEach((segment) => {
        const tail = segment.mvinfo.at(-1)?.generated_assets?.last_frame;
        if (tail) next[segment.segment_id] = tail;
      });
      return next;
    });
  }, [storyboard]);

  // Check if any generated content exists to show appropriate modal
  const hasAnyGeneratedContent = useMemo(() => {
    return orderedStoryboard.some(segment => 
      segment.mvinfo.some(info => info.generated_assets?.video)
    );
  }, [orderedStoryboard]);

  const suggestedStartSegmentId = useMemo(() => {
    const firstIncomplete = orderedStoryboard.find(segment =>
      segment.mvinfo.some(info => info.video_prompt && !info.generated_assets?.video),
    );
    return firstIncomplete?.segment_id ?? orderedStoryboard[0]?.segment_id;
  }, [orderedStoryboard]);

  useImperativeHandle(ref, () => ({
    generateAllSegments: async () => {
      if (isGeneratingGlobally || orderedStoryboard.length === 0) return;
      if (audioPlan && audioPlan.mode !== 'disabled' && audioPlan.alignment_status !== 'locked') {
        alert('请先到“声音制作”页面锁定当前声音时间线；音频未全部生成也可以锁定。');
        return;
      }
      setStartSegmentInput(String(suggestedStartSegmentId ?? ''));
      setSkipGenerated(true);
      setValidationError('');
      setIsConfirmOpen(true);
    },
    generateAllFrames: async () => {
      if (isGeneratingGlobally || orderedStoryboard.length === 0) return;
      if (!window.confirm('确定要按镜头顺序逐个生成全片首帧与 FL2VA 目标尾帧吗？下一步可选择全部重做或只补缺失。')) return;
      const regenerateExisting = window.confirm('是否重新生成已有首尾帧？\n\n确定：全部重新生成，用新的“镜头提示词 + 整体艺术风格”统一画风。\n取消：只补缺失图片，保留已有结果。');
      setIsGeneratingGlobally(true);
      let generated = 0;
      let reused = 0;
      let deferred = 0;
      try {
        for (let index = 0; index < orderedStoryboard.length; index += 1) {
          const segmentRef = segmentRefs.current[index];
          if (!segmentRef) throw new Error(`分段 ${orderedStoryboard[index].segment_id} 的首尾帧控件尚未就绪`);
          document.getElementById(`segment-${orderedStoryboard[index].segment_id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          const result = await segmentRef.triggerGenerateFrames(regenerateExisting);
          generated += result.generated;
          reused += result.reused;
          deferred += result.deferred;
        }
        alert(`全片首尾帧处理完成：新生成 ${generated} 张，复用 ${reused} 张，${deferred} 个承接首帧将在上一镜头视频生成后自动接入。`);
      } catch (error) {
        alert(`首尾帧批量生成已停止：${error instanceof Error ? error.message : String(error)}\n当前已新生成 ${generated} 张、复用 ${reused} 张。`);
      } finally {
        setIsGeneratingGlobally(false);
      }
    },
  }), [audioPlan, isGeneratingGlobally, orderedStoryboard, suggestedStartSegmentId]);

  const handleConfirmGlobalGeneration = async () => {
    const requestedSegmentId = Number(startSegmentInput);
    const startIndex = orderedStoryboard.findIndex(segment => Number(segment.segment_id) === requestedSegmentId);
    if (!Number.isInteger(requestedSegmentId) || startIndex < 0) {
      setValidationError(`请输入有效分段编号：${orderedStoryboard.map(segment => segment.segment_id).join('、')}`);
      return;
    }

    setIsConfirmOpen(false);
    setIsGeneratingGlobally(true);

    let totalRequested = 0;
    let totalGenerated = 0;
    try {
      for (let i = startIndex; i < orderedStoryboard.length; i++) {
        const segmentRef = segmentRefs.current[i];
        if (!segmentRef) throw new Error(`分段 ${orderedStoryboard[i].segment_id} 的生成控件尚未就绪`);
        const segmentElement = document.getElementById(`segment-${orderedStoryboard[i].segment_id}`);
        if (segmentElement) {
          segmentElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }

        const result = await segmentRef.triggerGenerateAll(true, skipGenerated ? 'continue' : 'restart');
        if (result) {
          totalRequested += result.requested;
          totalGenerated += result.generated;
          if (result.generated !== result.requested) {
            throw new Error(`分段 ${result.segmentId} 只完成 ${result.generated}/${result.requested} 个视频`);
          }
        }
      }
      alert(`全部视频生成完成：成功 ${totalGenerated}/${totalRequested}，没有跳过失败镜头。`);
    } catch (error) {
      console.error('Global batch generation stopped:', error);
      alert(`批量生成已停止。${error instanceof Error ? error.message : String(error)}\n已成功完成 ${totalGenerated}/${totalRequested} 个本次待生成视频，请修复当前镜头后点击“生成全部视频”继续。`);
    } finally {
      setIsGeneratingGlobally(false);
    }
  };

  return (
    <main className="space-y-20 pb-20">
      {isConfirmOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#1a1a1a] border border-neon-cyan/30 rounded-xl p-6 max-w-md w-full shadow-[0_0_30px_rgba(0,255,255,0.1)]">
            <h3 className="text-xl font-bold text-white mb-3">确认全篇生成顺序</h3>
            <p className="text-sm text-gray-300 mb-5">
              系统建议从分段 <span className="text-neon-cyan font-bold">{suggestedStartSegmentId}</span> 开始。
              如果不正确，请手动输入起始分段编号。
            </p>

            <label className="block text-xs text-gray-400 mb-2">从第几段开始</label>
            <input
              type="number"
              step="1"
              value={startSegmentInput}
              onChange={(event) => {
                setStartSegmentInput(event.target.value);
                setValidationError('');
              }}
              className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-neon-cyan"
            />
            <p className="text-[11px] text-gray-500 mt-2">
              可用编号：{orderedStoryboard.map(segment => segment.segment_id).join('、')}
            </p>
            <p className="mt-3 text-xs text-amber-200/80">可以先制作已有音频的镜头；遇到缺少音频或音频文件失效的镜头，将弹出“没有声音了”并停止，已完成的动画保留。</p>

            <label className="mt-5 flex items-center gap-3 text-sm text-gray-300 cursor-pointer">
              <input
                type="checkbox"
                checked={skipGenerated}
                onChange={(event) => setSkipGenerated(event.target.checked)}
                className="accent-cyan-400"
              />
              跳过已经生成的视频
            </label>
            {hasAnyGeneratedContent && skipGenerated && (
              <p className="text-[11px] text-gray-500 mt-2">将只点击尚未生成的视频，并保持数字顺序。</p>
            )}

            {validationError && <p className="text-sm text-red-400 mt-4">{validationError}</p>}

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setIsConfirmOpen(false)}
                className="flex-1 py-2 rounded-lg bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"
              >
                取消
              </button>
              <button
                onClick={handleConfirmGlobalGeneration}
                className="flex-1 py-2 rounded-lg bg-neon-cyan/10 border border-neon-cyan/50 text-neon-cyan hover:bg-neon-cyan/20 font-bold"
              >
                从该分段开始
              </button>
            </div>
          </div>
        </div>
      )}

      {orderedStoryboard.map((segment, index) => (
        <SegmentCard 
          key={segment.segment_id} 
          ref={el => segmentRefs.current[index] = el}
          segment={segment} 
          basics={basics} 
          previousSegmentLastFrame={index > 0 ? segmentTailFrames[orderedStoryboard[index - 1].segment_id] : undefined}
          onSegmentLastFrameGenerated={(url) => setSegmentTailFrames((previous) => {
            const next = { ...previous };
            if (url) next[segment.segment_id] = url;
            else delete next[segment.segment_id];
            return next;
          })}
        />
      ))}
    </main>
  );
});

StoryboardTimeline.displayName = "StoryboardTimeline";
