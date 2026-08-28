import assert from 'node:assert/strict';
import type { DirectorAudioPlan, MVInfo } from '../types/mv-data';
import { missingShotAudio, prepareVideoAudio, resolveShotAudioMode, nonDialogueVideoPrompt } from './videoAudio';
import { pendingVideoIndexes, runVideoGenerationQueue } from './batchGeneration';

const plan = { mode: 'qwen3-tts-audio-first', alignment_status: 'locked' } as DirectorAudioPlan;
const shot = (id: string, assets?: MVInfo['generated_assets'], text = '对白'): MVInfo => ({
  shot_id: id, timestamp: '00:00 - 00:05', type: 'New_Scene', lyrics: text, video_prompt: 'animate', generated_assets: assets,
});
const ready = shot('READY', { voice_audio: '/voice.mp3', drive_audio: '/drive.mp3' });
const missing = shot('MISSING');

const run = async () => {
  const originalFetch = globalThis.fetch;
  const requests: string[] = [];
  try {
    globalThis.fetch = async (url) => { requests.push(String(url)); return new Response(new Uint8Array([1, 2, 3]), { headers: { 'Content-Type': 'audio/mpeg' } }); };
    assert.equal((await prepareVideoAudio(ready, plan)).blob?.size, 3);
    assert.equal(missingShotAudio(ready, plan), undefined);
    await assert.rejects(() => prepareVideoAudio(ready, { ...plan, alignment_status: 'planned' }), /尚未锁定/);
    await assert.rejects(() => prepareVideoAudio(missing, plan), /没有声音了[\s\S]*MISSING/);
    await assert.rejects(() => prepareVideoAudio(shot('MUSIC_ONLY', { drive_audio: '/music.mp3' }), plan), /尚未生成配音/);
    await assert.rejects(() => prepareVideoAudio(shot('VOICE_ONLY', { voice_audio: '/voice.mp3' }), plan), /最终 Drive Audio/);
    await assert.rejects(() => prepareVideoAudio(shot('LEGACY', { voice_audio: '/voice.mp3', audio: '/old.mp3' }), plan), /没有声音了/);
    const silent = shot('NO_DIALOGUE', { drive_audio: '/music.mp3' }, '(No dialogue)');
    requests.length = 0;
    assert.deepEqual(await prepareVideoAudio(silent, plan, true), {}, 'no-dialogue shots ignore even an existing Drive Audio');
    assert.deepEqual(await prepareVideoAudio(shot('NO_MUSIC', undefined, '(No dialogue)'), plan, true), {}, 'no-dialogue shots need no music file');
    assert.deepEqual(await prepareVideoAudio(silent, { ...plan, mode: 'music3-audio-first' }), {});
    assert.equal(requests.length, 0, 'silent shots must not fetch, upload or mux local audio');
    assert.equal(resolveShotAudioMode(silent, plan, 'drive-audio'), 'native-audio');
    assert.equal(resolveShotAudioMode(ready, plan, 'native-audio'), 'drive-audio');
    assert.equal(missingShotAudio(silent, plan, true), undefined);
    for (const text of ['', '(No dialogue)', '（本镜头无对白，保留器乐过门）', '无对白']) {
      assert.deepEqual(await prepareVideoAudio(shot('SILENT', undefined, text), plan, true), {});
    }
    const cleanPrompt = nonDialogueVideoPrompt('Visual: keep <Picture 1>\noverall_soundscape:\n严格复用 <Audio 1> 作为唯一声音来源\n\nnon_diegetic_music:\nN/A\n\ndrive_audio_transcript: <d>[Auto] old</d>');
    assert(cleanPrompt.includes('<Picture 1>') && !cleanPrompt.includes('<Audio 1>') && !cleanPrompt.includes('<d>') && !cleanPrompt.includes('drive_audio_transcript'));
    assert.equal(nonDialogueVideoPrompt(cleanPrompt), cleanPrompt, 'prompt normalization must be idempotent');
    const traversed = [];
    await runVideoGenerationQueue([0, 1, 2], async (i) => {
      await prepareVideoAudio([ready, silent, ready][i], plan);
      traversed.push(i);
    });
    assert.deepEqual(traversed, [0, 1, 2], 'a silent shot must not interrupt the animation queue');
    requests.length = 0;
    assert.deepEqual(await prepareVideoAudio(missing), { url: undefined }, 'legacy native/silent generation remains available');
    assert.equal(requests.length, 0);
    await assert.rejects(() => prepareVideoAudio(missing, undefined, true), /没有声音了/);

    // Use the same sequential runner as SegmentCard: later ready shots must not run after a gap.
    const sequence = [shot('DONE', { video: '/keep.mp4' }), ready, missing, ready];
    const generated: number[] = [];
    const snapshot = JSON.stringify(sequence);
    await assert.rejects(() => runVideoGenerationQueue(pendingVideoIndexes(sequence, 'continue'), async (index) => {
      await prepareVideoAudio(sequence[index], plan);
      generated.push(index);
    }), /没有声音了/);
    assert.deepEqual(generated, [1], 'complete ready prefix, then stop without skipping the missing shot');
    assert.equal(JSON.stringify(sequence), snapshot, 'existing audio/video assets are untouched');
    const visitedSegments: number[] = [];
    await assert.rejects(async () => {
      for (const [index, shots] of [[ready], [missing, ready], [ready]].entries()) {
        visitedSegments.push(index);
        await runVideoGenerationQueue(pendingVideoIndexes(shots, 'restart'), (i) => prepareVideoAudio(shots[i], plan));
      }
    }, /没有声音了/);
    assert.deepEqual(visitedSegments, [0, 1], 'global processing stops at the failing segment');

    for (const response of [new Response(null, { status: 404 }), new Response(null, { status: 500 }), new Response(new Uint8Array()), new Response('<html>fallback</html>', { headers: { 'Content-Type': 'text/html' } })]) {
      globalThis.fetch = async () => response;
      await assert.rejects(() => prepareVideoAudio(ready, plan), /没有声音了/);
    }
    globalThis.fetch = async () => { throw new Error('offline'); };
    await assert.rejects(() => prepareVideoAudio(ready, plan), /没有声音了[\s\S]*offline/);
    console.log('PASS partial animation, stop-on-gap, missing files, legacy modes and preservation');
  } finally {
    globalThis.fetch = originalFetch;
  }
};
run().catch((error) => { console.error(error); process.exitCode = 1; });
