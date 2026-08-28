import React, { useState } from 'react';
import { ChevronDown, Download, Sparkles, FileArchive } from 'lucide-react';
import { useGlobalSettings } from '../stores/useGlobalSettings';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { AudioUploader } from './AudioUploader';
import { H3VideoControls } from './H3VideoControls';
import { VideoOrientationControl } from './VideoOrientationControl';
import { downloadProjectArchive } from '../utils/downloadProjectArchive';
import { createProjectLrc, safeLrcFilename } from '../utils/lrcExport';
import { addGeneratedVideosToZip, generatedVideoEntries } from '../utils/videoDownload';

interface HeaderProps {
  title: string;
  proposalId: number;
  onGenerateAll?: () => void;
  onGenerateAllFrames?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ title, proposalId, onGenerateAll, onGenerateAllFrames }) => {
  const {
    selectedWorkflow,
    setSelectedWorkflow,
    selectedVideoWorkflow,
    setSelectedVideoWorkflow,
    videoOrientation,
    setVideoOrientation,
    h3GenerationMode,
    h3AudioMode,
    h3VideoLength,
    h3ReferenceImages,
    mvData,
  } = useGlobalSettings();
  const [isDownloading, setIsDownloading] = useState(false);

  const generatedVideos = generatedVideoEntries(mvData?.storyboard ?? []);

  const handleDownloadAll = async () => {
    if (!mvData || !generatedVideos.length || isDownloading) return;
    setIsDownloading(true);
    try {
      const zip = new JSZip();
      await addGeneratedVideosToZip(zip.folder('videos')!, generatedVideos);

      // Add LRC
      zip.file(safeLrcFilename(mvData), `\uFEFF${createProjectLrc(mvData)}`);

      const content = await zip.generateAsync({ type: "blob" });
      saveAs(content, `mv_project_${mvData.proposal_id}_full_package.zip`);

    } catch (error) {
      console.error("Error downloading all:", error);
      alert(`下载失败，请重试：${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleSaveJson = () => {
    if (!mvData) return;
    try {
      downloadProjectArchive(mvData, {
        image_workflow: selectedWorkflow,
        video_workflow: selectedVideoWorkflow,
        video_orientation: videoOrientation,
        h3: {
          generation_mode: h3GenerationMode,
          audio_mode: h3AudioMode,
          video_length_frames: h3VideoLength,
          reference_images: h3ReferenceImages,
        },
      });
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      alert(`保存完整项目失败：${detail}`);
    }
  };

  return (
    <header className="mb-12">
      <div className="flex flex-col gap-6">
        <div className="flex w-full flex-col items-start gap-6">
          <div>
            <h1 className="text-4xl font-bold tracking-tighter text-white mb-2 neon-text-shadow">
              {title}
            </h1>
            <p className="text-neon-cyan font-mono tracking-widest text-sm flex items-center gap-2 mb-0">
              <span className="w-2 h-2 bg-neon-cyan rounded-full animate-pulse" />
              提案 ID: {String(proposalId).padStart(3, '0')} / MV 分镜脚本
            </p>
          </div>

          <div className="flex flex-wrap gap-4">
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
                      <option value="Krea2 Turbo">Krea2 Turbo</option>
                      <option value="Z-Image-Turbo">Z-Image-Turbo</option>
                    </select>
                    <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  </div>
                </div>
            </div>

            <div className="glass-card bg-black/40 border border-white/10 rounded-lg p-3 inline-flex flex-col gap-2">
                <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 bg-neon-magenta/50 rounded-full"></div>
                  AI 视频生产控制
                </label>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] text-gray-400 whitespace-nowrap">视频生成 Workflow：</span>
                  <div className="relative min-w-[180px]">
                    <select 
                      value={selectedVideoWorkflow}
                      onChange={(e) => setSelectedVideoWorkflow(e.target.value)}
                      className="bg-black/50 text-xs text-gray-300 border border-white/10 rounded px-2.5 py-1.5 w-full focus:outline-none focus:border-neon-magenta appearance-none pr-8 cursor-pointer hover:border-white/20 transition-colors"
                    >
                      <option value="SmoothV2">SmoothV2</option>
                      <option value="SmoothV1">SmoothV1</option>
                      <option value="Wan22">Wan22</option>
                      <option value="LTX2.3">LTX2.3</option>
                      <option value="LTX2.3 V2I">LTX2.3 V2I</option>
                      <option value="H3 Turbo Stable 4V4A">H3 Turbo Stable 4V4A</option>
                    </select>
                    <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  </div>
                </div>
            </div>

            {!['music3-audio-first', 'qwen3-tts-audio-first'].includes(mvData?.director_plan?.audio_plan?.mode || '') && <AudioUploader proposalId={proposalId} />}
            {selectedVideoWorkflow === 'H3 Turbo Stable 4V4A' && <H3VideoControls />}
            <div className="glass-card min-w-[310px] rounded-lg border border-white/10 bg-black/40 p-3">
              <label className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-gray-500">整体视频方向</label>
              <VideoOrientationControl value={videoOrientation} onChange={setVideoOrientation} />
            </div>
          </div>
        </div>

        <div className="flex w-full flex-col gap-3 border-t border-white/10 pt-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <button
              onClick={onGenerateAllFrames}
              className="flex min-h-11 items-center justify-center gap-2 rounded border border-neon-cyan/40 bg-neon-cyan/10 px-4 py-2 text-center text-sm font-bold text-neon-cyan transition-all hover:bg-neon-cyan/20"
              title="按镜头顺序生成 T2I 首帧与 FL2VA 目标尾帧，并自动合并整体艺术风格"
            >
              <Sparkles size={16} />
              生成全片首尾帧
            </button>
            <button 
              onClick={onGenerateAll}
              className="flex min-h-11 items-center justify-center gap-2 rounded bg-neon-magenta px-4 py-2 text-center text-sm font-bold text-white shadow-[0_0_15px_rgba(255,0,255,0.3)] transition-all hover:-translate-y-0.5 hover:bg-neon-magenta/80 hover:shadow-[0_0_25px_rgba(255,0,255,0.5)]"
              title="按顺序生成项目中所有分段的视频"
            >
              <Sparkles size={16} />
              生成全片视频
            </button>
            
            <button 
              onClick={handleSaveJson}
              className="flex min-h-11 items-center justify-center gap-2 rounded bg-neon-cyan px-4 py-2 text-center text-sm font-bold text-black shadow-[0_0_15px_rgba(0,255,255,0.3)] transition-all hover:-translate-y-0.5 hover:bg-neon-cyan/80 hover:shadow-[0_0_25px_rgba(0,255,255,0.5)]"
              title="保存分镜、人物展示内容与全部生成设置"
            >
              <Download size={16} />
              保存完整项目
            </button>

            {generatedVideos.length > 0 && (
              <button
                onClick={handleDownloadAll}
                disabled={isDownloading}
                className="flex min-h-11 items-center justify-center gap-2 rounded bg-green-600/80 px-4 py-2 text-center text-sm font-bold text-white shadow-[0_0_15px_rgba(0,255,0,0.3)] transition-all hover:-translate-y-0.5 hover:bg-green-600 hover:shadow-[0_0_25px_rgba(0,255,0,0.5)] disabled:cursor-not-allowed disabled:opacity-50"
                title={`打包当前已生成的 ${generatedVideos.length} 个动画和 LRC 字幕，跳过未完成镜头`}
              >
                <FileArchive size={16} />
                {isDownloading ? '打包下载中...' : `下载所有动画（${generatedVideos.length}）`}
              </button>
            )}
          </div>

        </div>
      </div>
    </header>
  );
};
