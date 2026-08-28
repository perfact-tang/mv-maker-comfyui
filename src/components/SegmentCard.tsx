import React, { useRef, useImperativeHandle, forwardRef } from 'react';
import { Play, X, Sparkles, Loader2, FileArchive } from 'lucide-react';
import { StoryboardSegment, MVScriptData } from '../types/mv-data';
import { MVInfoCard, MVInfoCardHandle } from './MVInfoCard';
import { GenerationConfirmModal } from './GenerationConfirmModal';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { useGlobalSettings } from '../stores/useGlobalSettings';
import { missingVideoIndexes, pendingVideoIndexes, runVideoGenerationQueue } from '../utils/batchGeneration';
import { addGeneratedVideosToZip, generatedVideoEntries } from '../utils/videoDownload';

export interface SegmentBatchResult {
  segmentId: number;
  requested: number;
  generated: number;
}

export interface SegmentCardHandle {
  triggerGenerateAll: (skipConfirm?: boolean, mode?: 'continue' | 'restart') => Promise<SegmentBatchResult | undefined>;
  triggerGenerateFrames: (regenerateExisting?: boolean) => Promise<{ generated: number; reused: number; deferred: number }>;
}

interface SegmentCardProps {
  segment: StoryboardSegment;
  basics: MVScriptData['basics'];
  previousSegmentLastFrame?: string;
  onSegmentLastFrameGenerated?: (url: string | null) => void;
}

export const SegmentCard = forwardRef<SegmentCardHandle, SegmentCardProps>(({ segment, basics, previousSegmentLastFrame, onSegmentLastFrameGenerated }, ref) => {
  const [lastFrames, setLastFrames] = React.useState<Record<number, string>>(() => {
    const initial: Record<number, string> = {};
    segment.mvinfo.forEach((info, idx) => {
      if (info.generated_assets?.last_frame) {
        initial[idx] = info.generated_assets.last_frame;
      }
    });
    return initial;
  });

  // Video Player State
  const [showPlayer, setShowPlayer] = React.useState(false);
  const [currentVideoIndex, setCurrentVideoIndex] = React.useState(0);
  const [isGeneratingAll, setIsGeneratingAll] = React.useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = React.useState(false);
  const [isDownloading, setIsDownloading] = React.useState(false);

  const generatedVideos = generatedVideoEntries([segment]);

  const handleDownloadSegment = async () => {
      if (!generatedVideos.length || isDownloading) return;
      setIsDownloading(true);
      try {
        const zip = new JSZip();
        let lrcContent = `[ti:Segment ${segment.segment_id}]\n[ar:MV Maker]\n`;
        
        segment.mvinfo.forEach((info) => {
          // Add to LRC
          if (info.video_prompt) {
             const startTime = info.timestamp.split(' - ')[0]; // "00:00"
             // Format to 00:00.00 if it's just 00:00
             const formattedTime = `[${startTime}.00]`;
             // Clean prompt
             const cleanPrompt = info.video_prompt.replace(/\n/g, ' ');
             lrcContent += `${formattedTime}${cleanPrompt}\n`;
          }

        });

        await addGeneratedVideosToZip(zip.folder(`segment_${segment.segment_id}_videos`)!, generatedVideos);

        // Add LRC
        zip.file(`segment_${segment.segment_id}_prompts.lrc`, lrcContent);

        const content = await zip.generateAsync({ type: "blob" });
        saveAs(content, `mv_segment_${segment.segment_id}_package.zip`);

      } catch (error) {
        console.error("Error downloading segment:", error);
        alert(`下载失败，请重试：${error instanceof Error ? error.message : String(error)}`);
      } finally {
        setIsDownloading(false);
      }
  };

  // Refs for MVInfoCards
  const cardRefs = useRef<{[key: number]: MVInfoCardHandle | null}>({});

  const validVideos = React.useMemo(() => 
    segment.mvinfo
      .map((info, index) => ({...info, originalIndex: index}))
      .filter(info => info.generated_assets?.video), 
    [segment.mvinfo]
  );

  const currentVideo = validVideos[currentVideoIndex];

  const handleVideoEnd = () => {
    if (currentVideoIndex < validVideos.length - 1) {
      setCurrentVideoIndex(prev => prev + 1);
    }
  };
  
  const executeBatchGeneration = async (mode: 'continue' | 'restart'): Promise<SegmentBatchResult> => {
    setIsGeneratingAll(true);
    try {
      const generationIndexes = pendingVideoIndexes(segment.mvinfo, mode);

      await runVideoGenerationQueue(generationIndexes, async (i) => {
        const cardRef = cardRefs.current[i];
        if (!cardRef) throw new Error(`分段 ${segment.segment_id} · 小段 ${i + 1} 的生成控件尚未就绪`);
        try {
          await cardRef.triggerGenerateVideo();
        } catch (error) {
          const reason = error instanceof Error ? error.message : String(error);
          throw new Error(`分段 ${segment.segment_id} · 小段 ${i + 1} 生成失败：${reason}`);
        }
      });

      const liveSegment = useGlobalSettings.getState().mvData?.storyboard
        .find((item) => item.segment_id === segment.segment_id);
      const missing = missingVideoIndexes(liveSegment?.mvinfo, generationIndexes);
      if (missing.length > 0) {
        throw new Error(`分段 ${segment.segment_id} 完成校验失败，以下小段仍无视频：${missing.map((index) => index + 1).join('、')}`);
      }
      return { segmentId: segment.segment_id, requested: generationIndexes.length, generated: generationIndexes.length };
    } finally {
      setIsGeneratingAll(false);
    }
  };

  const handleGenerateAllVideos = async (skipConfirm = false, forceMode?: 'continue' | 'restart') => {
    if (isGeneratingAll) return;
    
    // Check if there are already generated videos
    const hasGeneratedContent = segment.mvinfo.some(info => info.generated_assets?.video);

    if (skipConfirm) {
        // Global generation logic
        
        // If forceMode is provided (e.g. from global modal), use it
        if (forceMode) {
             // If continue mode, but everything is finished, skip
             if (forceMode === 'continue') {
                 const needsWork = segment.mvinfo.some(info => !info.generated_assets?.video);
                 if (!needsWork) return { segmentId: segment.segment_id, requested: 0, generated: 0 };
             }
             return executeBatchGeneration(forceMode);
        }

        // Fallback default logic (shouldn't be reached if StoryboardTimeline passes mode)
        if (hasGeneratedContent) {
            const needsWork = segment.mvinfo.some(info => !info.generated_assets?.video);
            if (!needsWork) return { segmentId: segment.segment_id, requested: 0, generated: 0 }; 
            return executeBatchGeneration('continue');
        } else {
            return executeBatchGeneration('restart');
        }
    }

    // Manual trigger logic (Segment level button)
    if (hasGeneratedContent) {
        setIsConfirmModalOpen(true);
    } else {
        // No content, simple confirm
        if (window.confirm(`确定要自动生成该分段所有 ${segment.mvinfo.length} 个视频吗？这将按顺序依次执行生图和生视频操作。`)) {
            try {
              const result = await executeBatchGeneration('restart');
              alert(`分段 ${segment.segment_id} 已完成：成功生成 ${result.generated}/${result.requested} 个视频。`);
              return result;
            } catch (error) {
              alert(error instanceof Error ? error.message : String(error));
              throw error;
            }
        }
    }
  };

  useImperativeHandle(ref, () => ({
    triggerGenerateAll: (skipConfirm, mode) => handleGenerateAllVideos(skipConfirm, mode),
    triggerGenerateFrames: async (regenerateExisting = false) => {
      let generated = 0;
      let reused = 0;
      let deferred = 0;
      for (let index = 0; index < segment.mvinfo.length; index += 1) {
        const cardRef = cardRefs.current[index];
        if (!cardRef) throw new Error(`分段 ${segment.segment_id} · 小段 ${index + 1} 的首尾帧控件尚未就绪`);
        try {
          const result = await cardRef.triggerGenerateFrames(regenerateExisting);
          generated += result.generated;
          reused += result.reused;
          deferred += result.deferred;
        } catch (error) {
          throw new Error(`分段 ${segment.segment_id} · 小段 ${index + 1} 首尾帧生成失败：${error instanceof Error ? error.message : String(error)}`);
        }
      }
      return { generated, reused, deferred };
    },
  }));

  // Update lastFrames when segment data changes (e.g. after loading new JSON)
  React.useEffect(() => {
    const newFrames: Record<number, string> = {};
    segment.mvinfo.forEach((info, idx) => {
      if (info.generated_assets?.last_frame) {
        newFrames[idx] = info.generated_assets.last_frame;
      }
    });
    setLastFrames(newFrames);
  }, [segment]);

  return (
    <section id={`segment-${segment.segment_id}`} className="space-y-8 scroll-mt-24">
      <GenerationConfirmModal 
        isOpen={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        onConfirm={async (mode) => {
            setIsConfirmModalOpen(false);
            try {
              const result = await executeBatchGeneration(mode);
              alert(`分段 ${segment.segment_id} 已完成：成功生成 ${result.generated}/${result.requested} 个视频。`);
            } catch (error) {
              alert(error instanceof Error ? error.message : String(error));
            }
        }}
        hasGeneratedContent={true}
        totalCount={segment.mvinfo.length}
      />

      <div className="flex flex-col md:flex-row md:items-end justify-between border-b border-white/10 pb-4 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            <span className="text-neon-cyan/50 text-lg">#{String(segment.segment_id).padStart(2, '0')}</span>
            分段 {segment.segment_id}
          </h2>
          <p className="text-gray-500 text-sm italic mt-1">{segment.content_narrative}</p>
        </div>
        <div className="text-right">
          <span className="text-xs font-mono text-neon-cyan bg-neon-cyan/10 px-2 py-1 rounded border border-neon-cyan/20 whitespace-nowrap">
            {segment.movielength}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 bg-white/5 rounded-lg border border-white/5 hover:border-neon-cyan/30 transition duration-300">
          <span className="text-neon-cyan font-bold block mb-2 uppercase text-[10px] tracking-widest">
            起始帧意向
          </span>
          <span className="text-gray-400 text-xs leading-relaxed">{segment.prompts.first_frame}</span>
        </div>
        <div className="p-4 bg-white/5 rounded-lg border border-white/5 hover:border-neon-magenta/30 transition duration-300">
          <span className="text-neon-magenta font-bold block mb-2 uppercase text-[10px] tracking-widest">
            结束帧意向
          </span>
          <span className="text-gray-400 text-xs leading-relaxed">{segment.prompts.last_frame}</span>
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <button
            onClick={() => handleGenerateAllVideos(false)}
            disabled={isGeneratingAll}
            className="flex items-center gap-2 px-4 py-2 bg-neon-magenta/10 text-neon-magenta border border-neon-magenta/20 rounded-lg hover:bg-neon-magenta/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
            {isGeneratingAll ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
            <span>AI生成分段所有视频</span>
        </button>

        {validVideos.length > 0 && (
          <button
            onClick={() => {
              setCurrentVideoIndex(0);
              setShowPlayer(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/20 rounded-lg hover:bg-neon-cyan/20 transition-colors"
          >
            <Play size={16} />
            <span>播放分段视频</span>
          </button>
        )}

        {generatedVideos.length > 0 && (
            <button 
              onClick={handleDownloadSegment}
              disabled={isDownloading}
              title={`打包本段已生成的 ${generatedVideos.length} 个视频，跳过未完成镜头`}
              className="flex items-center gap-2 px-4 py-2 bg-green-600/10 text-green-500 border border-green-600/20 rounded-lg hover:bg-green-600/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FileArchive size={16} />
              <span>{isDownloading ? '打包中...' : '下载本段落视频'}</span>
            </button>
        )}
      </div>

      <div className="space-y-4">
        {segment.mvinfo.map((info, idx) => (
          <MVInfoCard 
            key={`${segment.segment_id}-${idx}`} 
            ref={el => cardRefs.current[idx] = el}
            info={info} 
            basics={basics}
            previousLastFrame={idx > 0 ? lastFrames[idx - 1] : previousSegmentLastFrame}
            onLastFrameGenerated={(url) => {
              setLastFrames((previous) => {
                const next = { ...previous };
                if (url) next[idx] = url;
                else delete next[idx];
                return next;
              });
              if (idx === segment.mvinfo.length - 1) onSegmentLastFrameGenerated?.(url);
            }}
            segmentId={segment.segment_id}
            infoIndex={idx}
          />
        ))}
      </div>

      {showPlayer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
          <div className="bg-[#1a1a1a] border border-white/10 rounded-xl w-full max-w-6xl overflow-hidden flex flex-col md:flex-row h-[80vh]">
            
            {/* Left: Video Player */}
            <div className="flex-1 bg-black flex items-center justify-center relative group">
              {currentVideo ? (
                <video
                  key={currentVideo.generated_assets?.video}
                  src={currentVideo.generated_assets?.video}
                  className="w-full h-full object-contain"
                  controls
                  autoPlay
                  onEnded={handleVideoEnd}
                />
              ) : (
                <div className="text-gray-500">无法加载视频</div>
              )}
               {/* Close button overlay for mobile/convenience */}
               <button 
                  onClick={() => setShowPlayer(false)}
                  className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors md:hidden"
                >
                  <X size={20} />
                </button>
            </div>

            {/* Right: Playlist */}
            <div className="w-full md:w-80 bg-[#111] border-l border-white/10 flex flex-col">
              <div className="p-4 border-b border-white/10 flex justify-between items-center">
                <h3 className="font-bold text-white">播放列表 ({currentVideoIndex + 1}/{validVideos.length})</h3>
                <button onClick={() => setShowPlayer(false)} className="text-gray-400 hover:text-white hidden md:block">
                  <X size={20} />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {validVideos.map((video, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentVideoIndex(idx)}
                    className={`w-full text-left group transition-all ${
                      currentVideoIndex === idx 
                        ? 'ring-2 ring-neon-cyan bg-white/5' 
                        : 'hover:bg-white/5 border border-transparent'
                    } rounded-lg overflow-hidden p-2 flex gap-3`}
                  >
                    {/* Thumbnail */}
                    <div className="w-24 aspect-video bg-black rounded overflow-hidden flex-shrink-0 relative border border-white/10">
                        {video.generated_assets?.image ? (
                            <img src={video.generated_assets.image} alt={`Scene ${video.originalIndex + 1}`} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-xs text-gray-600">No Img</div>
                        )}
                        {/* Playing indicator */}
                        {currentVideoIndex === idx && (
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                <Play size={12} className="fill-neon-cyan text-neon-cyan" />
                            </div>
                        )}
                    </div>
                    
                    {/* Info */}
                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                        <span className={`text-xs font-medium truncate ${currentVideoIndex === idx ? 'text-neon-cyan' : 'text-gray-300'}`}>
                            镜头 {video.originalIndex + 1}
                        </span>
                        <span className="text-[10px] text-gray-500 truncate mt-1">
                            {video.video_prompt || "无提示词"}
                        </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
});

SegmentCard.displayName = 'SegmentCard';
