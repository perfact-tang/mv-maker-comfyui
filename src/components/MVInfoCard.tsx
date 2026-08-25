import React, { useState, useRef, useImperativeHandle, forwardRef, useCallback } from 'react';
import { AudioLines, Image, Video, Music, Loader2, X, Play, UploadCloud } from 'lucide-react';
import { MVInfo, MVScriptData } from '../types/mv-data';
import { generateComfyImage, executeComfyWorkflow, uploadAudioToComfy, uploadImageToComfy } from '../utils/comfyApi';
import { useGlobalSettings } from '../stores/useGlobalSettings';
import { VIDEO_WORKFLOWS } from '../utils/workflows';
import { applyVideoDimensions, VIDEO_DIMENSIONS } from '../utils/characterVideoWorkflow';
import { ImageEditModal } from './ImageEditModal';
import { H3ShotControls } from './H3ShotControls';
import { configureH3AudioInputs, configureH3VisualInputs } from '../utils/h3ShotWorkflow';
import { resolveReferenceImage } from '../utils/characterReferences';
import { composeStoryboardImagePrompt } from '../utils/imagePrompt';
import { muxOriginalDriveAudio } from '../utils/audioProduction';
import { compressProjectImage, describeImageOptimization, isStorageQuotaError } from '../utils/projectImageCompression';

export interface MVInfoCardHandle {
  triggerGenerateVideo: () => Promise<{ videoUrl: string; lastFrameUrl: string }>;
  triggerGenerateFrames: (regenerateExisting?: boolean) => Promise<{ generated: number; reused: number; deferred: number }>;
}

interface MVInfoCardProps {
  info: MVInfo;
  basics?: MVScriptData['basics'];
  previousLastFrame?: string | null;
  onLastFrameGenerated?: (url: string | null) => void;
  segmentId: number;
  infoIndex: number;
}

const captureImageAsPng = async (image: HTMLImageElement): Promise<Blob | null> => {
  try {
    if (!image.complete || image.naturalWidth === 0 || image.naturalHeight === 0) return null;
    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext('2d');
    if (!context) return null;
    context.drawImage(image, 0, 0);
    return await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
  } catch {
    return null;
  }
};

const readFirstAvailableImage = async (
  candidates: Array<string | null | undefined>,
  cachedImages: Map<string, Blob>,
): Promise<Blob> => {
  const uniqueCandidates = [...new Set(candidates.filter((url): url is string => Boolean(url)))];

  for (const url of uniqueCandidates) {
    const cached = cachedImages.get(url);
    if (cached && cached.size > 0) return cached;

    try {
      const response = await fetch(url);
      if (!response.ok) continue;
      const blob = await response.blob();
      if (blob.size === 0) continue;
      cachedImages.set(url, blob);
      return blob;
    } catch {
      // Try the next image source from the same card.
    }
  }

  throw new Error('当前参考图已经失效，且没有可用的上一镜头尾帧');
};

export const MVInfoCard = forwardRef<MVInfoCardHandle, MVInfoCardProps>(({ info, basics, previousLastFrame, onLastFrameGenerated, segmentId, infoIndex }, ref) => {
  const isNewScene = info.type === 'New_Scene';
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  // Initialize state from info.generated_assets if available
  const [generatedImage, setGeneratedImage] = useState<string | null>(info.generated_assets?.image || null);
  const [generatedVideo, setGeneratedVideo] = useState<string | null>(info.generated_assets?.video || null);
  const [generatedLastFrame, setGeneratedLastFrame] = useState<string | null>(info.generated_assets?.last_frame || null);
  const [generatedTargetLastFrame, setGeneratedTargetLastFrame] = useState<string | null>(info.generated_assets?.target_last_frame || null);
  const [isImageEditOpen, setIsImageEditOpen] = useState(false);
  const [isUploadingFrame, setIsUploadingFrame] = useState(false);
  const [frameUploadStatus, setFrameUploadStatus] = useState<{
    target: 'first-frame' | 'target-frame';
    tone: 'success' | 'error';
    message: string;
  } | null>(null);
  
  const {
    selectedWorkflow,
    selectedVideoWorkflow,
    videoOrientation,
    updateMVInfoAsset,
    updateMVInfoFirstFrameSource,
    updateMVInfoImagePrompt,
    updateMVInfoLastFrameImagePrompt,
    updateMuxStatus,
    replaceMVInfoImage,
    mvData,
    h3GenerationMode,
    h3AudioMode,
    h3VideoLength,
    h3ReferenceImages,
  } = useGlobalSettings();
  const shotPlan = info.generation_plan;
  const firstFrameSource = info.first_frame_source ?? (info.type === 'Last_Frame_Continuity' ? 'previous-tail' : 't2i');
  const effectiveH3Mode = shotPlan?.mode ?? (h3GenerationMode === 'reference-images' ? 'Ref2VA' : 'I2VA');
  const effectiveH3AudioMode = ['music3-audio-first', 'qwen3-tts-audio-first'].includes(mvData?.director_plan?.audio_plan?.mode || '')
    ? 'drive-audio'
    : shotPlan?.audio_mode ?? h3AudioMode;
  const effectiveH3Length = shotPlan?.duration_frames ?? h3VideoLength;
  const characterReferences = (mvData?.characters ?? [])
    .filter((character) => Boolean(character.generated_assets?.image))
    .map((character) => ({
      name: character.name,
      role: character.role,
      imageUrl: character.generated_assets!.image!,
    }));
  const [previewMedia, setPreviewMedia] = useState<{ type: 'image' | 'video', url: string } | null>(null);
  const promptRef = useRef<HTMLTextAreaElement>(null);
  const videoPromptRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const targetFrameInputRef = useRef<HTMLInputElement>(null);
  const sourceImageBlobCacheRef = useRef<Map<string, Blob>>(new Map());
  
  const handleUploadImage = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || isUploadingFrame) return;
    setIsUploadingFrame(true);
    setFrameUploadStatus(null);
    try {
      const compressed = await compressProjectImage(file);
      updateMVInfoAsset(segmentId, infoIndex, 'image', compressed.dataUrl);
      setGeneratedImage(compressed.dataUrl);
      setFrameUploadStatus({ target: 'first-frame', tone: 'success', message: describeImageOptimization(compressed) });
    } catch (error) {
      setFrameUploadStatus({
        target: 'first-frame',
        tone: 'error',
        message: isStorageQuotaError(error)
          ? '浏览器项目存储空间仍然不足，请先保存项目备份并清理旧项目数据。'
          : error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsUploadingFrame(false);
    }
  };

  const handleGenerate = async () => {
    if (isGenerating) return;
    
    const currentPrompt = promptRef.current?.value || info.image_prompt;
    if (!currentPrompt) return;

    setIsGenerating(true);
    try {
      const imageUrl = await generateComfyImage(
        composeStoryboardImagePrompt(currentPrompt, basics?.art_style_description, videoOrientation),
        undefined,
        selectedWorkflow,
        VIDEO_DIMENSIONS[videoOrientation],
      );
      setGeneratedImage(imageUrl);
      updateMVInfoAsset(segmentId, infoIndex, 'image', imageUrl);

      // Wait for 3 seconds before finishing as requested
      await new Promise(resolve => setTimeout(resolve, 3000));
    } catch (error) {
      console.error('Generation failed:', error);
      alert('生成失败: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleTargetFrameUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || isUploadingFrame) return;
    setIsUploadingFrame(true);
    setFrameUploadStatus(null);
    try {
      const compressed = await compressProjectImage(file);
      updateMVInfoAsset(segmentId, infoIndex, 'target_last_frame', compressed.dataUrl);
      setGeneratedTargetLastFrame(compressed.dataUrl);
      setFrameUploadStatus({ target: 'target-frame', tone: 'success', message: describeImageOptimization(compressed) });
    } catch (error) {
      setFrameUploadStatus({
        target: 'target-frame',
        tone: 'error',
        message: isStorageQuotaError(error)
          ? '浏览器项目存储空间仍然不足，请先保存项目备份并清理旧项目数据。'
          : error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsUploadingFrame(false);
    }
  };

  const handleGenerateTargetFrame = async () => {
    if (!info.last_frame_image_prompt?.trim() || isGenerating) return;
    setIsGenerating(true);
    try {
      const imageUrl = await generateComfyImage(
        composeStoryboardImagePrompt(info.last_frame_image_prompt, basics?.art_style_description, videoOrientation),
        undefined,
        selectedWorkflow,
        VIDEO_DIMENSIONS[videoOrientation],
      );
      setGeneratedTargetLastFrame(imageUrl);
      updateMVInfoAsset(segmentId, infoIndex, 'target_last_frame', imageUrl);
    } catch (error) {
      alert('目标尾帧生成失败: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateVideo = useCallback(async (): Promise<{ videoUrl: string; lastFrameUrl: string }> => {
    if (isGeneratingVideo) throw new Error('当前镜头已经在生成中');
    const isH3Workflow = selectedVideoWorkflow === 'H3 Turbo Stable 4V4A';
    const usesH3References = isH3Workflow && effectiveH3Mode === 'Ref2VA';
    const usesH3LastFrame = isH3Workflow && effectiveH3Mode === 'FL2VA';
    const liveProject = useGlobalSettings.getState().mvData;
    const orderedShots = (liveProject?.storyboard ?? [])
      .flatMap((segment) => segment.mvinfo.map((shot, index) => ({ segmentId: segment.segment_id, index, shot })));
    const currentShotIndex = orderedShots.findIndex((entry) => entry.segmentId === segmentId && entry.index === infoIndex);
    const liveCurrentShot = currentShotIndex >= 0 ? orderedShots[currentShotIndex].shot : info;
    const audioFirstPlan = liveProject?.director_plan?.audio_plan;
    const usesMusic3AudioFirst = ['music3-audio-first', 'qwen3-tts-audio-first'].includes(audioFirstPlan?.mode || '');
    if (usesMusic3AudioFirst && audioFirstPlan.alignment_status !== 'locked') {
      throw new Error('声音时间线尚未锁定，请先到“声音制作”完成校准和切分');
    }
    const driveAudioUrl = liveCurrentShot.generated_assets?.drive_audio || liveCurrentShot.generated_assets?.audio;
    const livePreviousTail = currentShotIndex > 0
      ? orderedShots[currentShotIndex - 1].shot.generated_assets?.last_frame
      : undefined;
    let sourceImage = firstFrameSource === 'previous-tail'
      ? livePreviousTail || previousLastFrame || null
      : liveCurrentShot.generated_assets?.image || generatedImage || null;

    if (!usesH3References && !sourceImage && firstFrameSource === 't2i') {
      const imagePrompt = promptRef.current?.value.trim() || liveCurrentShot.image_prompt?.trim();
      if (!imagePrompt) throw new Error('选择了“新画面 T2I”，但没有画面提示词');
      sourceImage = await generateComfyImage(
        composeStoryboardImagePrompt(imagePrompt, basics?.art_style_description, videoOrientation),
        undefined,
        selectedWorkflow,
        VIDEO_DIMENSIONS[videoOrientation],
      );
      setGeneratedImage(sourceImage);
      updateMVInfoAsset(segmentId, infoIndex, 'image', sourceImage);
    }
    if (!usesH3References && !sourceImage) {
      throw new Error('选择了“承接上一尾帧”，但上一镜头尚未生成可用尾帧');
    }

    let targetLastFrame = liveCurrentShot.generated_assets?.target_last_frame || generatedTargetLastFrame || null;
    if (usesH3LastFrame && !targetLastFrame) {
      const targetPrompt = liveCurrentShot.last_frame_image_prompt?.trim();
      if (!targetPrompt) throw new Error('FL2VA 缺少目标尾帧和 last_frame_image_prompt');
      targetLastFrame = await generateComfyImage(
        composeStoryboardImagePrompt(targetPrompt, basics?.art_style_description, videoOrientation),
        undefined,
        selectedWorkflow,
        VIDEO_DIMENSIONS[videoOrientation],
      );
      setGeneratedTargetLastFrame(targetLastFrame);
      updateMVInfoAsset(segmentId, infoIndex, 'target_last_frame', targetLastFrame);
    }
    const requiresExternalH3Audio = effectiveH3AudioMode === 'drive-audio' || effectiveH3AudioMode === 'reference-audio';
    if (isH3Workflow && requiresExternalH3Audio && !driveAudioUrl) {
      throw new Error(`声明了 ${effectiveH3AudioMode}，但尚未分配音频`);
    }

    const shotReferenceImages = shotPlan?.mode === 'Ref2VA'
      ? shotPlan.reference_images.map((reference) => {
          const resolvedImage = resolveReferenceImage(mvData?.characters ?? [], reference);
          return {
            dataUrl: resolvedImage?.dataUrl || '',
            filename: resolvedImage?.filename || `${reference.source_character || reference.label}.png`,
            prompt: reference.prompt,
          };
        })
      : h3ReferenceImages.filter((image) => Boolean(image?.dataUrl || image?.prompt?.trim())).map((image) => ({
          dataUrl: image?.dataUrl || '',
          filename: image?.filename || '',
          prompt: image?.prompt || '',
        }));
    if (usesH3References) {
      if (shotReferenceImages.length < 1 || shotReferenceImages.length > 2) {
        throw new Error('Ref2VA 需要一至两张参考图');
      }
      const missingImage = shotReferenceImages.findIndex((image) => !image.dataUrl);
      if (missingImage >= 0) {
        throw new Error(`Ref2VA 缺少参考图 ${missingImage + 1}`);
      }
      const missingPrompt = shotReferenceImages.findIndex((image) => !image.prompt.trim());
      if (missingPrompt >= 0) {
        throw new Error(`Ref2VA 缺少参考图 ${missingPrompt + 1} 的声明`);
      }
    }

    const currentVideoPrompt = videoPromptRef.current?.innerText || info.video_prompt;
    const styleDescription = basics?.art_style_description || '';
    const referencePrompt = usesH3References
      ? shotReferenceImages.map((image) => image.prompt.trim()).filter(Boolean).join('\n')
      : '';
    const fullPrompt = shotPlan
      ? [referencePrompt, currentVideoPrompt].filter(Boolean).join('\n').trim()
      : [referencePrompt, currentVideoPrompt, styleDescription].filter(Boolean).join('\n').trim();

    setIsGeneratingVideo(true);
    try {
      // 1. Upload the generated image to ComfyUI to be used as input
      let uploadedFilename: string | null = null;
      if (sourceImage && !usesH3References) {
        const imageBlob = await readFirstAvailableImage(
          firstFrameSource === 'previous-tail'
            ? [previousLastFrame, sourceImage]
            : [generatedImage, sourceImage],
          sourceImageBlobCacheRef.current,
        );
        uploadedFilename = await uploadImageToComfy(imageBlob, `ref_img_${Date.now()}.png`);
      }

      let uploadedTargetLastFrame: string | null = null;
      if (usesH3LastFrame && targetLastFrame) {
        const targetBlob = await readFirstAvailableImage([targetLastFrame], sourceImageBlobCacheRef.current);
        uploadedTargetLastFrame = await uploadImageToComfy(targetBlob, `h3_target_last_frame_${Date.now()}.png`);
      }

      let uploadedH3References: string[] = [];
      if (usesH3References) {
        uploadedH3References = await Promise.all(shotReferenceImages.map(async (image, index) => {
          const imageResponse = await fetch(image.dataUrl);
          if (!imageResponse.ok) throw new Error(`参考图 ${index + 1} 读取失败 (${imageResponse.status})`);
          const imageBlob = await imageResponse.blob();
          return uploadImageToComfy(imageBlob, `h3_reference_${index + 1}_${Date.now()}.png`);
        }));
      }

      let uploadedAudioFilename: string | null = null;
      const shouldUploadAudio = selectedVideoWorkflow === 'LTX2.3 V2I'
        || (isH3Workflow && requiresExternalH3Audio);
      if (shouldUploadAudio && driveAudioUrl) {
        const audioRes = await fetch(driveAudioUrl);
        if (!audioRes.ok) throw new Error(`Drive Audio 读取失败 (${audioRes.status})`);
        const audioBlob = await audioRes.blob();
        const audioFilename = `scene_${segmentId}_${infoIndex + 1}_${Date.now()}.mp3`;
        uploadedAudioFilename = await uploadAudioToComfy(audioBlob, audioFilename);
      }

      // 2. Prepare Workflow
      // LTX2.3 V2I has mandatory audio nodes, so use its video-only sibling when
      // the optional audio upload was skipped. H3 can also explicitly export a silent video.
      const effectiveVideoWorkflow = selectedVideoWorkflow === 'LTX2.3 V2I' && !uploadedAudioFilename
        ? 'LTX2.3'
        : selectedVideoWorkflow;
      const selectedWorkflowJson = VIDEO_WORKFLOWS[effectiveVideoWorkflow as keyof typeof VIDEO_WORKFLOWS] || VIDEO_WORKFLOWS['SmoothV2'];
      const workflow = JSON.parse(JSON.stringify(selectedWorkflowJson));
      applyVideoDimensions(workflow, VIDEO_DIMENSIONS[videoOrientation]);

      // Node 82 (SmoothV2/V1) or 86 (Wan22) or 320:277/320:276 (LTX2.3): Seed
      const seed = Math.floor(Math.random() * 1000000000000000);
      
      if (isH3Workflow) {
        configureH3VisualInputs(workflow, {
          prompt: fullPrompt,
          length: effectiveH3Length,
          mode: effectiveH3Mode,
          seed,
          firstFrame: uploadedFilename,
          lastFrame: uploadedTargetLastFrame,
          referenceImages: uploadedH3References,
        });

        configureH3AudioInputs(workflow, {
          audioMode: effectiveH3AudioMode,
          uploadedAudioFilename,
        });
      } else if (effectiveVideoWorkflow === 'LTX2.3') {
        // LTX2.3 specific node mapping
        if (workflow["269"] && uploadedFilename) workflow["269"].inputs.image = uploadedFilename;
        if (workflow["320:319"]) workflow["320:319"].inputs.value = fullPrompt;
        if (workflow["320:277"]) workflow["320:277"].inputs.noise_seed = seed;
        if (workflow["320:276"]) workflow["320:276"].inputs.noise_seed = seed;
      } else if (effectiveVideoWorkflow === 'LTX2.3 V2I') {
        // LTX2.3 V2I: image + mp3 audio + prompt workflow
        if (workflow["269"] && uploadedFilename) workflow["269"].inputs.image = uploadedFilename;
        if (workflow["276"] && uploadedAudioFilename) {
          workflow["276"].inputs.audio = uploadedAudioFilename;
          delete workflow["276"].inputs.audioUI;
        }
        if (workflow["340:319"]) workflow["340:319"].inputs.value = fullPrompt;
        if (workflow["340:285"]) workflow["340:285"].inputs.noise_seed = seed;
        if (workflow["340:286"]) workflow["340:286"].inputs.noise_seed = Math.floor(Math.random() * 1000000000000000);

        // The attached workflow saves the video but does not save a last frame.
        // Add a tiny tail-frame branch so continuation scenes can use it.
        if (!workflow["340:342"] && workflow["340:316"]) {
          workflow["340:342"] = {
            inputs: {
              from_direction: "end",
              count: 1,
              image: ["340:316", 0],
            },
            class_type: "Pick From Batch (mtb)",
            _meta: {
              title: "Pick Last Frame",
            },
          };
        }
        if (!workflow["340:343"]) {
          workflow["340:343"] = {
            inputs: {
              filename_prefix: "video/LTX_2.3_ia2v_LASTFRAME",
              images: ["340:342", 0],
            },
            class_type: "SaveImage",
            _meta: {
              title: "保存最后一帧",
            },
          };
        }
      } else {
        // Node 52 or 97: LoadImage
        if (workflow["52"] && uploadedFilename) workflow["52"].inputs.image = uploadedFilename;
        if (workflow["97"] && uploadedFilename) workflow["97"].inputs.image = uploadedFilename;
        
        // Node 88 & 89 (SmoothV2/V1) or 93 & 89 (Wan22): Prompt
        if (workflow["88"]) workflow["88"].inputs.value = fullPrompt;
        if (workflow["89"]) {
          if (selectedVideoWorkflow === 'Wan22') {
             if (workflow["93"]) workflow["93"].inputs.text = fullPrompt;
          } else {
             if (workflow["89"]) workflow["89"].inputs.text = fullPrompt;
          }
        }
        
        if (workflow["82"]) workflow["82"].inputs.seed = seed;
        if (workflow["86"]) workflow["86"].inputs.noise_seed = seed;
      }

      // 3. Execute
      const outputs = await executeComfyWorkflow(workflow);
      if (!outputs.video) throw new Error('ComfyUI 工作流完成但没有返回视频文件');
      const lastFrameUrl = outputs.images?.find(url => url.includes('type=output')) || outputs.images?.[0];
      if (!lastFrameUrl) throw new Error('ComfyUI 工作流完成但没有返回尾帧，无法保证后续镜头连续生成');

      let finalVideoUrl = outputs.video;
      if (usesMusic3AudioFirst) {
        if (!driveAudioUrl) throw new Error('声音优先镜头缺少千问配音 / Music 3 配乐形成的 Drive Audio');
        updateMVInfoAsset(segmentId, infoIndex, 'source_video', outputs.video);
        updateMuxStatus(segmentId, infoIndex, 'pending');
        try {
          finalVideoUrl = await muxOriginalDriveAudio(
            liveProject!.proposal_id,
            liveCurrentShot.shot_id || `segment-${segmentId}-shot-${infoIndex + 1}`,
            outputs.video,
            driveAudioUrl,
          );
          updateMuxStatus(segmentId, infoIndex, 'ready');
        } catch (muxError) {
          updateMuxStatus(segmentId, infoIndex, 'failed', muxError instanceof Error ? muxError.message : String(muxError));
          throw muxError;
        }
      }
      setGeneratedVideo(finalVideoUrl);
      updateMVInfoAsset(segmentId, infoIndex, 'video', finalVideoUrl);
      setGeneratedLastFrame(lastFrameUrl);
      updateMVInfoAsset(segmentId, infoIndex, 'last_frame', lastFrameUrl);
      onLastFrameGenerated?.(lastFrameUrl);
      return { videoUrl: finalVideoUrl, lastFrameUrl };

    } catch (error) {
      console.error('Video generation failed:', error);
      throw error;
    } finally {
      setIsGeneratingVideo(false);
    }
  }, [
    basics?.art_style_description,
    generatedImage,
    effectiveH3AudioMode,
    firstFrameSource,
    effectiveH3Length,
    effectiveH3Mode,
    generatedTargetLastFrame,
    h3ReferenceImages,
    info,
    infoIndex,
    isGeneratingVideo,
    onLastFrameGenerated,
    previousLastFrame,
    segmentId,
    selectedVideoWorkflow,
    selectedWorkflow,
    shotPlan,
    updateMVInfoAsset,
    updateMuxStatus,
    videoOrientation,
    mvData?.characters,
  ]);

  const handleVideoButtonClick = useCallback(async () => {
    try {
      await handleGenerateVideo();
    } catch (error) {
      alert('视频生成失败: ' + (error instanceof Error ? error.message : String(error)));
    }
  }, [handleGenerateVideo]);

  const handleGenerateFrames = useCallback(async (regenerateExisting = false): Promise<{ generated: number; reused: number; deferred: number }> => {
    const liveProject = useGlobalSettings.getState().mvData;
    const orderedShots = (liveProject?.storyboard ?? [])
      .flatMap((segment) => segment.mvinfo.map((shot, index) => ({ segmentId: segment.segment_id, index, shot })));
    const currentIndex = orderedShots.findIndex((entry) => entry.segmentId === segmentId && entry.index === infoIndex);
    const liveShot = currentIndex >= 0 ? orderedShots[currentIndex].shot : info;
    let generated = 0;
    let reused = 0;
    let deferred = 0;

    if (effectiveH3Mode === 'Ref2VA') {
      // Ref2VA uses the two declared references instead of a generated first frame.
    } else if (firstFrameSource === 'previous-tail') {
      const previousTail = currentIndex > 0 ? orderedShots[currentIndex - 1].shot.generated_assets?.last_frame : undefined;
      if (previousTail) reused += 1;
      else deferred += 1;
    } else if (regenerateExisting || !liveShot.generated_assets?.image) {
      const prompt = promptRef.current?.value.trim() || liveShot.image_prompt?.trim();
      if (!prompt) throw new Error('T2I 首帧缺少画面提示词');
      const imageUrl = await generateComfyImage(
        composeStoryboardImagePrompt(prompt, basics?.art_style_description, videoOrientation),
        undefined,
        selectedWorkflow,
        VIDEO_DIMENSIONS[videoOrientation],
      );
      setGeneratedImage(imageUrl);
      updateMVInfoAsset(segmentId, infoIndex, 'image', imageUrl);
      generated += 1;
    } else {
      reused += 1;
    }

    if (effectiveH3Mode === 'FL2VA') {
      if (regenerateExisting || !liveShot.generated_assets?.target_last_frame) {
        const targetPrompt = liveShot.last_frame_image_prompt?.trim();
        if (!targetPrompt) throw new Error('FL2VA 目标尾帧缺少提示词');
        const targetUrl = await generateComfyImage(
          composeStoryboardImagePrompt(targetPrompt, basics?.art_style_description, videoOrientation),
          undefined,
          selectedWorkflow,
          VIDEO_DIMENSIONS[videoOrientation],
        );
        setGeneratedTargetLastFrame(targetUrl);
        updateMVInfoAsset(segmentId, infoIndex, 'target_last_frame', targetUrl);
        generated += 1;
      } else {
        reused += 1;
      }
    }

    return { generated, reused, deferred };
  }, [
    basics?.art_style_description,
    effectiveH3Mode,
    firstFrameSource,
    info,
    infoIndex,
    segmentId,
    selectedWorkflow,
    updateMVInfoAsset,
    videoOrientation,
  ]);

  useImperativeHandle(ref, () => ({
    triggerGenerateVideo: handleGenerateVideo,
    triggerGenerateFrames: handleGenerateFrames,
  }), [handleGenerateFrames, handleGenerateVideo]);

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

      <ImageEditModal
        isOpen={isImageEditOpen}
        characterName={`分段 ${segmentId} · 小段 ${infoIndex + 1}`}
        currentImage={generatedImage || undefined}
        sourceHelper="当前视频首帧 · 修改后将被覆盖"
        successMessage="新图已生成，并已覆盖当前视频首帧。"
        staleOutputWarning="生成后，当前镜头基于旧首帧生成的视频和尾帧会被清除。"
        referenceCandidates={characterReferences}
        onClose={() => setIsImageEditOpen(false)}
        onApply={(imageUrl) => {
          setGeneratedImage(imageUrl);
          setGeneratedVideo(null);
          setGeneratedLastFrame(null);
          sourceImageBlobCacheRef.current.clear();
          replaceMVInfoImage(segmentId, infoIndex, imageUrl);
          onLastFrameGenerated?.(null);
        }}
      />

      <div className="w-full md:w-32 bg-black/40 p-4 flex flex-col justify-center items-center border-b md:border-b-0 md:border-r border-white/5">
        <span className="text-[11px] font-mono font-bold text-neon-cyan mb-2 px-2 py-0.5 rounded border border-neon-cyan/30 bg-neon-cyan/10">
          小段 {infoIndex + 1}
        </span>
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
          {info.generated_assets?.audio && (
            <div className="flex items-center gap-2 text-xs text-emerald-300 bg-emerald-500/10 border border-emerald-400/20 rounded px-2 py-1">
              <AudioLines size={12} />
              <span className="max-w-[180px] truncate">{info.generated_assets.audio_filename || 'scene_audio.mp3'}</span>
              <audio src={info.generated_assets.audio} controls className="h-6 w-36" />
            </div>
          )}
        </div>

        {info.source_text && (
          <div className="mb-4 rounded border border-white/5 bg-black/30 px-3 py-2 text-[11px] leading-relaxed text-gray-400">
            <span className="mr-2 font-bold uppercase tracking-wider text-gray-500">原文映射</span>
            {info.source_text}
          </div>
        )}

        {selectedVideoWorkflow === 'H3 Turbo Stable 4V4A' && (
          <H3ShotControls info={info} segmentId={segmentId} infoIndex={infoIndex} />
        )}
        
        <div className="mb-4 rounded-lg border border-cyan-400/20 bg-cyan-500/5 p-3">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-cyan-200">本镜头首帧来源</p>
              <p className="mt-1 text-[10px] text-gray-500">连续镜头可跨分段承接上一镜头尾帧；新场景可用 T2I 独立起画。</p>
            </div>
            <div className="flex rounded-lg border border-white/10 bg-black/40 p-1">
              <button
                type="button"
                onClick={() => updateMVInfoFirstFrameSource(segmentId, infoIndex, 'previous-tail')}
                className={`rounded px-3 py-1.5 text-[10px] transition ${firstFrameSource === 'previous-tail' ? 'bg-cyan-400 text-black' : 'text-gray-400 hover:text-white'}`}
              >
                承接上一尾帧
              </button>
              <button
                type="button"
                onClick={() => updateMVInfoFirstFrameSource(segmentId, infoIndex, 't2i')}
                className={`rounded px-3 py-1.5 text-[10px] transition ${firstFrameSource === 't2i' ? 'bg-cyan-400 text-black' : 'text-gray-400 hover:text-white'}`}
              >
                新画面 T2I
              </button>
            </div>
          </div>

          {firstFrameSource === 'previous-tail' && (
            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <div className={`flex aspect-video w-full shrink-0 items-center justify-center overflow-hidden rounded border md:w-48 ${previousLastFrame ? 'border-cyan-300/30 bg-black/50' : 'border-amber-400/30 bg-amber-500/5'}`}>
                {previousLastFrame ? (
                  <img
                    src={previousLastFrame}
                    alt="承接的上一镜头尾帧"
                    className="h-full w-full object-cover"
                    onLoad={async (event) => {
                      const blob = await captureImageAsPng(event.currentTarget);
                      if (blob && blob.size > 0) sourceImageBlobCacheRef.current.set(previousLastFrame, blob);
                    }}
                  />
                ) : (
                  <span className="px-3 text-center text-[10px] text-amber-300">等待上一镜头生成尾帧</span>
                )}
              </div>
              <div className="text-xs leading-6 text-gray-400">
                {previousLastFrame
                  ? '已接入上一镜头的实际尾帧，并将它作为本镜头首帧提交。跨分段时同样生效。'
                  : '当前没有可承接的尾帧。请先生成上一镜头视频，或切换为“新画面 T2I”生成独立首帧。'}
              </div>
            </div>
          )}
          {info.generated_assets?.drive_audio && (
            <div className="flex items-center gap-2 rounded border border-cyan-400/20 bg-cyan-500/10 px-2 py-1 text-xs text-cyan-200">
              <AudioLines size={12} />
              <span className="max-w-[180px] truncate">{info.generated_assets.drive_audio_filename || 'music3_drive_audio.mp3'}</span>
              <audio src={info.generated_assets.drive_audio} controls className="h-6 w-36" />
              <span className="text-[9px] text-gray-400">{info.generated_assets.mux_status === 'ready' ? '原音轨已封装' : info.generated_assets.mux_status === 'failed' ? '封装失败' : '待封装'}</span>
            </div>
          )}
        </div>
        
        <div className="space-y-2">
          {firstFrameSource === 't2i' && (
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="flex justify-between items-center mb-1.5">
                    <label className="text-[10px] uppercase tracking-widest text-neon-cyan font-bold flex items-center gap-1.5">
                      <Image size={10} />
                      画面提示词 (T2I)
                    </label>
                    <div className="flex gap-2">
                        <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            accept="image/*"
                            onChange={handleUploadImage}
                        />
                        <button 
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isGenerating || isUploadingFrame}
                            className="bg-white/5 hover:bg-white/10 text-gray-300 text-[10px] px-2 py-1 rounded border border-white/10 hover:border-white/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                        >
                            {isUploadingFrame ? <Loader2 size={10} className="animate-spin" /> : <UploadCloud size={10} />}
                            {isUploadingFrame ? '正在压缩' : '上传参考图'}
                        </button>
                        <button 
                            onClick={handleGenerate}
                            disabled={isGenerating || isUploadingFrame}
                            className="bg-neon-cyan/10 hover:bg-neon-cyan/20 text-neon-cyan text-[10px] px-2 py-1 rounded border border-neon-cyan/30 hover:border-neon-cyan/60 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                        >
                            {isGenerating ? <Loader2 size={10} className="animate-spin" /> : null}
                            AI生图
                        </button>
                    </div>
                </div>
                <p className="mb-1.5 text-[9px] text-cyan-300/70">实际提交时自动合并“镜头画面要求 + 项目整体艺术风格 + 画幅与角色一致性约束”。</p>
                {frameUploadStatus?.target === 'first-frame' && <p className={`mb-1.5 text-[9px] ${frameUploadStatus.tone === 'success' ? 'text-emerald-300' : 'text-red-300'}`}>{frameUploadStatus.message}</p>}
                <textarea
                  ref={promptRef}
                  value={info.image_prompt || ''}
                  onChange={(event) => updateMVInfoImagePrompt(segmentId, infoIndex, event.target.value)}
                  placeholder="请输入本镜头的新画面提示词……"
                  rows={5}
                  className="min-h-24 w-full resize-y rounded border border-cyan-900/30 bg-black/50 p-3 text-xs leading-5 text-gray-300 outline-none transition placeholder:text-gray-600 hover:border-cyan-500/50 focus:border-neon-cyan focus:ring-1 focus:ring-neon-cyan/50"
                />
              </div>
              
              <div className="flex flex-col mt-6 gap-2">
                  <div className="w-full md:w-48 aspect-video bg-black/50 rounded border border-white/5 flex items-center justify-center shrink-0 relative group overflow-hidden">
                    {generatedImage ? (
                        <>
                        <img 
                            src={generatedImage} 
                            alt="AI Generated" 
                            className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform duration-300"
                            onLoad={async (event) => {
                              const blob = await captureImageAsPng(event.currentTarget);
                              if (blob && blob.size > 0) sourceImageBlobCacheRef.current.set(generatedImage, blob);
                            }}
                            onClick={() => setIsImageEditOpen(true)}
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors pointer-events-none" />
                        <span className="pointer-events-none absolute bottom-1.5 right-1.5 rounded border border-white/15 bg-black/70 px-2 py-1 text-[9px] text-white opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100">
                          图片编辑
                        </span>
                        </>
                    ) : (
                        <span className="px-3 text-center text-[10px] text-gray-600">等待生成或上传 T2I 首帧</span>
                    )}
                  </div>
              </div>
            </div>
          )}

          {selectedVideoWorkflow === 'H3 Turbo Stable 4V4A' && effectiveH3Mode === 'FL2VA' && (
            <div className="flex flex-col gap-4 rounded border border-fuchsia-400/20 bg-black/20 p-3 md:flex-row">
              <div className="flex-1">
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-fuchsia-300">目标尾帧提示词 (FL2VA)</label>
                  <div className="flex gap-2">
                    <input ref={targetFrameInputRef} type="file" accept="image/*" className="hidden" onChange={handleTargetFrameUpload} />
                    <button type="button" disabled={isUploadingFrame} onClick={() => targetFrameInputRef.current?.click()} className="inline-flex items-center gap-1 rounded border border-white/10 bg-white/5 px-2 py-1 text-[10px] text-gray-300 disabled:opacity-50">{isUploadingFrame && <Loader2 size={10} className="animate-spin" />}{isUploadingFrame ? '正在压缩' : '上传目标尾帧'}</button>
                    <button type="button" onClick={handleGenerateTargetFrame} disabled={!info.last_frame_image_prompt?.trim() || isGenerating || isUploadingFrame} className="rounded border border-fuchsia-400/30 bg-fuchsia-500/10 px-2 py-1 text-[10px] text-fuchsia-200 disabled:opacity-40">AI 生目标尾帧</button>
                  </div>
                </div>
                <p className="mb-1.5 text-[9px] text-fuchsia-300/70">目标尾帧同样自动附加项目整体艺术风格，避免首帧与尾帧画风漂移。</p>
                {frameUploadStatus?.target === 'target-frame' && <p className={`mb-1.5 text-[9px] ${frameUploadStatus.tone === 'success' ? 'text-emerald-300' : 'text-red-300'}`}>{frameUploadStatus.message}</p>}
                <textarea
                  value={info.last_frame_image_prompt || ''}
                  onChange={(event) => updateMVInfoLastFrameImagePrompt(segmentId, infoIndex, event.target.value)}
                  placeholder="请输入 FL2VA 目标尾帧提示词……"
                  rows={5}
                  className="min-h-24 w-full resize-y rounded border border-fuchsia-900/30 bg-black/50 p-3 text-xs leading-5 text-gray-300 outline-none transition placeholder:text-gray-600 hover:border-fuchsia-500/50 focus:border-fuchsia-300 focus:ring-1 focus:ring-fuchsia-300/40"
                />
              </div>
              <div className="flex aspect-video w-full shrink-0 items-center justify-center overflow-hidden rounded border border-white/10 bg-black/50 md:w-48">
                {generatedTargetLastFrame ? <img src={generatedTargetLastFrame} alt="Target last frame" className="h-full w-full object-cover" /> : <span className="text-[10px] text-gray-600">等待目标尾帧</span>}
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
                  onClick={handleVideoButtonClick}
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
