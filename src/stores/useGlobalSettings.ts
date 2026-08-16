import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
  AudioAlignmentStatus,
  AudioChapter,
  MVScriptData,
  ProjectGenerationSettings,
  SavedH3ReferenceImage,
  VideoOrientation,
  VoiceProfile,
} from '../types/mv-data';
import { H3_AUDIO_FRAMES } from '../utils/audioAlignment';
import { migrateGenerationSettingsToV4AudioPlan, migrateProjectToV4AudioPlan } from '../utils/audioPlanMigration';

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

const retimeStoryboard = (data: MVScriptData): MVScriptData => {
  let cursor = 0;
  const storyboard = data.storyboard.map((segment) => {
    const segmentStart = cursor;
    const mvinfo = segment.mvinfo.map((info) => {
      const duration = info.audio_plan?.duration_seconds ?? info.generation_plan?.duration_seconds ?? (parseTimestampDuration(info.timestamp) || 5);
      const start = cursor;
      cursor += duration;
      return { ...info, timestamp: `${formatTimestamp(start)} - ${formatTimestamp(cursor)}` };
    });
    return { ...segment, movielength: `${formatTimestamp(segmentStart)}-${formatTimestamp(cursor)}`, mvinfo };
  });
  return {
    ...data,
    ...(data.director_plan ? { director_plan: { ...data.director_plan, total_duration_seconds: cursor } } : {}),
    storyboard,
  };
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
  upgradeCurrentProjectAudioPlan: () => void;
  updateCharacterDescription: (characterIndex: number, description: string) => void;
  updateCharacterVoiceProfile: (characterIndex: number, patch: Partial<VoiceProfile>) => void;
  updateNarratorVoiceProfile: (patch: Partial<VoiceProfile>) => void;
  updateCharacterAsset: (characterIndex: number, assetType: 'image' | 'video', url: string, orientation?: VideoOrientation) => void;
  replaceCharacterImage: (characterIndex: number, url: string) => void;
  replaceMVInfoImage: (segmentId: number, infoIndex: number, url: string) => void;
  updateMVInfoAsset: (segmentId: number, infoIndex: number, assetType: 'image' | 'video' | 'source_video' | 'last_frame' | 'target_last_frame' | 'drive_audio' | 'drive_audio_filename' | 'voice_audio' | 'voice_audio_filename' | 'music_audio' | 'music_audio_filename', url: string) => void;
  updateMVInfoAudioTiming: (segmentId: number, infoIndex: number, duration: 5 | 10 | 15, actualVoiceDuration?: number, playbackRate?: number, resetVoice?: boolean) => void;
  updateMVInfoAudioText: (segmentId: number, infoIndex: number, text: string) => void;
  updateAudioChapter: (chapterId: string, patch: Partial<AudioChapter>) => void;
  setAudioAlignmentStatus: (status: AudioAlignmentStatus) => void;
  lockAudioTimeline: () => void;
  applyAudioChapterDurations: (chapterId: string, durations: Array<5 | 10 | 15>, actualDurationSeconds: number) => void;
  assignDriveAudioChunks: (chunks: Array<{ shotId: string; url: string; filename: string }>) => void;
  updateMuxStatus: (segmentId: number, infoIndex: number, status: 'pending' | 'ready' | 'failed', error?: string) => void;
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
      loadProject: (data, settings) => set((state) => {
        const project = migrateProjectToV4AudioPlan(data);
        const nextSettings = migrateGenerationSettingsToV4AudioPlan(settings, project);
        return {
        mvData: project,
        ...(nextSettings ? {
          selectedWorkflow: nextSettings.image_workflow,
          selectedVideoWorkflow: nextSettings.video_workflow,
          videoOrientation: nextSettings.video_orientation,
          h3GenerationMode: nextSettings.h3.generation_mode,
          h3AudioMode: nextSettings.h3.audio_mode,
          h3VideoLength: nextSettings.h3.video_length_frames,
          h3ReferenceImages: nextSettings.h3.reference_images,
        } : {
          selectedWorkflow: state.selectedWorkflow,
          selectedVideoWorkflow: state.selectedVideoWorkflow,
        }),
      };
      }),
      upgradeCurrentProjectAudioPlan: () => set((state) => {
        if (!state.mvData) return state;
        const project = migrateProjectToV4AudioPlan(state.mvData);
        return {
          mvData: project,
          ...(project.director_plan?.audio_plan?.mode === 'qwen3-tts-audio-first'
            ? { h3GenerationMode: 'director-routed' as const, h3AudioMode: 'drive-audio' as const }
            : {}),
        };
      }),
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
      updateCharacterVoiceProfile: (characterIndex, patch) => set((state) => {
        if (!state.mvData?.characters[characterIndex]?.voice_profile) return state;
        const characters = [...state.mvData.characters];
        characters[characterIndex] = { ...characters[characterIndex], voice_profile: { ...characters[characterIndex].voice_profile!, ...patch } };
        return { mvData: { ...state.mvData, characters } };
      }),
      updateNarratorVoiceProfile: (patch) => set((state) => {
        const plan = state.mvData?.director_plan?.audio_plan;
        if (!state.mvData?.director_plan || !plan?.narrator_voice) return state;
        return { mvData: { ...state.mvData, director_plan: { ...state.mvData.director_plan, audio_plan: { ...plan, narrator_voice: { ...plan.narrator_voice, ...patch } } } } };
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
              ...(previousAssets?.drive_audio ? { drive_audio: previousAssets.drive_audio } : {}),
              ...(previousAssets?.drive_audio_filename ? { drive_audio_filename: previousAssets.drive_audio_filename } : {}),
              ...(previousAssets?.voice_audio ? { voice_audio: previousAssets.voice_audio } : {}),
              ...(previousAssets?.voice_audio_filename ? { voice_audio_filename: previousAssets.voice_audio_filename } : {}),
              ...(previousAssets?.music_audio ? { music_audio: previousAssets.music_audio } : {}),
              ...(previousAssets?.music_audio_filename ? { music_audio_filename: previousAssets.music_audio_filename } : {}),
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
      updateMVInfoAudioTiming: (segmentId, infoIndex, duration, actualVoiceDuration, playbackRate, resetVoice = false) => set((state) => {
        if (!state.mvData?.director_plan?.audio_plan) return state;
        let durationChanged = false;
        let changedChapterId: string | undefined;
        const updated = state.mvData.storyboard.map((segment) => ({
          ...segment,
          mvinfo: segment.mvinfo.map((info, index) => {
            if (segment.segment_id !== segmentId || index !== infoIndex || !info.audio_plan) return info;
            durationChanged = info.audio_plan.duration_seconds !== duration;
            changedChapterId = info.audio_plan.chapter_id;
            const generatedAssets = { ...info.generated_assets };
            if (durationChanged) {
              delete generatedAssets.drive_audio;
              delete generatedAssets.drive_audio_filename;
              delete generatedAssets.music_audio;
              delete generatedAssets.music_audio_filename;
              generatedAssets.mux_status = 'pending';
              if (resetVoice) {
                delete generatedAssets.voice_audio;
                delete generatedAssets.voice_audio_filename;
              }
            }
            return {
              ...info,
              audio_plan: {
                ...info.audio_plan,
                duration_seconds: duration,
                actual_voice_duration_seconds: resetVoice ? undefined : (actualVoiceDuration ?? info.audio_plan.actual_voice_duration_seconds),
                voice_playback_rate: resetVoice ? undefined : (playbackRate ?? info.audio_plan.voice_playback_rate),
                cut_status: 'tentative' as const,
              },
              generation_plan: info.generation_plan ? {
                ...info.generation_plan,
                duration_seconds: duration,
                duration_frames: H3_AUDIO_FRAMES[duration],
                audio_mode: 'drive-audio' as const,
              } : info.generation_plan,
              generated_assets: generatedAssets,
            };
          }),
        }));
        const chapterCursors = new Map<string, number>();
        const storyboard = updated.map((segment) => ({
          ...segment,
          mvinfo: segment.mvinfo.map((info) => {
            if (!info.audio_plan) return info;
            const start = chapterCursors.get(info.audio_plan.chapter_id) ?? 0;
            chapterCursors.set(info.audio_plan.chapter_id, start + info.audio_plan.duration_seconds);
            return { ...info, audio_plan: { ...info.audio_plan, source_start_seconds: start } };
          }),
        }));
        const audioPlan = state.mvData.director_plan.audio_plan;
        const chapters = audioPlan.chapters.map((chapter) => {
          const targetDuration = chapterCursors.get(chapter.chapter_id) ?? chapter.target_duration_seconds;
          if (!durationChanged || chapter.chapter_id !== changedChapterId) return chapter;
          return { ...chapter, target_duration_seconds: targetDuration, generated_audio: undefined, actual_duration_seconds: undefined, status: 'idle' as const };
        });
        return {
          mvData: retimeStoryboard({
            ...state.mvData,
            director_plan: {
              ...state.mvData.director_plan,
              audio_plan: { ...audioPlan, chapters, alignment_status: durationChanged ? 'planned' : audioPlan.alignment_status },
            },
            storyboard,
          }),
        };
      }),
      updateMVInfoAudioText: (segmentId, infoIndex, text) => set((state) => {
        if (!state.mvData?.director_plan?.audio_plan) return state;
        const storyboard = state.mvData.storyboard.map((segment) => {
          if (segment.segment_id !== segmentId || !segment.mvinfo[infoIndex]) return segment;
          const mvinfo = [...segment.mvinfo];
          const info = mvinfo[infoIndex];
          if (!info.audio_plan) return segment;
          const generatedAssets = { ...info.generated_assets };
          delete generatedAssets.voice_audio;
          delete generatedAssets.voice_audio_filename;
          delete generatedAssets.drive_audio;
          delete generatedAssets.drive_audio_filename;
          generatedAssets.mux_status = 'pending';
          mvinfo[infoIndex] = {
            ...info,
            lyrics: text,
            audio_plan: {
              ...info.audio_plan,
              audio_text: text,
              actual_voice_duration_seconds: undefined,
              voice_playback_rate: undefined,
              cut_status: 'tentative',
            },
            generated_assets: generatedAssets,
          };
          return { ...segment, mvinfo };
        });
        return {
          mvData: {
            ...state.mvData,
            director_plan: {
              ...state.mvData.director_plan,
              audio_plan: { ...state.mvData.director_plan.audio_plan, alignment_status: 'planned' },
            },
            storyboard,
          },
        };
      }),
      updateAudioChapter: (chapterId, patch) => set((state) => {
        if (!state.mvData?.director_plan?.audio_plan) return state;
        return {
          mvData: {
            ...state.mvData,
            director_plan: {
              ...state.mvData.director_plan,
              audio_plan: {
                ...state.mvData.director_plan.audio_plan,
                chapters: state.mvData.director_plan.audio_plan.chapters.map((chapter) => chapter.chapter_id === chapterId ? { ...chapter, ...patch } : chapter),
              },
            },
          },
        };
      }),
      setAudioAlignmentStatus: (status) => set((state) => {
        if (!state.mvData?.director_plan?.audio_plan) return state;
        return {
          mvData: {
            ...state.mvData,
            director_plan: {
              ...state.mvData.director_plan,
              audio_plan: { ...state.mvData.director_plan.audio_plan, alignment_status: status },
            },
          },
        };
      }),
      lockAudioTimeline: () => set((state) => {
        if (!state.mvData?.director_plan?.audio_plan) return state;
        return {
          mvData: {
            ...state.mvData,
            director_plan: {
              ...state.mvData.director_plan,
              audio_plan: { ...state.mvData.director_plan.audio_plan, alignment_status: 'locked' },
            },
            storyboard: state.mvData.storyboard.map((segment) => ({
              ...segment,
              mvinfo: segment.mvinfo.map((info) => info.audio_plan ? {
                ...info,
                audio_plan: { ...info.audio_plan, cut_status: 'confirmed' },
                generation_plan: info.generation_plan ? { ...info.generation_plan, audio_mode: 'drive-audio' } : info.generation_plan,
              } : info),
            })),
          },
        };
      }),
      applyAudioChapterDurations: (chapterId, durations, actualDurationSeconds) => set((state) => {
        if (!state.mvData?.director_plan?.audio_plan) return state;
        let durationIndex = 0;
        let chapterCursor = 0;
        const storyboard = state.mvData.storyboard.map((segment) => ({
          ...segment,
          mvinfo: segment.mvinfo.map((info) => {
            if (info.audio_plan?.chapter_id !== chapterId) return info;
            const duration = durations[durationIndex++];
            if (!duration) return info;
            const updated = {
              ...info,
              audio_plan: { ...info.audio_plan, source_start_seconds: chapterCursor, duration_seconds: duration, cut_status: 'tentative' as const },
              generation_plan: info.generation_plan ? { ...info.generation_plan, duration_seconds: duration, duration_frames: H3_AUDIO_FRAMES[duration], audio_mode: 'drive-audio' as const } : info.generation_plan,
            };
            chapterCursor += duration;
            return updated;
          }),
        }));
        const audioPlan = state.mvData.director_plan.audio_plan;
        return {
          mvData: retimeStoryboard({
            ...state.mvData,
            director_plan: {
              ...state.mvData.director_plan,
              audio_plan: {
                ...audioPlan,
                alignment_status: 'aligned',
                chapters: audioPlan.chapters.map((chapter) => chapter.chapter_id === chapterId ? { ...chapter, actual_duration_seconds: actualDurationSeconds } : chapter),
              },
            },
            storyboard,
          }),
        };
      }),
      assignDriveAudioChunks: (chunks) => set((state) => {
        if (!state.mvData) return state;
        const byShotId = new Map(chunks.map((chunk) => [chunk.shotId, chunk]));
        return {
          mvData: {
            ...state.mvData,
            storyboard: state.mvData.storyboard.map((segment) => ({
              ...segment,
              mvinfo: segment.mvinfo.map((info) => {
                const chunk = info.shot_id ? byShotId.get(info.shot_id) : undefined;
                if (!chunk) return info;
                return { ...info, generated_assets: { ...info.generated_assets, drive_audio: chunk.url, drive_audio_filename: chunk.filename, mux_status: 'pending' } };
              }),
            })),
          },
        };
      }),
      updateMuxStatus: (segmentId, infoIndex, status, error) => set((state) => {
        if (!state.mvData) return state;
        return {
          mvData: {
            ...state.mvData,
            storyboard: state.mvData.storyboard.map((segment) => segment.segment_id !== segmentId ? segment : {
              ...segment,
              mvinfo: segment.mvinfo.map((info, index) => index !== infoIndex ? info : {
                ...info,
                generated_assets: { ...info.generated_assets, mux_status: status, ...(error ? { mux_error: error } : { mux_error: undefined }) },
              }),
            }),
          },
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
      version: 6,
      storage: createJSONStorage(() => localStorage),
      migrate: (persistedState, version) => {
        const state = persistedState as Partial<GlobalSettingsState>;
        if (version < 2 && state.mvData && !Array.isArray(state.mvData.characters)) {
          return { ...state, mvData: null } as GlobalSettingsState;
        }
        if (version < 3 && !['Krea2 Turbo', 'Z-Image-Turbo'].includes(state.selectedWorkflow || '')) {
          state.selectedWorkflow = 'Krea2 Turbo';
        }
        if (version < 6 && state.mvData) {
          state.mvData = migrateProjectToV4AudioPlan(state.mvData);
          if (state.mvData.director_plan?.audio_plan?.mode === 'qwen3-tts-audio-first') {
            state.h3GenerationMode = 'director-routed';
            state.h3AudioMode = 'drive-audio';
          }
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
