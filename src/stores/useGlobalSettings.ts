import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
  MVScriptData,
  ProjectGenerationSettings,
  SavedH3ReferenceImage,
  VideoOrientation,
} from '../types/mv-data';

export type H3GenerationMode = ProjectGenerationSettings['h3']['generation_mode'];
export type H3AudioMode = ProjectGenerationSettings['h3']['audio_mode'];

export type H3ReferenceImage = SavedH3ReferenceImage;

const parseTimestampDuration = (timestamp: string): number => {
  const toSeconds = (value: string) => {
    const [minutes, seconds] = value.trim().split(':').map(Number);
    return Number.isFinite(minutes) && Number.isFinite(seconds) ? minutes * 60 + seconds : 0;
  };
  const [start, end] = timestamp.split(/\s*-\s*/);
  return start && end ? Math.max(0, toSeconds(end) - toSeconds(start)) : 0;
};

const formatTimestamp = (seconds: number) => {
  const minutes = Math.floor(seconds / 60);
  const remaining = Math.floor(seconds % 60);
  return `${String(minutes).padStart(2, '0')}:${String(remaining).padStart(2, '0')}`;
};

interface GlobalSettingsState {
  selectedWorkflow: string;
  setSelectedWorkflow: (workflow: string) => void;
  selectedVideoWorkflow: string;
  setSelectedVideoWorkflow: (workflow: string) => void;
  videoOrientation: VideoOrientation;
  setVideoOrientation: (orientation: VideoOrientation) => void;
  h3GenerationMode: H3GenerationMode;
  setH3GenerationMode: (mode: H3GenerationMode) => void;
  h3AudioMode: H3AudioMode;
  setH3AudioMode: (mode: H3AudioMode) => void;
  h3VideoLength: number;
  setH3VideoLength: (length: number) => void;
  h3ReferenceImages: [H3ReferenceImage | null, H3ReferenceImage | null];
  setH3ReferenceImage: (index: 0 | 1, image: H3ReferenceImage | null) => void;
  setH3ReferencePrompt: (index: 0 | 1, prompt: string) => void;
  mvData: MVScriptData | null;
  setMvData: (data: MVScriptData | null) => void;
  loadProject: (data: MVScriptData, settings?: ProjectGenerationSettings) => void;
  updateCharacterDescription: (characterIndex: number, description: string) => void;
  updateCharacterAsset: (characterIndex: number, assetType: 'image' | 'video', url: string, orientation?: VideoOrientation) => void;
  replaceCharacterImage: (characterIndex: number, url: string) => void;
  replaceMVInfoImage: (segmentId: number, infoIndex: number, url: string) => void;
  updateMVInfoAsset: (segmentId: number, infoIndex: number, assetType: 'image' | 'video' | 'last_frame' | 'target_last_frame', url: string) => void;
  updateMVInfoFirstFrameSource: (segmentId: number, infoIndex: number, source: 't2i' | 'previous-tail') => void;
  updateMVInfoImagePrompt: (segmentId: number, infoIndex: number, prompt: string) => void;
  updateMVInfoGenerationPlan: (segmentId: number, infoIndex: number, generationPlan: NonNullable<MVScriptData['storyboard'][number]['mvinfo'][number]['generation_plan']>) => void;
  assignAudioChunks: (chunks: Array<{ url: string; filename: string }>) => void;
}

export const useGlobalSettings = create<GlobalSettingsState>()(
  persist(
    (set) => ({
      selectedWorkflow: 'Krea2 Turbo',
      setSelectedWorkflow: (workflow) => set((state) => ({
        selectedWorkflow: workflow,
        ...(state.mvData ? {
          mvData: {
            ...state.mvData,
            characters: state.mvData.characters.map((character) => {
              const sheet = character.reference_sheet;
              if (!sheet) return character;
              const description = workflow === 'Z-Image-Turbo'
                ? sheet.z_image_prompt
                : workflow === 'Krea2 Turbo'
                  ? sheet.krea_prompt
                  : character.description;
              return { ...character, description };
            }),
          },
        } : {}),
      })),
      selectedVideoWorkflow: 'SmoothV2',
      setSelectedVideoWorkflow: (workflow) => set({ selectedVideoWorkflow: workflow }),
      videoOrientation: 'landscape',
      setVideoOrientation: (orientation) => set({ videoOrientation: orientation }),
      h3GenerationMode: 'first-frame',
      setH3GenerationMode: (mode) => set({ h3GenerationMode: mode }),
      h3AudioMode: 'native-audio',
      setH3AudioMode: (mode) => set({ h3AudioMode: mode }),
      h3VideoLength: 141,
      setH3VideoLength: (length) => set({ h3VideoLength: length }),
      h3ReferenceImages: [null, null],
      setH3ReferenceImage: (index, image) => set((state) => {
        const images = [...state.h3ReferenceImages] as [H3ReferenceImage | null, H3ReferenceImage | null];
        images[index] = image;
        return { h3ReferenceImages: images };
      }),
      setH3ReferencePrompt: (index, prompt) => set((state) => {
        const images = [...state.h3ReferenceImages] as [H3ReferenceImage | null, H3ReferenceImage | null];
        const current = images[index];
        if (current) images[index] = { ...current, prompt };
        return { h3ReferenceImages: images };
      }),
      mvData: null,
      setMvData: (data) => set({ mvData: data }),
      loadProject: (data, settings) => set((state) => ({
        mvData: data,
        ...(settings ? {
          selectedWorkflow: settings.image_workflow,
          selectedVideoWorkflow: settings.video_workflow,
          videoOrientation: settings.video_orientation,
          h3GenerationMode: settings.h3.generation_mode,
          h3AudioMode: settings.h3.audio_mode,
          h3VideoLength: settings.h3.video_length_frames,
          h3ReferenceImages: settings.h3.reference_images,
        } : {
          selectedWorkflow: state.selectedWorkflow,
          selectedVideoWorkflow: state.selectedVideoWorkflow,
        }),
      })),
      updateCharacterDescription: (characterIndex, description) => set((state) => {
        if (!state.mvData || !state.mvData.characters[characterIndex]) return state;
        const characters = [...state.mvData.characters];
        const character = characters[characterIndex];
        const referenceSheet = character.reference_sheet;
        characters[characterIndex] = {
          ...character,
          description,
          ...(referenceSheet ? {
            reference_sheet: {
              ...referenceSheet,
              ...(state.selectedWorkflow === 'Z-Image-Turbo' ? { z_image_prompt: description } : {}),
              ...(state.selectedWorkflow === 'Krea2 Turbo' ? { krea_prompt: description } : {}),
            },
          } : {}),
        };
        return { mvData: { ...state.mvData, characters } };
      }),
      updateCharacterAsset: (characterIndex, assetType, url, orientation) => set((state) => {
        if (!state.mvData || !state.mvData.characters[characterIndex]) return state;
        const characters = [...state.mvData.characters];
        const character = characters[characterIndex];
        characters[characterIndex] = {
          ...character,
          generated_assets: {
            ...character.generated_assets,
            [assetType]: url,
            ...(assetType === 'video' && orientation ? { video_orientation: orientation } : {}),
          },
        };
        return { mvData: { ...state.mvData, characters } };
      }),
      replaceCharacterImage: (characterIndex, url) => set((state) => {
        if (!state.mvData || !state.mvData.characters[characterIndex]) return state;
        const characters = [...state.mvData.characters];
        const character = characters[characterIndex];
        characters[characterIndex] = {
          ...character,
          generated_assets: { image: url },
        };
        return { mvData: { ...state.mvData, characters } };
      }),
      replaceMVInfoImage: (segmentId, infoIndex, url) => set((state) => {
        if (!state.mvData) return state;
        const storyboard = state.mvData.storyboard.map((segment) => {
          if (segment.segment_id !== segmentId || !segment.mvinfo[infoIndex]) return segment;
          const mvinfo = [...segment.mvinfo];
          const previousAssets = mvinfo[infoIndex].generated_assets;
          mvinfo[infoIndex] = {
            ...mvinfo[infoIndex],
            generated_assets: {
              image: url,
              ...(previousAssets?.target_last_frame ? { target_last_frame: previousAssets.target_last_frame } : {}),
              ...(previousAssets?.audio ? { audio: previousAssets.audio } : {}),
              ...(previousAssets?.audio_filename ? { audio_filename: previousAssets.audio_filename } : {}),
            },
          };
          return { ...segment, mvinfo };
        });
        return { mvData: { ...state.mvData, storyboard } };
      }),
      updateMVInfoAsset: (segmentId, infoIndex, assetType, url) => set((state) => {
        if (!state.mvData) return state;
        
        const newStoryboard = state.mvData.storyboard.map(segment => {
          if (segment.segment_id !== segmentId) return segment;
          
          const newMVInfo = [...segment.mvinfo];
          if (!newMVInfo[infoIndex]) return segment;

          newMVInfo[infoIndex] = {
            ...newMVInfo[infoIndex],
            generated_assets: {
              ...newMVInfo[infoIndex].generated_assets,
              [assetType]: url
            }
          };

          return {
            ...segment,
            mvinfo: newMVInfo
          };
        });

        return {
          mvData: {
            ...state.mvData,
            storyboard: newStoryboard
          }
        };
      }),
      updateMVInfoFirstFrameSource: (segmentId, infoIndex, source) => set((state) => {
        if (!state.mvData) return state;
        const storyboard = state.mvData.storyboard.map((segment) => {
          if (segment.segment_id !== segmentId || !segment.mvinfo[infoIndex]) return segment;
          const mvinfo = [...segment.mvinfo];
          mvinfo[infoIndex] = {
            ...mvinfo[infoIndex],
            first_frame_source: source,
            type: source === 'previous-tail' ? 'Last_Frame_Continuity' : 'New_Scene',
          };
          return { ...segment, mvinfo };
        });
        return { mvData: { ...state.mvData, storyboard } };
      }),
      updateMVInfoImagePrompt: (segmentId, infoIndex, prompt) => set((state) => {
        if (!state.mvData) return state;
        const storyboard = state.mvData.storyboard.map((segment) => {
          if (segment.segment_id !== segmentId || !segment.mvinfo[infoIndex]) return segment;
          const mvinfo = [...segment.mvinfo];
          mvinfo[infoIndex] = { ...mvinfo[infoIndex], image_prompt: prompt };
          return { ...segment, mvinfo };
        });
        return { mvData: { ...state.mvData, storyboard } };
      }),
      updateMVInfoGenerationPlan: (segmentId, infoIndex, generationPlan) => set((state) => {
        if (!state.mvData) return state;
        const updated = state.mvData.storyboard.map((segment) => {
          if (segment.segment_id !== segmentId || !segment.mvinfo[infoIndex]) return segment;
          const mvinfo = [...segment.mvinfo];
          mvinfo[infoIndex] = { ...mvinfo[infoIndex], generation_plan: generationPlan };
          return { ...segment, mvinfo };
        });
        let cursor = 0;
        const storyboard = updated.map((segment) => {
          const segmentStart = cursor;
          const mvinfo = segment.mvinfo.map((info) => {
            const duration = info.generation_plan?.duration_seconds || parseTimestampDuration(info.timestamp) || 5;
            const start = cursor;
            cursor += duration;
            return { ...info, timestamp: `${formatTimestamp(start)} - ${formatTimestamp(cursor)}` };
          });
          return {
            ...segment,
            movielength: `${formatTimestamp(segmentStart)}-${formatTimestamp(cursor)}`,
            mvinfo,
          };
        });
        return {
          mvData: {
            ...state.mvData,
            ...(state.mvData.director_plan ? {
              director_plan: { ...state.mvData.director_plan, total_duration_seconds: cursor },
            } : {}),
            storyboard,
          },
        };
      }),
      assignAudioChunks: (chunks) => set((state) => {
        if (!state.mvData) return state;

        let chunkIndex = 0;
        const newStoryboard = state.mvData.storyboard.map((segment) => ({
          ...segment,
          mvinfo: segment.mvinfo.map((info) => {
            const chunk = chunks[chunkIndex++];
            const generatedAssets = { ...info.generated_assets };

            if (chunk) {
              generatedAssets.audio = chunk.url;
              generatedAssets.audio_filename = chunk.filename;
            } else {
              delete generatedAssets.audio;
              delete generatedAssets.audio_filename;
            }

            return {
              ...info,
              generated_assets: generatedAssets,
            };
          }),
        }));

        return {
          mvData: {
            ...state.mvData,
            storyboard: newStoryboard,
          },
        };
      }),
    }),
    {
      name: 'mv-maker-storage',
      version: 3,
      storage: createJSONStorage(() => localStorage),
      migrate: (persistedState, version) => {
        const state = persistedState as Partial<GlobalSettingsState>;
        if (version < 2 && state.mvData && !Array.isArray(state.mvData.characters)) {
          return { ...state, mvData: null } as GlobalSettingsState;
        }
        if (version < 3 && !['Krea2 Turbo', 'Z-Image-Turbo'].includes(state.selectedWorkflow || '')) {
          state.selectedWorkflow = 'Krea2 Turbo';
        }
        return state as GlobalSettingsState;
      },
      partialize: (state) => ({ 
        selectedWorkflow: state.selectedWorkflow,
        selectedVideoWorkflow: state.selectedVideoWorkflow,
        videoOrientation: state.videoOrientation,
        h3GenerationMode: state.h3GenerationMode,
        h3AudioMode: state.h3AudioMode,
        h3VideoLength: state.h3VideoLength,
        h3ReferenceImages: state.h3ReferenceImages,
        mvData: state.mvData 
      }),
    }
  )
);
