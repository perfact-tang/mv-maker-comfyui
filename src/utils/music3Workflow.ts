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

export const createMusic3Workflow = ({ caption, lyrics, maxDurationSeconds, seed, chapterId, instrumental = false }: Music3WorkflowOptions) => {
  const workflow = structuredClone(music3Workflow) as unknown as Music3Workflow;
  const resolvedSeed = seed ?? Math.floor(Math.random() * 1_000_000_000_000_000);
  workflow['37:13'].inputs.caption = instrumental
    ? `${caption.trim()}。纯器乐配乐，无演唱、无人声、无吟唱、无旁白。`
    : caption.trim();
  workflow['37:13'].inputs.lyrics = instrumental ? '[Instrumental]\n(No vocals)' : lyrics.trim();
  workflow['37:13'].inputs.max_duration = Math.max(1, Math.min(300, Math.ceil(maxDurationSeconds)));
  workflow['37:38'].inputs.seed = resolvedSeed;
  workflow['35'].inputs.filename_prefix = `audio/mv-maker-music3/${(chapterId || 'chapter').replace(/[^a-zA-Z0-9_-]/g, '_')}`;
  return { workflow, seed: resolvedSeed };
};
