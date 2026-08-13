import {
  MVProjectArchive,
  MVScriptData,
  ProjectGenerationSettings,
} from '../types/mv-data';
import { validateMVData } from './jsonValidator';

export const PROJECT_ARCHIVE_SCHEMA = 'mv-maker-project' as const;
export const PROJECT_ARCHIVE_VERSION = 3 as const;

type JsonObject = Record<string, unknown>;

const isObject = (value: unknown): value is JsonObject => (
  typeof value === 'object' && value !== null && !Array.isArray(value)
);

const isReferenceImage = (value: unknown): boolean => {
  if (value === null) return true;
  if (!isObject(value)) return false;
  return typeof value.dataUrl === 'string'
    && typeof value.filename === 'string'
    && typeof value.prompt === 'string';
};

const validateGenerationSettings = (value: unknown): value is ProjectGenerationSettings => {
  if (!isObject(value) || !isObject(value.h3)) return false;

  const references = value.h3.reference_images;
  return typeof value.image_workflow === 'string'
    && Boolean(value.image_workflow.trim())
    && typeof value.video_workflow === 'string'
    && Boolean(value.video_workflow.trim())
    && ['landscape', 'portrait'].includes(String(value.video_orientation))
    && ['first-frame', 'reference-images', 'director-routed'].includes(String(value.h3.generation_mode))
    && ['native-audio', 'drive-audio', 'reference-audio', 'no-audio'].includes(String(value.h3.audio_mode))
    && typeof value.h3.video_length_frames === 'number'
    && Number.isFinite(value.h3.video_length_frames)
    && Array.isArray(references)
    && references.length === 2
    && references.every(isReferenceImage);
};

export interface ParsedProjectFile {
  project: MVScriptData;
  generationSettings?: ProjectGenerationSettings;
  source: 'archive-v3' | 'legacy-script';
}

export const createProjectArchive = (
  project: MVScriptData,
  generationSettings: ProjectGenerationSettings,
): MVProjectArchive => ({
  schema: PROJECT_ARCHIVE_SCHEMA,
  schema_version: PROJECT_ARCHIVE_VERSION,
  exported_at: new Date().toISOString(),
  project,
  generation_settings: generationSettings,
});

export const parseProjectFile = (jsonString: string): ParsedProjectFile => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonString);
  } catch {
    throw new Error('JSON 文件无法解析，请检查文件内容。');
  }

  if (isObject(parsed) && parsed.schema === PROJECT_ARCHIVE_SCHEMA) {
    if (parsed.schema_version !== PROJECT_ARCHIVE_VERSION) {
      throw new Error(`暂不支持项目存档版本 ${String(parsed.schema_version)}。`);
    }

    const projectValidation = validateMVData(parsed.project);
    if (!projectValidation.isValid) {
      throw new Error(projectValidation.error || '项目内容格式无效。');
    }
    if (!validateGenerationSettings(parsed.generation_settings)) {
      throw new Error('项目存档中的 generation_settings 格式无效。');
    }

    return {
      project: parsed.project as unknown as MVScriptData,
      generationSettings: parsed.generation_settings,
      source: 'archive-v3',
    };
  }

  const legacyValidation = validateMVData(parsed);
  if (!legacyValidation.isValid) {
    throw new Error(legacyValidation.error || '接入 JSON 格式无效。');
  }

  return {
    project: parsed as MVScriptData,
    source: 'legacy-script',
  };
};
