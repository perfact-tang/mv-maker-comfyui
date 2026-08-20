import assert from 'node:assert/strict';
import type { MVScriptData } from '../types/mv-data.ts';
import { getStartupProjectPage } from './projectPageRouting.ts';

const project = (): MVScriptData => ({
  proposal_id: 1,
  direction_name: '测试项目',
  characters: [{ name: '人物 A', description: '测试人物' }],
  basics: { outline: '', shooting_method: '', art_style_description: '' },
  director_plan: {
    source_type: 'story', content_form: 'short_drama', model: 'H3', aspect_ratio: '16:9',
    total_duration_seconds: 5, allowed_clip_durations_seconds: [5], style_name: '', style_rationale: '',
    narrative_strategy: '', source_coverage_note: '',
    audio_plan: {
      mode: 'qwen3-tts-audio-first', workflow: '千问 3 TTS', production_style: 'spoken-word',
      chapters: [], alignment_status: 'planned',
    },
  },
  storyboard: [{
    segment_id: 1, movielength: '5s', content_narrative: '', prompts: { first_frame: '', last_frame: '' },
    mvinfo: [{
      timestamp: '00:00 - 00:05', type: 'New_Scene', lyrics: '需要配音', video_prompt: '',
      audio_plan: { chapter_id: 'A1', source_start_seconds: 0, duration_seconds: 5, audio_text: '需要配音', speakers: [], cut_status: 'tentative' },
    }],
  }],
});

const charactersPending = project();
assert.equal(getStartupProjectPage(charactersPending), 'characters');

const voicesPending = project();
voicesPending.characters[0].generated_assets = { image: 'character.png' };
assert.equal(getStartupProjectPage(voicesPending), 'audio');

const allComplete = project();
allComplete.characters[0].generated_assets = { image: 'character.png' };
allComplete.storyboard[0].mvinfo[0].generated_assets = { voice_audio: 'voice.wav' };
assert.equal(getStartupProjectPage(allComplete), 'storyboard');

const noDialogue = project();
noDialogue.characters[0].generated_assets = { image: 'character.png' };
noDialogue.storyboard[0].mvinfo[0].lyrics = '(No dialogue)';
noDialogue.storyboard[0].mvinfo[0].audio_plan!.audio_text = '';
assert.equal(getStartupProjectPage(noDialogue), 'storyboard');

console.log('project page routing tests passed');
