import React, { useRef, useState } from 'react';
import { AudioLines, Loader2, Trash2, UploadCloud } from 'lucide-react';
import { useGlobalSettings } from '../stores/useGlobalSettings';

interface AudioUploaderProps {
  proposalId: number;
}

type AudioSegmentDuration = 5 | 10 | 15 | 20;

interface AudioChunkResponse {
  chunks: Array<{
    url: string;
    filename: string;
  }>;
}

const AUDIO_SEGMENT_DURATIONS: AudioSegmentDuration[] = [5, 10, 15, 20];

export const AudioUploader: React.FC<AudioUploaderProps> = ({ proposalId }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [segmentDuration, setSegmentDuration] = useState<AudioSegmentDuration>(10);
  const [lastResult, setLastResult] = useState<string | null>(null);
  const { mvData, assignAudioChunks } = useGlobalSettings();

  const sceneCount = mvData?.storyboard.reduce((total, segment) => total + segment.mvinfo.length, 0) ?? 0;
  const assignedAudioCount = mvData?.storyboard.reduce(
    (total, segment) => total + segment.mvinfo.filter((info) => Boolean(info.generated_assets?.audio)).length,
    0,
  ) ?? 0;

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
          'X-Segment-Duration': String(segmentDuration),
        },
        body: file,
      });

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || '音频切分失败');
      }

      const data = (await response.json()) as AudioChunkResponse;
      assignAudioChunks(data.chunks);
      setLastResult(`已按 ${segmentDuration} 秒生成 ${data.chunks.length} 段 MP3，并分配给 ${Math.min(data.chunks.length, sceneCount)} 个场景。`);
    } catch (error) {
      console.error('Audio upload failed:', error);
      alert('音频处理失败: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClearAudio = () => {
    assignAudioChunks([]);
    setLastResult('已移除所有场景音频，接下来将按无上传音频模式生成。');
  };

  return (
    <div className="glass-card bg-black/40 border border-white/10 rounded-lg p-3 inline-flex flex-col gap-2">
      <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider flex items-center gap-1.5">
        <AudioLines size={12} className="text-emerald-400" />
        音频上传（可选）
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-[10px] text-gray-400">
          每段
          <select
            value={segmentDuration}
            onChange={(event) => setSegmentDuration(Number(event.target.value) as AudioSegmentDuration)}
            disabled={isProcessing}
            className="bg-black/50 text-emerald-300 text-xs px-2 py-1.5 rounded border border-emerald-400/30 focus:outline-none focus:border-emerald-300 disabled:opacity-50"
            aria-label="音频切片时长"
          >
            {AUDIO_SEGMENT_DURATIONS.map((duration) => (
              <option key={duration} value={duration}>{duration} 秒</option>
            ))}
          </select>
        </label>
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
          title={`上传 WAV/MP3，并按每 ${segmentDuration} 秒切分成 MP3`}
        >
          {isProcessing ? <Loader2 size={14} className="animate-spin" /> : <UploadCloud size={14} />}
          {isProcessing ? '切分中...' : '上传 WAV/MP3'}
        </button>
        {assignedAudioCount > 0 && (
          <button
            type="button"
            onClick={handleClearAudio}
            disabled={isProcessing}
            className="bg-red-500/10 hover:bg-red-500/20 text-red-300 text-xs px-3 py-1.5 rounded border border-red-400/30 hover:border-red-300/60 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
            title="移除所有场景中已分配的音频"
          >
            <Trash2 size={14} />
            移除音频
          </button>
        )}
        <span className="text-[10px] text-gray-500">共 {sceneCount} 个场景；不上传也可生成</span>
      </div>
      {lastResult && <p className="text-[10px] text-emerald-300/80">{lastResult}</p>}

      {isProcessing && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="bg-gray-900 border border-emerald-400/30 p-6 rounded-lg flex flex-col items-center gap-4 shadow-[0_0_30px_rgba(52,211,153,0.12)] max-w-sm w-full mx-4">
            <Loader2 size={32} className="text-emerald-300 animate-spin" />
            <div className="text-center">
              <p className="text-white font-bold mb-1">音频处理中</p>
              <p className="text-gray-400 text-sm">正在上传并按 {segmentDuration} 秒切分为 MP3 文件。</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
