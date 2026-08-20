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

export type AudioPlanMode = 'disabled' | 'qwen3-tts-audio-first' | 'music3-audio-first';
export type AudioProductionStyle = 'spoken-word' | 'musical-drama';
export type AudioAlignmentStatus = 'planned' | 'generated' | 'aligned' | 'locked';
export type AudioChapterStatus = 'idle' | 'generating' | 'ready' | 'failed';
export type Qwen3TtsLanguage = 'Auto' | 'Chinese' | 'English' | 'Japanese' | 'Korean' | 'German' | 'French' | 'Russian' | 'Portuguese' | 'Spanish' | 'Italian';
export type Qwen3AsrLanguage = 'auto' | Exclude<Qwen3TtsLanguage, 'Auto'> | 'Cantonese' | 'Arabic' | 'Indonesian' | 'Thai' | 'Vietnamese' | 'Turkish' | 'Hindi' | 'Malay' | 'Dutch' | 'Swedish' | 'Danish' | 'Finnish' | 'Polish' | 'Czech' | 'Filipino' | 'Persian' | 'Greek' | 'Hungarian' | 'Macedonian' | 'Romanian';

export interface VoiceReferenceAudio {
  data_url: string;
  filename: string;
  mime_type: string;
  duration_seconds: number;
  ref_audio_max_seconds: number;
  source?: 'generated-fixed-voice' | 'uploaded-reference';
  capture_method?: 'file-upload' | 'browser-recording';
}

export interface AudioChapter {
  chapter_id: string;
  title: string;
  target_duration_seconds: number;
  caption: string;
  lyrics: string;
  shot_refs: string[];
  generated_audio?: string;
  actual_duration_seconds?: number;
  seed?: number;
  status: AudioChapterStatus;
  error?: string;
}

export interface DirectorAudioPlan {
  mode: AudioPlanMode;
  workflow: '千问 3 TTS' | 'MiniMax Music 3';
  music_workflow?: 'MiniMax Music 3';
  music_enabled?: boolean;
  production_style: AudioProductionStyle;
  chapters: AudioChapter[];
  alignment_status: AudioAlignmentStatus;
  narrator_voice?: VoiceProfile;
  tts_language?: Qwen3TtsLanguage;
}

export interface VoiceProfile {
  voice_id: string;
  speaker_label: string;
  instruct: string;
  reference_text: string;
  language: Qwen3TtsLanguage;
  seed: number;
  generation_mode?: 'voice-design' | 'voice-clone';
  reference_language?: Qwen3AsrLanguage;
  creation_reference_audio?: VoiceReferenceAudio;
  reference_audio?: VoiceReferenceAudio;
  prompt_filename?: string;
  preview_audio?: string;
  status?: 'idle' | 'generating' | 'ready' | 'failed';
  error?: string;
}

export interface ShotSpeaker {
  speaker_label: string;
  character_name?: string;
  voice_description: string;
  voice_id?: string;
}

export interface ShotAudioPlan {
  chapter_id: string;
  source_start_seconds: number;
  duration_seconds: 5 | 10 | 15;
  actual_voice_duration_seconds?: number;
  voice_playback_rate?: number;
  audio_text: string;
  speakers: ShotSpeaker[];
  cut_status: 'tentative' | 'confirmed';
  tts_language?: Qwen3TtsLanguage;
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
  audio_plan?: DirectorAudioPlan;
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
  voice_profile?: VoiceProfile;
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
  schema_version: 4;
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
  shot_id?: string;
  timestamp: string;
  type: "New_Scene" | "Last_Frame_Continuity";
  first_frame_source?: 't2i' | 'previous-tail';
  source_text?: string;
  lyrics: string;
  image_prompt?: string;
  last_frame_image_prompt?: string;
  video_prompt: string;
  generation_plan?: H3ShotGenerationPlan;
  audio_plan?: ShotAudioPlan;
  generated_assets?: {
    image?: string;
    video?: string;
    last_frame?: string;
    target_last_frame?: string;
    audio?: string;
    audio_filename?: string;
    drive_audio?: string;
    drive_audio_filename?: string;
    voice_audio?: string;
    voice_audio_filename?: string;
    music_audio?: string;
    music_audio_filename?: string;
    source_video?: string;
    mux_status?: 'pending' | 'ready' | 'failed';
    mux_error?: string;
  };
}
