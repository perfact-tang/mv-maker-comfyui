import type { MVInfo, MVScriptData } from '../types/mv-data';

const NO_DIALOGUE = /^(\(No dialogue\)|（?无对白|（?本镜头无对白)/i;

const parseClock = (value: string): number | undefined => {
  const parts = value.trim().split(':').map(Number);
  if (parts.some((part) => !Number.isFinite(part)) || parts.length < 2 || parts.length > 3) return undefined;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return parts[0] * 60 + parts[1];
};

const shotStart = (shot: MVInfo): number | undefined => {
  const start = shot.timestamp?.split(/\s*-\s*/)[0];
  return start ? parseClock(start) : undefined;
};

const shotDuration = (shot: MVInfo) => (
  shot.audio_plan?.duration_seconds ?? shot.generation_plan?.duration_seconds ?? 5
);

const subtitleText = (shot: MVInfo) => (
  (shot.audio_plan?.audio_text ?? shot.lyrics ?? '').replace(/\s+/g, ' ').trim()
);

export const formatLrcTimestamp = (seconds: number) => {
  const centiseconds = Math.max(0, Math.round(seconds * 100));
  const minutes = Math.floor(centiseconds / 6000);
  const remaining = centiseconds % 6000;
  return `${String(minutes).padStart(2, '0')}:${String(Math.floor(remaining / 100)).padStart(2, '0')}.${String(remaining % 100).padStart(2, '0')}`;
};

export const createProjectLrc = (project: MVScriptData) => {
  let cursor = 0;
  const subtitleLines: string[] = [];
  for (const segment of [...project.storyboard].sort((left, right) => Number(left.segment_id) - Number(right.segment_id))) {
    for (const shot of segment.mvinfo) {
      const start = shotStart(shot) ?? cursor;
      const text = subtitleText(shot);
      if (text && !NO_DIALOGUE.test(text)) subtitleLines.push(`[${formatLrcTimestamp(start)}]${text}`);
      cursor = Math.max(cursor, start + shotDuration(shot));
    }
  }
  const totalDuration = Math.max(cursor, project.director_plan?.total_duration_seconds ?? 0);
  const title = project.direction_name?.trim() || `Project ${project.proposal_id}`;
  return [
    `[ti:${title}]`,
    '[ar:MV Maker]',
    `[al:Proposal ${project.proposal_id}]`,
    '[by:MV Maker ComfyUI]',
    '[offset:0]',
    ...subtitleLines,
    `[${formatLrcTimestamp(totalDuration)}]`,
    '',
  ].join('\n');
};

export const safeLrcFilename = (project: MVScriptData) => {
  const title = (project.direction_name || `mv_project_${project.proposal_id}`)
    .replace(/[\\/:*?"<>|]+/g, '_')
    .trim();
  return `${title || `mv_project_${project.proposal_id}`}_subtitles.lrc`;
};
