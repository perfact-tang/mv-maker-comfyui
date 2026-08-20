const H3_DURATIONS = [5, 10, 15] as const;
const SAFE_TTS_PLAYBACK_RATE = 1.2;
const END_PADDING_SECONDS = 0.15;

export const fitTtsDuration = (actualDurationSeconds: number, preferredDuration: number) => {
  if (!Number.isFinite(actualDurationSeconds) || actualDurationSeconds <= 0) {
    throw new Error('TTS actual duration must be a positive number.');
  }

  const preferredIndex = Math.max(0, H3_DURATIONS.findIndex((duration) => duration === preferredDuration));
  for (let index = preferredIndex; index < H3_DURATIONS.length; index += 1) {
    const durationSeconds = H3_DURATIONS[index];
    const usableSeconds = Math.max(0.1, durationSeconds - END_PADDING_SECONDS);
    const playbackRate = actualDurationSeconds > usableSeconds ? actualDurationSeconds / usableSeconds : 1;
    if (playbackRate <= SAFE_TTS_PLAYBACK_RATE) {
      return { durationSeconds, playbackRate: Math.max(1, playbackRate), forcedCompression: false };
    }
  }

  throw new Error(`配音实长 ${actualDurationSeconds.toFixed(1)} 秒，即使使用最高 ${SAFE_TTS_PLAYBACK_RATE.toFixed(1)}× 安全语速也无法完整放入 15 秒镜头；请缩短台词或拆分镜头，系统不会截断人声`);
};

// FFmpeg's atempo filter is most portable in the 0.5-2.0 range. Split large
// speed-ups into several filters so arbitrarily long speech can fit a shot.
export const buildAtempoFilterChain = (playbackRate: number): string[] => {
  if (!Number.isFinite(playbackRate) || playbackRate < 1) {
    throw new Error('TTS playback rate must be at least 1.0.');
  }

  const filters: string[] = [];
  let remaining = playbackRate;
  while (remaining > 2.000001) {
    filters.push('atempo=2.000000');
    remaining /= 2;
  }
  if (remaining > 1.0001) filters.push(`atempo=${remaining.toFixed(6)}`);
  return filters;
};
