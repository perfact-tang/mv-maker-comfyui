import { MVScriptData } from "../types/mv-data";
import { validateMVData } from "./jsonValidator";

export const parseMVData = (jsonString: string): Promise<MVScriptData> => {
  return new Promise((resolve, reject) => {
    try {
      const parsed = JSON.parse(jsonString);
      const validation = validateMVData(parsed);
      
      if (validation.isValid) {
        resolve(parsed as MVScriptData);
      } else {
        reject(new Error(validation.error || "无效的 JSON 结构"));
      }
    } catch (e) {
      reject(new Error("解析 JSON 字符串失败"));
    }
  });
};
