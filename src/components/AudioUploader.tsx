import React, { useMemo, useRef, useState } from 'react';
import { AudioLines, Loader2, Trash2, UploadCloud } from 'lucide-react';
import { useGlobalSettings } from '../stores/useGlobalSettings';

interface AudioUploaderProps {
  proposalId: number;
}

interface AudioChunkResponse {
  chunks: Array<{
    url: string;
    filename: string;
    durationSeconds?: number;
  }>;
}

const parseTimestampDuration = (timestamp: string) => {
  const matches = timestamp.match(/(\d{2}):(\d{2}):(\d{2})/g);
  if (!matches || matches.length < 2) return null;

  const toSeconds = (value: string) => {
    const [hours, minutes, seconds] = value.split(':').map(Number);
    return hours * 3600 + minutes * 60 + seconds;
  };

  const duration = toSeconds(matches[1]) - toSeconds(matches[0]);
  return duration > 0 ? duration : null;
};

export const AudioUploader: React.FC<AudioUploaderProps> = ({ proposalId }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastResult, setLastResult] = useState<string | null>(null);
  const { mvData, assignAudioChunks } = useGlobalSettings();

  const shotDurations = useMemo(() => (
    mvData?.storyboard.flatMap((segment) => segment.mvinfo.map((info) => (
      info.generation_plan?.duration_seconds ?? parseTimestampDuration(info.timestamp) ?? 5
    ))) ?? []
  ), [mvData]);
  const sceneCount = shotDurations.length;
  const totalDuration = shotDurations.reduce((total, duration) => total + duration, 0);
  const durationSummary = useMemo(() => {
    const counts = new Map<number, number>();
    shotDurations.forEach((duration) => counts.set(duration, (counts.get(duration) ?? 0) + 1));
    return [...counts.entries()]
      .sort(([left], [right]) => left - right)
      .map(([duration, count]) => `${duration} 秒×${count}`)
      .join(' · ');
  }, [shotDurations]);
  const inclusiveCutSummary = useMemo(() => (
    [...new Set(shotDurations)]
      .sort((left, right) => left - right)
      .map((duration) => `${duration}→${duration + 1} 秒`)
      .join(' · ')
  ), [shotDurations]);
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

    if (!shotDurations.length) {
      alert('当前脚本没有可分配音频的镜头。');
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
          'X-Shot-Durations': JSON.stringify(shotDurations),
        },
        body: file,
      });

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || '音频切分失败');
      }

      const data = (await response.json()) as AudioChunkResponse;
      assignAudioChunks(data.chunks);
      const assignedCount = Math.min(data.chunks.length, sceneCount);
      setLastResult(
        assignedCount === sceneCount
          ? `已按镜头时长切分并分配 ${assignedCount} 段音频。`
          : `已分配 ${assignedCount}/${sceneCount} 段音频；源音频长度不足，后续镜头未分配。`,
      );
    } catch (error) {
      console.error('Audio upload failed:', error);
      alert('音频处理失败：' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClearAudio = () => {
    assignAudioChunks([]);
    setLastResult('已移除所有镜头音频，可重新上传并切分。');
  };

  return (
    <div className="glass-card min-w-[330px] rounded-lg border border-white/10 bg-black/40 p-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-500">
            <AudioLines size={12} className="text-emerald-400" />
            手动 Drive / Reference Audio
          </label>
          <p className="mt-1 text-[10px] text-gray-400">
            {sceneCount > 0
              ? `${sceneCount} 个镜头 · 共 ${totalDuration} 秒 · ${durationSummary}`
              : '加载脚本后，将按各镜头时长自动切分'}
          </p>
          {sceneCount > 0 && (
            <p className="mt-1 text-[9px] text-emerald-300/70">包含结束秒：{inclusiveCutSummary}</p>
          )}
        </div>

        <div className="flex items-center gap-2">
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
            disabled={isProcessing || sceneCount === 0}
            className="flex items-center gap-1.5 rounded border border-emerald-400/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-300 transition-all hover:border-emerald-300/60 hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-50"
            title="选择 WAV/MP3；每段包含标记的结束秒，并与下一段重叠 1 秒"
          >
            {isProcessing ? <Loader2 size={14} className="animate-spin" /> : <UploadCloud size={14} />}
            {isProcessing ? '正在切分并分配…' : '上传旧版驱动/参考音频'}
          </button>
          {assignedAudioCount > 0 && (
            <button
              type="button"
              onClick={handleClearAudio}
              disabled={isProcessing}
              className="flex items-center gap-1.5 rounded border border-red-400/30 bg-red-500/10 px-2.5 py-1.5 text-xs text-red-300 transition-all hover:border-red-300/60 hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
              title="移除所有镜头中已分配的音频"
            >
              <Trash2 size={14} />
              移除
            </button>
          )}
        </div>
      </div>
      {lastResult && <p className="mt-2 text-[10px] text-emerald-300/80">{lastResult}</p>}

      {isProcessing && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="mx-4 flex w-full max-w-sm flex-col items-center gap-4 rounded-lg border border-emerald-400/30 bg-gray-900 p-6 shadow-[0_0_30px_rgba(52,211,153,0.12)]">
            <Loader2 size={32} className="animate-spin text-emerald-300" />
            <div className="text-center">
              <p className="mb-1 font-bold text-white">正在处理音频</p>
              <p className="text-sm text-gray-400">按 {sceneCount} 个镜头的实际时长切分并依次分配。</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
