import { useState } from 'react';
import { Download, LogOut, X } from 'lucide-react';
import { useGlobalSettings } from '../stores/useGlobalSettings';
import { downloadProjectArchive } from '../utils/downloadProjectArchive';

export const CloseProjectControl = () => {
  const {
    mvData,
    setMvData,
    selectedWorkflow,
    selectedVideoWorkflow,
    videoOrientation,
    h3GenerationMode,
    h3AudioMode,
    h3VideoLength,
    h3ReferenceImages,
  } = useGlobalSettings();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  if (!mvData) return null;

  const handleSaveAndClose = () => {
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
      setIsDialogOpen(false);
      window.setTimeout(() => setMvData(null), 0);
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      alert(`保存完整项目失败：${detail}`);
    }
  };

  return (
    <section className="border-t border-white/10 pb-10 pt-6" aria-label="关闭项目">
      <button
        type="button"
        onClick={() => setIsDialogOpen(true)}
        className="flex min-h-11 w-full items-center justify-center gap-2 rounded border border-red-500/30 bg-red-900/50 px-4 py-2 text-center text-sm font-bold text-red-200 transition-all hover:bg-red-900/80 hover:shadow-[0_0_15px_rgba(255,0,0,0.3)]"
        title="保存完整项目并关闭"
      >
        <LogOut size={16} />
        关闭
      </button>

      {isDialogOpen && (
        <div className="fixed inset-0 z-[140] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="save-and-close-title">
          <div className="relative w-full max-w-md rounded-2xl border border-red-300/25 bg-[#111827] p-6 shadow-[0_0_50px_rgba(239,68,68,0.16)] md:p-7">
            <button
              type="button"
              onClick={() => setIsDialogOpen(false)}
              aria-label="关闭确认对话框"
              className="absolute right-4 top-4 rounded-lg p-2 text-gray-500 transition-colors hover:bg-white/5 hover:text-white"
            >
              <X size={18} />
            </button>
            <div className="pr-10">
              <h2 id="save-and-close-title" className="text-xl font-bold text-white">保存完整项目并关闭</h2>
              <p className="mt-3 text-sm leading-6 text-gray-400">为了安全起见，关闭前会将当前完整项目保存为一个 JSON 文件。保存触发后，系统再关闭当前项目并返回上传页面。</p>
            </div>
            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setIsDialogOpen(false)}
                className="min-h-11 rounded-lg border border-white/15 px-5 py-2 text-sm font-bold text-gray-300 transition-colors hover:bg-white/5 hover:text-white"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleSaveAndClose}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-neon-cyan px-5 py-2 text-sm font-bold text-black transition-colors hover:bg-cyan-300"
              >
                <Download size={16} />
                保存并关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
