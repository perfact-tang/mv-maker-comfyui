import React, { useRef, useImperativeHandle, forwardRef } from 'react';
import { Play, X, Sparkles, Loader2, FileArchive } from 'lucide-react';
import { StoryboardSegment, MVScriptData } from '../types/mv-data';
import { MVInfoCard, MVInfoCardHandle } from './MVInfoCard';
import { GenerationConfirmModal } from './GenerationConfirmModal';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

export interface SegmentCardHandle {
  triggerGenerateAll: (skipConfirm?: boolean, mode?: 'continue' | 'restart') => Promise<void>;
}

interface SegmentCardProps {
  segment: StoryboardSegment;
  basics: MVScriptData['basics'];
}

export const SegmentCard = forwardRef<SegmentCardHandle, SegmentCardProps>(({ segment, basics }, ref) => {
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

  // Check if all videos for this segment are generated
  const isAllGenerated = segment.mvinfo.every(info => 
    !info.video_prompt || (info.video_prompt && info.generated_assets?.video)
  );

  const handleDownloadSegment = async () => {
      setIsDownloading(true);
      try {
        const zip = new JSZip();
        const videoFolder = zip.folder(`segment_${segment.segment_id}_videos`);
        let lrcContent = `[ti:Segment ${segment.segment_id}]\n[ar:MV Maker]\n`;
        
        const promises: Promise<void>[] = [];

        segment.mvinfo.forEach((info, index) => {
          // Add to LRC
          if (info.video_prompt) {
             const startTime = info.timestamp.split(' - ')[0]; // "00:00"
             // Format to 00:00.00 if it's just 00:00
             const formattedTime = `[${startTime}.00]`;
             // Clean prompt
             const cleanPrompt = info.video_prompt.replace(/\n/g, ' ');
             lrcContent += `${formattedTime}${cleanPrompt}\n`;
          }

          // Add video
          if (info.generated_assets?.video) {
             const filename = `segment_${segment.segment_id}_scene_${index + 1}.mp4`;
             const p = fetch(info.generated_assets.video)
               .then(res => res.blob())
               .then(blob => {
                 videoFolder?.file(filename, blob);
               })
               .catch(err => console.error("Failed to fetch video", err));
             promises.push(p);
          }
        });

        await Promise.all(promises);

        // Add LRC
        zip.file(`segment_${segment.segment_id}_prompts.lrc`, lrcContent);

        const content = await zip.generateAsync({ type: "blob" });
        saveAs(content, `mv_segment_${segment.segment_id}_package.zip`);

      } catch (error) {
        console.error("Error downloading segment:", error);
        alert("下载失败，请重试");
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
  
  const executeBatchGeneration = async (mode: 'continue' | 'restart') => {
    setIsGeneratingAll(true);
    try {
      let startIndex = 0;
      
      if (mode === 'continue') {
        startIndex = segment.mvinfo.findIndex(info => !info.generated_assets?.video);
        if (startIndex === -1) {
            // Check if all are done, if so, we can consider it "complete"
            // For single segment action, alert user.
            // For global action, this check might happen outside or we just silently finish.
            // Since this function is called after confirmation/decision, alerting is fine for manual trigger.
            // But for global trigger (skipConfirm=true), we might want to avoid alerts if possible, 
            // though executeBatchGeneration is usually called when we *know* we need to generate something.
            // Let's keep it simple.
        }
      }

      if (startIndex !== -1) {
        // Iterate through cards starting from the determined index
        for (let i = startIndex; i < segment.mvinfo.length; i++) {
            const cardRef = cardRefs.current[i];
            if (cardRef) {
                // 1. Trigger Image Generation (T2I)
                await cardRef.triggerGenerateImage();
                
                // 2. Trigger Video Generation (I2V)
                await cardRef.triggerGenerateVideo();

                // Wait 30 seconds for data stability (e.g. last frame availability)
                // 刚完成一个视频生成后，先等到30秒，让尾帧的数据获得到以后再开始下一个AI生视频或者AI生图
                console.log(`[Batch] Video ${i} generated. Waiting 30s before next step...`);
                await new Promise(resolve => setTimeout(resolve, 30000));
            }
        }
      }
      
      // We don't alert here anymore to avoid spamming alerts during global generation.
      // The parent caller (SegmentCard button or StoryboardTimeline) handles completion notification.
      if (!isGeneratingAll && !isConfirmModalOpen) {
          // This condition is tricky because state updates are async.
          // Better to return a promise that resolves when done.
      }
    } catch (error) {
      console.error("Batch generation failed:", error);
      // alert("批量生成过程中出现错误，任务已停止。"); 
      // Suppress alert for individual segment failures during global batch to allow others to proceed?
      // Or maybe just log it. Let's keep it minimal.
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
                 if (!needsWork) return;
             }
             await executeBatchGeneration(forceMode);
             return;
        }

        // Fallback default logic (shouldn't be reached if StoryboardTimeline passes mode)
        if (hasGeneratedContent) {
            const needsWork = segment.mvinfo.some(info => !info.generated_assets?.video);
            if (!needsWork) return; 
            await executeBatchGeneration('continue');
        } else {
            await executeBatchGeneration('restart');
        }
        return;
    }

    // Manual trigger logic (Segment level button)
    if (hasGeneratedContent) {
        setIsConfirmModalOpen(true);
    } else {
        // No content, simple confirm
        if (window.confirm(`确定要自动生成该分段所有 ${segment.mvinfo.length} 个视频吗？这将按顺序依次执行生图和生视频操作。`)) {
            await executeBatchGeneration('restart');
            alert("分段视频生成任务已完成！");
        }
    }
  };

  useImperativeHandle(ref, () => ({
    triggerGenerateAll: (skipConfirm, mode) => handleGenerateAllVideos(skipConfirm, mode)
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
            await executeBatchGeneration(mode);
            alert("分段视频生成任务已完成！");
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

        {isAllGenerated && (
            <button 
              onClick={handleDownloadSegment}
              disabled={isDownloading}
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
            previousLastFrame={idx > 0 ? lastFrames[idx - 1] : undefined}
            onLastFrameGenerated={(url) => setLastFrames(prev => ({...prev, [idx]: url}))}
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
