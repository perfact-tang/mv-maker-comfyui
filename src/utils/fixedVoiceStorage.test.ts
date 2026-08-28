import assert from 'node:assert/strict';
import { persistFixedVoiceAudio, fixedVoiceReadError } from './fixedVoiceStorage';
import { recoverFixedVoiceReference } from './audioProduction';
import type { VoiceProfile } from '../types/mv-data';

const run = async () => {
  const originalFetch = globalThis.fetch;
  const originalWindow = globalThis.window;
  const originalContext = globalThis.AudioContext;
  const calls: string[] = [];
  const persistent = '/uploads/audio/fixed-voices/hash/voice.wav';
  const profile: VoiceProfile = {
    voice_id: 'VOICE-CHAR-001', speaker_label: '(S1)', instruct: '', reference_text: 'test', language: 'Auto',
    seed: 1, status: 'ready', preview_audio: '/comfy-api/view?filename=old.flac&type=temp',
    reference_audio: { data_url: '/comfy-api/view?filename=old.flac&type=temp', filename: 'VOICE-CHAR-001-fixed-voice.wav',
      mime_type: 'audio/wav', duration_seconds: 5, ref_audio_max_seconds: 60, source: 'generated-fixed-voice' },
  };
  const originalProfile = JSON.stringify(profile);
  try {
    globalThis.window = { location: { origin: 'http://localhost' } } as Window & typeof globalThis;
    globalThis.AudioContext = class {
      decodeAudioData() { return Promise.resolve({ duration: 5, sampleRate: 1, length: 5, numberOfChannels: 1, getChannelData: () => new Float32Array(5) }); }
      close() { return Promise.resolve(); }
    } as unknown as typeof AudioContext;
    globalThis.fetch = (async (url, options) => {
      calls.push(String(url));
      if (String(url).includes('type=temp')) return new Response(null, { status: 404 });
      if (url === '/api/audio/fixed-voice') {
        assert.equal(options?.method, 'POST');
        assert.equal((options?.body as Blob).size, 3);
        return Response.json({ url: persistent });
      }
      return new Response(new Uint8Array([1, 2, 3]), { headers: { 'Content-Type': 'audio/wav' } });
    }) as typeof fetch;
    const recovered = await recoverFixedVoiceReference(profile);
    assert.equal(recovered.data_url, persistent);
    assert(calls.some((url) => url.includes('filename=VOICE-CHAR-001-fixed-voice.wav') && url.includes('type=input')));
    assert.equal(JSON.stringify(profile), originalProfile, 'recovery must not mutate the stored profile before success');
    calls.length = 0;
    assert.equal(await recoverFixedVoiceReference({ ...profile, reference_audio: recovered }), recovered);
    assert.equal(calls.length, 0, 'persistent references do not depend on ComfyUI temp or input');
    await assert.rejects(() => recoverFixedVoiceReference({ ...profile, reference_audio: { ...profile.reference_audio!, duration_seconds: 9 } }), /时长/);
    assert(!calls.includes('/api/audio/fixed-voice'), 'mismatched cached audio must not be committed');
    globalThis.fetch = async () => new Response(null, { status: 404 });
    await assert.rejects(() => persistFixedVoiceAudio('/missing', 'voice'), /404/);
    globalThis.fetch = async () => new Response(new Uint8Array());
    await assert.rejects(() => persistFixedVoiceAudio('/empty', 'voice'), /为空/);
    assert(fixedVoiceReadError('VOICE-CHAR-001', 404).includes('已有镜头配音不会删除'));
    console.log('PASS durable fixed voice storage, reboot recovery, mismatch and failure safety');
  } finally {
    globalThis.fetch = originalFetch;
    globalThis.window = originalWindow;
    globalThis.AudioContext = originalContext;
  }
};
run().catch((error) => { console.error(error); process.exitCode = 1; });
