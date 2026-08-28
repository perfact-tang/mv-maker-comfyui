import { migrateGenerationSettingsToV4AudioPlan, migrateProjectToV4AudioPlan } from './audioPlanMigration.ts';
import { validateMVData } from './jsonValidator.ts';
import { createProjectArchive, parseProjectFile } from './projectArchive.ts';
import type { MVScriptData, ProjectGenerationSettings } from '../types/mv-data.ts';

const assert = (condition: unknown, message: string) => {
  if (!condition) throw new Error(message);
};

const project: MVScriptData = {
  proposal_id: 1,
  direction_name: '旧讲解项目',
  director_plan: {
    source_type: 'blog', content_form: 'promo', model: 'minimax-h3', aspect_ratio: '16:9', total_duration_seconds: 10,
    allowed_clip_durations_seconds: [5, 10, 15], style_name: '3D', style_rationale: '', narrative_strategy: '', source_coverage_note: '',
  },
  characters: [],
  basics: { outline: '', shooting_method: '', art_style_description: '' },
  storyboard: [{
    segment_id: 1, movielength: '00:00-00:10', content_narrative: '开场解释', prompts: { first_frame: '', last_frame: '' },
    mvinfo: [{
      timestamp: '00:00 - 00:10', type: 'New_Scene', lyrics: '这是旁白。', image_prompt: '首帧',
      video_prompt: 'overall_soundscape:\n旧音效\n\nnon_diegetic_music:\n旧配乐',
      generation_plan: { model: 'minimax-h3', mode: 'I2VA', duration_seconds: 10, duration_frames: 260, audio_mode: 'native-audio', reference_images: [] },
    }],
  }],
};

const migrated = migrateProjectToV4AudioPlan(project);
const shot = migrated.storyboard[0].mvinfo[0];
assert(migrated.director_plan?.audio_plan?.mode === 'qwen3-tts-audio-first', 'promo should migrate to Qwen3 TTS audio-first');
assert(migrated.director_plan?.audio_plan?.music_workflow === 'MiniMax Music 3', 'Music 3 should remain as the score workflow');
assert(migrated.director_plan?.audio_plan?.narrator_voice?.voice_id === 'VOICE-NARRATOR', 'narrator voice should be locked');
assert(migrated.director_plan?.audio_plan?.chapters.length === 1, 'one segment should create one chapter');
assert(shot.shot_id === 'SHOT-001', 'migration should add a stable shot id');
assert(shot.audio_plan?.source_start_seconds === 0 && shot.audio_plan.duration_seconds === 10, 'shot audio timing should be created');
assert(shot.generation_plan?.audio_mode === 'drive-audio', 'H3 must use drive audio');
assert(shot.audio_plan?.speakers[0]?.voice_id === 'VOICE-NARRATOR', 'shot should reference the locked narrator voice');
assert(shot.video_prompt.includes('<Audio 1>') && shot.video_prompt.endsWith('N/A'), 'prompt must reuse drive audio and disable H3 music');
assert(validateMVData(migrated).isValid, 'migrated Qwen3 TTS project must validate');

const settings: ProjectGenerationSettings = {
  image_workflow: 'Z-Image-Turbo', video_workflow: 'H3', video_orientation: 'landscape',
  h3: { generation_mode: 'director-routed', audio_mode: 'native-audio', video_length_frames: 260, reference_images: [null, null] },
};
assert(migrateGenerationSettingsToV4AudioPlan(settings, migrated)?.h3.audio_mode === 'drive-audio', 'global H3 settings should migrate');
assert(migrateProjectToV4AudioPlan(migrated) === migrated, 'migration must be idempotent');

const narratorCloneProject = structuredClone(migrated);
narratorCloneProject.director_plan!.audio_plan!.narrator_voice = {
  ...narratorCloneProject.director_plan!.audio_plan!.narrator_voice!,
  generation_mode: 'voice-clone',
  reference_language: 'Chinese',
  status: 'ready',
  preview_audio: 'data:audio/wav;base64,AA==',
  creation_reference_audio: { data_url: 'data:audio/wav;base64,AA==', filename: 'narrator-source.wav', mime_type: 'audio/wav', duration_seconds: 9.5, ref_audio_max_seconds: 60, source: 'uploaded-reference', capture_method: 'file-upload' },
  reference_audio: { data_url: 'data:audio/wav;base64,AA==', filename: 'narrator-fixed.wav', mime_type: 'audio/wav', duration_seconds: 7.5, ref_audio_max_seconds: 60, source: 'generated-fixed-voice' },
};
const migratedNarratorClone = migrateProjectToV4AudioPlan(narratorCloneProject);
assert(migratedNarratorClone === narratorCloneProject, 'ready narrator Voice Clone project must remain migration-idempotent');
assert(migratedNarratorClone.director_plan?.audio_plan?.narrator_voice?.generation_mode === 'voice-clone', 'migration must preserve narrator Voice Clone mode');

const projectWithOldWorkflowLabel = structuredClone(migrated);
(projectWithOldWorkflowLabel.director_plan!.audio_plan as unknown as { workflow: string }).workflow = 'Qwen3 TTS';
const archive = createProjectArchive(projectWithOldWorkflowLabel, settings);
assert(archive.project.director_plan?.audio_plan?.workflow === '千问 3 TTS', 'archive export must canonicalize legacy Qwen workflow labels');
const importedArchive = parseProjectFile(JSON.stringify({ ...archive, project: projectWithOldWorkflowLabel }));
assert(importedArchive.project.director_plan?.audio_plan?.workflow === '千问 3 TTS', 'archive import must normalize workflow labels before validation');

console.log('PASS v3 director project audio-plan migration');

const dialogueProject = structuredClone(project);
dialogueProject.characters = [
  { name: 'コードにゃ', description: '猫讲师', voice_direction: '明亮温和的年轻女性声线。' },
  { name: '小林', description: '学习者', voice_direction: '沉稳清楚的成年女性声线。' },
];
dialogueProject.director_plan!.speaker_registry = [{ id: 'S1', name: '小林' }, { id: 'S3', name: 'コードにゃ' }];
const dialogueShot = { ...dialogueProject.storyboard[0].mvinfo[0], speaker: '小林', speaker_id: 'S1' };
dialogueProject.storyboard[0].mvinfo = [
  dialogueShot,
  { ...dialogueShot, speaker: undefined, speaker_id: 'S3' },
  { ...dialogueShot, speaker: '咨询助手朗读', speaker_id: 'S4' },
  { ...dialogueShot, speaker: undefined, speaker_id: undefined, lyrics: '(No dialogue)' },
];
const bound = migrateProjectToV4AudioPlan(dialogueProject);
const boundShots = bound.storyboard[0].mvinfo;
assert(boundShots[0].audio_plan?.speakers[0].voice_id === bound.characters[1].voice_profile?.voice_id, 'promo dialogue must bind by explicit name, not narrator or character array order');
assert(boundShots[0].audio_plan?.speakers[0].speaker_label === '(S1)', 'original speaker label must survive migration');
assert(boundShots[1].audio_plan?.speakers[0].voice_id === bound.characters[0].voice_profile?.voice_id, 'registry-only speaker ID must resolve');
assert(bound.characters[0].voice_profile?.instruct === dialogueProject.characters[0].voice_direction, 'voice direction must initialize the voice profile');
assert(boundShots[2].audio_plan?.speakers[0].voice_id === undefined && boundShots[2].audio_plan?.speakers[0].character_name === '咨询助手朗读', 'unknown named speakers must remain visible and unresolved');
assert(boundShots[3].audio_plan?.speakers.length === 0, 'silent shots must not acquire a narrator');
assert(boundShots[3].generation_plan?.audio_mode === 'native-audio', 'silent shots must not be routed to local Drive Audio');
assert(!boundShots[3].video_prompt.includes('<Audio 1>'), 'silent shot scripts must not reference an unprovided audio input');
assert(validateMVData(bound).isValid, 'explicit unresolved script speakers must remain importable');
assert(migrateProjectToV4AudioPlan(bound) === bound, 'pending bindings must remain idempotent');
assert(parseProjectFile(JSON.stringify(createProjectArchive(bound, settings))).project.storyboard[0].mvinfo[2].audio_plan?.speakers[0].character_name === '咨询助手朗读', 'unresolved identity must survive archive roundtrip');

const previouslyImported = structuredClone(bound);
previouslyImported.storyboard[0].mvinfo[0].audio_plan!.speakers = [{
  speaker_label: '(S1)', character_name: '旁白', voice_id: 'VOICE-NARRATOR',
  voice_description: '清晰沉稳的中文男声旁白，语速适中，旋律性弱，吐字明确。',
}];
previouslyImported.storyboard[0].mvinfo[0].generated_assets = { image: 'keep-image', music_audio: 'keep-music', voice_audio: 'old-voice', drive_audio: 'old-drive' };
const repaired = migrateProjectToV4AudioPlan(previouslyImported);
assert(repaired.storyboard[0].mvinfo[0].audio_plan?.speakers[0].voice_id === bound.characters[1].voice_profile?.voice_id, 'previous imports must recover the original speaker');
assert(repaired.storyboard[0].mvinfo[0].generated_assets?.voice_audio === 'old-voice' && repaired.storyboard[0].mvinfo[0].generated_assets?.drive_audio === 'old-drive', 'identity reconciliation preserves completed speech and mix');
assert(repaired.storyboard[0].mvinfo[0].generated_assets?.image === 'keep-image' && repaired.storyboard[0].mvinfo[0].generated_assets?.music_audio === 'keep-music', 'repair preserves image and music assets');
assert(migrateProjectToV4AudioPlan(repaired) === repaired, 'repair runs only once');

const manual = structuredClone(previouslyImported);
manual.storyboard[0].mvinfo[0].audio_plan!.speakers[0].binding_source = 'manual';
assert(migrateProjectToV4AudioPlan(manual) === manual, 'explicit manual bindings must never be overwritten');
delete manual.storyboard[0].mvinfo[0].audio_plan!.speakers[0].binding_source;
manual.storyboard[0].mvinfo[0].audio_plan!.speakers[0].voice_description = manual.director_plan!.audio_plan!.narrator_voice!.instruct;
assert(migrateProjectToV4AudioPlan(manual) === manual, 'manual narrator selections made by previous versions must survive');

const stale = structuredClone(bound);
stale.storyboard[0].mvinfo[0].audio_plan!.speakers[0].voice_id = 'OLD-VOICE-ID';
assert(migrateProjectToV4AudioPlan(stale).storyboard[0].mvinfo[0].audio_plan?.speakers[0].voice_id === bound.characters[1].voice_profile?.voice_id, 'stale imported IDs should resolve by the named character');

const addedCharacter = structuredClone(bound);
addedCharacter.characters.push({ name: '咨询助手朗读', description: '仅声音角色', voice_direction: '平稳朗读。' });
const resolved = migrateProjectToV4AudioPlan(addedCharacter);
assert(resolved.storyboard[0].mvinfo[2].audio_plan?.speakers[0].voice_id === resolved.characters[2].voice_profile?.voice_id, 'adding a missing character resolves its pending shots');
const invalid = structuredClone(bound);
delete invalid.storyboard[0].mvinfo[2].audio_plan!.speakers[0].binding_source;
assert(!validateMVData(invalid).isValid, 'missing voice IDs without explicit pending script identity must still fail validation');
console.log('PASS script speaker binding, unresolved identity, archive roundtrip and existing project recovery');

const legacySilent = structuredClone(bound);
legacySilent.director_plan!.audio_plan!.alignment_status = 'locked';
const legacySilentShot = legacySilent.storyboard[0].mvinfo[3];
legacySilentShot.generation_plan!.audio_mode = 'drive-audio';
legacySilentShot.video_prompt = 'Keep <Picture 1>\noverall_soundscape:\n严格复用 <Audio 1> 作为唯一声音来源。\n\nnon_diegetic_music:\nN/A';
legacySilentShot.generated_assets = { voice_audio: '/keep-voice', drive_audio: '/keep-drive', music_audio: '/keep-music', video: '/keep-video' };
const repairedSilent = migrateProjectToV4AudioPlan(legacySilent);
assert(repairedSilent.storyboard[0].mvinfo[3].generation_plan!.audio_mode === 'native-audio', 'existing silent scripts upgrade automatically');
assert(repairedSilent.storyboard[0].mvinfo[3].generated_assets === legacySilentShot.generated_assets, 'silent routing never deletes generated media');
assert(repairedSilent.director_plan!.audio_plan!.alignment_status === 'locked', 'silent routing retains partial timeline lock');
assert(migrateProjectToV4AudioPlan(repairedSilent) === repairedSilent, 'silent routing upgrade is idempotent');
const silentRoundTrip = parseProjectFile(JSON.stringify(createProjectArchive(repairedSilent, settings))).project.storyboard[0].mvinfo[3];
assert(silentRoundTrip.generation_plan!.audio_mode === 'native-audio' && !silentRoundTrip.video_prompt.includes('<Audio 1>'), 'saved scripts keep silent shots independent of local audio');
assert(silentRoundTrip.generated_assets!.drive_audio === '/keep-drive', 'archive retains unused audio records for editing');
