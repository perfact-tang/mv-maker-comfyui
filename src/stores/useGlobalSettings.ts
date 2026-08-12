import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { MVScriptData } from '../types/mv-data';

export type H3GenerationMode = 'first-frame' | 'reference-images';
export type H3AudioMode = 'drive-audio' | 'reference-audio';

export interface H3ReferenceImage {
  dataUrl: string;
  filename: string;
  prompt: string;
}

interface GlobalSettingsState {
  selectedWorkflow: string;
  setSelectedWorkflow: (workflow: string) => void;
  selectedVideoWorkflow: string;
  setSelectedVideoWorkflow: (workflow: string) => void;
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
  updateMVInfoAsset: (segmentId: number, infoIndex: number, assetType: 'image' | 'video' | 'last_frame', url: string) => void;
  assignAudioChunks: (chunks: Array<{ url: string; filename: string }>) => void;
}

export const useGlobalSettings = create<GlobalSettingsState>()(
  persist(
    (set) => ({
      selectedWorkflow: 'Qwen-Image-2512',
      setSelectedWorkflow: (workflow) => set({ selectedWorkflow: workflow }),
      selectedVideoWorkflow: 'SmoothV2',
      setSelectedVideoWorkflow: (workflow) => set({ selectedVideoWorkflow: workflow }),
      h3GenerationMode: 'first-frame',
      setH3GenerationMode: (mode) => set({ h3GenerationMode: mode }),
      h3AudioMode: 'drive-audio',
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
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ 
        selectedWorkflow: state.selectedWorkflow,
        selectedVideoWorkflow: state.selectedVideoWorkflow,
        h3GenerationMode: state.h3GenerationMode,
        h3AudioMode: state.h3AudioMode,
        h3VideoLength: state.h3VideoLength,
        h3ReferenceImages: state.h3ReferenceImages,
        mvData: state.mvData 
      }),
    }
  )
);
