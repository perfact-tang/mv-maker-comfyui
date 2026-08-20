import { validateMVData } from './jsonValidator.ts';
import type { MVScriptData } from '../types/mv-data.ts';

const assert = (condition: unknown, message: string) => {
  if (!condition) throw new Error(message);
};

const base = {
  proposal_id: 1,
  direction_name: 'Test',
  characters: [],
  basics: { outline: '', shooting_method: '', art_style_description: '' },
  storyboard: [{
    segment_id: 1,
    movielength: '00:00-00:05',
    content_narrative: 'Test',
    prompts: { first_frame: '', last_frame: '' },
    mvinfo: [{
      timestamp: '00:00 - 00:05',
      type: 'New_Scene',
      lyrics: '(No dialogue)',
      image_prompt: 'First frame',
      video_prompt: 'Prompt',
      generation_plan: {
        model: 'minimax-h3',
        mode: 'I2VA',
        duration_seconds: 5,
        duration_frames: 141,
        audio_mode: 'no-audio',
        reference_images: [],
      },
    }],
  }],
};

assert(validateMVData(base).isValid, 'new director JSON with no characters must validate');

const legacy = structuredClone(base);
delete legacy.storyboard[0].mvinfo[0].generation_plan;
assert(validateMVData(legacy).isValid, 'legacy JSON without generation_plan must validate');

const badFrames = structuredClone(base);
badFrames.storyboard[0].mvinfo[0].generation_plan.duration_frames = 260;
assert(!validateMVData(badFrames).isValid, 'invalid duration/frame pair must fail');

const badRef = structuredClone(base);
badRef.storyboard[0].mvinfo[0].generation_plan.mode = 'Ref2VA';
assert(!validateMVData(badRef).isValid, 'Ref2VA without declarations must fail');

const singleRef = structuredClone(base);
singleRef.storyboard[0].mvinfo[0].generation_plan.mode = 'Ref2VA';
singleRef.storyboard[0].mvinfo[0].generation_plan.reference_images = [{
  label: '<Picture 1>',
  purpose: '人物身份参考',
  prompt: '<Picture 1> 定义并保持人物身份。',
}];
assert(validateMVData(singleRef).isValid, 'Ref2VA with one declaration must validate');

const audioFirst = structuredClone(base) as unknown as MVScriptData;
audioFirst.director_plan = {
  source_type: 'blog',
  content_form: 'promo',
  model: 'minimax-h3',
  aspect_ratio: '16:9',
  total_duration_seconds: 5,
  allowed_clip_durations_seconds: [5, 10, 15],
  style_name: '测试',
  style_rationale: '测试',
  narrative_strategy: '测试',
  source_coverage_note: '测试',
  audio_plan: {
    mode: 'music3-audio-first', workflow: 'MiniMax Music 3', production_style: 'spoken-word', alignment_status: 'planned',
    chapters: [{ chapter_id: 'A1', title: '讲解', target_duration_seconds: 5, caption: '清晰念白配乐', lyrics: '[Verse]\n测试', shot_refs: ['SHOT-1'], status: 'idle' }],
  },
};
audioFirst.storyboard[0].mvinfo[0].shot_id = 'SHOT-1';
audioFirst.storyboard[0].mvinfo[0].audio_plan = { chapter_id: 'A1', source_start_seconds: 0, duration_seconds: 5, audio_text: '测试', speakers: [], cut_status: 'tentative' };
audioFirst.storyboard[0].mvinfo[0].generation_plan.audio_mode = 'drive-audio';
assert(validateMVData(audioFirst).isValid, 'v4 Music 3 audio-first project must validate');

const nativeAudioFirst = structuredClone(audioFirst);
nativeAudioFirst.storyboard[0].mvinfo[0].generation_plan.audio_mode = 'native-audio';
assert(!validateMVData(nativeAudioFirst).isValid, 'Music 3 audio-first shot cannot fall back to native audio');

const characterBoundAudio = structuredClone(audioFirst);
characterBoundAudio.director_plan!.audio_plan = {
  ...characterBoundAudio.director_plan!.audio_plan!,
  mode: 'qwen3-tts-audio-first',
  workflow: '千问 3 TTS',
  music_workflow: 'MiniMax Music 3',
  narrator_voice: {
    voice_id: 'VOICE-NARRATOR', speaker_label: '(S1)', instruct: '稳定旁白音色', reference_text: '测试旁白音色', language: 'Auto', seed: 41,
  },
};
characterBoundAudio.characters.push({ name: '角色', description: '角色生成提示词', voice_profile: {
  voice_id: 'VOICE-CHAR-001', speaker_label: '(S2)', instruct: '稳定角色音色', reference_text: '测试角色音色', language: 'Japanese', seed: 42,
} });
characterBoundAudio.storyboard[0].mvinfo[0].audio_plan!.speakers = [{ speaker_label: '(S2)', character_name: '角色', voice_description: '稳定角色音色', voice_id: 'VOICE-CHAR-001' }];
assert(validateMVData(characterBoundAudio).isValid, 'Qwen shot voice_id bound to a character must validate');

const unknownShotVoice = structuredClone(characterBoundAudio);
unknownShotVoice.storyboard[0].mvinfo[0].audio_plan!.speakers[0].voice_id = 'VOICE-UNKNOWN';
assert(!validateMVData(unknownShotVoice).isValid, 'Qwen shot voice_id must resolve to a character or narrator');

const duplicateCharacterVoice = structuredClone(characterBoundAudio);
duplicateCharacterVoice.characters[0].voice_profile!.voice_id = 'VOICE-NARRATOR';
assert(!validateMVData(duplicateCharacterVoice).isValid, 'character and narrator voice_id values must be unique');

const uploadedReferenceCreation = structuredClone(characterBoundAudio);
uploadedReferenceCreation.characters[0].voice_profile = {
  ...uploadedReferenceCreation.characters[0].voice_profile!,
  generation_mode: 'voice-clone',
  status: 'ready',
  preview_audio: 'data:audio/wav;base64,AA==',
  creation_reference_audio: { data_url: 'data:audio/wav;base64,AA==', filename: 'source.wav', mime_type: 'audio/wav', duration_seconds: 12.5, ref_audio_max_seconds: 60, source: 'uploaded-reference' },
  reference_audio: { data_url: 'data:audio/wav;base64,AA==', filename: 'fixed.wav', mime_type: 'audio/wav', duration_seconds: 8.5, ref_audio_max_seconds: 60, source: 'generated-fixed-voice' },
};
assert(validateMVData(uploadedReferenceCreation).isValid, 'uploaded-reference character fixed-voice creation must validate');
delete uploadedReferenceCreation.characters[0].voice_profile!.creation_reference_audio;
assert(!validateMVData(uploadedReferenceCreation).isValid, 'ready uploaded-reference creation must retain its source audio');

const narratorReferenceCreation = structuredClone(characterBoundAudio);
narratorReferenceCreation.director_plan!.audio_plan!.narrator_voice = {
  ...narratorReferenceCreation.director_plan!.audio_plan!.narrator_voice!,
  generation_mode: 'voice-clone',
  reference_language: 'Chinese',
  status: 'idle',
  creation_reference_audio: { data_url: 'data:audio/wav;base64,AA==', filename: 'narrator-source.wav', mime_type: 'audio/wav', duration_seconds: 9.5, ref_audio_max_seconds: 60, source: 'uploaded-reference', capture_method: 'file-upload' },
  reference_audio: undefined,
};
assert(validateMVData(narratorReferenceCreation).isValid, 'pending narrator voice-clone creation must validate before fixed voice generation');
narratorReferenceCreation.director_plan!.audio_plan!.narrator_voice!.status = 'ready';
narratorReferenceCreation.director_plan!.audio_plan!.narrator_voice!.preview_audio = 'data:audio/wav;base64,AA==';
narratorReferenceCreation.director_plan!.audio_plan!.narrator_voice!.reference_audio = { data_url: 'data:audio/wav;base64,AA==', filename: 'narrator-fixed.wav', mime_type: 'audio/wav', duration_seconds: 7.5, ref_audio_max_seconds: 60, source: 'generated-fixed-voice' };
assert(validateMVData(narratorReferenceCreation).isValid, 'ready narrator voice-clone creation must validate');

const linkedNarratorVoice = structuredClone(characterBoundAudio);
linkedNarratorVoice.director_plan!.audio_plan!.narrator_voice!.linked_character_voice_id = 'VOICE-CHAR-001';
assert(validateMVData(linkedNarratorVoice).isValid, 'narrator may link to an existing character fixed voice');
linkedNarratorVoice.director_plan!.audio_plan!.narrator_voice!.linked_character_voice_id = 'VOICE-UNKNOWN';
assert(!validateMVData(linkedNarratorVoice).isValid, 'narrator linked character voice must resolve');

const cloneProfile = structuredClone(audioFirst);
cloneProfile.characters.push({ name: '角色', description: '角色生成提示词', voice_profile: {
  voice_id: 'VOICE-CHAR-001', speaker_label: '(S2)', instruct: '稳定角色音色', reference_text: '预览文本', language: 'Japanese', seed: 42,
  generation_mode: 'voice-clone', reference_language: 'Chinese',
  reference_audio: { data_url: 'data:audio/wav;base64,AA==', filename: 'reference.wav', mime_type: 'audio/wav', duration_seconds: 18.4, ref_audio_max_seconds: 60 },
} });
assert(validateMVData(cloneProfile).isValid, 'safe reference-audio voice clone profile must validate');
cloneProfile.characters[0].voice_profile.reference_audio!.ref_audio_max_seconds = 10;
assert(!validateMVData(cloneProfile).isValid, 'ref_audio_max_seconds below the real duration must fail');

const tooManyRefs = structuredClone(singleRef);
tooManyRefs.storyboard[0].mvinfo[0].generation_plan.reference_images.push(
  { label: '<Picture 2>', purpose: '场景参考', prompt: '<Picture 2> 定义场景。' },
  { label: '<Picture 3>', purpose: '多余参考', prompt: '<Picture 3> 不应被接受。' },
);
assert(!validateMVData(tooManyRefs).isValid, 'Ref2VA with more than two declarations must fail');

console.log('PASS legacy and director JSON validation');
