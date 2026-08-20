import { createQwen3VoiceCloneWorkflow, QWEN3_ASR_LANGUAGES, safeRefAudioMaxSeconds } from './qwen3VoiceCloneWorkflow.ts';
import { hasConfirmedFixedVoiceReference, shouldUseQwen3VoiceClone } from './voiceCloneProfile.ts';
import type { VoiceProfile } from '../types/mv-data.ts';

const result = createQwen3VoiceCloneWorkflow({
  text: 'こんにちは。元気ですか',
  outputLanguage: 'Japanese',
  referenceLanguage: 'Chinese',
  referenceAudioFilename: 'actor-reference.wav',
  referenceAudioDurationSeconds: 73.2,
  refAudioMaxSeconds: 20,
  seed: 42,
});

if (result.workflow['2'].inputs.language !== 'Chinese') throw new Error('ASR input language was not applied');
if (result.workflow['4'].inputs.audio !== 'actor-reference.wav') throw new Error('reference audio filename was not applied');
if (result.workflow['9'].inputs.language !== 'Japanese') throw new Error('TTS output language was not applied');
if (result.workflow['9'].inputs.ref_audio_max_seconds !== 75) throw new Error('reference audio safety duration was not applied');
if (result.workflow['9'].inputs.seed !== 42) throw new Error('seed was not applied');
if (result.workflow['5'].class_type !== 'PreviewAny' || result.workflow['9'].inputs.ref_text[0] !== '2') throw new Error('attached ASR transcript path was not preserved');
if (safeRefAudioMaxSeconds(12.2, 5) !== 60) throw new Error('short references must keep the safe 60-second floor');
if (!QWEN3_ASR_LANGUAGES.includes('Cantonese') || !QWEN3_ASR_LANGUAGES.includes('Romanian')) throw new Error('ASR language options mismatch');
const legacyDesignProfile: VoiceProfile = { voice_id: 'V1', speaker_label: '(S2)', instruct: '', reference_text: '测试', language: 'Auto', seed: 1, generation_mode: 'voice-design' };
if (!shouldUseQwen3VoiceClone(legacyDesignProfile, true)) throw new Error('required character generation must force the clone workflow');
if (hasConfirmedFixedVoiceReference(legacyDesignProfile)) throw new Error('Voice Design without a generated reference must not be selectable');
const confirmedFixedVoice: VoiceProfile = { ...legacyDesignProfile, status: 'ready', preview_audio: 'data:audio/wav;base64,AA==', reference_audio: { data_url: 'data:audio/wav;base64,AA==', filename: 'fixed.wav', mime_type: 'audio/wav', duration_seconds: 10, ref_audio_max_seconds: 60, source: 'generated-fixed-voice' } };
if (!hasConfirmedFixedVoiceReference(confirmedFixedVoice)) throw new Error('created fixed voice must be selectable as a clone reference');
if (!shouldUseQwen3VoiceClone(confirmedFixedVoice, true)) throw new Error('sound production must clone a Voice Design fixed voice');
console.log('PASS Qwen3 voice clone workflow adapter');
