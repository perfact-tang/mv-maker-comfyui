#!/usr/bin/env node

import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const FRAME_MAP = new Map([[5, 141], [10, 260], [15, 379]]);
const MODES = new Set(['I2VA', 'FL2VA', 'Ref2VA']);
const AUDIO_MODES = new Set(['native-audio', 'drive-audio', 'reference-audio', 'no-audio']);

const fail = (message) => {
  console.error(`INVALID: ${message}`);
  process.exitCode = 1;
};

const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const hasChinese = (value) => typeof value === 'string' && /[\u3400-\u9fff]/u.test(value);

const parseClock = (value) => {
  const match = /^(\d{2,}):(\d{2})(?:\.(\d{1,3}))?$/.exec(value.trim());
  if (!match) return Number.NaN;
  return Number(match[1]) * 60 + Number(match[2]) + Number(`0.${match[3] ?? 0}`);
};

const parseRange = (value) => {
  if (typeof value !== 'string') return null;
  const parts = value.split(/\s*-\s*/);
  if (parts.length !== 2) return null;
  const start = parseClock(parts[0]);
  const end = parseClock(parts[1]);
  return Number.isFinite(start) && Number.isFinite(end) && end > start ? { start, end } : null;
};

const file = process.argv[2];
if (!file) {
  console.error('Usage: node validate_storyboard.mjs <project.json> [--legacy-compatible]');
  process.exit(2);
}

const legacyCompatible = process.argv.includes('--legacy-compatible');
let parsed;
try {
  parsed = JSON.parse(await readFile(resolve(file), 'utf8'));
} catch (error) {
  console.error(`INVALID: cannot read JSON: ${error.message}`);
  process.exit(1);
}

const project = parsed?.schema === 'mv-maker-project' ? parsed.project : parsed;
if (!isObject(project)) {
  fail('project must be an object');
} else {
  if (typeof project.proposal_id !== 'number') fail('proposal_id must be a number');
  if (typeof project.direction_name !== 'string' || !project.direction_name.trim()) fail('direction_name is required');
  if (!Array.isArray(project.characters)) fail('characters must be an array (it may be empty)');
  if (!Array.isArray(project.storyboard) || project.storyboard.length === 0) fail('storyboard must be a non-empty array');

  if (!legacyCompatible) {
    const plan = project.director_plan;
    if (!isObject(plan)) fail('director_plan is required in strict mode');
    else {
      for (const field of ['source_type', 'content_form', 'model', 'aspect_ratio', 'style_name', 'style_rationale', 'narrative_strategy', 'source_coverage_note']) {
        if (typeof plan[field] !== 'string' || !plan[field].trim()) fail(`director_plan.${field} is required`);
      }
      if (!['music_video', 'short_drama', 'promo'].includes(plan.content_form)) fail('director_plan.content_form is invalid');
      if (!Number.isFinite(plan.total_duration_seconds) || plan.total_duration_seconds <= 0) fail('director_plan.total_duration_seconds must be positive');
      if (!Array.isArray(plan.allowed_clip_durations_seconds) || plan.allowed_clip_durations_seconds.some((v) => !FRAME_MAP.has(v))) {
        fail('director_plan.allowed_clip_durations_seconds may contain only 5, 10, and 15');
      }
      const styleLock = plan.visual_style_lock;
      if (!isObject(styleLock)) fail('director_plan.visual_style_lock is required');
      else {
        for (const field of ['style_id', 'style_name', 'shared_style_prefix', 'shared_negative_prompt', 'character_sheet_layout', 'preferred_image_workflow']) {
          if (typeof styleLock[field] !== 'string' || !styleLock[field].trim()) fail(`director_plan.visual_style_lock.${field} is required`);
        }
        if (!['Z-Image-Turbo', 'Krea2 Turbo'].includes(styleLock.preferred_image_workflow)) {
          fail('director_plan.visual_style_lock.preferred_image_workflow is invalid');
        }
        for (const field of ['style_name', 'shared_style_prefix', 'shared_negative_prompt', 'character_sheet_layout']) {
          if (!hasChinese(styleLock[field])) fail(`director_plan.visual_style_lock.${field} must contain Chinese prompt content`);
        }
      }
    }

    const imageWorkflow = parsed?.generation_settings?.image_workflow;
    if (!['Z-Image-Turbo', 'Krea2 Turbo'].includes(imageWorkflow)) {
      fail('generation_settings.image_workflow must be Z-Image-Turbo or Krea2 Turbo');
    }
    for (const [characterIndex, character] of (project.characters ?? []).entries()) {
      const at = `characters[${characterIndex}]`;
      if (!isObject(character) || typeof character.name !== 'string' || !character.name.trim()) {
        fail(`${at}.name is required`);
        continue;
      }
      if (!hasChinese(character.description)) fail(`${at}.description must be a Chinese reference-sheet prompt`);
      const sheet = character.reference_sheet;
      if (!isObject(sheet)) {
        fail(`${at}.reference_sheet is required`);
        continue;
      }
      for (const field of ['style_id', 'layout', 'z_image_prompt', 'krea_prompt']) {
        if (typeof sheet[field] !== 'string' || !sheet[field].trim()) fail(`${at}.reference_sheet.${field} is required`);
      }
      if (sheet.style_id !== project.director_plan?.visual_style_lock?.style_id) fail(`${at}.reference_sheet.style_id must match the project visual style lock`);
      for (const field of ['layout', 'z_image_prompt', 'krea_prompt']) {
        if (!hasChinese(sheet[field])) fail(`${at}.reference_sheet.${field} must contain Chinese prompt content`);
      }
      const requiredLayoutTerms = ['正面', '侧面', '背面', '表情', '细节'];
      if (!requiredLayoutTerms.every((term) => sheet.layout.includes(term))) fail(`${at}.reference_sheet.layout is missing required multi-view sections`);
      const selectedPrompt = imageWorkflow === 'Z-Image-Turbo' ? sheet.z_image_prompt : sheet.krea_prompt;
      if (character.description !== selectedPrompt) fail(`${at}.description must equal the selected workflow prompt`);
    }
    if (parsed?.schema === 'mv-maker-project') {
      const settings = parsed.generation_settings;
      if (!isObject(settings) || !isObject(settings.h3)) fail('generation_settings with h3 settings is required');
      else {
        if (!['Z-Image-Turbo', 'Krea2 Turbo'].includes(settings.image_workflow)) fail('generation_settings.image_workflow is invalid');
        if (typeof settings.video_workflow !== 'string' || !settings.video_workflow.trim()) fail('generation_settings.video_workflow is required');
        if (!['landscape', 'portrait'].includes(settings.video_orientation)) fail('generation_settings.video_orientation is invalid');
        if (!['first-frame', 'reference-images', 'director-routed'].includes(settings.h3.generation_mode)) fail('generation_settings.h3.generation_mode is invalid');
        if (!AUDIO_MODES.has(settings.h3.audio_mode)) fail('generation_settings.h3.audio_mode is invalid');
        if (!Number.isFinite(settings.h3.video_length_frames)) fail('generation_settings.h3.video_length_frames is invalid');
        if (!Array.isArray(settings.h3.reference_images) || settings.h3.reference_images.length !== 2) fail('generation_settings.h3.reference_images must contain two slots');
        if (project.storyboard?.some((segment) => segment.mvinfo?.some((shot) => shot.generation_plan)) && settings.h3.generation_mode !== 'director-routed') {
          fail('generation_settings.h3.generation_mode must be director-routed when per-shot generation plans are present');
        }
      }
    }
  }

  let previousEnd = 0;
  let computedDuration = 0;
  let shotCount = 0;
  for (const [segmentIndex, segment] of (project.storyboard ?? []).entries()) {
    if (!isObject(segment) || typeof segment.segment_id !== 'number' || !Array.isArray(segment.mvinfo)) {
      fail(`storyboard[${segmentIndex}] is invalid`);
      continue;
    }
    for (const [shotIndex, shot] of segment.mvinfo.entries()) {
      const at = `storyboard[${segmentIndex}].mvinfo[${shotIndex}]`;
      shotCount += 1;
      const range = parseRange(shot.timestamp);
      if (!range) fail(`${at}.timestamp is invalid`);
      else {
        if (Math.abs(range.start - previousEnd) > 0.001) fail(`${at}.timestamp is not contiguous`);
        previousEnd = range.end;
      }

      if (legacyCompatible && !shot.generation_plan) continue;
      if (typeof shot.source_text !== 'string' || !shot.source_text.trim()) fail(`${at}.source_text is required`);
      if (typeof shot.video_prompt !== 'string' || !shot.video_prompt.trim()) fail(`${at}.video_prompt is required`);
      if (!legacyCompatible && !hasChinese(shot.video_prompt)) fail(`${at}.video_prompt must contain Chinese prompt content`);
      const plan = shot.generation_plan;
      if (!isObject(plan)) {
        fail(`${at}.generation_plan is required`);
        continue;
      }
      if (plan.model !== 'minimax-h3') fail(`${at}.generation_plan.model must be minimax-h3`);
      if (!MODES.has(plan.mode)) fail(`${at}.generation_plan.mode is invalid`);
      if (!FRAME_MAP.has(plan.duration_seconds) || FRAME_MAP.get(plan.duration_seconds) !== plan.duration_frames) {
        fail(`${at} has an invalid duration/frame pair`);
      }
      if (range && Math.abs((range.end - range.start) - plan.duration_seconds) > 0.001) {
        fail(`${at}.timestamp duration does not match generation_plan.duration_seconds`);
      }
      if (!AUDIO_MODES.has(plan.audio_mode)) fail(`${at}.generation_plan.audio_mode is invalid`);
      const refs = plan.reference_images ?? [];
      if (!Array.isArray(refs)) fail(`${at}.generation_plan.reference_images must be an array`);
      if (plan.mode === 'Ref2VA') {
        if (!Array.isArray(refs) || refs.length !== 2) fail(`${at} Ref2VA requires exactly two reference declarations`);
        for (const [refIndex, ref] of (Array.isArray(refs) ? refs : []).entries()) {
          if (!isObject(ref) || ref.label !== `<Picture ${refIndex + 1}>` || typeof ref.purpose !== 'string' || !ref.purpose.trim() || typeof ref.prompt !== 'string' || !ref.prompt.trim()) {
            fail(`${at}.generation_plan.reference_images[${refIndex}] is invalid`);
          }
          if (!legacyCompatible && (!hasChinese(ref?.purpose) || !hasChinese(ref?.prompt))) fail(`${at}.generation_plan.reference_images[${refIndex}] must use Chinese descriptions`);
        }
      } else if (Array.isArray(refs) && refs.length !== 0) {
        fail(`${at} ${plan.mode} must not declare Ref2VA reference images`);
      }
      if (plan.mode === 'FL2VA' && (typeof shot.last_frame_image_prompt !== 'string' || !shot.last_frame_image_prompt.trim())) {
        fail(`${at} FL2VA requires last_frame_image_prompt`);
      }
      if (!legacyCompatible && plan.mode === 'FL2VA' && !hasChinese(shot.last_frame_image_prompt)) fail(`${at}.last_frame_image_prompt must contain Chinese prompt content`);
      if (plan.mode === 'I2VA' && shot.type !== 'Last_Frame_Continuity' && (typeof shot.image_prompt !== 'string' || !shot.image_prompt.trim())) {
        fail(`${at} I2VA New_Scene requires image_prompt`);
      }
      if (!legacyCompatible && plan.mode === 'I2VA' && shot.type !== 'Last_Frame_Continuity' && !hasChinese(shot.image_prompt)) fail(`${at}.image_prompt must contain Chinese prompt content`);
      computedDuration += Number(plan.duration_seconds) || 0;
    }
  }

  if (shotCount === 0) fail('at least one shot is required');
  if (!legacyCompatible && isObject(project.director_plan) && Math.abs(computedDuration - project.director_plan.total_duration_seconds) > 0.001) {
    fail('director_plan.total_duration_seconds does not equal the sum of shot durations');
  }
}

if (!process.exitCode) console.log('VALID');
