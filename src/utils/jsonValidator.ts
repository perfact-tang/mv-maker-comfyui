import { MVScriptData } from "../types/mv-data";

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export const validateMVData = (data: any): ValidationResult => {
  if (!data) {
    return { isValid: false, error: "数据为空" };
  }

  if (typeof data.proposal_id !== "number") {
    return { isValid: false, error: "缺少或无效的 'proposal_id'" };
  }

  if (typeof data.direction_name !== "string") {
    return { isValid: false, error: "缺少或无效的 'direction_name'" };
  }

  if (!data.basics || typeof data.basics.outline !== "string") {
    return { isValid: false, error: "缺少或无效的 'basics' 字段" };
  }

  if (!Array.isArray(data.storyboard)) {
    return { isValid: false, error: "'storyboard' 必须是一个数组" };
  }

  // Basic check for first segment to fail fast
  if (data.storyboard.length > 0) {
    const firstSeg = data.storyboard[0];
    if (typeof firstSeg.segment_id !== "number") {
      return { isValid: false, error: "无效的分段结构: 缺少 'segment_id'" };
    }
    if (!Array.isArray(firstSeg.mvinfo)) {
      return { isValid: false, error: "无效的分段结构: 'mvinfo' 必须是一个数组" };
    }
  }

  return { isValid: true };
};
