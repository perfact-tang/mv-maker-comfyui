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

const projectWithOldWorkflowLabel = structuredClone(migrated);
(projectWithOldWorkflowLabel.director_plan!.audio_plan as unknown as { workflow: string }).workflow = 'Qwen3 TTS';
const archive = createProjectArchive(projectWithOldWorkflowLabel, settings);
assert(archive.project.director_plan?.audio_plan?.workflow === '千问 3 TTS', 'archive export must canonicalize legacy Qwen workflow labels');
const importedArchive = parseProjectFile(JSON.stringify({ ...archive, project: projectWithOldWorkflowLabel }));
assert(importedArchive.project.director_plan?.audio_plan?.workflow === '千问 3 TTS', 'archive import must normalize workflow labels before validation');

console.log('PASS v3 director project audio-plan migration');
