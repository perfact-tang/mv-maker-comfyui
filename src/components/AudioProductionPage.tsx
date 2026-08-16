import { useMemo, useState } from 'react';
import { AudioLines, CheckCircle2, Loader2, LockKeyhole, Music2, RefreshCw, Sparkles, UserRound, WandSparkles } from 'lucide-react';
import type { MVInfo, VoiceProfile } from '../types/mv-data';
import { generateMusic3Chapter, generateQwen3ShotVoice, generateQwen3Voice, mixVoiceAndMusic, splitMusic3Chapter } from '../utils/audioProduction';
import { useGlobalSettings } from '../stores/useGlobalSettings';

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

const hasSpokenText = (shot: MVInfo) => {
  const text = (shot.audio_plan?.audio_text || shot.lyrics || '').trim();
  return Boolean(text) && !/^(\(No dialogue\)|（?无对白|（?本镜头无对白)/i.test(text);
};

export const AudioProductionPage = () => {
  const { mvData, updateAudioChapter, updateNarratorVoiceProfile, updateMVInfoAsset, updateMVInfoAudioTiming, updateMVInfoAudioText, lockAudioTimeline, upgradeCurrentProjectAudioPlan } = useGlobalSettings();
  const [panel, setPanel] = useState<'voice' | 'music'>('voice');
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [voiceBatchProgress, setVoiceBatchProgress] = useState<VoiceBatchProgress | null>(null);
  const [voiceBatchDialog, setVoiceBatchDialog] = useState<VoiceBatchDialog | null>(null);
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

  if (!mvData || !plan) {
    return <div className="glass-card rounded-xl border border-amber-300/20 p-6 text-sm text-amber-200"><p>当前项目没有新版声音计划。已有导演计划的旧项目可以直接升级为“千问 3 TTS 配音 + Music 3 配乐”。</p>{mvData?.director_plan && <button type="button" onClick={upgradeCurrentProjectAudioPlan} className="mt-4 rounded bg-amber-300 px-4 py-2 font-bold text-black">升级声音计划</button>}</div>;
  }
  if (plan.mode === 'disabled') {
    return <div className="glass-card rounded-xl border border-cyan-300/20 p-8"><h2 className="text-xl font-bold text-white">声音制作</h2><p className="mt-3 text-sm text-gray-400">当前项目为 MV，沿用主音乐时间线，不调用千问 3 TTS 或 Music 3 配乐流程。</p></div>;
  }

  const resolveVoice = (shot: MVInfo): VoiceProfile | undefined => {
    const voiceId = shot.audio_plan?.speakers[0]?.voice_id;
    return mvData.characters.find((character) => character.voice_profile?.voice_id === voiceId)?.voice_profile
      || (voiceId === plan.narrator_voice?.voice_id ? plan.narrator_voice : undefined)
      || plan.narrator_voice;
  };

  const generateVoice = async (entry: typeof orderedShots[number]) => {
    const { shot, segmentId, infoIndex } = entry;
    const profile = resolveVoice(shot);
    if (!profile) throw new Error(`${shot.shot_id || '镜头'} 没有匹配到人物或旁白音色`);
    if (profile.status !== 'ready' || !profile.preview_audio) throw new Error(`请先为 ${profile.voice_id} 生成并确认音色预览，再生成镜头配音`);
    setBusy(`voice:${shot.shot_id}`);
    const chunk = await generateQwen3ShotVoice(mvData.proposal_id, shot, profile);
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
          for (let seconds = 20; seconds > 0; seconds -= 1) {
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
    setBusy('narrator-preview');
    setMessage(null);
    updateNarratorVoiceProfile({ status: 'generating', error: undefined });
    try {
      const result = await generateQwen3Voice(plan.narrator_voice);
      updateNarratorVoiceProfile({ preview_audio: result.audioUrl, seed: result.seed, prompt_filename: result.promptFilename, status: 'ready' });
      setMessage('旁白音色预览和可复用 Prompt 已生成。');
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
      const generated = await generateMusic3Chapter(chapter, replaceSeed);
      updateAudioChapter(chapterId, { generated_audio: generated.audioUrl, actual_duration_seconds: chapter.target_duration_seconds, seed: generated.seed, status: 'ready' });
      setMessage(`“${chapter.title}”纯器乐配乐已生成。`);
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      updateAudioChapter(chapterId, { status: 'failed', error: detail });
      setMessage(`Music 3 配乐失败：${detail}`);
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
      setMessage('Music 3 纯器乐配乐已按镜头切分，并与千问 3 TTS 配音完成混合。');
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

  return <div className="space-y-6">
    {voiceBatchProgress && <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/90 p-4 backdrop-blur-md" aria-live="assertive" aria-busy="true"><div className="w-full max-w-md rounded-2xl border border-cyan-300/30 bg-[#111827] p-8 text-center shadow-[0_0_50px_rgba(34,211,238,0.18)]"><div className="relative mx-auto flex h-24 w-24 items-center justify-center"><div className="absolute inset-0 animate-ping rounded-full border border-cyan-300/20" /><div className="absolute inset-2 animate-spin rounded-full border-4 border-cyan-300/15 border-t-cyan-300" /><AudioLines className="text-cyan-200" size={34} /></div><h3 className="mt-6 text-xl font-bold text-white">{voiceBatchProgress.phase === 'generating' ? '千问 3 TTS 配音生成中' : '生成成功，正在冷却'}</h3><p className="mt-2 text-sm text-cyan-200">{voiceBatchProgress.shotLabel} · 第 {voiceBatchProgress.current}/{voiceBatchProgress.total} 个</p>{voiceBatchProgress.phase === 'cooling' ? <><div className="mx-auto mt-5 flex h-16 w-16 items-center justify-center rounded-full border border-fuchsia-300/30 bg-fuchsia-500/10 text-2xl font-bold text-fuchsia-200">{voiceBatchProgress.cooldownSeconds}</div><p className="mt-3 text-xs text-gray-400">等待 ComfyUI 释放资源，倒计时结束后自动生成下一个镜头。</p></> : <p className="mt-5 text-xs text-gray-400">请不要关闭页面或重复点击，当前操作完成前界面已暂时锁定。</p>}<div className="mt-6 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full bg-gradient-to-r from-cyan-300 to-fuchsia-400 transition-all duration-500" style={{ width: `${((voiceBatchProgress.current - (voiceBatchProgress.phase === 'generating' ? 1 : 0)) / voiceBatchProgress.total) * 100}%` }} /></div></div></div>}
    {voiceBatchDialog && <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"><div className={`w-full max-w-md rounded-xl border p-6 shadow-2xl ${voiceBatchDialog.tone === 'success' ? 'border-emerald-300/30 bg-emerald-950/90' : 'border-red-300/30 bg-red-950/90'}`}><h3 className="text-lg font-bold text-white">{voiceBatchDialog.title}</h3><p className="mt-3 whitespace-pre-line text-sm leading-6 text-gray-200">{voiceBatchDialog.message}</p><button type="button" onClick={() => setVoiceBatchDialog(null)} className="mt-6 w-full rounded bg-white/10 px-4 py-2 text-sm font-bold text-white hover:bg-white/20">知道了</button></div></div>}
    <section className="glass-card rounded-xl border border-emerald-300/20 bg-emerald-500/5 p-5">
      <div className="flex flex-wrap items-start justify-between gap-4"><div><div className="flex items-center gap-2"><AudioLines className="text-emerald-300" /><h2 className="text-2xl font-bold text-white">声音制作</h2></div><p className="mt-2 text-sm text-gray-400">千问 3 TTS 负责配音和音色一致性；MiniMax Music 3 只负责纯器乐背景配乐。</p><p className="mt-1 text-xs text-emerald-200/70">最终 Drive Audio：配音 100% + 配乐 18% · 状态 {plan.alignment_status}</p></div><button type="button" disabled={Boolean(busy)} onClick={lock} className="flex items-center gap-2 rounded border border-cyan-300/40 bg-cyan-500/10 px-4 py-2 text-sm font-bold text-cyan-200 disabled:opacity-50"><LockKeyhole size={15} />锁定声音时间线</button></div>
      <div className="mt-5 grid grid-cols-2 gap-2 rounded-lg bg-black/30 p-1"><button type="button" onClick={() => setPanel('voice')} className={`flex items-center justify-center gap-2 rounded px-4 py-2 text-sm font-bold ${panel === 'voice' ? 'bg-cyan-400 text-black' : 'text-gray-400'}`}><UserRound size={15} />千问 3 TTS · 配音</button><button type="button" onClick={() => setPanel('music')} className={`flex items-center justify-center gap-2 rounded px-4 py-2 text-sm font-bold ${panel === 'music' ? 'bg-fuchsia-400 text-black' : 'text-gray-400'}`}><Music2 size={15} />Music 3 · 配乐</button></div>
      {message && <p className="mt-4 rounded border border-white/10 bg-black/30 px-3 py-2 text-xs text-gray-200">{message}</p>}
    </section>

    {panel === 'voice' ? <>
      {plan.narrator_voice && <section className="glass-card rounded-xl border border-cyan-300/15 p-5"><div className="mb-3 flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-bold text-white">旁白固定音色</h3><p className="text-xs text-gray-500">{plan.narrator_voice.voice_id} · seed {plan.narrator_voice.seed}</p></div><div className="flex gap-2"><button type="button" disabled={Boolean(busy)} onClick={generateNarratorPreview} className="rounded border border-cyan-300/30 px-3 py-2 text-xs text-cyan-200 disabled:opacity-50">{busy === 'narrator-preview' ? <Loader2 size={13} className="animate-spin" /> : '生成音色预览'}</button><button type="button" disabled={Boolean(busy)} onClick={generateAllVoices} className="flex items-center gap-2 rounded bg-cyan-400 px-4 py-2 text-sm font-bold text-black disabled:cursor-wait disabled:opacity-50">{busy?.startsWith('voice:') ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}{voiceBatchProgress ? `生成配音 ${voiceBatchProgress.current}/${voiceBatchProgress.total}` : '生成全部配音'}</button></div></div><label className="text-xs text-gray-400">音色定义 instruct<textarea value={plan.narrator_voice.instruct} onChange={(event) => updateNarratorVoiceProfile({ instruct: event.target.value, status: 'idle' })} className="mt-1 h-20 w-full rounded border border-white/10 bg-black/40 p-2 text-xs text-gray-200" /></label><label className="mt-3 block text-xs text-gray-400">音色参考文本<textarea value={plan.narrator_voice.reference_text} onChange={(event) => updateNarratorVoiceProfile({ reference_text: event.target.value, status: 'idle' })} className="mt-1 h-16 w-full rounded border border-white/10 bg-black/40 p-2 text-xs text-gray-200" /></label>{plan.narrator_voice.preview_audio && <audio controls src={plan.narrator_voice.preview_audio} className="mt-3 h-8 w-full" />}{plan.narrator_voice.prompt_filename && <p className="mt-2 text-[10px] text-emerald-300">Prompt：{plan.narrator_voice.prompt_filename}</p>}</section>}
      <section className="grid gap-3 md:grid-cols-2">{orderedShots.map((entry) => {
        const profile = resolveVoice(entry.shot);
        const spoken = hasSpokenText(entry.shot);
        const shotLabel = entry.shot.shot_id || `镜头 ${entry.shotNumber}`;
        const shotDuration = entry.shot.audio_plan?.duration_seconds ?? entry.shot.generation_plan?.duration_seconds ?? 5;
        return <article key={entry.shot.shot_id || `${entry.segmentId}-${entry.infoIndex}`} className="glass-card rounded-xl border border-white/10 p-4">
          <div className="flex items-start justify-between gap-3"><div><h3 className="text-sm font-bold text-white">{shotLabel}</h3><p className="mt-1 text-[10px] text-cyan-300">{profile?.voice_id || '未匹配音色'} · {entry.shot.audio_plan?.speakers.map((speaker) => speaker.character_name || speaker.speaker_label).join(' / ')}</p></div>{spoken && <button type="button" disabled={Boolean(busy)} onClick={async () => { setMessage(null); try { await generateVoice(entry); setMessage(`${shotLabel} 配音已生成。`); } catch (error) { setMessage(error instanceof Error ? error.message : String(error)); } finally { setBusy(null); } }} className="rounded border border-cyan-300/30 px-3 py-1.5 text-xs text-cyan-200 disabled:opacity-50">{busy === `voice:${entry.shot.shot_id}` ? <Loader2 size={13} className="animate-spin" /> : '生成配音'}</button>}</div>
          <div className="mt-3 flex flex-wrap items-end gap-3 rounded-lg border border-white/10 bg-black/25 p-3"><label className="text-[10px] font-bold tracking-wider text-gray-400">目标视频时长<select disabled={Boolean(busy)} value={shotDuration} onChange={(event) => { const duration = Number(event.target.value) as 5 | 10 | 15; updateMVInfoAudioTiming(entry.segmentId, entry.infoIndex, duration, undefined, undefined, true); setMessage(`${shotLabel} 已改为 ${duration} 秒；时间戳和 H3 帧数已同步，请重新生成本镜头配音。`); }} className="mt-1 block rounded border border-cyan-300/25 bg-black/60 px-3 py-1.5 text-xs text-cyan-100"><option value={5}>5 秒</option><option value={10}>10 秒</option><option value={15}>15 秒</option></select></label><div className="pb-1 text-[10px] leading-5 text-gray-400">实际人声：{entry.shot.audio_plan?.actual_voice_duration_seconds ? `${entry.shot.audio_plan.actual_voice_duration_seconds.toFixed(1)} 秒` : '待生成'}<br />语速微调：{entry.shot.audio_plan?.voice_playback_rate && entry.shot.audio_plan.voice_playback_rate > 1.001 ? `${entry.shot.audio_plan.voice_playback_rate.toFixed(2)}×` : '自然语速'}</div></div>
          <label className="mt-3 block text-[10px] font-bold tracking-wider text-gray-500">配音文本<textarea disabled={Boolean(busy)} value={entry.shot.audio_plan?.audio_text ?? entry.shot.lyrics} onChange={(event) => updateMVInfoAudioText(entry.segmentId, entry.infoIndex, event.target.value)} rows={3} placeholder="输入本镜头需要朗读的配音文本；留空表示无对白" className="mt-1 w-full resize-y rounded-lg border border-white/10 bg-black/35 p-3 text-xs font-normal leading-5 text-gray-200 outline-none transition-colors focus:border-cyan-300/50 disabled:cursor-wait disabled:opacity-60" /></label><p className="mt-1 text-[9px] text-amber-200/60">修改文本后，旧配音与 Drive Audio 会失效，需要重新生成本镜头配音。</p>{!spoken && <p className="mt-2 text-[10px] text-fuchsia-300">无对白：使用 Music 3 配乐作为 Drive Audio。</p>}{entry.shot.generated_assets?.voice_audio && <audio controls src={entry.shot.generated_assets.voice_audio} className="mt-3 h-8 w-full" />}{entry.shot.generated_assets?.drive_audio && <div className="mt-2 flex items-center gap-1 text-[10px] text-emerald-300"><CheckCircle2 size={11} />最终 Drive Audio 已就绪</div>}
        </article>;
      })}</section>
    </> : <>
      <section className="glass-card rounded-xl border border-fuchsia-300/15 p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-bold text-white">MiniMax Music 3 纯器乐配乐</h3><p className="mt-1 text-xs text-gray-500">不会再用于配音；生成后按镜头切分，以 18% 音量混入千问配音。</p></div><div className="flex gap-2"><button type="button" disabled={Boolean(busy)} onClick={generateAllMusic} className="rounded bg-fuchsia-400 px-4 py-2 text-sm font-bold text-black disabled:opacity-50">生成全部配乐</button><button type="button" disabled={Boolean(busy)} onClick={applyMusic} className="rounded border border-fuchsia-300/30 px-4 py-2 text-sm font-bold text-fuchsia-200 disabled:opacity-50">切分并混合</button></div></div></section>
      {plan.chapters.map((chapter) => <section key={chapter.chapter_id} className="glass-card rounded-xl border border-white/10 p-5"><div className="mb-4 flex items-start justify-between gap-3"><div><h3 className="font-bold text-white">{chapter.title}</h3><p className="mt-1 text-xs text-gray-500">{chapter.chapter_id} · {chapter.target_duration_seconds}s · 纯器乐</p></div><div className="flex gap-2"><button type="button" disabled={Boolean(busy)} onClick={() => generateChapter(chapter.chapter_id, false)} className="flex items-center gap-1 rounded border border-fuchsia-300/30 px-3 py-1.5 text-xs text-fuchsia-200">{busy === `music:${chapter.chapter_id}` ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}保留种子</button><button type="button" disabled={Boolean(busy)} onClick={() => generateChapter(chapter.chapter_id, true)} className="flex items-center gap-1 rounded border border-white/15 px-3 py-1.5 text-xs text-gray-300"><WandSparkles size={13} />换种子</button></div></div><label className="text-xs text-gray-400">配乐描述<textarea value={chapter.caption} onChange={(event) => updateAudioChapter(chapter.chapter_id, { caption: event.target.value, status: 'idle' })} className="mt-1 h-24 w-full rounded border border-white/10 bg-black/40 p-2 text-xs text-gray-200" /></label><p className="mt-2 text-[10px] text-fuchsia-300">系统固定附加：纯器乐、无人声、无演唱、无吟唱。</p>{chapter.generated_audio && <audio controls src={chapter.generated_audio} className="mt-3 h-9 w-full" />}{chapter.error && <p className="mt-2 text-xs text-red-300">{chapter.error}</p>}</section>)}
    </>}
  </div>;
};
