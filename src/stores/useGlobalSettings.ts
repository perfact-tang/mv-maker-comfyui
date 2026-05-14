import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { MVScriptData } from '../types/mv-data';

interface GlobalSettingsState {
  selectedWorkflow: string;
  setSelectedWorkflow: (workflow: string) => void;
  selectedVideoWorkflow: string;
  setSelectedVideoWorkflow: (workflow: string) => void;
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
        mvData: state.mvData 
      }),
    }
  )
);
