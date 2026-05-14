import React, { useRef, useState } from 'react';
import { AudioLines, Loader2, UploadCloud } from 'lucide-react';
import { useGlobalSettings } from '../stores/useGlobalSettings';

interface AudioUploaderProps {
  proposalId: number;
}

interface AudioChunkResponse {
  chunks: Array<{
    url: string;
    filename: string;
  }>;
}

export const AudioUploader: React.FC<AudioUploaderProps> = ({ proposalId }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastResult, setLastResult] = useState<string | null>(null);
  const { mvData, assignAudioChunks } = useGlobalSettings();

  const sceneCount = mvData?.storyboard.reduce((total, segment) => total + segment.mvinfo.length, 0) ?? 0;

  const handleAudioSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) return;

    const extension = file.name.split('.').pop()?.toLowerCase();
    if (!extension || !['wav', 'mp3'].includes(extension)) {
      alert('请上传 WAV 或 MP3 音频文件。');
      return;
    }

    setIsProcessing(true);
    setLastResult(null);

    try {
      const response = await fetch('/api/audio/split', {
        method: 'POST',
        headers: {
          'Content-Type': file.type || 'application/octet-stream',
          'X-File-Name': encodeURIComponent(file.name),
          'X-Proposal-Id': String(proposalId),
        },
        body: file,
      });

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || '音频切分失败');
      }

      const data = (await response.json()) as AudioChunkResponse;
      assignAudioChunks(data.chunks);
      setLastResult(`已生成 ${data.chunks.length} 段 MP3，并写入 ${Math.min(data.chunks.length, sceneCount)} 个场景。`);
    } catch (error) {
      console.error('Audio upload failed:', error);
      alert('音频处理失败: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="glass-card bg-black/40 border border-white/10 rounded-lg p-3 inline-flex flex-col gap-2">
      <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider flex items-center gap-1.5">
        <AudioLines size={12} className="text-emerald-400" />
        音频上传
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept=".wav,.mp3,audio/wav,audio/mpeg"
          onChange={handleAudioSelected}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={isProcessing}
          className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 text-xs px-3 py-1.5 rounded border border-emerald-400/30 hover:border-emerald-300/60 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
          title="上传 WAV/MP3，并按每 9 秒切分成 MP3"
        >
          {isProcessing ? <Loader2 size={14} className="animate-spin" /> : <UploadCloud size={14} />}
          {isProcessing ? '切分中...' : '上传 WAV/MP3'}
        </button>
        <span className="text-[10px] text-gray-500">{sceneCount} 个 9 秒场景</span>
      </div>
      {lastResult && <p className="text-[10px] text-emerald-300/80">{lastResult}</p>}

      {isProcessing && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="bg-gray-900 border border-emerald-400/30 p-6 rounded-lg flex flex-col items-center gap-4 shadow-[0_0_30px_rgba(52,211,153,0.12)] max-w-sm w-full mx-4">
            <Loader2 size={32} className="text-emerald-300 animate-spin" />
            <div className="text-center">
              <p className="text-white font-bold mb-1">处理中</p>
              <p className="text-gray-400 text-sm">正在上传并按 9 秒切分为 MP3 文件。</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
