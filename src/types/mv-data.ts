export interface MVScriptData {
  proposal_id: number;
  direction_name: string;
  director_plan?: DirectorPlan;
  characters: CharacterProfile[];
  basics: {
    outline: string;
    shooting_method: string;
    art_style_description: string;
  };
  storyboard: StoryboardSegment[];
}

export interface DirectorPlan {
  source_type: 'lyrics' | 'lrc' | 'novel' | 'story' | 'blog' | 'product_copy' | string;
  content_form: 'music_video' | 'short_drama' | 'promo';
  form_subtype?: string;
  model: string;
  aspect_ratio: string;
  total_duration_seconds: number;
  allowed_clip_durations_seconds: Array<5 | 10 | 15>;
  style_name: string;
  style_rationale: string;
  narrative_strategy: string;
  source_coverage_note: string;
  visual_style_lock?: VisualStyleLock;
}

export interface VisualStyleLock {
  style_id: string;
  style_name: string;
  shared_style_prefix: string;
  shared_negative_prompt: string;
  character_sheet_layout: string;
  preferred_image_workflow: 'Z-Image-Turbo' | 'Krea2 Turbo' | string;
}

export interface CharacterReferenceSheet {
  style_id: string;
  layout: string;
  z_image_prompt: string;
  krea_prompt: string;
}

export interface CharacterProfile {
  id?: string | number;
  character_id?: string | number;
  name: string;
  description: string;
  role?: string;
  traits?: string[];
  reference_sheet?: CharacterReferenceSheet;
  generated_assets?: {
    image?: string;
    video?: string;
    video_orientation?: VideoOrientation;
  };
}

export type VideoOrientation = 'landscape' | 'portrait';

export type H3GenerationModeValue = 'first-frame' | 'reference-images' | 'director-routed';
export type H3AudioModeValue = 'native-audio' | 'drive-audio' | 'reference-audio' | 'no-audio';
export type H3ShotMode = 'I2VA' | 'FL2VA' | 'Ref2VA';

export interface SavedH3ReferenceImage {
  dataUrl: string;
  filename: string;
  prompt: string;
}

export interface H3ShotReferenceImage {
  label: '<Picture 1>' | '<Picture 2>';
  purpose: string;
  prompt: string;
  source_character?: string;
  source_character_id?: string | number;
  asset?: { dataUrl: string; filename: string };
}

export interface H3ShotGenerationPlan {
  model: string;
  mode: H3ShotMode;
  duration_seconds: 5 | 10 | 15;
  duration_frames: 141 | 260 | 379;
  audio_mode: H3AudioModeValue;
  reference_images: H3ShotReferenceImage[];
}

export interface ProjectGenerationSettings {
  image_workflow: string;
  video_workflow: string;
  video_orientation: VideoOrientation;
  h3: {
    generation_mode: H3GenerationModeValue;
    audio_mode: H3AudioModeValue;
    video_length_frames: number;
    reference_images: [SavedH3ReferenceImage | null, SavedH3ReferenceImage | null];
  };
}

export interface MVProjectArchive {
  schema: 'mv-maker-project';
  schema_version: 3;
  exported_at: string;
  project: MVScriptData;
  generation_settings: ProjectGenerationSettings;
}

export interface StoryboardSegment {
  segment_id: number;
  movielength: string;
  content_narrative: string;
  prompts: {
    first_frame: string;
    last_frame: string;
  };
  mvinfo: MVInfo[];
}

export interface MVInfo {
  timestamp: string;
  type: "New_Scene" | "Last_Frame_Continuity";
  first_frame_source?: 't2i' | 'previous-tail';
  source_text?: string;
  lyrics: string;
  image_prompt?: string;
  last_frame_image_prompt?: string;
  video_prompt: string;
  generation_plan?: H3ShotGenerationPlan;
  generated_assets?: {
    image?: string;
    video?: string;
    last_frame?: string;
    target_last_frame?: string;
    audio?: string;
    audio_filename?: string;
  };
}
