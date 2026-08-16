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

export interface ProjectSubtitleCue {
  segmentId: number;
  infoIndex: number;
  shotId?: string;
  startSeconds: number;
  durationSeconds: number;
  text: string;
}

export interface ParsedLrcLine {
  startSeconds: number;
  text: string;
}

export interface LrcImportAssignment extends ProjectSubtitleCue {
  importedStartSeconds: number;
  importedText: string;
  matchMode: 'timestamp' | 'sequence';
}

export const getProjectSubtitleCues = (project: MVScriptData): ProjectSubtitleCue[] => {
  let cursor = 0;
  const cues: ProjectSubtitleCue[] = [];
  for (const segment of [...project.storyboard].sort((left, right) => Number(left.segment_id) - Number(right.segment_id))) {
    segment.mvinfo.forEach((shot, infoIndex) => {
      const startSeconds = shotStart(shot) ?? cursor;
      const durationSeconds = shotDuration(shot);
      const text = subtitleText(shot);
      if (text && !NO_DIALOGUE.test(text)) cues.push({ segmentId: segment.segment_id, infoIndex, shotId: shot.shot_id, startSeconds, durationSeconds, text });
      cursor = Math.max(cursor, startSeconds + durationSeconds);
    });
  }
  return cues;
};

export const parseLrc = (content: string): ParsedLrcLine[] => {
  const lines: ParsedLrcLine[] = [];
  for (const rawLine of content.replace(/^\uFEFF/, '').split(/\r?\n/)) {
    const timestamps = [...rawLine.matchAll(/\[(\d+):(\d+(?:\.\d+)?)\]/g)];
    if (!timestamps.length) continue;
    const text = rawLine.replace(/\[(\d+):(\d+(?:\.\d+)?)\]/g, '').trim();
    if (!text) continue;
    for (const match of timestamps) {
      const startSeconds = Number(match[1]) * 60 + Number(match[2]);
      if (Number.isFinite(startSeconds)) lines.push({ startSeconds, text });
    }
  }
  return lines.sort((left, right) => left.startSeconds - right.startSeconds);
};

export const matchLrcToProject = (project: MVScriptData, content: string) => {
  const cues = getProjectSubtitleCues(project);
  const importedLines = parseLrc(content);
  const usedCueIndexes = new Set<number>();
  const usedLineIndexes = new Set<number>();
  const assignments: LrcImportAssignment[] = [];
  importedLines.forEach((line, lineIndex) => {
    let bestCueIndex = -1;
    let bestDistance = Number.POSITIVE_INFINITY;
    cues.forEach((cue, cueIndex) => {
      if (usedCueIndexes.has(cueIndex)) return;
      const distance = Math.abs(cue.startSeconds - line.startSeconds);
      if (distance <= 0.75 && distance < bestDistance) {
        bestDistance = distance;
        bestCueIndex = cueIndex;
      }
    });
    if (bestCueIndex < 0) return;
    usedCueIndexes.add(bestCueIndex);
    usedLineIndexes.add(lineIndex);
    assignments.push({ ...cues[bestCueIndex], importedStartSeconds: line.startSeconds, importedText: line.text, matchMode: 'timestamp' });
  });
  const remainingCues = cues.map((cue, index) => ({ cue, index })).filter(({ index }) => !usedCueIndexes.has(index));
  const remainingLines = importedLines.map((line, index) => ({ line, index })).filter(({ index }) => !usedLineIndexes.has(index));
  if (remainingCues.length === remainingLines.length) {
    remainingCues.forEach(({ cue }, index) => assignments.push({ ...cue, importedStartSeconds: remainingLines[index].line.startSeconds, importedText: remainingLines[index].line.text, matchMode: 'sequence' }));
  }
  assignments.sort((left, right) => left.startSeconds - right.startSeconds);
  return {
    assignments,
    cueCount: cues.length,
    importedLineCount: importedLines.length,
    unmatchedCueCount: cues.length - assignments.length,
    unmatchedLineCount: importedLines.length - assignments.length,
  };
};

export const formatLrcTimestamp = (seconds: number) => {
  const centiseconds = Math.max(0, Math.round(seconds * 100));
  const minutes = Math.floor(centiseconds / 6000);
  const remaining = centiseconds % 6000;
  return `${String(minutes).padStart(2, '0')}:${String(Math.floor(remaining / 100)).padStart(2, '0')}.${String(remaining % 100).padStart(2, '0')}`;
};

export const createProjectLrc = (project: MVScriptData) => {
  let cursor = 0;
  const subtitleLines = getProjectSubtitleCues(project).map((cue) => `[${formatLrcTimestamp(cue.startSeconds)}]${cue.text}`);
  for (const segment of project.storyboard) for (const shot of segment.mvinfo) cursor += shotDuration(shot);
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
