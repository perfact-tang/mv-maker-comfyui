import { create } from 'zustand';
import { MVScriptData } from '../types/mv-data';

interface GlobalSettingsState {
  selectedWorkflow: string;
  setSelectedWorkflow: (workflow: string) => void;
  mvData: MVScriptData | null;
  setMvData: (data: MVScriptData | null) => void;
  updateMVInfoAsset: (segmentId: number, infoIndex: number, assetType: 'image' | 'video' | 'last_frame', url: string) => void;
}

export const useGlobalSettings = create<GlobalSettingsState>((set) => ({
  selectedWorkflow: 'Qwen-Image-2512',
  setSelectedWorkflow: (workflow) => set({ selectedWorkflow: workflow }),
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
}));
