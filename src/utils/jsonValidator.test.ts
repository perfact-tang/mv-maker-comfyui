import { validateMVData } from './jsonValidator.ts';

const assert = (condition: unknown, message: string) => {
  if (!condition) throw new Error(message);
};

const base = {
  proposal_id: 1,
  direction_name: 'Test',
  characters: [],
  basics: { outline: '', shooting_method: '', art_style_description: '' },
  storyboard: [{
    segment_id: 1,
    movielength: '00:00-00:05',
    content_narrative: 'Test',
    prompts: { first_frame: '', last_frame: '' },
    mvinfo: [{
      timestamp: '00:00 - 00:05',
      type: 'New_Scene',
      lyrics: '(No dialogue)',
      image_prompt: 'First frame',
      video_prompt: 'Prompt',
      generation_plan: {
        model: 'minimax-h3',
        mode: 'I2VA',
        duration_seconds: 5,
        duration_frames: 141,
        audio_mode: 'no-audio',
        reference_images: [],
      },
    }],
  }],
};

assert(validateMVData(base).isValid, 'new director JSON with no characters must validate');

const legacy = structuredClone(base);
delete legacy.storyboard[0].mvinfo[0].generation_plan;
assert(validateMVData(legacy).isValid, 'legacy JSON without generation_plan must validate');

const badFrames = structuredClone(base);
badFrames.storyboard[0].mvinfo[0].generation_plan.duration_frames = 260;
assert(!validateMVData(badFrames).isValid, 'invalid duration/frame pair must fail');

const badRef = structuredClone(base);
badRef.storyboard[0].mvinfo[0].generation_plan.mode = 'Ref2VA';
assert(!validateMVData(badRef).isValid, 'Ref2VA without declarations must fail');

console.log('PASS legacy and director JSON validation');
