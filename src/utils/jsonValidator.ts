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
      if (shot.generation_plan === undefined) continue;
      if (!isObject(shot.generation_plan)) return { isValid: false, error: `第 ${index + 1} 段第 ${shotIndex + 1} 个镜头的 generation_plan 无效` };
      const plan = shot.generation_plan;
      if (!['I2VA', 'FL2VA', 'Ref2VA'].includes(String(plan.mode))) return { isValid: false, error: `第 ${index + 1} 段第 ${shotIndex + 1} 个镜头的 H3 mode 无效` };
      const seconds = Number(plan.duration_seconds);
      if (H3_DURATION_FRAMES[seconds] !== Number(plan.duration_frames)) return { isValid: false, error: `第 ${index + 1} 段第 ${shotIndex + 1} 个镜头的时长与帧数不匹配` };
      if (!['native-audio', 'drive-audio', 'reference-audio', 'no-audio'].includes(String(plan.audio_mode))) return { isValid: false, error: `第 ${index + 1} 段第 ${shotIndex + 1} 个镜头的 audio_mode 无效` };
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
