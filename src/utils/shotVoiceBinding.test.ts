import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ShotVoiceCharacterSelector } from '../components/ShotVoiceCharacterSelector';
import { useGlobalSettings } from '../stores/useGlobalSettings';
import { migrateProjectToV4AudioPlan } from './audioPlanMigration';
import { hasConfirmedFixedVoiceReference } from './voiceCloneProfile';
import type { MVScriptData } from '../types/mv-data';

const assert = (condition: unknown, message: string) => { if (!condition) throw new Error(message); };
const project: MVScriptData = {
  proposal_id: 1, direction_name: 'Speaker binding fixture',
  director_plan: {
    source_type: 'story', content_form: 'promo', model: 'minimax-h3', aspect_ratio: '16:9',
    total_duration_seconds: 5, allowed_clip_durations_seconds: [5], style_name: '',
    style_rationale: '', narrative_strategy: '', source_coverage_note: '',
  },
  basics: { outline: '', shooting_method: '', art_style_description: '' },
  characters: [{ name: '小林', description: '', voice_direction: '沉稳女声' }],
  storyboard: [{ segment_id: 1, movielength: '00:00-00:05', content_narrative: '',
    prompts: { first_frame: '', last_frame: '' }, mvinfo: [{
      timestamp: '00:00-00:05', type: 'New_Scene', lyrics: '你好', video_prompt: '', speaker: '小林', speaker_id: 'S1',
    }] }],
};
useGlobalSettings.getState().loadProject(project);
const data = () => useGlobalSettings.getState().mvData!;
const voiceId = data().characters[0].voice_profile!.voice_id;
const render = () => renderToStaticMarkup(createElement(ShotVoiceCharacterSelector, {
  characters: data().characters, selectedVoiceId: data().storyboard[0].mvinfo[0].audio_plan!.speakers[0].voice_id,
  speakerName: '小林', onSelect: () => { throw new Error('must not need manual selection'); },
}));
assert(render().includes('小林') && render().includes('无需重新选择'), 'import must show the matched character before audio creation');
useGlobalSettings.getState().updateCharacterAsset(0, 'image', 'https://example.invalid/character.png');
assert(render().includes('https://example.invalid/character.png'), 'new character image appears without reselection');
useGlobalSettings.getState().updateCharacterVoiceProfile(0, {
  status: 'ready', preview_audio: 'data:audio/wav;base64,AA==',
  reference_audio: { data_url: 'data:audio/wav;base64,AA==', filename: 'fixed.wav', mime_type: 'audio/wav',
    duration_seconds: 5, ref_audio_max_seconds: 60, source: 'generated-fixed-voice' },
});
assert(data().storyboard[0].mvinfo[0].audio_plan!.speakers[0].voice_id === voiceId, 'voice creation retains the prebound identity');
assert(hasConfirmedFixedVoiceReference(data().characters[0].voice_profile), 'the bound profile is now usable by generation');
assert(render().includes('固定音色已创建') && !render().includes('无需重新选择'), 'created voice is shown as ready automatically');
const restored = migrateProjectToV4AudioPlan(JSON.parse(JSON.stringify(data())));
assert(restored.storyboard[0].mvinfo[0].audio_plan!.speakers[0].voice_id === voiceId, 'reload retains binding');
assert(hasConfirmedFixedVoiceReference(restored.characters[0].voice_profile), 'reload preserves fixed voice assets');
const unmatched = renderToStaticMarkup(createElement(ShotVoiceCharacterSelector, {
  characters: [{ name: 'unrelated', description: '' }], speakerName: '咨询助手朗读', onSelect: () => {},
}));
assert(unmatched.includes('咨询助手朗读') && unmatched.includes('尚未匹配到人物音色') && !unmatched.includes('>unrelated<'), 'unknown voice shows its script name, never an unrelated unvoiced character');
console.log('PASS voice binding store updates and selector rendering without manual activation');

// Regression: settings, speaker reconciliation and image generation must retain produced media.
const assets = { voice_audio: '/old-voice.mp3', voice_audio_filename: 'old-voice.mp3', drive_audio: '/old-drive.mp3', drive_audio_filename: 'old-drive.mp3', music_audio: '/old-music.mp3' };
const withAudio = structuredClone(data());
withAudio.storyboard[0].mvinfo[0].generated_assets = assets;
withAudio.storyboard[0].mvinfo[0].audio_plan!.actual_voice_duration_seconds = 3.5;
useGlobalSettings.getState().setMvData(withAudio);
const keep = (action: () => void, label: string) => {
  action();
  const current = data().storyboard[0].mvinfo[0];
  assert(JSON.stringify(current.generated_assets) === JSON.stringify(assets), label + ' preserves all media');
  assert(current.audio_plan!.actual_voice_duration_seconds === 3.5, label + ' preserves measured timing');
};
keep(() => useGlobalSettings.getState().setGlobalTtsLanguage('Japanese'), 'global language');
assert(hasConfirmedFixedVoiceReference(data().characters[0].voice_profile), 'global language retains ready fixed voice');
keep(() => useGlobalSettings.getState().updateNarratorVoiceProfile({ reference_text: 'changed narrator text' }), 'narrator text');
keep(() => useGlobalSettings.getState().updateNarratorVoiceProfile({ linked_character_voice_id: voiceId }), 'narrator binding');
keep(() => useGlobalSettings.getState().updateCharacterVoiceProfile(0, { instruct: 'changed character instruction' }), 'character voice instruction');
keep(() => useGlobalSettings.getState().replaceCharacterImage(0, '/new-image.png'), 'replace image');
keep(() => useGlobalSettings.getState().updateCharacterAsset(0, 'image', '/generated-image.png'), 'generate image');
keep(() => useGlobalSettings.getState().setShotTtsLanguage(1, 0, 'English'), 'shot language');
keep(() => useGlobalSettings.getState().updateMVInfoAudioText(1, 0, 'new text'), 'shot text');
keep(() => useGlobalSettings.getState().updateMVInfoAudioTexts([{ segmentId: 1, infoIndex: 0, text: 'translated' }]), 'LRC import');
keep(() => useGlobalSettings.getState().setShotVoiceId(1, 0, data().director_plan!.audio_plan!.narrator_voice!.voice_id), 'speaker binding');
const serialized = JSON.parse(JSON.stringify(data()));
keep(() => useGlobalSettings.getState().loadProject(serialized), 'project reload');
console.log('PASS audio assets preserved across settings, images, text and reload');

const partial = structuredClone(data());
partial.storyboard[0].mvinfo.push({ ...structuredClone(partial.storyboard[0].mvinfo[0]), shot_id: 'MISSING-AUDIO', generated_assets: undefined });
useGlobalSettings.getState().setMvData(partial);
useGlobalSettings.getState().lockAudioTimeline();
assert(data().director_plan!.audio_plan!.alignment_status === 'locked', 'partial audio project can lock its current timeline');
assert(JSON.stringify(data().storyboard[0].mvinfo[0].generated_assets) === JSON.stringify(assets), 'partial locking retains existing audio');
assert(!data().storyboard[0].mvinfo[1].generated_assets, 'locking does not fabricate missing audio');
const lockedDurations = data().storyboard[0].mvinfo.map((shot) => shot.audio_plan!.duration_seconds);
assert(JSON.stringify(lockedDurations) === JSON.stringify(partial.storyboard[0].mvinfo.map((shot) => shot.audio_plan!.duration_seconds)), 'locking retains planned durations, including ungenerated shots');
const emptyAudioProject = structuredClone(partial);
emptyAudioProject.storyboard[0].mvinfo.forEach((shot) => { shot.generated_assets = undefined; });
useGlobalSettings.getState().setMvData(emptyAudioProject);
useGlobalSettings.getState().lockAudioTimeline();
assert(data().director_plan!.audio_plan!.alignment_status === 'locked', 'even a project with no generated audio can lock; video generation will stop on its first shot');
console.log('PASS partial and empty audio timelines can lock without clearing assets or changing durations');

useGlobalSettings.getState().setMvData(partial);
keep(() => useGlobalSettings.getState().updateMVInfoAudioText(1, 0, ''), 'remove dialogue');
const firstShot = () => data().storyboard[0].mvinfo[0];
assert(firstShot().generation_plan!.audio_mode === 'native-audio', 'removing dialogue switches stored mode to native audio');
assert(!firstShot().video_prompt.includes('<Audio 1>') && !firstShot().video_prompt.includes('<d>'), 'removing dialogue removes local drive prompt');
useGlobalSettings.getState().lockAudioTimeline();
assert(firstShot().generation_plan!.audio_mode === 'native-audio', 'locking keeps non-dialogue native');
useGlobalSettings.getState().updateMVInfoAudioTiming(1, 0, 10);
assert(firstShot().generation_plan!.audio_mode === 'native-audio', 'duration edit keeps non-dialogue native');
useGlobalSettings.getState().applyAudioChapterDurations(firstShot().audio_plan!.chapter_id, [10, 5], 15);
assert(firstShot().generation_plan!.audio_mode === 'native-audio', 'chapter alignment keeps non-dialogue native');
useGlobalSettings.getState().updateMVInfoAudioTexts([{ segmentId: 1, infoIndex: 0, text: '重新加入对白' }]);
assert(firstShot().generation_plan!.audio_mode === 'drive-audio', 'adding dialogue switches stored mode back to drive');
assert(firstShot().video_prompt.includes('<Audio 1>') && firstShot().video_prompt.includes('重新加入对白</d>'), 'adding dialogue restores drive prompt and transcript');
useGlobalSettings.getState().updateMVInfoAudioTexts([{ segmentId: 1, infoIndex: 0, text: '(No dialogue)' }]);
assert(firstShot().generation_plan!.audio_mode === 'native-audio', 'batch text edit also recognizes no-dialogue marker');
useGlobalSettings.getState().updateMVInfoAudioText(1, 0, '再次恢复对白');
assert(firstShot().generation_plan!.audio_mode === 'drive-audio', 'single text edit restores dialogue drive mode');
console.log('PASS no-dialogue routing stays consistent across text edits, locking and timing changes');
