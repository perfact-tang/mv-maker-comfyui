import type { MVInfo, MVScriptData } from '../types/mv-data';
import type { ProjectPage } from '../components/ProjectNavigation';
import { hasConfirmedFixedVoiceReference } from './voiceCloneProfile';

export const hasSpokenText = (shot: MVInfo) => {
  const text = (shot.audio_plan?.audio_text || shot.lyrics || '').trim();
  return Boolean(text) && !/^(\(No dialogue\)|（?无对白|（?本镜头无对白)/i.test(text);
};

export const areCharacterTasksComplete = (project: MVScriptData) => project.characters.every((character) => (
  Boolean(character.generated_assets?.image)
  && (!character.voice_profile || hasConfirmedFixedVoiceReference(character.voice_profile))
));

export const areVoiceTasksComplete = (project: MVScriptData) => {
  const audioPlan = project.director_plan?.audio_plan;
  if (!audioPlan || audioPlan.mode === 'disabled') return true;

  return project.storyboard
    .flatMap((segment) => segment.mvinfo)
    .filter(hasSpokenText)
    .every((shot) => Boolean(shot.generated_assets?.voice_audio));
};

export const getStartupProjectPage = (project: MVScriptData): ProjectPage => {
  if (!areCharacterTasksComplete(project)) return 'characters';
  if (!areVoiceTasksComplete(project)) return 'audio';
  return 'storyboard';
};
