import {
  MVProjectArchive,
  MVScriptData,
  ProjectGenerationSettings,
} from '../types/mv-data';
import { validateMVData } from './jsonValidator';
import { migrateGenerationSettingsToV4AudioPlan, migrateProjectToV4AudioPlan } from './audioPlanMigration';

export const PROJECT_ARCHIVE_SCHEMA = 'mv-maker-project' as const;
export const PROJECT_ARCHIVE_VERSION = 4 as const;
const LEGACY_ARCHIVE_VERSION = 3 as const;

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
  source: 'archive-v4' | 'archive-v3' | 'legacy-script';
}

const normalizeAudioWorkflowLabels = (value: unknown): unknown => {
  if (!isObject(value) || !isObject(value.director_plan) || !isObject(value.director_plan.audio_plan)) return value;
  const directorPlan = value.director_plan as JsonObject;
  const audioPlan = directorPlan.audio_plan as JsonObject;
  const mode = String(audioPlan.mode || '');
  const workflow = mode === 'qwen3-tts-audio-first'
    ? '千问 3 TTS'
    : mode === 'music3-audio-first'
      ? 'MiniMax Music 3'
      : ['千问 3 TTS', 'MiniMax Music 3'].includes(String(audioPlan.workflow))
        ? audioPlan.workflow
        : 'MiniMax Music 3';
  return {
    ...value,
    director_plan: {
      ...directorPlan,
      audio_plan: {
        ...audioPlan,
        workflow,
        ...(mode === 'qwen3-tts-audio-first' ? { music_workflow: ['MiniMax Music 3', 'Audio ACE Step 1.5'].includes(String(audioPlan.music_workflow)) ? audioPlan.music_workflow : 'MiniMax Music 3' } : {}),
      },
    },
  };
};

const prepareProject = (value: unknown): MVScriptData => {
  const normalized = normalizeAudioWorkflowLabels(value);
  let migrated: MVScriptData;
  try {
    migrated = migrateProjectToV4AudioPlan(normalized as MVScriptData);
  } catch {
    const validation = validateMVData(normalized);
    throw new Error(validation.error || '项目内容格式无效。');
  }
  const validation = validateMVData(migrated);
  if (!validation.isValid) throw new Error(validation.error || '项目内容格式无效。');
  return migrated;
};

export const createProjectArchive = (
  project: MVScriptData,
  generationSettings: ProjectGenerationSettings,
): MVProjectArchive => {
  const preparedProject = prepareProject(project);
  const preparedSettings = migrateGenerationSettingsToV4AudioPlan(generationSettings, preparedProject);
  if (!preparedSettings || !validateGenerationSettings(preparedSettings)) {
    throw new Error('当前生成设置无法保存，请检查 H3 和工作流设置。');
  }
  return {
    schema: PROJECT_ARCHIVE_SCHEMA,
    schema_version: PROJECT_ARCHIVE_VERSION,
    exported_at: new Date().toISOString(),
    project: preparedProject,
    generation_settings: preparedSettings,
  };
};

export const parseProjectFile = (jsonString: string): ParsedProjectFile => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonString);
  } catch {
    throw new Error('JSON 文件无法解析，请检查文件内容。');
  }

  if (isObject(parsed) && parsed.schema === PROJECT_ARCHIVE_SCHEMA) {
    if (![LEGACY_ARCHIVE_VERSION, PROJECT_ARCHIVE_VERSION].includes(parsed.schema_version as 3 | 4)) {
      throw new Error(`暂不支持项目存档版本 ${String(parsed.schema_version)}。`);
    }

    if (!validateGenerationSettings(parsed.generation_settings)) {
      throw new Error('项目存档中的 generation_settings 格式无效。');
    }

    const project = prepareProject(parsed.project);
    return {
      project,
      generationSettings: migrateGenerationSettingsToV4AudioPlan(parsed.generation_settings, project),
      source: parsed.schema_version === PROJECT_ARCHIVE_VERSION ? 'archive-v4' : 'archive-v3',
    };
  }

  const project = prepareProject(parsed);
  return {
    project,
    source: 'legacy-script',
  };
};
