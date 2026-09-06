export const H3_AUDIO_DURATIONS = [5, 10, 15] as const;
export const H3_AUDIO_FRAMES: Record<(typeof H3_AUDIO_DURATIONS)[number], 141 | 260 | 379> = {
  5: 141,
  10: 260,
  15: 379,
};

export interface AudioAnalysis {
  durationSeconds: number;
  bucketSeconds: number;
  energy: number[];
  quietCandidates: number[];
  mimeType?: string;
  fileExtension?: string;
}

interface AudioContainer {
  name: string;
  mimeType?: string;
  fileExtension?: string;
  durationSeconds?: number;
}

const startsWith = (bytes: Uint8Array, signature: number[], offset = 0) => (
  signature.every((value, index) => bytes[offset + index] === value)
);

/** FLAC stores an exact sample count in its STREAMINFO block; this avoids Web Audio's inconsistent FLAC support. */
const flacDurationSeconds = (bytes: Uint8Array): number | undefined => {
  let offset = 4;
  while (offset + 4 <= bytes.length) {
    const type = bytes[offset] & 0x7f;
    const isLast = Boolean(bytes[offset] & 0x80);
    const length = (bytes[offset + 1] << 16) | (bytes[offset + 2] << 8) | bytes[offset + 3];
    const payload = offset + 4;
    if (payload + length > bytes.length) return undefined;
    if (type === 0 && length >= 34) {
      const sampleRate = (bytes[payload + 10] << 12) | (bytes[payload + 11] << 4) | (bytes[payload + 12] >> 4);
      const totalSamples = (bytes[payload + 13] & 0x0f) * 0x100000000
        + bytes[payload + 14] * 0x1000000
        + bytes[payload + 15] * 0x10000
        + bytes[payload + 16] * 0x100
        + bytes[payload + 17];
      return sampleRate > 0 && totalSamples > 0 ? totalSamples / sampleRate : undefined;
    }
    offset = payload + length;
    if (isLast) break;
  }
  return undefined;
};

export const inspectAudioContainer = (data: ArrayBuffer): AudioContainer => {
  const bytes = new Uint8Array(data);
  if (startsWith(bytes, [0x66, 0x4c, 0x61, 0x43])) return { name: 'FLAC', mimeType: 'audio/flac', fileExtension: '.flac', durationSeconds: flacDurationSeconds(bytes) };
  if (startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) && startsWith(bytes, [0x57, 0x41, 0x56, 0x45], 8)) return { name: 'WAV', mimeType: 'audio/wav', fileExtension: '.wav' };
  if (startsWith(bytes, [0x4f, 0x67, 0x67, 0x53])) return { name: 'Ogg', mimeType: 'audio/ogg', fileExtension: '.ogg' };
  if (startsWith(bytes, [0x1a, 0x45, 0xdf, 0xa3])) return { name: 'WebM', mimeType: 'audio/webm', fileExtension: '.webm' };
  if (startsWith(bytes, [0x49, 0x44, 0x33]) || (bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0)) return { name: 'MP3/AAC', mimeType: 'audio/mpeg', fileExtension: '.mp3' };
  if (startsWith(bytes, [0x66, 0x74, 0x79, 0x70], 4)) return { name: 'M4A', mimeType: 'audio/mp4', fileExtension: '.m4a' };
  return { name: '未知格式' };
};

const rms = (samples: Float32Array, start: number, end: number) => {
  let sum = 0;
  for (let index = start; index < end; index += 1) sum += samples[index] * samples[index];
  return Math.sqrt(sum / Math.max(1, end - start));
};

export const analyzeAudioBuffer = (buffer: AudioBuffer, bucketSeconds = 0.1): AudioAnalysis => {
  const bucketSize = Math.max(1, Math.floor(buffer.sampleRate * bucketSeconds));
  const bucketCount = Math.ceil(buffer.length / bucketSize);
  const energy = Array.from({ length: bucketCount }, (_, bucketIndex) => {
    let total = 0;
    for (let channelIndex = 0; channelIndex < buffer.numberOfChannels; channelIndex += 1) {
      const channel = buffer.getChannelData(channelIndex);
      total += rms(channel, bucketIndex * bucketSize, Math.min(channel.length, (bucketIndex + 1) * bucketSize));
    }
    return total / buffer.numberOfChannels;
  });
  const peak = Math.max(...energy, 0.000001);
  const normalized = energy.map((value) => value / peak);
  const quietCandidates = normalized
    .map((value, index) => ({ value, index }))
    .filter(({ value, index }) => index > 0 && index < normalized.length - 1
      && value <= normalized[index - 1] && value <= normalized[index + 1] && value <= 0.22)
    .map(({ index }) => Number((index * bucketSeconds).toFixed(3)));

  return { durationSeconds: buffer.duration, bucketSeconds, energy: normalized, quietCandidates };
};

export const analyzeAudioData = async (data: ArrayBuffer, contentType = ''): Promise<AudioAnalysis> => {
  if (!data.byteLength) throw new Error('声音文件为空，无法读取时长。');
  if (/text\/html|application\/json/i.test(contentType)) throw new Error(`声音链接返回了 ${contentType}，没有返回音频文件。`);
  const container = inspectAudioContainer(data);
  if (container.name === 'FLAC') {
    if (!container.durationSeconds) throw new Error('FLAC 文件缺少有效的 STREAMINFO 时长信息。');
    return {
      durationSeconds: container.durationSeconds,
      bucketSeconds: 0.1,
      energy: [],
      quietCandidates: [],
      mimeType: container.mimeType,
      fileExtension: container.fileExtension,
    };
  }
  const context = new AudioContext();
  try {
    const analysis = analyzeAudioBuffer(await context.decodeAudioData(data.slice(0)));
    return { ...analysis, mimeType: container.mimeType, fileExtension: container.fileExtension };
  } catch (error) {
    throw new Error(`浏览器无法读取该声音（检测到：${container.name}）。请换用 WAV、MP3 或 FLAC 文件；原有声音记录未被替换。${error instanceof Error ? ` ${error.message}` : ''}`);
  } finally {
    await context.close();
  }
};

export const analyzeAudioUrl = async (url: string): Promise<AudioAnalysis> => {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`无法读取声音章节：HTTP ${response.status}`);
  return analyzeAudioData(await response.arrayBuffer(), response.headers.get('content-type') || '');
};

const boundaryEnergy = (analysis: AudioAnalysis | undefined, seconds: number) => {
  if (!analysis?.energy.length) return 0;
  const index = Math.min(analysis.energy.length - 1, Math.max(0, Math.round(seconds / analysis.bucketSeconds)));
  const radius = Math.max(1, Math.round(0.3 / analysis.bucketSeconds));
  const values = analysis.energy.slice(Math.max(0, index - radius), index + radius + 1);
  return values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length);
};

export const planH3AudioDurations = (
  actualDurationSeconds: number,
  preferredDurations: number[],
  analysis?: AudioAnalysis,
): Array<5 | 10 | 15> => {
  if (!preferredDurations.length) throw new Error('声音章节没有关联镜头');
  const paddedTotal = Math.ceil(actualDurationSeconds / 5) * 5;
  const minimum = preferredDurations.length * 5;
  const maximum = preferredDurations.length * 15;
  const target = Math.max(minimum, paddedTotal);
  if (target > maximum) throw new Error(`声音章节长达 ${actualDurationSeconds.toFixed(1)} 秒，当前 ${preferredDurations.length} 个镜头最多只能承载 ${maximum} 秒，请拆分章节或增加镜头`);

  type State = { cost: number; durations: Array<5 | 10 | 15> };
  let states = new Map<number, State>([[0, { cost: 0, durations: [] }]]);
  preferredDurations.forEach((preferred, shotIndex) => {
    const next = new Map<number, State>();
    states.forEach((state, elapsed) => {
      H3_AUDIO_DURATIONS.forEach((duration) => {
        const nextElapsed = elapsed + duration;
        if (nextElapsed > target) return;
        const isLast = shotIndex === preferredDurations.length - 1;
        const energyCost = isLast ? 0 : boundaryEnergy(analysis, nextElapsed) * 8;
        const durationCost = Math.abs(duration - preferred) / 5;
        const candidate = { cost: state.cost + energyCost + durationCost, durations: [...state.durations, duration] };
        const current = next.get(nextElapsed);
        if (!current || candidate.cost < current.cost) next.set(nextElapsed, candidate);
      });
    });
    states = next;
  });
  const result = states.get(target);
  if (!result) throw new Error(`无法用 ${preferredDurations.length} 个 5/10/15 秒镜头覆盖 ${target} 秒声音`);
  return result.durations;
};

export const formatAudioTimestamp = (seconds: number) => {
  const minutes = Math.floor(seconds / 60);
  const remaining = Math.floor(seconds % 60);
  return `${String(minutes).padStart(2, '0')}:${String(remaining).padStart(2, '0')}`;
};
