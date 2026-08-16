import { createQwen3TtsWorkflow } from './qwen3TtsWorkflow.ts';

const result = createQwen3TtsWorkflow({ text: '你好，世界。', instruct: '年轻沉稳的中文女声', language: 'Chinese', seed: 42, voiceId: 'CHAR-001' });
if (result.workflow['9'].inputs.text !== '你好，世界。') throw new Error('TTS text was not applied');
if (result.workflow['9'].inputs.instruct !== '年轻沉稳的中文女声') throw new Error('voice instruct was not applied');
if (result.workflow['9'].inputs.seed !== 42 || result.workflow['5'].inputs.ref_text !== '你好，世界。') throw new Error('seed/ref text mismatch');
if (result.workflow['11'].inputs.filename !== 'mv-maker-CHAR-001') throw new Error('prompt filename mismatch');
const shot = createQwen3TtsWorkflow({ text: '镜头台词', instruct: '稳定音色', seed: 42, voiceId: 'CHAR-001', savePrompt: false });
if (shot.workflow['5'] || shot.workflow['6'] || shot.workflow['11']) throw new Error('shot synthesis must not overwrite the locked voice prompt');
console.log('PASS Qwen3 TTS workflow adapter');
