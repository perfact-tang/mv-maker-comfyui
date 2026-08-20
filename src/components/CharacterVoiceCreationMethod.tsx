import { useRef, useState } from 'react';
import { FileAudio2, Loader2, Trash2, Upload } from 'lucide-react';
import type { Qwen3AsrLanguage, Qwen3TtsLanguage, VoiceProfile } from '../types/mv-data';
import { analyzeAudioUrl } from '../utils/audioAlignment';
import { QWEN3_ASR_LANGUAGES, safeRefAudioMaxSeconds } from '../utils/qwen3VoiceCloneWorkflow';

interface CharacterVoiceCreationMethodProps {
  profile: VoiceProfile;
  outputLanguage: Qwen3TtsLanguage;
  disabled?: boolean;
  onChange: (patch: Partial<VoiceProfile>) => void;
}

const fileToDataUrl = (file: File) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('参考声音读取失败'));
  reader.onerror = () => reject(reader.error || new Error('参考声音读取失败'));
  reader.readAsDataURL(file);
});

export const CharacterVoiceCreationMethod = ({ profile, outputLanguage, disabled = false, onChange }: CharacterVoiceCreationMethodProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [reading, setReading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const method = profile.generation_mode ?? 'voice-design';
  const sourceAudio = profile.creation_reference_audio;

  const selectFile = async (file?: File) => {
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

  return <div className="mt-3 rounded-lg border border-white/10 bg-black/25 p-3">
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="text-[10px] font-bold tracking-wider text-gray-500">固定音色创建方式
        <select disabled={disabled || reading} value={method} onChange={(event) => onChange({ generation_mode: event.target.value as VoiceProfile['generation_mode'], reference_audio: undefined, preview_audio: undefined, prompt_filename: undefined, status: 'idle' })} className="mt-1 w-full rounded border border-white/10 bg-black/50 px-2 py-2 text-xs text-gray-200">
          <option value="voice-design">文本定义（Voice Design）</option>
          <option value="voice-clone">上传参考声音（Voice Clone）</option>
        </select>
      </label>
      <label className="text-[10px] font-bold tracking-wider text-gray-500">固定音色输出语言
        <input disabled value={outputLanguage} className="mt-1 w-full cursor-not-allowed rounded border border-white/10 bg-black/20 px-2 py-2 text-xs text-gray-400" />
      </label>
    </div>

    {method === 'voice-clone' && <>
      <input ref={inputRef} type="file" accept="audio/*,.wav,.mp3,.flac,.m4a,.ogg,.aac" className="hidden" onChange={(event) => selectFile(event.target.files?.[0])} />
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button type="button" disabled={disabled || reading} onClick={() => inputRef.current?.click()} className="inline-flex items-center gap-2 rounded border border-cyan-300/30 px-3 py-2 text-xs text-cyan-200 disabled:opacity-50">
          {reading ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}{sourceAudio ? '更换参考声音' : '上传参考声音'}
        </button>
        {sourceAudio && <button type="button" disabled={disabled || reading} onClick={() => onChange({ creation_reference_audio: undefined, reference_audio: undefined, preview_audio: undefined, prompt_filename: undefined, status: 'idle' })} className="inline-flex items-center gap-1 rounded border border-red-300/20 px-2 py-2 text-[10px] text-red-200 disabled:opacity-50"><Trash2 size={12} />移除</button>}
      </div>
      {sourceAudio && <div className="mt-3 rounded border border-cyan-300/15 bg-cyan-500/5 p-3">
        <div className="flex items-center gap-2 text-xs font-bold text-cyan-100"><FileAudio2 size={14} />{sourceAudio.filename}</div>
        <div className="mt-2 grid gap-2 text-[10px] text-gray-400 sm:grid-cols-2"><span>参考声音：{sourceAudio.duration_seconds.toFixed(2)} 秒</span><span>安全读取上限：{safeRefAudioMaxSeconds(sourceAudio.duration_seconds, sourceAudio.ref_audio_max_seconds)} 秒</span></div>
        <audio controls src={sourceAudio.data_url} className="mt-2 h-8 w-full" />
      </div>}
      <label className="mt-3 block text-[10px] font-bold tracking-wider text-gray-500">参考声音输入语言（ASR）
        <select disabled={disabled || reading} value={profile.reference_language ?? 'auto'} onChange={(event) => onChange({ reference_language: event.target.value as Qwen3AsrLanguage, reference_audio: undefined, preview_audio: undefined, status: 'idle' })} className="mt-1 w-full rounded border border-white/10 bg-black/50 px-2 py-2 text-xs text-gray-200">
          {QWEN3_ASR_LANGUAGES.map((language) => <option key={language} value={language}>{language}</option>)}
        </select>
      </label>
      <p className="mt-2 text-[10px] leading-4 text-emerald-200/70">上传音频只用于创建固定音色；创建成功后的输出才会成为声音制作阶段使用的克隆参考。</p>
    </>}
    {error && <p className="mt-2 text-[10px] text-red-300">{error}</p>}
  </div>;
};
