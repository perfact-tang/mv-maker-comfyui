import { useEffect, useRef, useState } from 'react';
import { FileAudio2, Loader2, Mic, Square, Trash2, Upload } from 'lucide-react';
import type { Qwen3AsrLanguage, Qwen3TtsLanguage, VoiceProfile } from '../types/mv-data';
import { analyzeAudioUrl } from '../utils/audioAlignment';
import { QWEN3_ASR_LANGUAGES, safeRefAudioMaxSeconds } from '../utils/qwen3VoiceCloneWorkflow';
import { QWEN3_TTS_LANGUAGES } from '../utils/qwen3TtsWorkflow';

interface CharacterVoiceCreationMethodProps {
  profile: VoiceProfile;
  disabled?: boolean;
  onChange: (patch: Partial<VoiceProfile>) => void;
}

const fileToDataUrl = (file: File) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('参考声音读取失败'));
  reader.onerror = () => reject(reader.error || new Error('参考声音读取失败'));
  reader.readAsDataURL(file);
});

export const CharacterVoiceCreationMethod = ({ profile, disabled = false, onChange }: CharacterVoiceCreationMethodProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [reading, setReading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const method = profile.generation_mode ?? 'voice-design';
  const sourceAudio = profile.creation_reference_audio;

  const releaseMicrophone = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    recorderRef.current = null;
  };

  useEffect(() => {
    if (!recording) return;
    const interval = window.setInterval(() => setRecordingSeconds((seconds) => seconds + 1), 1000);
    return () => window.clearInterval(interval);
  }, [recording]);

  useEffect(() => () => {
    const recorder = recorderRef.current;
    if (recorder) {
      recorder.ondataavailable = null;
      recorder.onstop = null;
      if (recorder.state !== 'inactive') recorder.stop();
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

  const selectFile = async (file?: File, captureMethod: 'file-upload' | 'browser-recording' = 'file-upload') => {
    if (!file) return;
    setReading(true);
    setError(null);
    const objectUrl = URL.createObjectURL(file);
    try {
      const [dataUrl, analysis] = await Promise.all([fileToDataUrl(file), analyzeAudioUrl(objectUrl)]);
      const durationSeconds = Number(analysis.durationSeconds.toFixed(3));
      onChange({
        generation_mode: 'voice-clone',
        reference_language: profile.reference_language ?? 'auto',
        creation_reference_audio: {
          data_url: dataUrl,
          filename: file.name,
          mime_type: file.type || 'application/octet-stream',
          duration_seconds: durationSeconds,
          ref_audio_max_seconds: safeRefAudioMaxSeconds(durationSeconds),
          source: 'uploaded-reference',
          capture_method: captureMethod,
        },
        reference_audio: undefined,
        preview_audio: undefined,
        prompt_filename: undefined,
        status: 'idle',
        error: undefined,
      });
    } catch (readError) {
      setError(readError instanceof Error ? readError.message : String(readError));
    } finally {
      URL.revokeObjectURL(objectUrl);
      if (inputRef.current) inputRef.current.value = '';
      setReading(false);
    }
  };

  const startRecording = async () => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setError('当前浏览器不支持网页录音，请改用上传参考声音。');
      return;
    }
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
      streamRef.current = stream;
      const preferredMimeType = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus'].find((mimeType) => MediaRecorder.isTypeSupported(mimeType));
      const recorder = new MediaRecorder(stream, preferredMimeType ? { mimeType: preferredMimeType } : undefined);
      recorderRef.current = recorder;
      chunksRef.current = [];
      recorder.ondataavailable = (event) => { if (event.data.size > 0) chunksRef.current.push(event.data); };
      recorder.onerror = () => {
        setError('录音过程中发生错误，请重新录制或上传文件。');
        setRecording(false);
        releaseMicrophone();
      };
      recorder.onstop = () => {
        const mimeType = recorder.mimeType || preferredMimeType || 'audio/webm';
        const blob = new Blob(chunksRef.current, { type: mimeType });
        chunksRef.current = [];
        setRecording(false);
        releaseMicrophone();
        if (blob.size === 0) {
          setError('没有录到有效声音，请检查麦克风后重试。');
          return;
        }
        const extension = mimeType.includes('ogg') ? 'ogg' : 'webm';
        const file = new File([blob], `recorded-reference-${Date.now()}.${extension}`, { type: mimeType });
        void selectFile(file, 'browser-recording');
      };
      setRecordingSeconds(0);
      setRecording(true);
      recorder.start(250);
    } catch (recordError) {
      releaseMicrophone();
      const denied = recordError instanceof DOMException && ['NotAllowedError', 'SecurityError'].includes(recordError.name);
      setError(denied ? '麦克风权限被拒绝，请允许访问麦克风后重试。' : recordError instanceof Error ? recordError.message : String(recordError));
    }
  };

  const stopRecording = () => {
    const recorder = recorderRef.current;
    if (recorder?.state === 'recording') recorder.stop();
  };

  const formattedRecordingTime = `${String(Math.floor(recordingSeconds / 60)).padStart(2, '0')}:${String(recordingSeconds % 60).padStart(2, '0')}`;

  const updateOutputLanguage = (language: Qwen3TtsLanguage) => onChange({
    language,
    reference_audio: undefined,
    preview_audio: undefined,
    prompt_filename: undefined,
    status: 'idle',
  });

  return <div className="mt-3 rounded-lg border border-white/10 bg-black/25 p-3">
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="text-[10px] font-bold tracking-wider text-gray-500">固定音色创建方式
        <select disabled={disabled || reading || recording} value={method} onChange={(event) => onChange({ generation_mode: event.target.value as VoiceProfile['generation_mode'], reference_audio: undefined, preview_audio: undefined, prompt_filename: undefined, status: 'idle' })} className="mt-1 w-full rounded border border-white/10 bg-black/50 px-2 py-2 text-xs text-gray-200">
          <option value="voice-design">文本定义（Voice Design）</option>
          <option value="voice-clone">上传参考声音（Voice Clone）</option>
        </select>
      </label>
      {method === 'voice-clone' ? <label className="text-[10px] font-bold tracking-wider text-gray-500">参考声音语言（ASR）
        <select disabled={disabled || reading || recording} value={profile.reference_language ?? 'auto'} onChange={(event) => onChange({ reference_language: event.target.value as Qwen3AsrLanguage, reference_audio: undefined, preview_audio: undefined, status: 'idle' })} className="mt-1 w-full rounded border border-white/10 bg-black/50 px-2 py-2 text-xs text-gray-200">
          {QWEN3_ASR_LANGUAGES.map((language) => <option key={language} value={language}>{language}</option>)}
        </select>
      </label> : <label className="text-[10px] font-bold tracking-wider text-gray-500">固定音色输出语言
        <select disabled={disabled || reading || recording} value={profile.language} onChange={(event) => updateOutputLanguage(event.target.value as Qwen3TtsLanguage)} className="mt-1 w-full rounded border border-white/10 bg-black/50 px-2 py-2 text-xs text-gray-200">
          {QWEN3_TTS_LANGUAGES.map((language) => <option key={language} value={language}>{language}</option>)}
        </select>
      </label>}
    </div>

    {method === 'voice-clone' && <>
      <input ref={inputRef} type="file" accept="audio/*,.wav,.mp3,.flac,.m4a,.ogg,.aac" className="hidden" onChange={(event) => selectFile(event.target.files?.[0])} />
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button type="button" disabled={disabled || reading || recording} onClick={() => inputRef.current?.click()} className="inline-flex items-center gap-2 rounded border border-cyan-300/30 px-3 py-2 text-xs text-cyan-200 disabled:opacity-50">
          {reading ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}{sourceAudio ? '更换参考声音' : '上传参考声音'}
        </button>
        {recording
          ? <button type="button" onClick={stopRecording} className="inline-flex items-center gap-2 rounded border border-red-300/40 bg-red-500/10 px-3 py-2 text-xs font-bold text-red-200"><Square size={12} fill="currentColor" />停止录音 · {formattedRecordingTime}</button>
          : <button type="button" disabled={disabled || reading} onClick={startRecording} className="inline-flex items-center gap-2 rounded border border-fuchsia-300/30 px-3 py-2 text-xs text-fuchsia-200 disabled:opacity-50"><Mic size={13} />网页录音</button>}
        {sourceAudio && <button type="button" disabled={disabled || reading || recording} onClick={() => onChange({ creation_reference_audio: undefined, reference_audio: undefined, preview_audio: undefined, prompt_filename: undefined, status: 'idle' })} className="inline-flex items-center gap-1 rounded border border-red-300/20 px-2 py-2 text-[10px] text-red-200 disabled:opacity-50"><Trash2 size={12} />移除</button>}
      </div>
      {sourceAudio && <div className="mt-3 rounded border border-cyan-300/15 bg-cyan-500/5 p-3">
        <div className="flex items-center gap-2 text-xs font-bold text-cyan-100"><FileAudio2 size={14} />{sourceAudio.filename}</div>
        <div className="mt-2 grid gap-2 text-[10px] text-gray-400 sm:grid-cols-3"><span>来源：{sourceAudio.capture_method === 'browser-recording' ? '网页录音' : '上传文件'}</span><span>参考声音：{sourceAudio.duration_seconds.toFixed(2)} 秒</span><span>安全读取上限：{safeRefAudioMaxSeconds(sourceAudio.duration_seconds, sourceAudio.ref_audio_max_seconds)} 秒</span></div>
        <audio controls src={sourceAudio.data_url} className="mt-2 h-8 w-full" />
      </div>}
      <label className="mt-3 block text-[10px] font-bold tracking-wider text-gray-500">固定音色输出语言
        <select disabled={disabled || reading || recording} value={profile.language} onChange={(event) => updateOutputLanguage(event.target.value as Qwen3TtsLanguage)} className="mt-1 w-full rounded border border-white/10 bg-black/50 px-2 py-2 text-xs text-gray-200">
          {QWEN3_TTS_LANGUAGES.map((language) => <option key={language} value={language}>{language}</option>)}
        </select>
      </label>
    </>}
    {error && <p className="mt-2 text-[10px] text-red-300">{error}</p>}
  </div>;
};
