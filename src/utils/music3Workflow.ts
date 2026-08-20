import music3Workflow from './audio_minimax_music_3.json' with { type: 'json' };

type WorkflowNode = { inputs: Record<string, unknown>; class_type: string; _meta?: { title?: string } };
export type Music3Workflow = Record<string, WorkflowNode>;

export interface Music3WorkflowOptions {
  caption: string;
  lyrics: string;
  maxDurationSeconds: number;
  seed?: number;
  chapterId?: string;
  instrumental?: boolean;
}

const makeInstrumentalTimeline = (lyrics: string) => {
  const script = lyrics.trim();
  if (!script) return '[Instrumental]\n[Intro]\n(Sparse opening)\n[Build]\n(Gradually rising energy)\n[Climax]\n(Full instrumental arrangement)\n[Outro]\n(Clean resolution and fade)';
  return /^\s*\[Instrumental\]/i.test(script) ? script : `[Instrumental]\n${script}`;
};

export const createMusic3Workflow = ({ caption, lyrics, maxDurationSeconds, seed, chapterId, instrumental = false }: Music3WorkflowOptions) => {
  const workflow = structuredClone(music3Workflow) as unknown as Music3Workflow;
  const resolvedSeed = seed ?? Math.floor(Math.random() * 1_000_000_000_000_000);
  workflow['37:13'].inputs.caption = instrumental
    ? `${caption.trim()}。Instrumental score only; no singing, spoken words, humming, chanting, or vocal chops.`
    : caption.trim();
  workflow['37:13'].inputs.lyrics = instrumental ? makeInstrumentalTimeline(lyrics) : lyrics.trim();
  workflow['37:13'].inputs.max_duration = Math.max(1, Math.min(300, Math.ceil(maxDurationSeconds)));
  workflow['37:38'].inputs.seed = resolvedSeed;
  workflow['35'].inputs.filename_prefix = `audio/mv-maker-music3/${(chapterId || 'chapter').replace(/[^a-zA-Z0-9_-]/g, '_')}`;
  return { workflow, seed: resolvedSeed };
};
