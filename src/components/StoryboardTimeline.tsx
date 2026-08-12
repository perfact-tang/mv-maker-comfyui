import React, { useRef, useImperativeHandle, forwardRef, useState, useMemo } from 'react';
import { StoryboardSegment, MVScriptData } from '../types/mv-data';
import { SegmentCard, SegmentCardHandle } from './SegmentCard';

interface StoryboardTimelineProps {
  storyboard: StoryboardSegment[];
  basics: MVScriptData['basics'];
}

export interface StoryboardTimelineHandle {
  generateAllSegments: () => Promise<void>;
}

export const StoryboardTimeline = forwardRef<StoryboardTimelineHandle, StoryboardTimelineProps>(({ storyboard, basics }, ref) => {
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
      setStartSegmentInput(String(suggestedStartSegmentId ?? ''));
      setSkipGenerated(true);
      setValidationError('');
      setIsConfirmOpen(true);
    }
  }), [isGeneratingGlobally, orderedStoryboard.length, suggestedStartSegmentId]);

  const handleConfirmGlobalGeneration = async () => {
    const requestedSegmentId = Number(startSegmentInput);
    const startIndex = orderedStoryboard.findIndex(segment => Number(segment.segment_id) === requestedSegmentId);
    if (!Number.isInteger(requestedSegmentId) || startIndex < 0) {
      setValidationError(`请输入有效分段编号：${orderedStoryboard.map(segment => segment.segment_id).join('、')}`);
      return;
    }

    setIsConfirmOpen(false);
    setIsGeneratingGlobally(true);

    try {
      for (let i = startIndex; i < orderedStoryboard.length; i++) {
        const segmentRef = segmentRefs.current[i];
        if (segmentRef) {
          try {
            const segmentElement = document.getElementById(`segment-${orderedStoryboard[i].segment_id}`);
            if (segmentElement) {
              segmentElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }

            await segmentRef.triggerGenerateAll(true, skipGenerated ? 'continue' : 'restart');
          } catch (error) {
            console.error(`Error generating segment ${orderedStoryboard[i].segment_id}:`, error);
          }
        }
      }
      alert("所有分段视频生成完毕！");
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
        />
      ))}
    </main>
  );
});

StoryboardTimeline.displayName = "StoryboardTimeline";
