import { createProjectLrc, formatLrcTimestamp, matchLrcToProject, parseLrc } from './lrcExport.ts';
import type { MVScriptData } from '../types/mv-data.ts';

const assert = (condition: unknown, message: string) => {
  if (!condition) throw new Error(message);
};

const project = {
  proposal_id: 7,
  direction_name: '字幕测试',
  characters: [],
  basics: { outline: '', shooting_method: '', art_style_description: '' },
  storyboard: [{
    segment_id: 1,
    movielength: '00:00-00:15',
    content_narrative: '',
    prompts: { first_frame: '', last_frame: '' },
    mvinfo: [
      { timestamp: '00:00 - 00:10', type: 'New_Scene', lyrics: '第一句', image_prompt: '', video_prompt: '', audio_plan: { chapter_id: 'A1', source_start_seconds: 0, duration_seconds: 10, audio_text: '编辑后的第一句', speakers: [], cut_status: 'confirmed' } },
      { timestamp: '00:10 - 00:15', type: 'New_Scene', lyrics: '(No dialogue)', image_prompt: '', video_prompt: '', generation_plan: { model: 'minimax-h3', mode: 'I2VA', duration_seconds: 5, duration_frames: 141, audio_mode: 'drive-audio', reference_images: [] } },
    ],
  }],
} as MVScriptData;

const lrc = createProjectLrc(project);
assert(formatLrcTimestamp(75.12) === '01:15.12', 'timestamp formatting should support minutes and centiseconds');
assert(lrc.includes('[00:00.00]编辑后的第一句'), 'LRC must use editable audio text');
assert(!lrc.includes('(No dialogue)'), 'no-dialogue markers must not become subtitles');
assert(lrc.includes('[00:15.00]\n'), 'LRC must append a final clear timestamp');
assert(parseLrc('\uFEFF[ti:翻译]\n[00:00.00]Translated line\n[00:15.00]').length === 1, 'metadata and final empty timestamps must be ignored');
const translated = matchLrcToProject(project, '[00:00.20]Translated line');
assert(translated.assignments.length === 1 && translated.assignments[0].matchMode === 'timestamp', 'translated LRC must match shots within timestamp tolerance');
assert(translated.assignments[0].importedText === 'Translated line', 'translated text must be preserved');

console.log('PASS project LRC export');
