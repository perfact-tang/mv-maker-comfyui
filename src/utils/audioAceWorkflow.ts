import aceWorkflow from './audio_ace_step_1_5_split_4b.json' with { type: 'json' };
import type { AceMusicLanguage, MusicGenerationMode } from '../types/mv-data';

type WorkflowNode = { inputs: Record<string, unknown>; class_type: string; _meta?: { title?: string } };
export type AudioAceWorkflow = Record<string, WorkflowNode>;

export interface AudioAceWorkflowOptions {
  tags: string;
  lyrics: string;
  durationSeconds: number;
  mode: MusicGenerationMode;
  bpm: number;
  timeSignature: '2' | '3' | '4' | '6';
  language: AceMusicLanguage;
  keyScale: string;
  seed?: number;
  chapterId?: string;
}

const instrumentalScript = (lyrics: string) => {
  const script = lyrics.trim();
  if (!script) return '[Instrumental]\n[Intro]\n(Sparse opening, establish the motif)\n[Build]\n(Gradually add layers and energy)\n[Climax]\n(Full instrumental arrangement)\n[Outro]\n(Resolve and fade cleanly)';
  return /^\s*\[Instrumental\]/i.test(script) ? script : `[Instrumental]\n${script}`;
};

export const createAudioAceWorkflow = (options: AudioAceWorkflowOptions) => {
  const workflow = structuredClone(aceWorkflow) as unknown as AudioAceWorkflow;
  const seed = options.seed ?? Math.floor(Math.random() * 1_000_000_000_000_000);
  const duration = Math.max(10, Math.min(600, Math.ceil(options.durationSeconds)));
  workflow['3'].inputs.seed = seed;
  workflow['94'].inputs.tags = options.tags.trim();
  workflow['94'].inputs.lyrics = options.mode === 'instrumental' ? instrumentalScript(options.lyrics) : options.lyrics.trim();
  workflow['94'].inputs.seed = seed;
  workflow['94'].inputs.bpm = Math.max(30, Math.min(300, Math.round(options.bpm)));
  workflow['94'].inputs.duration = duration;
  workflow['94'].inputs.timesignature = options.timeSignature;
  workflow['94'].inputs.language = options.mode === 'instrumental' ? 'en' : options.language;
  workflow['94'].inputs.keyscale = options.keyScale;
  workflow['98'].inputs.seconds = duration;
  workflow['107'].inputs.filename_prefix = `audio/mv-maker-audio-ace/${(options.chapterId || 'chapter').replace(/[^a-zA-Z0-9_-]/g, '_')}`;
  return { workflow, seed, duration };
};
