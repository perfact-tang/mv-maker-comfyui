export interface MVScriptData {
  proposal_id: number;
  direction_name: string;
  basics: {
    outline: string;
    shooting_method: string;
    art_style_description: string;
  };
  storyboard: StoryboardSegment[];
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
  lyrics: string;
  image_prompt?: string;
  video_prompt: string;
  generated_assets?: {
    image?: string;
    video?: string;
    last_frame?: string;
  };
}
