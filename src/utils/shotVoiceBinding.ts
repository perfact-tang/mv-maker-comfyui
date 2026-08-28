import type { MVInfo, MVScriptData, ShotSpeaker } from '../types/mv-data';
import { hasSpokenText } from './projectPageRouting';

export const LEGACY_PROMO_VOICE_DESCRIPTION = '清晰沉稳的中文男声旁白，语速适中，旋律性弱，吐字明确。';
const clean = (value: unknown) => typeof value === 'string' ? value.trim() : '';
const labelId = (value: unknown) => clean(value).replace(/^\(|\)$/g, '');

export const getScriptSpeaker = (shot: MVInfo, project: MVScriptData): ShotSpeaker | undefined => {
  const id = labelId(shot.speaker_id);
  const entries = project.director_plan?.speaker_registry?.filter((entry) => labelId(entry.id) === id) || [];
  const name = clean(shot.speaker) || (id && entries.length === 1 ? clean(entries[0].name) : '');
  if (!name) return undefined;
  return { character_name: name, speaker_label: id ? `(${id})` : '', voice_description: '', binding_source: 'script' };
};

/** Resolve identities before voice creation. Images and fixed audio then appear via the same voice_id. */
export const reconcileShotVoiceBindings = (project: MVScriptData): MVScriptData => {
  const plan = project.director_plan?.audio_plan;
  if (!plan || plan.mode === 'disabled') return project;
  const narrator = plan.narrator_voice;
  const knownIds = new Set(project.characters.map((character) => character.voice_profile?.voice_id).filter(Boolean));
  if (narrator) knownIds.add(narrator.voice_id);
  let changed = false;
  const storyboard = project.storyboard.map((segment) => {
    let segmentChanged = false;
    const mvinfo = segment.mvinfo.map((shot) => {
      if (!shot.audio_plan) return shot;
      const scriptSpeaker = getScriptSpeaker(shot, project);
      const sourceSpeakers = !shot.audio_plan.speakers.length && scriptSpeaker && hasSpokenText(shot)
        ? [scriptSpeaker] : shot.audio_plan.speakers;
      let shotChanged = sourceSpeakers !== shot.audio_plan.speakers;
      const speakers = sourceSpeakers.map((speaker) => {
        // Old promo migration always wrote this exact placeholder. Manual selections
        // carry the chosen profile's description (and now an explicit source marker).
        const legacyPlaceholder = !speaker.binding_source && scriptSpeaker
          && speaker.character_name === '旁白'
          && speaker.voice_id === narrator?.voice_id
          && speaker.voice_description === LEGACY_PROMO_VOICE_DESCRIPTION;
        if (!legacyPlaceholder && speaker.voice_id && knownIds.has(speaker.voice_id)) return speaker;
        if (speaker.binding_source === 'manual') return speaker;
        const source = legacyPlaceholder ? scriptSpeaker : speaker;
        const name = clean(source.character_name) || (sourceSpeakers.length === 1 ? clean(scriptSpeaker?.character_name) : '');
        const matches = project.characters.filter((character) => clean(character.name) === name);
        const profile = matches.length === 1 ? matches[0].voice_profile : name === '旁白' ? narrator : undefined;
        if (!name) return speaker;
        const next: ShotSpeaker = {
          ...source,
          character_name: name,
          speaker_label: source.speaker_label || scriptSpeaker?.speaker_label || profile?.speaker_label || '(S1)',
          voice_description: profile?.instruct || source.voice_description,
          voice_id: profile?.voice_id,
          binding_source: 'script',
        };
        if (JSON.stringify(next) === JSON.stringify(speaker)) return speaker;
        shotChanged = true;
        return next;
      });
      if (!shotChanged) return shot;
      changed = segmentChanged = true;
      // Reconcile metadata without destroying completed audio on load or image updates.
      return { ...shot, audio_plan: { ...shot.audio_plan, speakers } };
    });
    return segmentChanged ? { ...segment, mvinfo } : segment;
  });
  return changed ? { ...project, storyboard, director_plan: {
    ...project.director_plan!, audio_plan: { ...plan, alignment_status: 'planned' },
  } } : project;
};
