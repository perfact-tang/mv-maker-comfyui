import React, { useState, useRef, useImperativeHandle, forwardRef } from 'react';
import { Image, Video, Music, Loader2, X, Play } from 'lucide-react';
import { MVInfo, MVScriptData } from '../types/mv-data';
import { generateComfyImage, executeComfyWorkflow, uploadImageToComfy } from '../utils/comfyApi';
import { useGlobalSettings } from '../stores/useGlobalSettings';
import { VIDEO_GENERATION_WORKFLOW } from '../utils/workflows';

export interface MVInfoCardHandle {
  triggerGenerateImage: () => Promise<void>;
  triggerGenerateVideo: () => Promise<void>;
}

interface MVInfoCardProps {
  info: MVInfo;
  basics?: MVScriptData['basics'];
  previousLastFrame?: string | null;
  onLastFrameGenerated?: (url: string) => void;
  segmentId: number;
  infoIndex: number;
}

export const MVInfoCard = forwardRef<MVInfoCardHandle, MVInfoCardProps>(({ info, basics, previousLastFrame, onLastFrameGenerated, segmentId, infoIndex }, ref) => {
  const isNewScene = info.type === 'New_Scene';
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  // Initialize state from info.generated_assets if available
  const [generatedImage, setGeneratedImage] = useState<string | null>(info.generated_assets?.image || null);
  const [generatedVideo, setGeneratedVideo] = useState<string | null>(info.generated_assets?.video || null);
  const [generatedLastFrame, setGeneratedLastFrame] = useState<string | null>(info.generated_assets?.last_frame || null);
  
  const { selectedWorkflow, updateMVInfoAsset } = useGlobalSettings();
  const [previewMedia, setPreviewMedia] = useState<{ type: 'image' | 'video', url: string } | null>(null);
  const promptRef = useRef<HTMLDivElement>(null);
  const videoPromptRef = useRef<HTMLDivElement>(null);

  const handleGenerate = async () => {
    if (isGenerating) return;
    
    // Get the current text from the contentEditable div or fallback to props
    const currentPrompt = promptRef.current?.innerText || info.image_prompt;
    if (!currentPrompt) return;

    setIsGenerating(true);
    try {
      const imageUrl = await generateComfyImage(currentPrompt, undefined, selectedWorkflow);
      setGeneratedImage(imageUrl);
      updateMVInfoAsset(segmentId, infoIndex, 'image', imageUrl);
    } catch (error) {
      console.error('Generation failed:', error);
      alert('生成失败: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateVideo = async () => {
    if (isGeneratingVideo) return;
    
    // Determine source image: either locally generated image or passed from previous card (for continuity)
    const sourceImage = generatedImage || previousLastFrame;
    
    if (!sourceImage) {
      alert('请先生成参考图 (AI生图) 或等待上一镜头的尾帧生成');
      return;
    }

    const currentVideoPrompt = videoPromptRef.current?.innerText || info.video_prompt;
    const styleDescription = basics?.art_style_description || '';
    const fullPrompt = `${currentVideoPrompt} ${styleDescription}`.trim();

    setIsGeneratingVideo(true);
    try {
      // 1. Upload the generated image to ComfyUI to be used as input
      // Fetch the image blob first
      const imageRes = await fetch(sourceImage);
      const imageBlob = await imageRes.blob();
      // Generate a filename
      const filename = `ref_img_${Date.now()}.png`;
      const uploadedFilename = await uploadImageToComfy(imageBlob, filename);

      // 2. Prepare Workflow
      const workflow = JSON.parse(JSON.stringify(VIDEO_GENERATION_WORKFLOW));

      // Modify nodes
      // Node 52: LoadImage
      if (workflow["52"]) workflow["52"].inputs.image = uploadedFilename;
      
      // Node 88 & 89: Prompt
      if (workflow["88"]) workflow["88"].inputs.value = fullPrompt;
      if (workflow["89"]) workflow["89"].inputs.text = fullPrompt;
      
      // Node 82: Seed
      if (workflow["82"]) workflow["82"].inputs.seed = Math.floor(Math.random() * 1000000000000000);

      // 3. Execute
      const outputs = await executeComfyWorkflow(workflow);
      
      if (outputs.video) {
        setGeneratedVideo(outputs.video);
        updateMVInfoAsset(segmentId, infoIndex, 'video', outputs.video);
      }
      
      if (outputs.images && outputs.images.length > 0) {
        // Assuming the last image is the last frame if multiple are returned, 
        // but our workflow only has one SaveImage (Node 81) for last frame.
        const lastFrameUrl = outputs.images[0];
        setGeneratedLastFrame(lastFrameUrl);
        updateMVInfoAsset(segmentId, infoIndex, 'last_frame', lastFrameUrl);
        
        // Notify parent about the new last frame
        if (onLastFrameGenerated) {
          onLastFrameGenerated(lastFrameUrl);
        }
      }

    } catch (error) {
      console.error('Video generation failed:', error);
      alert('视频生成失败: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setIsGeneratingVideo(false);
    }
  };

  useImperativeHandle(ref, () => ({
    triggerGenerateImage: handleGenerate,
    triggerGenerateVideo: handleGenerateVideo
  }));

  return (
    <div className="glass-card rounded-lg overflow-hidden border border-white/5 flex flex-col md:flex-row group hover:border-white/20 transition duration-300">
      {/* Popups */}
      {(isGenerating || isGeneratingVideo) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="bg-gray-900 border border-neon-cyan/30 p-6 rounded-lg flex flex-col items-center gap-4 shadow-[0_0_30px_rgba(0,255,255,0.1)]">
            <Loader2 size={32} className="text-neon-cyan animate-spin" />
            <p className="text-neon-cyan font-mono text-sm tracking-wider animate-pulse">
              AI处理中，保持屏幕常亮，请稍等。
            </p>
          </div>
        </div>
      )}
      
      {previewMedia && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <button 
            onClick={() => setPreviewMedia(null)}
            className="absolute top-4 right-4 text-white/50 hover:text-white hover:bg-white/10 p-2 rounded-full transition-all z-50"
          >
            <X size={32} />
          </button>
          {previewMedia.type === 'video' ? (
            <video 
              src={previewMedia.url} 
              controls 
              autoPlay 
              className="max-w-full max-h-full rounded shadow-2xl"
            />
          ) : (
            <img 
              src={previewMedia.url} 
              alt="Full Screen Preview" 
              className="max-w-full max-h-full object-contain rounded shadow-2xl"
            />
          )}
        </div>
      )}

      <div className="w-full md:w-32 bg-black/40 p-4 flex flex-col justify-center items-center border-b md:border-b-0 md:border-r border-white/5">
        <span className="text-xs font-mono font-bold text-white mb-1">
          {info.timestamp.split(' - ')[0]}
        </span>
        <span className="text-[10px] text-gray-500 uppercase tracking-wider">开始</span>
      </div>
      
      <div className="flex-1 p-5">
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <span className={`type-badge ${isNewScene ? 'type-new' : 'type-continuity'} whitespace-nowrap`}>
            {isNewScene ? '新场景' : '连续镜头'}
          </span>
          <div className="flex items-center gap-2 text-xs text-gray-500 italic">
            <Music size={12} />
            <span>{info.lyrics !== '(No lyrics)' ? info.lyrics : '纯音乐 / 无歌词'}</span>
          </div>
        </div>
        
        {!isNewScene && (
           <div className="flex justify-end">
             <div className="w-full md:w-48 aspect-video bg-black/50 rounded border border-white/5 flex items-center justify-center shrink-0 relative overflow-hidden group">
               {previousLastFrame ? (
                 <>
                   <img 
                     src={previousLastFrame} 
                     alt="Previous Last Frame" 
                     className="w-full h-full object-cover"
                   />
                   <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                     <span className="text-[10px] text-white bg-black/50 px-2 py-1 rounded">上一镜头尾帧</span>
                   </div>
                 </>
               ) : (
                 <span className="text-[10px] text-gray-600 uppercase tracking-wider">16:9 预览区域</span>
               )}
             </div>
           </div>
        )}
        
        <div className="space-y-2">
          {info.image_prompt && (
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="flex justify-between items-center mb-1.5">
                    <label className="text-[10px] uppercase tracking-widest text-neon-cyan font-bold flex items-center gap-1.5">
                      <Image size={10} />
                      画面提示词 (T2I)
                    </label>
                    <button 
                        onClick={handleGenerate}
                        disabled={isGenerating}
                        className="bg-neon-cyan/10 hover:bg-neon-cyan/20 text-neon-cyan text-[10px] px-2 py-1 rounded border border-neon-cyan/30 hover:border-neon-cyan/60 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                    >
                        {isGenerating ? <Loader2 size={10} className="animate-spin" /> : null}
                        AI生图
                    </button>
                </div>
                <div 
                  ref={promptRef}
                  contentEditable
                  suppressContentEditableWarning
                  className="bg-black/50 p-3 rounded text-xs text-gray-300 border border-cyan-900/30 hover:border-cyan-500/50 transition cursor-text selection:bg-neon-cyan/30 h-full focus:outline-none focus:border-neon-cyan focus:ring-1 focus:ring-neon-cyan/50"
                >
                  {info.image_prompt}
                </div>
              </div>
              
              <div className="flex flex-col mt-6 gap-2">
                  <div className="w-full md:w-48 aspect-video bg-black/50 rounded border border-white/5 flex items-center justify-center shrink-0 relative group overflow-hidden">
                    {generatedImage ? (
                        <>
                        <img 
                            src={generatedImage} 
                            alt="AI Generated" 
                            className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform duration-300"
                            onClick={() => setPreviewMedia({ type: 'image', url: generatedImage })}
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors pointer-events-none" />
                        </>
                    ) : (
                        <span className="text-[10px] text-gray-600 uppercase tracking-wider">16:9 预览区域</span>
                    )}
                  </div>
              </div>
            </div>
          )}
          
          <div className="flex flex-col md:flex-row gap-4 pt-12 pb-4">
            <div className="flex-1">
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-[10px] uppercase tracking-widest text-neon-magenta font-bold flex items-center gap-1.5">
                  <Video size={10} />
                  视频提示词 (I2V / Motion)
                </label>
                <button 
                  onClick={handleGenerateVideo}
                  disabled={isGeneratingVideo}
                  className="bg-neon-magenta/10 hover:bg-neon-magenta/20 text-neon-magenta text-[10px] px-2 py-1 rounded border border-neon-magenta/30 hover:border-neon-magenta/60 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                >
                  {isGeneratingVideo ? <Loader2 size={10} className="animate-spin" /> : null}
                  AI生视频
                </button>
              </div>
              <div 
                ref={videoPromptRef}
                contentEditable
                suppressContentEditableWarning
                className="bg-black/50 p-3 rounded text-xs text-gray-300 border border-magenta-900/30 hover:border-magenta-500/50 transition cursor-text selection:bg-neon-magenta/30 h-full focus:outline-none focus:border-neon-magenta focus:ring-1 focus:ring-neon-magenta/50"
              >
                {info.video_prompt}
              </div>
            </div>
            <div className="flex flex-col pt-[21px] gap-2">
              <div 
                className="w-full md:w-48 aspect-video bg-black/50 rounded border border-white/5 flex items-center justify-center shrink-0 relative group overflow-hidden cursor-pointer"
                onClick={() => generatedVideo && setPreviewMedia({ type: 'video', url: generatedVideo })}
              >
                {generatedVideo ? (
                  <>
                    <video 
                      src={generatedVideo} 
                      className="w-full h-full object-cover pointer-events-none"
                      loop
                      autoPlay
                      muted
                    />
                    <div className="absolute top-1 right-1 bg-black/50 rounded p-1 group-hover:bg-neon-cyan/80 transition-colors">
                      <Play size={10} className="text-white" />
                    </div>
                  </>
                ) : (
                  <span className="text-[10px] text-gray-600 uppercase tracking-wider">16:9 预览区域</span>
                )}
              </div>
              
              {/* Last Frame Preview if available */}
              {generatedLastFrame && (
                <div className="w-full md:w-48 aspect-video bg-black/50 rounded border border-white/5 flex items-center justify-center shrink-0 relative group overflow-hidden animate-in fade-in slide-in-from-top-2">
                  <img 
                    src={generatedLastFrame} 
                    alt="Last Frame" 
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-[8px] text-white p-1 text-center">
                    尾帧 (Last Frame)
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

MVInfoCard.displayName = "MVInfoCard";
