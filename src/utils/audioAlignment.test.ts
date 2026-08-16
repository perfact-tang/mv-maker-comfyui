import { planH3AudioDurations } from './audioAlignment.ts';

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
