import React, { useRef, useImperativeHandle, forwardRef, useState, useMemo } from 'react';
import { StoryboardSegment, MVScriptData } from '../types/mv-data';
import { SegmentCard, SegmentCardHandle } from './SegmentCard';
import { GenerationConfirmModal } from './GenerationConfirmModal';

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

  // Check if any generated content exists to show appropriate modal
  const hasAnyGeneratedContent = useMemo(() => {
    return storyboard.some(segment => 
      segment.mvinfo.some(info => info.generated_assets?.video)
    );
  }, [storyboard]);

  useImperativeHandle(ref, () => ({
    generateAllSegments: async () => {
      setIsConfirmOpen(true);
    }
  }));

  const handleConfirmGlobalGeneration = async (mode: 'continue' | 'restart') => {
    setIsConfirmOpen(false);
    
    // Iterate through all segments
    for (let i = 0; i < storyboard.length; i++) {
      const segmentRef = segmentRefs.current[i];
      if (segmentRef) {
        try {
          // Scroll to the segment being processed
          const segmentElement = document.getElementById(`segment-${storyboard[i].segment_id}`);
          if (segmentElement) {
            segmentElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }

          // Call generate on the segment, passing true to skip individual confirmation
          // and passing the chosen mode (continue/restart)
          await segmentRef.triggerGenerateAll(true, mode);
        } catch (error) {
          console.error(`Error generating segment ${i + 1}:`, error);
          // Continue to next segment on error
        }
      }
    }
    alert("所有分段视频生成完毕！");
  };

  return (
    <main className="space-y-20 pb-20">
      <GenerationConfirmModal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleConfirmGlobalGeneration}
        hasGeneratedContent={hasAnyGeneratedContent}
        totalCount={storyboard.length}
        scope="项目"
        unit="分段"
      />

      {storyboard.map((segment, index) => (
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
