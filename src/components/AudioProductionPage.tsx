import { useMemo, useRef, useState } from 'react';
import { AudioLines, CheckCircle2, Download, Headphones, Loader2, LockKeyhole, Music2, PackageOpen, RefreshCw, SkipBack, SkipForward, Sparkles, Upload, UserRound, WandSparkles, X } from 'lucide-react';
import { saveAs } from 'file-saver';
import JSZip from 'jszip';
import type { AceMusicLanguage, MusicGenerationMode, MusicWorkflow, MVInfo, Qwen3TtsLanguage, VoiceProfile } from '../types/mv-data';
import { generateMusicChapter, generateQwen3ShotVoice, generateQwen3Voice, makeGeneratedFixedVoiceReference, mixVoiceAndMusic, splitMusic3Chapter } from '../utils/audioProduction';
import { useGlobalSettings } from '../stores/useGlobalSettings';
import { createProjectLrc, formatLrcTimestamp, matchLrcToProject, safeLrcFilename } from '../utils/lrcExport';
import { QWEN3_TTS_LANGUAGES } from '../utils/qwen3TtsWorkflow';
import { ShotVoiceCharacterSelector } from './ShotVoiceCharacterSelector';
import { hasConfirmedFixedVoiceReference } from '../utils/voiceCloneProfile';
import { hasSpokenText } from '../utils/projectPageRouting';
import { CharacterVoiceCreationMethod } from './CharacterVoiceCreationMethod';

type VoiceBatchProgress = {
  phase: 'generating' | 'cooling';
  current: number;
  total: number;
  shotLabel: string;
  cooldownSeconds: number;
};

type VoiceBatchDialog = {
  title: string;
  message: string;
  tone: 'success' | 'error';
};

const ACE_LANGUAGES: Array<{ value: AceMusicLanguage; label: string }> = [
  { value: 'zh', label: '中文' }, { value: 'en', label: 'English' }, { value: 'ja', label: '日本語' },
  { value: 'ko', label: '한국어' }, { value: 'es', label: 'Español' }, { value: 'de', label: 'Deutsch' },
  { value: 'fr', label: 'Français' }, { value: 'pt', label: 'Português' }, { value: 'ru', label: 'Русский' },
  { value: 'it', label: 'Italiano' }, { value: 'ar', label: 'العربية' }, { value: 'vi', label: 'Tiếng Việt' },
  { value: 'nl', label: 'Nederlands' }, { value: 'pl', label: 'Polski' }, { value: 'tr', label: 'Türkçe' },
  { value: 'cs', label: 'Čeština' }, { value: 'fa', label: 'فارسی' }, { value: 'id', label: 'Bahasa Indonesia' },
  { value: 'uk', label: 'Українська' }, { value: 'hu', label: 'Magyar' }, { value: 'sv', label: 'Svenska' },
  { value: 'ro', label: 'Română' }, { value: 'el', label: 'Ελληνικά' },
];

const KEY_SCALES = ['C major', 'C minor', 'C# major', 'C# minor', 'Db major', 'Db minor', 'D major', 'D minor', 'D# major', 'D# minor', 'Eb major', 'Eb minor', 'E major', 'E minor', 'F major', 'F minor', 'F# major', 'F# minor', 'Gb major', 'Gb minor', 'G major', 'G minor', 'G# major', 'G# minor', 'Ab major', 'Ab minor', 'A major', 'A minor', 'A# major', 'A# minor', 'Bb major', 'Bb minor', 'B major', 'B minor'];
const VOICE_BATCH_COOLDOWN_SECONDS = 5;

export const AudioProductionPage = () => {
  const { mvData, updateAudioChapter, updateNarratorVoiceProfile, updateMVInfoAsset, updateMVInfoAudioTiming, updateMVInfoAudioText, updateMVInfoAudioTexts, setGlobalTtsLanguage, setShotTtsLanguage, setShotVoiceId, lockAudioTimeline, upgradeCurrentProjectAudioPlan } = useGlobalSettings();
  const [panel, setPanel] = useState<'voice' | 'music'>('voice');
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [voiceBatchProgress, setVoiceBatchProgress] = useState<VoiceBatchProgress | null>(null);
  const [voiceBatchDialog, setVoiceBatchDialog] = useState<VoiceBatchDialog | null>(null);
  const [lrcPreview, setLrcPreview] = useState<{ filename: string; result: ReturnType<typeof matchLrcToProject> } | null>(null);
  const [playlistOpen, setPlaylistOpen] = useState(false);
  const [playlistIndex, setPlaylistIndex] = useState(0);
  const lrcInputRef = useRef<HTMLInputElement>(null);
  const plan = mvData?.director_plan?.audio_plan;
  const orderedShots = useMemo(() => {
    let shotNumber = 0;
    return mvData
      ? [...mvData.storyboard]
        .sort((left, right) => Number(left.segment_id) - Number(right.segment_id))
        .flatMap((segment) => segment.mvinfo.map((shot, index) => ({
          shot,
          segmentId: segment.segment_id,
          infoIndex: index,
          shotNumber: ++shotNumber,
        })))
      : [];
  }, [mvData]);
  const voicePlaylist = useMemo(() => orderedShots.filter((entry) => hasSpokenText(entry.shot)).map((entry) => ({
    ...entry,
    label: entry.shot.shot_id || `镜头 ${entry.shotNumber}`,
    url: entry.shot.generated_assets?.voice_audio,
    text: entry.shot.audio_plan?.audio_text || entry.shot.lyrics,
  })), [orderedShots]);

  if (!mvData || !plan) {
    return <div className="glass-card rounded-xl border border-amber-300/20 p-6 text-sm text-amber-200"><p>当前项目没有新版声音计划。已有导演计划的旧项目可以直接升级为“千问 3 TTS 配音 + Music 3 配乐”。</p>{mvData?.director_plan && <button type="button" onClick={upgradeCurrentProjectAudioPlan} className="mt-4 rounded bg-amber-300 px-4 py-2 font-bold text-black">升级声音计划</button>}</div>;
  }
  if (plan.mode === 'disabled') {
    return <div className="glass-card rounded-xl border border-cyan-300/20 p-8"><h2 className="text-xl font-bold text-white">声音制作</h2><p className="mt-3 text-sm text-gray-400">当前项目为 MV，沿用主音乐时间线，不调用千问 3 TTS 或 Music 3 配乐流程。</p></div>;
  }

  const linkedNarratorCharacter = plan.narrator_voice?.linked_character_voice_id
    ? mvData.characters.find((character) => character.voice_profile?.voice_id === plan.narrator_voice?.linked_character_voice_id)
    : undefined;
  const narratorSourceProfile = plan.narrator_voice?.linked_character_voice_id
    ? linkedNarratorCharacter?.voice_profile
    : plan.narrator_voice;

  const resolveVoice = (shot: MVInfo): VoiceProfile | undefined => {
    const voiceId = shot.audio_plan?.speakers[0]?.voice_id;
    return mvData.characters.find((character) => character.voice_profile?.voice_id === voiceId)?.voice_profile
      || (voiceId === plan.narrator_voice?.voice_id ? narratorSourceProfile : undefined);
  };

  const generateVoice = async (entry: typeof orderedShots[number]) => {
    const { shot, segmentId, infoIndex } = entry;
    const profile = resolveVoice(shot);
    if (!profile) throw new Error(`${shot.shot_id || '镜头'} 没有匹配到人物或旁白音色`);
    if (!hasConfirmedFixedVoiceReference(profile)) throw new Error(`请先为 ${profile.voice_id} 创建并确认固定音色，再在声音制作中执行克隆`);
    setBusy(`voice:${shot.shot_id}`);
    const language = shot.audio_plan?.tts_language ?? plan.tts_language ?? profile.language;
    const chunk = await generateQwen3ShotVoice(mvData.proposal_id, shot, profile, language, true);
    const fittedDuration = chunk.durationSeconds as 5 | 10 | 15;
    const durationChanged = fittedDuration !== (shot.audio_plan?.duration_seconds ?? shot.generation_plan?.duration_seconds);
    updateMVInfoAudioTiming(segmentId, infoIndex, fittedDuration, chunk.actualDurationSeconds, chunk.playbackRate);
    updateMVInfoAsset(segmentId, infoIndex, 'voice_audio', chunk.url);
    updateMVInfoAsset(segmentId, infoIndex, 'voice_audio_filename', chunk.filename);
    const drive = await mixVoiceAndMusic(mvData.proposal_id, shot.shot_id || chunk.shotId, chunk.url, durationChanged ? undefined : shot.generated_assets?.music_audio);
    updateMVInfoAsset(segmentId, infoIndex, 'drive_audio', drive.url);
    updateMVInfoAsset(segmentId, infoIndex, 'drive_audio_filename', drive.filename);
  };

  const generateAllVoices = async () => {
    setMessage(null);
    setVoiceBatchDialog(null);
    const pendingEntries = orderedShots.filter((entry) => hasSpokenText(entry.shot) && !entry.shot.generated_assets?.voice_audio);
    if (pendingEntries.length === 0) {
      setMessage('没有待生成的配音；所有含对白的镜头都已经生成。');
      return;
    }

    let succeeded = 0;
    try {
      for (let index = 0; index < pendingEntries.length; index += 1) {
        const entry = pendingEntries[index];
        const shotLabel = entry.shot.shot_id || `镜头 ${entry.shotNumber}`;
        setVoiceBatchProgress({ phase: 'generating', current: index + 1, total: pendingEntries.length, shotLabel, cooldownSeconds: 0 });
        try {
          await generateVoice(entry);
          succeeded += 1;
        } catch (error) {
          const reason = error instanceof Error ? error.message : String(error);
          const failureMessage = `${shotLabel} 生成失败：${reason}\n\n队列已停止，没有跳过当前镜头。请处理后再次点击“生成全部配音”，系统会从这个未完成镜头继续。`;
          setMessage(failureMessage);
          setVoiceBatchDialog({ title: '批量配音已停止', message: failureMessage, tone: 'error' });
          return;
        }

        if (index < pendingEntries.length - 1) {
          setBusy('voice:cooldown');
          for (let seconds = VOICE_BATCH_COOLDOWN_SECONDS; seconds > 0; seconds -= 1) {
            setVoiceBatchProgress({ phase: 'cooling', current: index + 1, total: pendingEntries.length, shotLabel, cooldownSeconds: seconds });
            await new Promise((resolve) => window.setTimeout(resolve, 1000));
          }
        }
      }
      const successMessage = `全部待生成配音已按顺序完成，共成功 ${succeeded} 个。已有 Music 3 配乐的镜头已自动重新混合。`;
      setMessage(successMessage);
      setVoiceBatchDialog({ title: '批量配音完成', message: successMessage, tone: 'success' });
    } finally {
      setBusy(null);
      setVoiceBatchProgress(null);
    }
  };

  const generateNarratorPreview = async () => {
    if (!plan.narrator_voice) return;
    if (plan.narrator_voice.linked_character_voice_id) {
      setMessage('当前旁白正在使用人物音色；如需单独生成旁白音色，请先将音色来源切换为“独立旁白”。');
      return;
    }
    const profile = plan.narrator_voice;
    const method = profile.generation_mode ?? 'voice-design';
    if (!profile.reference_text.trim() || (method === 'voice-design' && !profile.instruct.trim())) {
      setMessage(method === 'voice-design' ? '请先填写旁白音色定义和预览文本。' : '请先填写旁白预览文本。');
      return;
    }
    if (method === 'voice-clone' && !profile.creation_reference_audio) {
      setMessage('请先上传或录制用于创建旁白固定音色的参考声音。');
      return;
    }
    setBusy('narrator-preview');
    setMessage(null);
    updateNarratorVoiceProfile({ status: 'generating', error: undefined });
    try {
      const generationProfile = method === 'voice-clone'
        ? { ...profile, seed: undefined, generation_mode: 'voice-clone' as const, reference_audio: profile.creation_reference_audio }
        : { ...profile, seed: undefined, generation_mode: 'voice-design' as const, reference_audio: undefined };
      const result = await generateQwen3Voice(generationProfile, profile.reference_text, true, profile.language);
      const referenceAudio = await makeGeneratedFixedVoiceReference(result.audioUrl, profile.voice_id);
      updateNarratorVoiceProfile({
        generation_mode: method,
        preview_audio: result.audioUrl,
        reference_audio: referenceAudio,
        seed: result.seed,
        prompt_filename: result.promptFilename,
        status: 'ready',
      });
      setMessage(`旁白固定音色已通过 ${method === 'voice-clone' ? 'Voice Clone' : 'Voice Design'} 创建；选择旁白镜头时将以该音频运行 Voice Clone。`);
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      updateNarratorVoiceProfile({ status: 'failed', error: detail });
      setMessage(detail);
    } finally {
      setBusy(null);
    }
  };

  const generateChapter = async (chapterId: string, replaceSeed = false) => {
    const chapter = useGlobalSettings.getState().mvData?.director_plan?.audio_plan?.chapters.find((item) => item.chapter_id === chapterId);
    if (!chapter) return;
    setBusy(`music:${chapterId}`);
    updateAudioChapter(chapterId, { status: 'generating', error: undefined });
    try {
      const generated = await generateMusicChapter({ ...chapter, music_workflow: chapter.music_workflow ?? plan.music_workflow ?? 'MiniMax Music 3' }, replaceSeed);
      updateAudioChapter(chapterId, { generated_audio: generated.audioUrl, actual_duration_seconds: generated.actualDurationSeconds, seed: generated.seed, status: 'ready' });
      setMessage(`“${chapter.title}”已通过 ${chapter.music_workflow ?? 'MiniMax Music 3'} 生成。`);
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      updateAudioChapter(chapterId, { status: 'failed', error: detail });
      setMessage(`${chapter.music_workflow ?? 'MiniMax Music 3'} 配乐失败：${detail}`);
    } finally {
      setBusy(null);
    }
  };

  const generateAllMusic = async () => {
    for (const chapter of plan.chapters) if (!chapter.generated_audio || chapter.status !== 'ready') await generateChapter(chapter.chapter_id);
  };

  const applyMusic = async () => {
    setBusy('mix');
    setMessage(null);
    try {
      const latest = useGlobalSettings.getState().mvData;
      const latestPlan = latest?.director_plan?.audio_plan;
      if (!latest || !latestPlan) throw new Error('声音计划不存在');
      const allMusicChunks = [];
      for (const chapter of latestPlan.chapters) {
        if (!chapter.generated_audio || chapter.status !== 'ready') throw new Error(`请先生成配乐章节“${chapter.title}”`);
        const shots = latest.storyboard.flatMap((segment) => segment.mvinfo).filter((shot) => shot.audio_plan?.chapter_id === chapter.chapter_id);
        allMusicChunks.push(...await splitMusic3Chapter(latest.proposal_id, chapter, shots));
      }
      const byShotId = new Map(allMusicChunks.map((chunk) => [chunk.shotId, chunk]));
      for (const entry of orderedShots) {
        const shotId = entry.shot.shot_id || '';
        const music = byShotId.get(shotId);
        if (!music) continue;
        updateMVInfoAsset(entry.segmentId, entry.infoIndex, 'music_audio', music.url);
        updateMVInfoAsset(entry.segmentId, entry.infoIndex, 'music_audio_filename', music.filename);
        const voice = useGlobalSettings.getState().mvData?.storyboard.find((segment) => segment.segment_id === entry.segmentId)?.mvinfo[entry.infoIndex]?.generated_assets?.voice_audio;
        const drive = voice ? await mixVoiceAndMusic(latest.proposal_id, shotId, voice, music.url) : music;
        updateMVInfoAsset(entry.segmentId, entry.infoIndex, 'drive_audio', drive.url);
        updateMVInfoAsset(entry.segmentId, entry.infoIndex, 'drive_audio_filename', drive.filename);
      }
      setMessage('配乐已按镜头切分，并与千问 3 TTS 配音完成混合。');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(null);
    }
  };

  const lock = () => {
    const currentShots = useGlobalSettings.getState().mvData?.storyboard.flatMap((segment) => segment.mvinfo) ?? [];
    const missingVoice = currentShots.find((shot) => hasSpokenText(shot) && !shot.generated_assets?.voice_audio);
    const missingDrive = currentShots.find((shot) => !shot.generated_assets?.drive_audio);
    if (missingVoice) return setMessage(`${missingVoice.shot_id || '某镜头'} 尚未生成千问 3 TTS 配音`);
    if (missingDrive) return setMessage(`${missingDrive.shot_id || '某镜头'} 尚未形成最终 Drive Audio；无对白镜头请先应用 Music 3 配乐`);
    lockAudioTimeline();
    setMessage('声音时间线已锁定，可以生成 H3 视频。');
  };

  const downloadLrc = () => {
    const content = `\uFEFF${createProjectLrc(mvData)}`;
    saveAs(new Blob([content], { type: 'text/plain;charset=utf-8' }), safeLrcFilename(mvData));
    setMessage('LRC 字幕已按当前声音时间线导出。修改后的配音文本和镜头时长已经写入字幕。');
  };

  const importLrc = async (file?: File) => {
    if (!file) return;
    try {
      const result = matchLrcToProject(mvData, await file.text());
      if (!result.importedLineCount) throw new Error('没有识别到带时间戳的字幕行，请保留 [mm:ss.xx] 时间标签');
      if (!result.assignments.length) throw new Error('LRC 时间戳和当前声音时间线无法匹配');
      setLrcPreview({ filename: file.name, result });
    } catch (error) {
      setMessage(`LRC 导入失败：${error instanceof Error ? error.message : String(error)}`);
    } finally {
      if (lrcInputRef.current) lrcInputRef.current.value = '';
    }
  };

  const applyLrcImport = () => {
    if (!lrcPreview) return;
    updateMVInfoAudioTexts(lrcPreview.result.assignments.map((assignment) => ({ segmentId: assignment.segmentId, infoIndex: assignment.infoIndex, text: assignment.importedText })));
    const count = lrcPreview.result.assignments.length;
    setLrcPreview(null);
    setMessage(`已导入 ${count} 段多语言配音文本。旧配音和 Drive Audio 已失效，Music 3 配乐已保留；现在可以重新生成全部配音。`);
  };

  const openVoicePlaylist = () => {
    const firstPlayable = voicePlaylist.findIndex((entry) => Boolean(entry.url));
    if (firstPlayable < 0) return setMessage('当前还没有可试听的千问 TTS 配音，请先生成配音。');
    setPlaylistIndex(firstPlayable);
    setPlaylistOpen(true);
  };

  const movePlaylist = (direction: 1 | -1) => {
    for (let index = playlistIndex + direction; index >= 0 && index < voicePlaylist.length; index += direction) {
      if (voicePlaylist[index].url) {
        setPlaylistIndex(index);
        return;
      }
    }
  };

  const downloadAllVoices = async () => {
    const playable = voicePlaylist.filter((entry) => entry.url);
    if (!playable.length) return setMessage('当前没有可下载的千问 TTS 配音。');
    setBusy('download-voices');
    setMessage(null);
    try {
      const zip = new JSZip();
      const folder = zip.folder('voices');
      const manifest: string[] = [];
      for (let index = 0; index < playable.length; index += 1) {
        const entry = playable[index];
        const response = await fetch(entry.url!);
        if (!response.ok) throw new Error(`${entry.label} 下载失败：HTTP ${response.status}`);
        const sourceName = entry.shot.generated_assets?.voice_audio_filename || entry.url!.split('/').pop() || 'voice.mp3';
        const extension = sourceName.match(/\.[a-zA-Z0-9]+$/)?.[0] || '.mp3';
        const safeLabel = entry.label.replace(/[^a-zA-Z0-9_-]+/g, '_');
        const filename = `${String(index + 1).padStart(3, '0')}_${safeLabel}_voice${extension}`;
        folder?.file(filename, await response.blob());
        manifest.push(`${entry.label}\t${filename}\t${entry.text.replace(/\s+/g, ' ').trim()}`);
      }
      zip.file(safeLrcFilename(mvData), `\uFEFF${createProjectLrc(mvData)}`);
      zip.file('voice_manifest.txt', `\uFEFF镜头\t文件\t配音文本\n${manifest.join('\n')}\n`);
      const content = await zip.generateAsync({ type: 'blob' });
      const missingCount = voicePlaylist.length - playable.length;
      saveAs(content, safeLrcFilename(mvData).replace(/_subtitles\.lrc$/i, '_voices.zip'));
      setMessage(`已打包下载 ${playable.length} 段纯配音、LRC 字幕和清单。${missingCount ? `另有 ${missingCount} 段尚未生成，未加入压缩包。` : ''}`);
    } catch (error) {
      setMessage(`下载所有配音失败：${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setBusy(null);
    }
  };

  const downloadAllMusic = async () => {
    const chapterTracks = plan.chapters
      .map((chapter, index) => ({ chapter, index }))
      .filter(({ chapter }) => Boolean(chapter.generated_audio));
    const shotTracks = orderedShots.filter((entry) => Boolean(entry.shot.generated_assets?.music_audio));
    if (!chapterTracks.length && !shotTracks.length) return setMessage('当前没有可下载的配乐，请先生成配乐。');

    setBusy('download-music');
    setMessage(null);
    try {
      const zip = new JSZip();
      const chapterFolder = zip.folder('music/chapters');
      const shotFolder = zip.folder('music/shots');
      const manifest: string[] = [];

      for (const { chapter, index } of chapterTracks) {
        const response = await fetch(chapter.generated_audio!);
        if (!response.ok) throw new Error(`配乐章节“${chapter.title}”下载失败：HTTP ${response.status}`);
        const sourceName = chapter.generated_audio!.split('/').pop() || 'music.wav';
        const extension = sourceName.match(/\.[a-zA-Z0-9]+(?:\?|$)/)?.[0].replace('?', '') || '.wav';
        const safeChapterId = chapter.chapter_id.replace(/[^a-zA-Z0-9_-]+/g, '_');
        const filename = `${String(index + 1).padStart(3, '0')}_${safeChapterId}_music${extension}`;
        chapterFolder?.file(filename, await response.blob());
        manifest.push(`完整章节\t${chapter.chapter_id}\t${chapter.title}\tchapters/${filename}`);
      }

      for (let index = 0; index < shotTracks.length; index += 1) {
        const entry = shotTracks[index];
        const url = entry.shot.generated_assets!.music_audio!;
        const response = await fetch(url);
        const label = entry.shot.shot_id || `镜头 ${entry.shotNumber}`;
        if (!response.ok) throw new Error(`${label} 配乐下载失败：HTTP ${response.status}`);
        const sourceName = entry.shot.generated_assets?.music_audio_filename || url.split('/').pop() || 'music.wav';
        const extension = sourceName.match(/\.[a-zA-Z0-9]+(?:\?|$)/)?.[0].replace('?', '') || '.wav';
        const safeLabel = label.replace(/[^a-zA-Z0-9_-]+/g, '_');
        const filename = `${String(index + 1).padStart(3, '0')}_${safeLabel}_music${extension}`;
        shotFolder?.file(filename, await response.blob());
        manifest.push(`镜头片段\t${label}\t${entry.shot.audio_plan?.chapter_id || ''}\tshots/${filename}`);
      }

      zip.file('music_manifest.txt', `\uFEFF类型\t编号\t标题/章节\t文件\n${manifest.join('\n')}\n`);
      const content = await zip.generateAsync({ type: 'blob' });
      saveAs(content, safeLrcFilename(mvData).replace(/_subtitles\.lrc$/i, '_music.zip'));
      setMessage(`已打包下载 ${chapterTracks.length} 个完整配乐章节和 ${shotTracks.length} 个镜头配乐片段。`);
    } catch (error) {
      setMessage(`下载所有配乐失败：${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setBusy(null);
    }
  };

  return <div className="space-y-6">
    {voiceBatchProgress && <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/90 p-4 backdrop-blur-md" aria-live="assertive" aria-busy="true"><div className="w-full max-w-md rounded-2xl border border-cyan-300/30 bg-[#111827] p-8 text-center shadow-[0_0_50px_rgba(34,211,238,0.18)]"><div className="relative mx-auto flex h-24 w-24 items-center justify-center"><div className="absolute inset-0 animate-ping rounded-full border border-cyan-300/20" /><div className="absolute inset-2 animate-spin rounded-full border-4 border-cyan-300/15 border-t-cyan-300" /><AudioLines className="text-cyan-200" size={34} /></div><h3 className="mt-6 text-xl font-bold text-white">{voiceBatchProgress.phase === 'generating' ? '千问 3 TTS 配音生成中' : '生成成功，正在冷却'}</h3><p className="mt-2 text-sm text-cyan-200">{voiceBatchProgress.shotLabel} · 第 {voiceBatchProgress.current}/{voiceBatchProgress.total} 个</p>{voiceBatchProgress.phase === 'cooling' ? <><div className="mx-auto mt-5 flex h-16 w-16 items-center justify-center rounded-full border border-fuchsia-300/30 bg-fuchsia-500/10 text-2xl font-bold text-fuchsia-200">{voiceBatchProgress.cooldownSeconds}</div><p className="mt-3 text-xs text-gray-400">等待 ComfyUI 释放资源，倒计时结束后自动生成下一个镜头。</p></> : <p className="mt-5 text-xs text-gray-400">请不要关闭页面或重复点击，当前操作完成前界面已暂时锁定。</p>}<div className="mt-6 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full bg-gradient-to-r from-cyan-300 to-fuchsia-400 transition-all duration-500" style={{ width: `${((voiceBatchProgress.current - (voiceBatchProgress.phase === 'generating' ? 1 : 0)) / voiceBatchProgress.total) * 100}%` }} /></div></div></div>}
    {voiceBatchDialog && <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"><div className={`w-full max-w-md rounded-xl border p-6 shadow-2xl ${voiceBatchDialog.tone === 'success' ? 'border-emerald-300/30 bg-emerald-950/90' : 'border-red-300/30 bg-red-950/90'}`}><h3 className="text-lg font-bold text-white">{voiceBatchDialog.title}</h3><p className="mt-3 whitespace-pre-line text-sm leading-6 text-gray-200">{voiceBatchDialog.message}</p><button type="button" onClick={() => setVoiceBatchDialog(null)} className="mt-6 w-full rounded bg-white/10 px-4 py-2 text-sm font-bold text-white hover:bg-white/20">知道了</button></div></div>}
    {lrcPreview && <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/85 p-4 backdrop-blur-md"><div className="flex max-h-[88vh] w-full max-w-4xl flex-col rounded-2xl border border-emerald-300/30 bg-[#101820] shadow-[0_0_50px_rgba(52,211,153,0.15)]"><div className="flex items-start justify-between border-b border-white/10 p-5"><div><h3 className="text-xl font-bold text-white">确认导入多语言 LRC</h3><p className="mt-1 text-xs text-gray-400">{lrcPreview.filename} · 匹配 {lrcPreview.result.assignments.length}/{lrcPreview.result.cueCount} 个配音镜头</p></div><button type="button" onClick={() => setLrcPreview(null)} className="rounded p-2 text-gray-400 hover:bg-white/10 hover:text-white"><X size={18} /></button></div>{(lrcPreview.result.unmatchedCueCount > 0 || lrcPreview.result.unmatchedLineCount > 0) && <p className="mx-5 mt-4 rounded border border-amber-300/25 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">有 {lrcPreview.result.unmatchedCueCount} 个镜头和 {lrcPreview.result.unmatchedLineCount} 条导入字幕未匹配；它们不会被覆盖。请优先保留导出文件中的时间戳。</p>}<div className="min-h-0 flex-1 overflow-y-auto p-5"><div className="space-y-3">{lrcPreview.result.assignments.map((assignment) => <article key={`${assignment.segmentId}:${assignment.infoIndex}`} className="rounded-lg border border-white/10 bg-black/25 p-3"><div className="flex flex-wrap items-center gap-2 text-[10px]"><span className="font-bold text-cyan-300">{assignment.shotId || `分段 ${assignment.segmentId} / 镜头 ${assignment.infoIndex + 1}`}</span><span className="text-gray-500">[{formatLrcTimestamp(assignment.startSeconds)}]</span><span className={assignment.matchMode === 'timestamp' ? 'text-emerald-300' : 'text-amber-300'}>{assignment.matchMode === 'timestamp' ? '时间戳匹配' : '顺序兜底'}</span></div><div className="mt-2 grid gap-2 md:grid-cols-2"><div className="rounded bg-white/5 p-2"><p className="mb-1 text-[9px] text-gray-500">当前文本</p><p className="text-xs leading-5 text-gray-400">{assignment.text}</p></div><div className="rounded bg-emerald-500/5 p-2"><p className="mb-1 text-[9px] text-emerald-400/70">导入文本</p><p className="text-xs leading-5 text-emerald-100">{assignment.importedText}</p></div></div></article>)}</div></div><div className="flex gap-3 border-t border-white/10 p-5"><button type="button" onClick={() => setLrcPreview(null)} className="flex-1 rounded bg-white/5 px-4 py-2 text-sm text-gray-300 hover:bg-white/10">取消</button><button type="button" onClick={applyLrcImport} className="flex-1 rounded bg-emerald-400 px-4 py-2 text-sm font-bold text-black hover:bg-emerald-300">应用 {lrcPreview.result.assignments.length} 段翻译文本</button></div></div></div>}
    {playlistOpen && <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/85 p-4 backdrop-blur-md"><div className="flex max-h-[88vh] w-full max-w-3xl flex-col rounded-2xl border border-cyan-300/30 bg-[#101820] shadow-[0_0_50px_rgba(34,211,238,0.15)]"><div className="flex items-start justify-between border-b border-white/10 p-5"><div><h3 className="flex items-center gap-2 text-xl font-bold text-white"><Headphones className="text-cyan-300" />聆听全部配音</h3><p className="mt-1 text-xs text-gray-400">按镜头顺序自动连播纯配音 · 已生成 {voicePlaylist.filter((entry) => entry.url).length}/{voicePlaylist.length}</p></div><button type="button" onClick={() => setPlaylistOpen(false)} className="rounded p-2 text-gray-400 hover:bg-white/10 hover:text-white"><X size={18} /></button></div>{voicePlaylist[playlistIndex]?.url && <div className="border-b border-white/10 bg-cyan-500/5 p-5"><p className="text-sm font-bold text-cyan-200">正在播放：{voicePlaylist[playlistIndex].label}</p><p className="mt-2 text-xs leading-5 text-gray-300">{voicePlaylist[playlistIndex].text}</p><audio key={voicePlaylist[playlistIndex].url} autoPlay controls src={voicePlaylist[playlistIndex].url} onEnded={() => movePlaylist(1)} className="mt-4 h-9 w-full" /><div className="mt-3 flex justify-center gap-3"><button type="button" onClick={() => movePlaylist(-1)} className="rounded border border-white/10 p-2 text-gray-300 hover:border-cyan-300/30 hover:text-cyan-200"><SkipBack size={16} /></button><button type="button" onClick={() => movePlaylist(1)} className="rounded border border-white/10 p-2 text-gray-300 hover:border-cyan-300/30 hover:text-cyan-200"><SkipForward size={16} /></button></div></div>}<div className="min-h-0 flex-1 overflow-y-auto p-4"><div className="space-y-2">{voicePlaylist.map((entry, index) => <button type="button" key={`${entry.segmentId}:${entry.infoIndex}`} disabled={!entry.url} onClick={() => setPlaylistIndex(index)} className={`w-full rounded-lg border p-3 text-left transition-colors ${index === playlistIndex ? 'border-cyan-300/40 bg-cyan-500/10' : 'border-white/10 bg-black/20 hover:bg-white/5'} disabled:cursor-not-allowed disabled:opacity-40`}><div className="flex items-center justify-between gap-3"><span className="text-xs font-bold text-white">{String(index + 1).padStart(2, '0')} · {entry.label}</span><span className={`text-[9px] ${entry.url ? 'text-emerald-300' : 'text-amber-300'}`}>{entry.url ? '可播放' : '待生成'}</span></div><p className="mt-1 line-clamp-2 text-[10px] leading-4 text-gray-400">{entry.text}</p></button>)}</div></div></div></div>}
    <section className="glass-card rounded-xl border border-emerald-300/20 bg-emerald-500/5 p-5">
      <div><div><div className="flex items-center gap-2"><AudioLines className="text-emerald-300" /><h2 className="text-2xl font-bold text-white">声音制作</h2></div><p className="mt-2 text-sm text-gray-400">千问 3 TTS 负责配音和音色一致性；MiniMax Music 3 只负责纯器乐背景配乐。</p><p className="mt-1 text-xs text-emerald-200/70">最终 Drive Audio：配音 100% + 配乐 18% · 状态 {plan.alignment_status}</p><label className="mt-4 flex max-w-md flex-col gap-1.5 rounded-lg border border-cyan-300/20 bg-black/25 p-3 text-xs text-gray-300"><span className="font-bold text-cyan-200">全局 TTS 生成语言</span><select disabled={Boolean(busy)} value={plan.tts_language ?? 'Auto'} onChange={(event) => setGlobalTtsLanguage(event.target.value as Qwen3TtsLanguage)} className="rounded border border-cyan-300/25 bg-black/60 px-3 py-2 text-sm text-cyan-100 outline-none focus:border-cyan-300/60">{QWEN3_TTS_LANGUAGES.map((language) => <option key={language} value={language}>{language}</option>)}</select><span className="text-[10px] leading-4 text-gray-500">默认应用到旁白、人物音色预览和所有未单独设置语言的镜头。</span></label></div><div className="mt-5 grid w-full grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6"><input ref={lrcInputRef} type="file" accept=".lrc,text/plain" className="hidden" onChange={(event) => importLrc(event.target.files?.[0])} /><button type="button" disabled={Boolean(busy)} onClick={downloadLrc} className="flex min-h-10 items-center justify-center gap-2 rounded border border-emerald-300/40 bg-emerald-500/10 px-3 py-2 text-center text-xs font-bold text-emerald-200 disabled:opacity-50"><Download size={14} className="shrink-0" />导出 LRC</button><button type="button" disabled={Boolean(busy)} onClick={() => lrcInputRef.current?.click()} className="flex min-h-10 items-center justify-center gap-2 rounded border border-emerald-300/40 bg-emerald-500/10 px-3 py-2 text-center text-xs font-bold text-emerald-200 disabled:opacity-50"><Upload size={14} className="shrink-0" />导入翻译 LRC</button><button type="button" disabled={Boolean(busy)} onClick={openVoicePlaylist} className="flex min-h-10 items-center justify-center gap-2 rounded border border-cyan-300/40 bg-cyan-500/10 px-3 py-2 text-center text-xs font-bold text-cyan-200 disabled:opacity-50"><Headphones size={14} className="shrink-0" />聆听全部配音</button><button type="button" disabled={Boolean(busy)} onClick={downloadAllVoices} className="flex min-h-10 items-center justify-center gap-2 rounded border border-fuchsia-300/40 bg-fuchsia-500/10 px-3 py-2 text-center text-xs font-bold text-fuchsia-200 disabled:opacity-50">{busy === 'download-voices' ? <Loader2 size={14} className="shrink-0 animate-spin" /> : <PackageOpen size={14} className="shrink-0" />}下载所有配音</button><button type="button" disabled={Boolean(busy)} onClick={downloadAllMusic} className="flex min-h-10 items-center justify-center gap-2 rounded border border-fuchsia-300/40 bg-fuchsia-500/10 px-3 py-2 text-center text-xs font-bold text-fuchsia-200 disabled:opacity-50">{busy === 'download-music' ? <Loader2 size={14} className="shrink-0 animate-spin" /> : <Music2 size={14} className="shrink-0" />}下载所有配乐</button><button type="button" disabled={Boolean(busy)} onClick={lock} className="flex min-h-10 items-center justify-center gap-2 rounded border border-cyan-300/40 bg-cyan-500/10 px-3 py-2 text-center text-xs font-bold text-cyan-200 disabled:opacity-50"><LockKeyhole size={14} className="shrink-0" />锁定声音时间线</button></div></div>
      <div className="mt-5 grid grid-cols-2 gap-2 rounded-lg bg-black/30 p-1"><button type="button" onClick={() => setPanel('voice')} className={`flex items-center justify-center gap-2 rounded px-4 py-2 text-sm font-bold ${panel === 'voice' ? 'bg-cyan-400 text-black' : 'text-gray-400'}`}><UserRound size={15} />千问 3 TTS · 配音</button><button type="button" onClick={() => setPanel('music')} className={`flex items-center justify-center gap-2 rounded px-4 py-2 text-sm font-bold ${panel === 'music' ? 'bg-fuchsia-400 text-black' : 'text-gray-400'}`}><Music2 size={15} />Music 3 · 配乐</button></div>
      {message && <p className="mt-4 rounded border border-white/10 bg-black/30 px-3 py-2 text-xs text-gray-200">{message}</p>}
    </section>

    {panel === 'voice' ? <>
      {plan.narrator_voice && <section className="glass-card rounded-xl border border-cyan-300/15 p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div><h3 className="font-bold text-white">旁白固定音色</h3><p className="text-xs text-gray-500">{plan.narrator_voice.voice_id}</p></div>
          <div className="flex gap-2">{!plan.narrator_voice.linked_character_voice_id && <button type="button" disabled={Boolean(busy)} onClick={generateNarratorPreview} className="inline-flex items-center gap-1.5 rounded border border-cyan-300/30 px-3 py-2 text-xs text-cyan-200 disabled:opacity-50">{busy === 'narrator-preview' && <Loader2 size={13} className="animate-spin" />}生成旁白音色</button>}<button type="button" disabled={Boolean(busy)} onClick={generateAllVoices} className="flex items-center gap-2 rounded bg-cyan-400 px-4 py-2 text-sm font-bold text-black disabled:cursor-wait disabled:opacity-50">{busy?.startsWith('voice:') ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}{voiceBatchProgress ? `生成配音 ${voiceBatchProgress.current}/${voiceBatchProgress.total}` : '生成全部配音'}</button></div>
        </div>
        <label className="block text-xs font-bold text-cyan-100">旁白音色来源<select disabled={Boolean(busy)} value={plan.narrator_voice.linked_character_voice_id ?? plan.narrator_voice.voice_id} onChange={(event) => updateNarratorVoiceProfile({ linked_character_voice_id: event.target.value === plan.narrator_voice!.voice_id ? undefined : event.target.value })} className="mt-2 w-full rounded border border-cyan-300/25 bg-black/50 px-3 py-2.5 text-xs text-gray-200"><option value={plan.narrator_voice.voice_id}>独立旁白音色</option>{mvData.characters.filter((character) => character.voice_profile).map((character) => <option key={character.voice_profile!.voice_id} value={character.voice_profile!.voice_id}>{character.name} · {hasConfirmedFixedVoiceReference(character.voice_profile) ? '固定音色已创建' : '固定音色未创建'}</option>)}</select></label>
        {plan.narrator_voice.linked_character_voice_id ? <div className="mt-4 flex gap-4 rounded-xl border border-cyan-300/20 bg-cyan-500/5 p-4">{linkedNarratorCharacter?.generated_assets?.image ? <img src={linkedNarratorCharacter.generated_assets.image} alt={linkedNarratorCharacter.name} className="h-24 w-36 rounded-lg object-cover" /> : <div className="flex h-24 w-36 items-center justify-center rounded-lg bg-black/40"><UserRound size={30} className="text-cyan-200/60" /></div>}<div className="min-w-0 flex-1"><p className="font-bold text-white">使用人物音色：{linkedNarratorCharacter?.name || '未找到人物'}</p><p className="mt-1 font-mono text-[10px] text-cyan-300">{narratorSourceProfile?.voice_id || plan.narrator_voice.linked_character_voice_id}</p><p className={`mt-2 text-xs ${hasConfirmedFixedVoiceReference(narratorSourceProfile) ? 'text-emerald-300' : 'text-amber-300'}`}>{hasConfirmedFixedVoiceReference(narratorSourceProfile) ? '固定音色已创建，可以生成旁白配音。' : '该人物尚未创建固定音色，请先到人物展示完成创建。'}</p>{narratorSourceProfile?.preview_audio && <audio controls src={narratorSourceProfile.preview_audio} className="mt-3 h-8 w-full" />}</div></div> : <><CharacterVoiceCreationMethod profile={plan.narrator_voice} disabled={Boolean(busy)} onChange={updateNarratorVoiceProfile} />{(plan.narrator_voice.generation_mode ?? 'voice-design') === 'voice-design' && <label className="mt-3 block text-xs text-gray-400">音色定义 instruct<textarea value={plan.narrator_voice.instruct} onChange={(event) => updateNarratorVoiceProfile({ instruct: event.target.value, status: 'idle' })} className="mt-1 h-20 w-full rounded border border-white/10 bg-black/40 p-2 text-xs text-gray-200" /></label>}<label className="mt-3 block text-xs text-gray-400">预览文本<textarea value={plan.narrator_voice.reference_text} onChange={(event) => updateNarratorVoiceProfile({ reference_text: event.target.value, status: 'idle' })} className="mt-1 h-16 w-full rounded border border-white/10 bg-black/40 p-2 text-xs text-gray-200" /></label>{plan.narrator_voice.preview_audio && <audio controls src={plan.narrator_voice.preview_audio} className="mt-3 h-8 w-full" />}{plan.narrator_voice.prompt_filename && <p className="mt-2 text-[10px] text-emerald-300">Prompt：{plan.narrator_voice.prompt_filename}</p>}{hasConfirmedFixedVoiceReference(plan.narrator_voice) && <p className="mt-2 text-[10px] text-emerald-300">旁白固定音色已创建，可以用于镜头配音。</p>}</>}
      </section>}
      <section className="grid gap-3 md:grid-cols-2">{orderedShots.map((entry) => {
        const profile = resolveVoice(entry.shot);
        const spoken = hasSpokenText(entry.shot);
        const shotLabel = entry.shot.shot_id || `镜头 ${entry.shotNumber}`;
        const shotDuration = entry.shot.audio_plan?.duration_seconds ?? entry.shot.generation_plan?.duration_seconds ?? 5;
        const voiceBindingReady = hasConfirmedFixedVoiceReference(profile);
        return <article key={entry.shot.shot_id || `${entry.segmentId}-${entry.infoIndex}`} className="glass-card rounded-xl border border-white/10 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><h3 className="text-sm font-bold text-white">{shotLabel}</h3><p className={`mt-1 text-[10px] ${voiceBindingReady ? 'text-cyan-300' : 'text-amber-300'}`}>{voiceBindingReady && profile ? `${profile.voice_id} · ${entry.shot.audio_plan?.speakers[0]?.character_name || profile.speaker_label}` : '尚未绑定已创建的固定音色'}</p></div>
            <div className="flex flex-wrap items-end justify-end gap-2">
              <label className="text-[10px] font-bold text-gray-500">TTS 输出语言<select disabled={Boolean(busy)} value={entry.shot.audio_plan?.tts_language ?? ''} onChange={(event) => setShotTtsLanguage(entry.segmentId, entry.infoIndex, (event.target.value || undefined) as Qwen3TtsLanguage | undefined)} className="mt-1 block min-w-36 rounded border border-cyan-300/25 bg-black/60 px-2 py-1.5 text-xs text-cyan-100"><option value="">跟随全局（{plan.tts_language ?? 'Auto'}）</option>{QWEN3_TTS_LANGUAGES.map((language) => <option key={language} value={language}>{language}</option>)}</select></label>
              {spoken && <button type="button" disabled={Boolean(busy) || !voiceBindingReady} onClick={async () => { setMessage(null); try { await generateVoice(entry); setMessage(`${shotLabel} 配音已生成。`); } catch (error) { setMessage(error instanceof Error ? error.message : String(error)); } finally { setBusy(null); } }} className="rounded border border-cyan-300/30 px-3 py-1.5 text-xs text-cyan-200 disabled:opacity-50">{busy === `voice:${entry.shot.shot_id}` ? <Loader2 size={13} className="animate-spin" /> : '生成配音'}</button>}
            </div>
          </div>
          {spoken && <div className="mt-3"><ShotVoiceCharacterSelector characters={mvData.characters} narrator={narratorSourceProfile} narratorVoiceId={plan.narrator_voice?.voice_id} selectedVoiceId={entry.shot.audio_plan?.speakers[0]?.voice_id} disabled={Boolean(busy)} onSelect={(voiceId) => {
            setShotVoiceId(entry.segmentId, entry.infoIndex, voiceId);
            setMessage(`${shotLabel} 已绑定所选人物或旁白的固定音色。点击“生成配音”后才会运行千问 3 Voice Clone + ASR。`);
          }} /></div>}
          <div className="mt-3 flex flex-wrap items-end gap-3 rounded-lg border border-white/10 bg-black/25 p-3"><label className="text-[10px] font-bold tracking-wider text-gray-400">目标视频时长<select disabled={Boolean(busy)} value={shotDuration} onChange={(event) => { const duration = Number(event.target.value) as 5 | 10 | 15; updateMVInfoAudioTiming(entry.segmentId, entry.infoIndex, duration, undefined, undefined, true); setMessage(`${shotLabel} 已改为 ${duration} 秒；时间戳和 H3 帧数已同步，请重新生成本镜头配音。`); }} className="mt-1 block rounded border border-cyan-300/25 bg-black/60 px-3 py-1.5 text-xs text-cyan-100"><option value={5}>5 秒</option><option value={10}>10 秒</option><option value={15}>15 秒</option></select></label><div className="pb-1 text-[10px] leading-5 text-gray-400">实际人声：{entry.shot.audio_plan?.actual_voice_duration_seconds ? `${entry.shot.audio_plan.actual_voice_duration_seconds.toFixed(1)} 秒` : '待生成'}<br />语速微调：{entry.shot.audio_plan?.voice_playback_rate && entry.shot.audio_plan.voice_playback_rate > 1.001 ? `${entry.shot.audio_plan.voice_playback_rate.toFixed(2)}×` : '自然语速'}</div></div>
          <label className="mt-3 block text-[10px] font-bold tracking-wider text-gray-500">配音文本<textarea disabled={Boolean(busy)} value={entry.shot.audio_plan?.audio_text ?? entry.shot.lyrics} onChange={(event) => updateMVInfoAudioText(entry.segmentId, entry.infoIndex, event.target.value)} rows={3} placeholder="输入本镜头需要朗读的配音文本；留空表示无对白" className="mt-1 w-full resize-y rounded-lg border border-white/10 bg-black/35 p-3 text-xs font-normal leading-5 text-gray-200 outline-none transition-colors focus:border-cyan-300/50 disabled:cursor-wait disabled:opacity-60" /></label>
          <p className="mt-1 text-[9px] text-amber-200/60">修改文本或切换人物后，旧配音与 Drive Audio 会失效，需要重新生成。</p>
          {!spoken && <p className="mt-2 text-[10px] text-fuchsia-300">无对白：使用 Music 3 配乐作为 Drive Audio。</p>}
          {entry.shot.generated_assets?.voice_audio && <audio controls src={entry.shot.generated_assets.voice_audio} className="mt-3 h-8 w-full" />}
          {entry.shot.generated_assets?.drive_audio && <div className="mt-2 flex items-center gap-1 text-[10px] text-emerald-300"><CheckCircle2 size={11} />最终 Drive Audio 已就绪</div>}
        </article>;
      })}</section>
    </> : <>
      <section className="glass-card rounded-xl border border-fuchsia-300/15 p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-bold text-white">MiniMax Music 3 / Audio ACE 配乐</h3><p className="mt-1 text-xs text-gray-500">每章可独立选择工作流和纯音乐/歌词模式；生成后按镜头切分，以 18% 音量混入千问配音。</p></div><div className="flex gap-2"><button type="button" disabled={Boolean(busy)} onClick={generateAllMusic} className="rounded bg-fuchsia-400 px-4 py-2 text-sm font-bold text-black disabled:opacity-50">生成全部配乐</button><button type="button" disabled={Boolean(busy)} onClick={applyMusic} className="rounded border border-fuchsia-300/30 px-4 py-2 text-sm font-bold text-fuchsia-200 disabled:opacity-50">切分并混合</button></div></div></section>
      {plan.chapters.map((chapter) => {
        const workflow = chapter.music_workflow ?? plan.music_workflow ?? 'MiniMax Music 3';
        const mode = chapter.generation_mode ?? 'instrumental';
        const invalidate = <T extends object>(patch: T) => updateAudioChapter(chapter.chapter_id, { ...patch, generated_audio: undefined, actual_duration_seconds: undefined, status: 'idle', error: undefined });
        return <section key={chapter.chapter_id} className="glass-card rounded-xl border border-white/10 p-5">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-bold text-white">{chapter.title}</h3><p className="mt-1 text-xs text-gray-500">{chapter.chapter_id} · 目标 {chapter.target_duration_seconds}s · {mode === 'instrumental' ? '纯音乐' : '带歌词'}</p></div><div className="flex gap-2"><button type="button" disabled={Boolean(busy)} onClick={() => generateChapter(chapter.chapter_id, false)} className="flex items-center gap-1 rounded border border-fuchsia-300/30 px-3 py-1.5 text-xs text-fuchsia-200">{busy === `music:${chapter.chapter_id}` ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}生成/保留种子</button><button type="button" disabled={Boolean(busy)} onClick={() => generateChapter(chapter.chapter_id, true)} className="flex items-center gap-1 rounded border border-white/15 px-3 py-1.5 text-xs text-gray-300"><WandSparkles size={13} />换种子</button></div></div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="text-xs text-gray-400">音乐工作流<select value={workflow} disabled={Boolean(busy)} onChange={(event) => { const next = event.target.value as MusicWorkflow; invalidate(next === 'Audio ACE Step 1.5' ? { music_workflow: next, target_duration_seconds: Math.max(10, chapter.target_duration_seconds), tags: chapter.tags?.trim() || chapter.caption, bpm: chapter.bpm ?? 100, time_signature: chapter.time_signature ?? '4', language: chapter.language ?? 'en', key_scale: chapter.key_scale ?? 'C major' } : { music_workflow: next }); }} className="mt-1 w-full rounded border border-white/10 bg-black/60 p-2 text-xs text-gray-200"><option>MiniMax Music 3</option><option>Audio ACE Step 1.5</option></select></label>
            <label className="text-xs text-gray-400">生成模式<select value={mode} disabled={Boolean(busy)} onChange={(event) => invalidate({ generation_mode: event.target.value as MusicGenerationMode })} className="mt-1 w-full rounded border border-white/10 bg-black/60 p-2 text-xs text-gray-200"><option value="instrumental">纯音乐（无演唱）</option><option value="vocal">带歌词歌曲</option></select></label>
            <label className="text-xs text-gray-400">目标时长（秒）<input type="number" min={workflow === 'Audio ACE Step 1.5' ? 10 : 1} max={workflow === 'Audio ACE Step 1.5' ? 600 : 300} value={chapter.target_duration_seconds} disabled={Boolean(busy)} onChange={(event) => invalidate({ target_duration_seconds: Math.max(workflow === 'Audio ACE Step 1.5' ? 10 : 1, Number(event.target.value) || 1) })} className="mt-1 w-full rounded border border-white/10 bg-black/60 p-2 text-xs text-gray-200" /></label>
            {workflow === 'Audio ACE Step 1.5' && <label className="text-xs text-gray-400">歌词语言<select value={chapter.language ?? (mode === 'vocal' ? 'zh' : 'en')} disabled={Boolean(busy) || mode === 'instrumental'} onChange={(event) => invalidate({ language: event.target.value as AceMusicLanguage })} className="mt-1 w-full rounded border border-white/10 bg-black/60 p-2 text-xs text-gray-200">{ACE_LANGUAGES.map((language) => <option key={language.value} value={language.value}>{language.label}</option>)}</select></label>}
          </div>
          {workflow === 'Audio ACE Step 1.5' && <div className="mt-3 grid gap-3 sm:grid-cols-3"><label className="text-xs text-gray-400">BPM（30–300）<input type="number" min={30} max={300} value={chapter.bpm ?? 100} onChange={(event) => invalidate({ bpm: Number(event.target.value) })} className="mt-1 w-full rounded border border-white/10 bg-black/60 p-2 text-xs text-gray-200" /></label><label className="text-xs text-gray-400">拍号<select value={chapter.time_signature ?? '4'} onChange={(event) => invalidate({ time_signature: event.target.value as '2' | '3' | '4' | '6' })} className="mt-1 w-full rounded border border-white/10 bg-black/60 p-2 text-xs text-gray-200"><option value="2">2/4</option><option value="3">3/4</option><option value="4">4/4（最稳定）</option><option value="6">6/8</option></select></label><label className="text-xs text-gray-400">调性<select value={chapter.key_scale ?? 'C major'} onChange={(event) => invalidate({ key_scale: event.target.value })} className="mt-1 w-full rounded border border-white/10 bg-black/60 p-2 text-xs text-gray-200">{KEY_SCALES.map((key) => <option key={key}>{key}</option>)}</select></label></div>}
          <label className="mt-3 block text-xs text-gray-400">{workflow === 'Audio ACE Step 1.5' ? '标签（曲风、情绪、乐器、音色、制作质感；不要重复 BPM/拍号）' : 'MiniMax Music 3 配乐描述（风格、乐器、情绪、空间、能量曲线、对白避让）'}<textarea value={workflow === 'Audio ACE Step 1.5' ? (chapter.tags ?? chapter.caption) : chapter.caption} onChange={(event) => invalidate(workflow === 'Audio ACE Step 1.5' ? { tags: event.target.value } : { caption: event.target.value })} className="mt-1 h-24 w-full rounded border border-white/10 bg-black/40 p-2 text-xs text-gray-200" /></label>
          <label className="mt-3 block text-xs text-gray-400">{mode === 'instrumental' ? '结构与状态脚本（不唱；用 [Intro]、[Build]、[Climax]、[Outro] 和括号说明变化）' : '歌词与演唱结构（用 [Verse]、[Chorus]、[Bridge] 等分段）'}<textarea value={chapter.lyrics} onChange={(event) => invalidate({ lyrics: event.target.value })} className="mt-1 h-44 w-full rounded border border-white/10 bg-black/40 p-2 font-mono text-xs leading-5 text-gray-200" /></label>
          <p className="mt-2 text-[10px] text-fuchsia-300">时长会同时写入编码节点与 latent 节点；纯音乐会自动在脚本首行补充 [Instrumental]，不会清空后续状态描述。</p>
          {chapter.generated_audio && <><audio controls src={chapter.generated_audio} className="mt-3 h-9 w-full" /><p className="mt-1 text-[10px] text-emerald-300">实际时长：{chapter.actual_duration_seconds?.toFixed(2) ?? '未知'} 秒</p></>}{chapter.error && <p className="mt-2 text-xs text-red-300">{chapter.error}</p>}
        </section>;
      })}
    </>}
  </div>;
};
