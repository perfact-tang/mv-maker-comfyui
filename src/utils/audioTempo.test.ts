import { buildAtempoFilterChain, fitTtsDuration } from './audioTempo.ts';

const assert = (condition: unknown, message: string) => {
  if (!condition) throw new Error(message);
};

const normal = fitTtsDuration(6.1, 5);
assert(normal.durationSeconds === 10 && normal.playbackRate === 1 && !normal.forcedCompression, 'expands a normal voice to the next H3 duration');

let overflowFailed = false;
try {
  fitTtsDuration(18.3, 10);
} catch (error) {
  overflowFailed = error instanceof Error && error.message.includes('不会截断人声');
}
assert(overflowFailed, 'voice that cannot safely fit must fail instead of being truncated or extremely accelerated');

const extremeRate = 9.2;
const filters = buildAtempoFilterChain(extremeRate);
assert(filters.length > 1, 'splits a large speed-up across multiple atempo filters');
const product = filters.reduce((value, filter) => value * Number(filter.split('=')[1]), 1);
assert(Math.abs(product - extremeRate) < 0.00001, 'atempo chain preserves the requested playback rate');
assert(filters.every((filter) => Number(filter.split('=')[1]) <= 2), 'keeps each atempo factor portable');

console.log('PASS TTS duration fitting and tempo filters');
