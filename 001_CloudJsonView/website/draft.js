import { parseProject } from './viewer.js';

export const draftKey = (uid) => `aimovieview-project-draft:${uid}`;
export function serializeDraft(document, filename, view) {
  return JSON.stringify({ root: document.root, filename, view });
}
export function restoreDraft(value) {
  const draft = JSON.parse(value);
  if (typeof draft.filename !== 'string') throw new Error('草稿文件名无效。');
  return { document: parseProject(draft.root), filename: draft.filename, view: draft.view ?? {} };
}
export function exportProject(document) {
  return JSON.stringify(document.root, null, 2);
}
// Only the displayed text fields can be changed; indexes refer to the original
// project, even when the storyboard is filtered.
export function editProject(project, path, value) {
  let match = /^characters\.(\d+)\.description$/.exec(path);
  if (match) {
    const character = project.characters[Number(match[1])];
    if (!character) return false;
    character.description = value;
    return true;
  }
  match = /^storyboard\.(\d+)\.mvinfo\.(\d+)\.(video_prompt|dialogue)$/.exec(path);
  if (!match) return false;
  const shot = project.storyboard[Number(match[1])]?.mvinfo[Number(match[2])];
  if (!shot) return false;
  if (match[3] === 'video_prompt') shot.video_prompt = value;
  else {
    if (shot.audio_plan?.audio_text != null) shot.audio_plan.audio_text = value;
    else shot.lyrics = value;
    // Archives can carry both copies of the spoken text.
    if (Object.hasOwn(shot, 'lyrics')) shot.lyrics = value;
  }
  return true;
}
