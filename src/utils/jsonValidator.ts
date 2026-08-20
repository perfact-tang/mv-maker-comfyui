export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

type JsonObject = Record<string, unknown>;

const H3_DURATION_FRAMES: Record<number, number> = { 5: 141, 10: 260, 15: 379 };

const isObject = (value: unknown): value is JsonObject => (
  typeof value === 'object' && value !== null && !Array.isArray(value)
);

export const validateMVData = (data: unknown): ValidationResult => {
  if (!isObject(data)) {
    return { isValid: false, error: '数据为空或不是有效对象' };
  }

  if (typeof data.proposal_id !== 'number') {
    return { isValid: false, error: "缺少或无效的 'proposal_id'" };
  }

  if (typeof data.direction_name !== 'string' || !data.direction_name.trim()) {
    return { isValid: false, error: "缺少或无效的 'direction_name'" };
  }

  if (!Array.isArray(data.characters)) {
    return {
      isValid: false,
      error: "'characters' 必须是数组（可以为空）",
    };
  }

  for (let index = 0; index < data.characters.length; index += 1) {
    const character = data.characters[index];
    const label = `第 ${index + 1} 位人物`;

    if (!isObject(character)) {
      return { isValid: false, error: `${label}必须是一个对象` };
    }
    if (typeof character.name !== 'string' || !character.name.trim()) {
      return { isValid: false, error: `${label}缺少非空的 'name'` };
    }
    if (typeof character.description !== 'string' || !character.description.trim()) {
      return { isValid: false, error: `${label}缺少非空的 'description'（人物描述）` };
    }
    if (character.id !== undefined && !['string', 'number'].includes(typeof character.id)) {
      return { isValid: false, error: `${label}的 'id' 必须是字符串或数字` };
    }
    if (character.character_id !== undefined && !['string', 'number'].includes(typeof character.character_id)) {
      return { isValid: false, error: `${label}的 'character_id' 必须是字符串或数字` };
    }
    if (character.role !== undefined && typeof character.role !== 'string') {
      return { isValid: false, error: `${label}的 'role' 必须是字符串` };
    }
    if (
      character.traits !== undefined
      && (!Array.isArray(character.traits) || character.traits.some((trait) => typeof trait !== 'string'))
    ) {
      return { isValid: false, error: `${label}的 'traits' 必须是字符串数组` };
    }
    if (character.reference_sheet !== undefined) {
      if (!isObject(character.reference_sheet)) {
        return { isValid: false, error: `${label}的 'reference_sheet' 必须是对象` };
      }
      for (const field of ['style_id', 'layout', 'z_image_prompt', 'krea_prompt']) {
        if (typeof character.reference_sheet[field] !== 'string' || !character.reference_sheet[field].trim()) {
          return { isValid: false, error: `${label}的 'reference_sheet.${field}' 必须是非空字符串` };
        }
      }
    }
    if (character.voice_profile !== undefined) {
      if (!isObject(character.voice_profile)) return { isValid: false, error: `${label}的 voice_profile 必须是对象` };
      for (const field of ['voice_id', 'speaker_label', 'instruct', 'reference_text', 'language']) {
        if (typeof character.voice_profile[field] !== 'string' || !String(character.voice_profile[field]).trim()) return { isValid: false, error: `${label}的 voice_profile.${field} 无效` };
      }
      if (!Number.isFinite(Number(character.voice_profile.seed))) return { isValid: false, error: `${label}的 voice_profile.seed 无效` };
      if (character.voice_profile.generation_mode !== undefined && !['voice-design', 'voice-clone'].includes(String(character.voice_profile.generation_mode))) return { isValid: false, error: `${label}的 voice_profile.generation_mode 无效` };
      if (character.voice_profile.reference_language !== undefined && !['auto', 'Chinese', 'English', 'Cantonese', 'Arabic', 'German', 'French', 'Spanish', 'Portuguese', 'Indonesian', 'Italian', 'Korean', 'Russian', 'Thai', 'Vietnamese', 'Japanese', 'Turkish', 'Hindi', 'Malay', 'Dutch', 'Swedish', 'Danish', 'Finnish', 'Polish', 'Czech', 'Filipino', 'Persian', 'Greek', 'Hungarian', 'Macedonian', 'Romanian'].includes(String(character.voice_profile.reference_language))) return { isValid: false, error: `${label}的 voice_profile.reference_language 无效` };
      if (character.voice_profile.generation_mode === 'voice-clone' && character.voice_profile.status === 'ready' && !isObject(character.voice_profile.creation_reference_audio)) return { isValid: false, error: `${label}通过参考声音创建固定音色，但缺少 creation_reference_audio` };
      if (character.voice_profile.creation_reference_audio !== undefined) {
        const sourceReference = character.voice_profile.creation_reference_audio;
        if (!isObject(sourceReference) || typeof sourceReference.data_url !== 'string' || !sourceReference.data_url.trim() || typeof sourceReference.filename !== 'string' || !sourceReference.filename.trim() || typeof sourceReference.mime_type !== 'string' || !sourceReference.mime_type.trim()) return { isValid: false, error: `${label}的创建参考声音文件信息无效` };
        const sourceDuration = Number(sourceReference.duration_seconds);
        const sourceMaximum = Number(sourceReference.ref_audio_max_seconds);
        if (!Number.isFinite(sourceDuration) || sourceDuration <= 0 || !Number.isFinite(sourceMaximum) || sourceMaximum <= sourceDuration) return { isValid: false, error: `${label}的创建参考声音安全读取上限无效` };
        if (sourceReference.source !== undefined && sourceReference.source !== 'uploaded-reference') return { isValid: false, error: `${label}的 creation_reference_audio.source 无效` };
        if (sourceReference.capture_method !== undefined && !['file-upload', 'browser-recording'].includes(String(sourceReference.capture_method))) return { isValid: false, error: `${label}的 creation_reference_audio.capture_method 无效` };
      }
      if (character.voice_profile.status === 'ready' && !isObject(character.voice_profile.reference_audio)) return { isValid: false, error: `${label}的固定音色已标记 ready 但缺少最终 reference_audio` };
      if (character.voice_profile.reference_audio !== undefined) {
        const reference = character.voice_profile.reference_audio;
        if (!isObject(reference) || typeof reference.data_url !== 'string' || !reference.data_url.trim() || typeof reference.filename !== 'string' || !reference.filename.trim() || typeof reference.mime_type !== 'string' || !reference.mime_type.trim()) return { isValid: false, error: `${label}的 reference_audio 文件信息无效` };
        const duration = Number(reference.duration_seconds);
        const maximum = Number(reference.ref_audio_max_seconds);
        if (!Number.isFinite(duration) || duration <= 0 || !Number.isFinite(maximum) || maximum <= duration) return { isValid: false, error: `${label}的 ref_audio_max_seconds 必须大于参考音频实长` };
        if (reference.source !== undefined && reference.source !== 'generated-fixed-voice') return { isValid: false, error: `${label}的最终 reference_audio.source 无效` };
      }
    }
  }

  if (!isObject(data.basics)) {
    return { isValid: false, error: "缺少或无效的 'basics' 字段" };
  }

  for (const field of ['outline', 'shooting_method', 'art_style_description']) {
    if (typeof data.basics[field] !== 'string') {
      return { isValid: false, error: `缺少或无效的 'basics.${field}'` };
    }
  }

  if (!Array.isArray(data.storyboard)) {
    return { isValid: false, error: "'storyboard' 必须是一个数组" };
  }

  const directorPlan = isObject(data.director_plan) ? data.director_plan : undefined;
  const audioPlan = directorPlan && isObject(directorPlan.audio_plan) ? directorPlan.audio_plan : undefined;
  const qwenLanguages = ['Auto', 'Chinese', 'English', 'Japanese', 'Korean', 'German', 'French', 'Russian', 'Portuguese', 'Spanish', 'Italian'];
  const knownVoiceIds = new Set<string>();
  for (const character of data.characters) {
    if (!isObject(character) || !isObject(character.voice_profile)) continue;
    const voiceId = String(character.voice_profile.voice_id || '').trim();
    if (!voiceId) continue;
    if (knownVoiceIds.has(voiceId)) return { isValid: false, error: `人物音色 voice_id 重复：${voiceId}` };
    knownVoiceIds.add(voiceId);
  }
  if (audioPlan && isObject(audioPlan.narrator_voice)) {
    const narratorVoiceId = String(audioPlan.narrator_voice.voice_id || '').trim();
    if (narratorVoiceId) {
      if (knownVoiceIds.has(narratorVoiceId)) return { isValid: false, error: `旁白与人物使用了重复 voice_id：${narratorVoiceId}` };
      knownVoiceIds.add(narratorVoiceId);
    }
  }
  if (audioPlan) {
    if (!['disabled', 'music3-audio-first', 'qwen3-tts-audio-first'].includes(String(audioPlan.mode))) {
      return { isValid: false, error: "director_plan.audio_plan.mode 无效" };
    }
    if (!['MiniMax Music 3', '千问 3 TTS'].includes(String(audioPlan.workflow))) {
      return { isValid: false, error: "director_plan.audio_plan.workflow 必须是千问 3 TTS 或 MiniMax Music 3" };
    }
    if (!['spoken-word', 'musical-drama'].includes(String(audioPlan.production_style))) {
      return { isValid: false, error: "director_plan.audio_plan.production_style 无效" };
    }
    if (!['planned', 'generated', 'aligned', 'locked'].includes(String(audioPlan.alignment_status))) {
      return { isValid: false, error: "director_plan.audio_plan.alignment_status 无效" };
    }
    if (!Array.isArray(audioPlan.chapters)) {
      return { isValid: false, error: "director_plan.audio_plan.chapters 必须是数组" };
    }
    if (audioPlan.mode === 'disabled' && audioPlan.chapters.length > 0) {
      return { isValid: false, error: "禁用 Music 3 时不能声明声音章节" };
    }
    if (directorPlan?.content_form === 'music_video' && audioPlan.mode !== 'disabled') {
      return { isValid: false, error: 'MV 项目必须禁用 Music 3 声音优先流程' };
    }
    if (directorPlan?.content_form !== 'music_video' && audioPlan.mode === 'disabled') {
      return { isValid: false, error: '新版讲解和小说项目必须使用千问 3 TTS 声音优先流程' };
    }
    if (audioPlan.mode === 'qwen3-tts-audio-first') {
      if (audioPlan.workflow !== '千问 3 TTS' || audioPlan.music_workflow !== 'MiniMax Music 3') return { isValid: false, error: '千问 3 TTS 项目必须声明千问 3 TTS 配音和 MiniMax Music 3 配乐工作流' };
      if (!isObject(audioPlan.narrator_voice)) return { isValid: false, error: '千问 3 TTS 项目缺少 narrator_voice' };
      if (audioPlan.tts_language !== undefined && !qwenLanguages.includes(String(audioPlan.tts_language))) return { isValid: false, error: 'director_plan.audio_plan.tts_language 无效' };
      if (isObject(audioPlan.narrator_voice)) {
        const narrator = audioPlan.narrator_voice;
        if (narrator.generation_mode !== undefined && !['voice-design', 'voice-clone'].includes(String(narrator.generation_mode))) return { isValid: false, error: 'narrator_voice.generation_mode 无效' };
        if (narrator.reference_language !== undefined && !['auto', 'Chinese', 'English', 'Cantonese', 'Arabic', 'German', 'French', 'Spanish', 'Portuguese', 'Indonesian', 'Italian', 'Korean', 'Russian', 'Thai', 'Vietnamese', 'Japanese', 'Turkish', 'Hindi', 'Malay', 'Dutch', 'Swedish', 'Danish', 'Finnish', 'Polish', 'Czech', 'Filipino', 'Persian', 'Greek', 'Hungarian', 'Macedonian', 'Romanian'].includes(String(narrator.reference_language))) return { isValid: false, error: 'narrator_voice.reference_language 无效' };
        if (narrator.generation_mode === 'voice-clone' && !isObject(narrator.reference_audio)) return { isValid: false, error: 'narrator_voice 选择了 voice-clone 但缺少 reference_audio' };
        if (narrator.reference_audio !== undefined) {
          const reference = narrator.reference_audio;
          if (!isObject(reference) || typeof reference.data_url !== 'string' || !reference.data_url.trim() || typeof reference.filename !== 'string' || !reference.filename.trim()) return { isValid: false, error: 'narrator_voice.reference_audio 文件信息无效' };
          if (!Number.isFinite(Number(reference.duration_seconds)) || Number(reference.duration_seconds) <= 0 || !Number.isFinite(Number(reference.ref_audio_max_seconds)) || Number(reference.ref_audio_max_seconds) <= Number(reference.duration_seconds)) return { isValid: false, error: 'narrator_voice.ref_audio_max_seconds 必须大于参考音频实长' };
        }
      }
    }
    const chapterIds = new Set<string>();
    for (const [chapterIndex, chapter] of audioPlan.chapters.entries()) {
      if (!isObject(chapter)) return { isValid: false, error: `第 ${chapterIndex + 1} 个声音章节必须是对象` };
      for (const field of ['chapter_id', 'title', 'caption', 'lyrics']) {
        if (typeof chapter[field] !== 'string' || !String(chapter[field]).trim()) {
          return { isValid: false, error: `第 ${chapterIndex + 1} 个声音章节缺少 ${field}` };
        }
      }
      if (chapterIds.has(String(chapter.chapter_id))) return { isValid: false, error: `声音章节 ID 重复：${String(chapter.chapter_id)}` };
      chapterIds.add(String(chapter.chapter_id));
      if (!Number.isFinite(Number(chapter.target_duration_seconds)) || Number(chapter.target_duration_seconds) <= 0 || Number(chapter.target_duration_seconds) > 300) {
        return { isValid: false, error: `第 ${chapterIndex + 1} 个声音章节时长必须在 1-300 秒` };
      }
      if (!Array.isArray(chapter.shot_refs) || chapter.shot_refs.some((ref) => typeof ref !== 'string')) {
        return { isValid: false, error: `第 ${chapterIndex + 1} 个声音章节的 shot_refs 无效` };
      }
      if (!['idle', 'generating', 'ready', 'failed'].includes(String(chapter.status))) {
        return { isValid: false, error: `第 ${chapterIndex + 1} 个声音章节状态无效` };
      }
    }
  }

  for (let index = 0; index < data.storyboard.length; index += 1) {
    const segment = data.storyboard[index];
    if (!isObject(segment) || typeof segment.segment_id !== 'number') {
      return { isValid: false, error: `第 ${index + 1} 个分段缺少有效的 'segment_id'` };
    }
    if (!Array.isArray(segment.mvinfo)) {
      return { isValid: false, error: `第 ${index + 1} 个分段的 'mvinfo' 必须是一个数组` };
    }
    for (let shotIndex = 0; shotIndex < segment.mvinfo.length; shotIndex += 1) {
      const shot = segment.mvinfo[shotIndex];
      if (!isObject(shot)) return { isValid: false, error: `第 ${index + 1} 段第 ${shotIndex + 1} 个镜头必须是对象` };
      if (shot.audio_plan !== undefined) {
        if (!isObject(shot.audio_plan)) return { isValid: false, error: `第 ${index + 1} 段第 ${shotIndex + 1} 个镜头的 audio_plan 无效` };
        const shotAudio = shot.audio_plan;
        if (shotAudio.tts_language !== undefined && !qwenLanguages.includes(String(shotAudio.tts_language))) return { isValid: false, error: `第 ${index + 1} 段第 ${shotIndex + 1} 个镜头的 TTS 语言无效` };
        if (typeof shotAudio.chapter_id !== 'string' || !shotAudio.chapter_id.trim()) return { isValid: false, error: `第 ${index + 1} 段第 ${shotIndex + 1} 个镜头缺少声音章节 ID` };
        if (audioPlan?.mode !== 'disabled' && !(audioPlan.chapters as unknown[]).some((chapter) => isObject(chapter) && chapter.chapter_id === shotAudio.chapter_id)) {
          return { isValid: false, error: `第 ${index + 1} 段第 ${shotIndex + 1} 个镜头引用了不存在的声音章节` };
        }
        if (!Number.isFinite(Number(shotAudio.source_start_seconds)) || Number(shotAudio.source_start_seconds) < 0) return { isValid: false, error: `第 ${index + 1} 段第 ${shotIndex + 1} 个镜头的声音起点无效` };
        if (![5, 10, 15].includes(Number(shotAudio.duration_seconds))) return { isValid: false, error: `第 ${index + 1} 段第 ${shotIndex + 1} 个镜头的声音时长无效` };
        if (typeof shotAudio.audio_text !== 'string' || !Array.isArray(shotAudio.speakers)) return { isValid: false, error: `第 ${index + 1} 段第 ${shotIndex + 1} 个镜头的声音文本或说话人无效` };
        if (audioPlan?.mode === 'qwen3-tts-audio-first' && shotAudio.speakers.some((speaker) => !isObject(speaker) || typeof speaker.voice_id !== 'string' || !speaker.voice_id.trim())) return { isValid: false, error: `第 ${index + 1} 段第 ${shotIndex + 1} 个镜头的说话人缺少 voice_id` };
        if (audioPlan?.mode === 'qwen3-tts-audio-first' && shotAudio.speakers.some((speaker) => isObject(speaker) && typeof speaker.voice_id === 'string' && !knownVoiceIds.has(speaker.voice_id))) return { isValid: false, error: `第 ${index + 1} 段第 ${shotIndex + 1} 个镜头引用了不存在的人物/旁白 voice_id` };
        if (!['tentative', 'confirmed'].includes(String(shotAudio.cut_status))) return { isValid: false, error: `第 ${index + 1} 段第 ${shotIndex + 1} 个镜头的切点状态无效` };
      }
      if (shot.generation_plan === undefined) continue;
      if (!isObject(shot.generation_plan)) return { isValid: false, error: `第 ${index + 1} 段第 ${shotIndex + 1} 个镜头的 generation_plan 无效` };
      const plan = shot.generation_plan;
      if (!['I2VA', 'FL2VA', 'Ref2VA'].includes(String(plan.mode))) return { isValid: false, error: `第 ${index + 1} 段第 ${shotIndex + 1} 个镜头的 H3 mode 无效` };
      const seconds = Number(plan.duration_seconds);
      if (H3_DURATION_FRAMES[seconds] !== Number(plan.duration_frames)) return { isValid: false, error: `第 ${index + 1} 段第 ${shotIndex + 1} 个镜头的时长与帧数不匹配` };
      if (!['native-audio', 'drive-audio', 'reference-audio', 'no-audio'].includes(String(plan.audio_mode))) return { isValid: false, error: `第 ${index + 1} 段第 ${shotIndex + 1} 个镜头的 audio_mode 无效` };
      if (audioPlan && audioPlan.mode !== 'disabled') {
        if (typeof shot.shot_id !== 'string' || !shot.shot_id.trim()) return { isValid: false, error: `第 ${index + 1} 段第 ${shotIndex + 1} 个镜头缺少 shot_id` };
        if (plan.audio_mode !== 'drive-audio') return { isValid: false, error: `第 ${index + 1} 段第 ${shotIndex + 1} 个镜头必须使用 drive-audio` };
        if (!isObject(shot.audio_plan) || Number(shot.audio_plan.duration_seconds) !== seconds) return { isValid: false, error: `第 ${index + 1} 段第 ${shotIndex + 1} 个镜头的声音时长必须与 H3 时长一致` };
      }
      if (!Array.isArray(plan.reference_images)) return { isValid: false, error: `第 ${index + 1} 段第 ${shotIndex + 1} 个镜头的 reference_images 必须是数组` };
      if (plan.mode === 'Ref2VA') {
        if (plan.reference_images.length < 1 || plan.reference_images.length > 2) return { isValid: false, error: `第 ${index + 1} 段第 ${shotIndex + 1} 个 Ref2VA 镜头必须声明一至两张参考图` };
        for (let refIndex = 0; refIndex < plan.reference_images.length; refIndex += 1) {
          const reference = plan.reference_images[refIndex];
          if (!isObject(reference) || reference.label !== `<Picture ${refIndex + 1}>` || typeof reference.purpose !== 'string' || !reference.purpose.trim() || typeof reference.prompt !== 'string' || !reference.prompt.trim()) {
            return { isValid: false, error: `第 ${index + 1} 段第 ${shotIndex + 1} 个镜头的参考图 ${refIndex + 1} 声明无效` };
          }
        }
      } else if (plan.reference_images.length > 0) return { isValid: false, error: `第 ${index + 1} 段第 ${shotIndex + 1} 个 ${String(plan.mode)} 镜头不能声明 Ref2VA 参考图` };
      if (plan.mode === 'FL2VA' && (typeof shot.last_frame_image_prompt !== 'string' || !shot.last_frame_image_prompt.trim())) return { isValid: false, error: `第 ${index + 1} 段第 ${shotIndex + 1} 个 FL2VA 镜头缺少 last_frame_image_prompt` };
    }
  }

  return { isValid: true };
};
