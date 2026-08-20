import type {
  AudioChapter,
  H3ShotGenerationPlan,
  MVInfo,
  MVScriptData,
  ProjectGenerationSettings,
  ShotSpeaker,
  VoiceProfile,
  Qwen3TtsLanguage,
} from '../types/mv-data';

const FRAMES_BY_DURATION = { 5: 141, 10: 260, 15: 379 } as const;
const QWEN3_TTS_LANGUAGE_SET = new Set<Qwen3TtsLanguage>(['Auto', 'Chinese', 'English', 'Japanese', 'Korean', 'German', 'French', 'Russian', 'Portuguese', 'Spanish', 'Italian']);
const normalizeTtsLanguage = (value: unknown): Qwen3TtsLanguage => QWEN3_TTS_LANGUAGE_SET.has(value as Qwen3TtsLanguage) ? value as Qwen3TtsLanguage : 'Auto';

const parseTimestampDuration = (timestamp: string): 5 | 10 | 15 => {
  const toSeconds = (value: string) => {
    const [minutes, seconds] = value.trim().split(':').map(Number);
    return Number.isFinite(minutes) && Number.isFinite(seconds) ? minutes * 60 + seconds : 0;
  };
  const [start, end] = timestamp.split(/\s*-\s*/);
  const duration = start && end ? toSeconds(end) - toSeconds(start) : 0;
  return duration === 10 || duration === 15 ? duration : 5;
};

const makeDriveAudioPrompt = (prompt: string) => {
  const soundscape = 'overall_soundscape:\n严格复用 <Audio 1> 作为唯一声音来源；人物口型、动作、表演节奏和镜头运动跟随该音频，不生成新的对白、音效或配乐。';
  let next = prompt.trim();
  if (/overall_soundscape\s*:/i.test(next)) {
    next = next.replace(/overall_soundscape\s*:[\s\S]*?(?=\n\s*non_diegetic_music\s*:|$)/i, soundscape);
  } else {
    next += `\n\n${soundscape}`;
  }
  if (/non_diegetic_music\s*:/i.test(next)) {
    next = next.replace(/non_diegetic_music\s*:[\s\S]*$/i, 'non_diegetic_music:\nN/A');
  } else {
    next += '\n\nnon_diegetic_music:\nN/A';
  }
  return next;
};

const getDuration = (shot: MVInfo): 5 | 10 | 15 => {
  const planned = shot.generation_plan?.duration_seconds;
  return planned === 5 || planned === 10 || planned === 15 ? planned : parseTimestampDuration(shot.timestamp);
};

const makeGenerationPlan = (shot: MVInfo, model: string): H3ShotGenerationPlan => {
  const duration = getDuration(shot);
  return {
    model: shot.generation_plan?.model || model || 'minimax-h3',
    mode: shot.generation_plan?.mode || 'I2VA',
    duration_seconds: duration,
    duration_frames: FRAMES_BY_DURATION[duration],
    audio_mode: 'drive-audio',
    reference_images: shot.generation_plan?.reference_images || [],
  };
};

const chapterCaption = (contentForm: 'promo' | 'short_drama') => contentForm === 'promo'
  ? '温暖克制的电影级知识讲解配乐，节奏清晰但不抢注意力，保留旁白空间；纯器乐，无演唱、无人声、无吟唱。'
  : '具有场景情绪和戏剧起伏的电影级氛围配乐，避开对白频段并保持转场连续；纯器乐，无演唱、无人声、无吟唱。';

const narratorVoice = (): VoiceProfile => ({
  voice_id: 'VOICE-NARRATOR',
  speaker_label: '(S1)',
  instruct: '清晰自然、沉稳可信的中文旁白，吐字明确，语速适中，情绪克制，不要演唱。',
  reference_text: '我们从一个看似简单的问题开始，沿着线索逐步理解事情背后的原因。',
  language: 'Auto',
  seed: 729754692978412,
  generation_mode: 'voice-design',
  reference_language: 'auto',
  prompt_filename: 'mv-maker-VOICE-NARRATOR',
  status: 'idle',
});

const characterVoice = (name: string, role: string | undefined, index: number): VoiceProfile => ({
  voice_id: `VOICE-CHAR-${String(index + 1).padStart(3, '0')}`,
  speaker_label: `(S${index + 2})`,
  instruct: `符合角色“${name}”视觉年龄、性别表达与气质的中文声音；角色功能是${role || '叙事人物'}；自然说话、吐字清楚、音色稳定，不要演唱。`,
  reference_text: `我是${name}。无论面对什么情况，我都会保持自己的判断，并把想说的话清楚地表达出来。`,
  language: 'Auto',
  seed: 729754692978413 + index,
  generation_mode: 'voice-design',
  reference_language: 'auto',
  prompt_filename: `mv-maker-VOICE-CHAR-${String(index + 1).padStart(3, '0')}`,
  status: 'idle',
});

const applyQwenVoiceProfiles = (project: MVScriptData): MVScriptData => {
  const director = project.director_plan;
  const plan = director?.audio_plan;
  if (!director || !plan || plan.mode === 'disabled') return project;
  const alreadyQwenReady = plan.mode === 'qwen3-tts-audio-first'
    && plan.workflow === '千问 3 TTS'
    && plan.music_workflow === 'MiniMax Music 3'
    && Boolean(plan.narrator_voice)
    && plan.narrator_voice?.generation_mode === 'voice-design'
    && Boolean(plan.narrator_voice.reference_language)
    && (plan.narrator_voice.status !== 'ready' || plan.narrator_voice.reference_audio?.source === 'generated-fixed-voice')
    && QWEN3_TTS_LANGUAGE_SET.has(plan.tts_language as Qwen3TtsLanguage)
    && project.characters.every((character) => Boolean(character.voice_profile)
      && ['voice-design', 'voice-clone'].includes(character.voice_profile!.generation_mode || 'voice-design')
      && Boolean(character.voice_profile!.reference_language)
      && (character.voice_profile!.generation_mode !== 'voice-clone' || character.voice_profile!.status !== 'ready' || Boolean(character.voice_profile!.creation_reference_audio))
      && (character.voice_profile!.status !== 'ready' || character.voice_profile!.reference_audio?.source === 'generated-fixed-voice'))
    && project.storyboard.every((segment) => segment.mvinfo.every((shot) => !shot.audio_plan || ((!shot.audio_plan.tts_language || QWEN3_TTS_LANGUAGE_SET.has(shot.audio_plan.tts_language)) && shot.audio_plan.speakers.every((speaker) => Boolean(speaker.voice_id)))));
  if (alreadyQwenReady) return project;
  const characters = project.characters.map((character, index) => ({
    ...character,
    voice_profile: character.voice_profile
      ? {
        ...character.voice_profile,
        language: normalizeTtsLanguage(character.voice_profile.language),
        generation_mode: character.voice_profile.generation_mode === 'voice-clone' ? 'voice-clone' as const : 'voice-design' as const,
        reference_language: character.voice_profile.reference_language ?? 'auto',
        ...(character.voice_profile.reference_audio?.source === 'generated-fixed-voice'
          ? {}
          : { reference_audio: undefined, preview_audio: undefined, prompt_filename: undefined, status: 'idle' as const }),
      }
      : characterVoice(character.name, character.role, index),
  }));
  const narrator = plan.narrator_voice
    ? {
      ...plan.narrator_voice,
      language: normalizeTtsLanguage(plan.narrator_voice.language),
      generation_mode: 'voice-design' as const,
      reference_language: plan.narrator_voice.reference_language ?? 'auto',
      ...(plan.narrator_voice.reference_audio?.source === 'generated-fixed-voice'
        ? {}
        : { reference_audio: undefined, preview_audio: undefined, prompt_filename: undefined, status: 'idle' as const }),
    }
    : narratorVoice();
  const ttsLanguage = normalizeTtsLanguage(plan.tts_language ?? narrator.language);
  const migratingMusic3VoicePlan = plan.mode === 'music3-audio-first';
  const voiceByCharacter = new Map(characters.map((character) => [character.name, character.voice_profile!]));
  const storyboard = project.storyboard.map((segment) => ({
    ...segment,
    mvinfo: segment.mvinfo.map((shot) => ({
      ...shot,
      ...(migratingMusic3VoicePlan ? { generated_assets: {
        ...shot.generated_assets,
        drive_audio: undefined,
        drive_audio_filename: undefined,
        voice_audio: undefined,
        voice_audio_filename: undefined,
        music_audio: undefined,
        music_audio_filename: undefined,
        mux_status: undefined,
      } } : {}),
      generation_plan: shot.generation_plan ? { ...shot.generation_plan, audio_mode: 'drive-audio' as const } : shot.generation_plan,
      audio_plan: shot.audio_plan ? {
        ...shot.audio_plan,
        ...(shot.audio_plan.tts_language ? { tts_language: normalizeTtsLanguage(shot.audio_plan.tts_language) } : {}),
        speakers: (shot.audio_plan.speakers.length ? shot.audio_plan.speakers : [{ speaker_label: narrator.speaker_label, character_name: '旁白', voice_description: narrator.instruct }]).map((speaker) => {
          const profile = speaker.character_name ? voiceByCharacter.get(speaker.character_name) : undefined;
          return { ...speaker, voice_id: speaker.voice_id || profile?.voice_id || narrator.voice_id };
        }),
      } : shot.audio_plan,
    })),
  }));
  return {
    ...project,
    characters,
    storyboard,
    director_plan: {
      ...director,
      audio_plan: {
        ...plan,
        mode: 'qwen3-tts-audio-first',
        workflow: '千问 3 TTS',
        music_workflow: 'MiniMax Music 3',
        music_enabled: plan.music_enabled ?? true,
        tts_language: ttsLanguage,
        narrator_voice: narrator,
        alignment_status: migratingMusic3VoicePlan ? 'planned' : plan.alignment_status,
        chapters: migratingMusic3VoicePlan ? plan.chapters.map((chapter) => ({
          ...chapter,
          caption: `${chapter.caption}；仅生成纯器乐背景配乐，避开对白频段，无演唱、无人声、无吟唱。`,
          lyrics: '[Instrumental]\n(No vocals)',
          generated_audio: undefined,
          actual_duration_seconds: undefined,
          status: 'idle' as const,
          error: undefined,
        })) : plan.chapters,
      },
    },
  };
};

const speakersForShot = (shot: MVInfo, contentForm: 'promo' | 'short_drama'): ShotSpeaker[] => {
  if (contentForm === 'promo') {
    return [{ speaker_label: '(S1)', character_name: '旁白', voice_description: '清晰沉稳的中文男声旁白，语速适中，旋律性弱，吐字明确。' }];
  }
  const labels = Array.from(new Set(shot.video_prompt.match(/\(S\d+\)/g) || ['(S1)']));
  return labels.map((speakerLabel, index) => ({
    speaker_label: speakerLabel,
    character_name: index === 0 ? '旁白或主要角色' : `角色 ${index + 1}`,
    voice_description: index === 0
      ? '稳定、清晰、具有叙事感的中文声音。'
      : `与其他角色明显不同的中文角色声音 ${index + 1}，保持固定年龄感、音高和说话节奏。`,
  }));
};

/**
 * Best-effort migration for director projects created before the v4 Music 3 contract.
 * Existing v4 plans are returned untouched; legacy scripts without director metadata
 * remain on the manual Drive/Reference Audio compatibility path.
 */
export const migrateProjectToV4AudioPlan = (project: MVScriptData): MVScriptData => {
  const director = project.director_plan;
  if (!director) return project;
  if (director.audio_plan) return applyQwenVoiceProfiles(project);

  if (director.content_form === 'music_video') {
    return {
      ...project,
      director_plan: {
        ...director,
        audio_plan: {
          mode: 'disabled',
          workflow: '千问 3 TTS',
          production_style: 'musical-drama',
          alignment_status: 'planned',
          chapters: [],
        },
      },
    };
  }

  const contentForm = director.content_form === 'short_drama' ? 'short_drama' : 'promo';
  let globalShotIndex = 0;
  const chapters: AudioChapter[] = [];
  const storyboard = project.storyboard.map((segment, segmentIndex) => {
    let chapterIndex = 0;
    let chapterDuration = 0;
    let chapterShots: Array<{ shotId: string; text: string }> = [];
    let currentChapterId = '';

    const flushChapter = () => {
      if (!chapterShots.length) return;
      chapters.push({
        chapter_id: currentChapterId,
        title: `声音章节 ${chapters.length + 1} · ${segment.content_narrative.slice(0, 24) || '未命名段落'}`,
        target_duration_seconds: chapterDuration,
        caption: chapterCaption(contentForm),
        lyrics: '[Instrumental]\n(No vocals)',
        shot_refs: chapterShots.map(({ shotId }) => shotId),
        status: 'idle',
      });
      chapterDuration = 0;
      chapterShots = [];
    };

    const mvinfo = segment.mvinfo.map((shot) => {
      const duration = getDuration(shot);
      if (!currentChapterId || chapterDuration + duration > 300) {
        flushChapter();
        chapterIndex += 1;
        currentChapterId = `AUDIO-${String(segmentIndex + 1).padStart(3, '0')}-${String(chapterIndex).padStart(2, '0')}`;
      }
      globalShotIndex += 1;
      const shotId = shot.shot_id || `SHOT-${String(globalShotIndex).padStart(3, '0')}`;
      const sourceStart = chapterDuration;
      const audioText = (shot.lyrics || shot.source_text || '').trim() || '（本镜头无对白，保留器乐过门）';
      chapterDuration += duration;
      chapterShots.push({ shotId, text: audioText });

      return {
        ...shot,
        shot_id: shotId,
        video_prompt: makeDriveAudioPrompt(shot.video_prompt),
        generation_plan: makeGenerationPlan(shot, director.model),
        audio_plan: {
          chapter_id: currentChapterId,
          source_start_seconds: sourceStart,
          duration_seconds: duration,
          audio_text: audioText,
          speakers: speakersForShot(shot, contentForm),
          cut_status: 'tentative' as const,
        },
      };
    });
    flushChapter();
    return { ...segment, mvinfo };
  });

  return applyQwenVoiceProfiles({
    ...project,
    director_plan: {
      ...director,
      audio_plan: {
        mode: 'qwen3-tts-audio-first',
        workflow: '千问 3 TTS',
        music_workflow: 'MiniMax Music 3',
        music_enabled: true,
        production_style: contentForm === 'promo' ? 'spoken-word' : 'musical-drama',
        alignment_status: 'planned',
        chapters,
        narrator_voice: narratorVoice(),
      },
    },
    storyboard,
  } as MVScriptData);
};

export const migrateGenerationSettingsToV4AudioPlan = (
  settings: ProjectGenerationSettings | undefined,
  project: MVScriptData,
): ProjectGenerationSettings | undefined => {
  if (!settings || !['music3-audio-first', 'qwen3-tts-audio-first'].includes(project.director_plan?.audio_plan?.mode || '')) return settings;
  return { ...settings, h3: { ...settings.h3, generation_mode: 'director-routed', audio_mode: 'drive-audio' } };
};
