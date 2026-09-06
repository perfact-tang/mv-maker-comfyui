import { analyzeAudioData, analyzeAudioUrl, inspectAudioContainer, planH3AudioDurations } from './audioAlignment.ts';

const assert = (condition: unknown, message: string) => {
  if (!condition) throw new Error(message);
};

const exact = planH3AudioDurations(30, [10, 10, 10]);
assert(JSON.stringify(exact) === JSON.stringify([10, 10, 10]), 'keeps an exact preferred plan');

const padded = planH3AudioDurations(27.2, [10, 10, 10]);
assert(padded.reduce((sum, duration) => sum + duration, 0) === 30, 'pads to a five-second boundary');
assert(padded.every((duration) => [5, 10, 15].includes(duration)), 'uses only H3 durations');

let overflow = '';
try {
  planH3AudioDurations(46, [15, 15, 15]);
} catch (error) {
  overflow = error instanceof Error ? error.message : String(error);
}
assert(overflow.includes('增加镜头'), 'reports chapters that cannot fit their shots');

console.log('PASS Music 3 audio alignment planning');

const makeFlac = (sampleRate = 48_000, totalSamples = 480_000) => {
  const bytes = new Uint8Array(42);
  bytes.set([0x66, 0x4c, 0x61, 0x43, 0x80, 0, 0, 34]);
  const payload = 8;
  bytes[payload + 10] = sampleRate >> 12;
  bytes[payload + 11] = sampleRate >> 4;
  bytes[payload + 12] = (sampleRate & 0x0f) << 4;
  bytes[payload + 13] = Math.floor(totalSamples / 0x100000000) & 0x0f;
  bytes[payload + 14] = totalSamples >>> 24;
  bytes[payload + 15] = totalSamples >>> 16;
  bytes[payload + 16] = totalSamples >>> 8;
  bytes[payload + 17] = totalSamples;
  return bytes;
};

const runAudioReadingTests = async () => {
  const originalFetch = globalThis.fetch;
  const originalContext = globalThis.AudioContext;
  let decoderCalls = 0;
  try {
    const flac = makeFlac();
    const inspected = inspectAudioContainer(flac.buffer);
    assert(inspected.name === 'FLAC' && inspected.mimeType === 'audio/flac' && inspected.fileExtension === '.flac', 'detects FLAC from bytes, not URL or response label');
    assert(Math.abs((inspected.durationSeconds ?? 0) - 10) < 0.001, 'reads exact FLAC duration from STREAMINFO');
    globalThis.AudioContext = class { constructor() { decoderCalls += 1; } } as unknown as typeof AudioContext;
    globalThis.fetch = async () => new Response(flac, { headers: { 'content-type': 'application/octet-stream' } });
    const analysis = await analyzeAudioUrl('/generated-fixed-voice.wav');
    assert(analysis.durationSeconds === 10 && analysis.mimeType === 'audio/flac', 'mislabelled Comfy FLAC succeeds without Web Audio decoding');
    assert(decoderCalls === 0, 'FLAC does not call unsupported decodeAudioData');
    assert((await analyzeAudioData(flac.buffer, 'audio/flac')).durationSeconds === 10, 'in-memory Comfy blob can be analyzed without a second public URL request');
    globalThis.fetch = async () => new Response('<html>proxy error</html>', { headers: { 'content-type': 'text/html' } });
    await analyzeAudioUrl('/not-audio').then(() => { throw new Error('HTML must fail'); }, error => assert(String(error).includes('没有返回音频文件'), 'HTML response gets a useful error'));
    globalThis.fetch = async () => new Response(new Uint8Array());
    await analyzeAudioUrl('/empty').then(() => { throw new Error('empty must fail'); }, error => assert(String(error).includes('为空'), 'empty response gets a useful error'));
    console.log('PASS FLAC metadata reading without decodeAudioData, including mislabeled Comfy output');
  } finally {
    globalThis.fetch = originalFetch;
    globalThis.AudioContext = originalContext;
  }
};

runAudioReadingTests().catch(error => { console.error(error); process.exitCode = 1; });
