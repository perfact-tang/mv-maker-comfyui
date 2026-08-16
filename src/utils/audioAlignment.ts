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
}

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

export const analyzeAudioUrl = async (url: string): Promise<AudioAnalysis> => {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`无法读取声音章节：HTTP ${response.status}`);
  const data = await response.arrayBuffer();
  const context = new AudioContext();
  try {
    return analyzeAudioBuffer(await context.decodeAudioData(data.slice(0)));
  } finally {
    await context.close();
  }
};

const boundaryEnergy = (analysis: AudioAnalysis | undefined, seconds: number) => {
  if (!analysis) return 0;
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
