export const SPEECH_LANGUAGES = { 'zh-CN': '中文', 'ja-JP': '日文', 'en-US': '英文', 'ko-KR': '韩文' };

export function descriptionSection(prompt) {
  if (typeof prompt !== 'string') return { name: 'detailed_description', text: '' };
  for (const name of ['detailed_description', 'integrated_multimodal_description']) {
    const pattern = new RegExp(`^[ \\t]*${name}[ \\t]*[:：][ \\t]*([\\s\\S]*?)(?=^[ \\t]*[a-z][a-z0-9_]*[ \\t]*[:：]|$(?![\\s\\S]))`, 'im');
    const match = pattern.exec(prompt.replace(/\r\n?/g, '\n'));
    if (match?.[1]?.trim()) return { name, text: match[1].trim() };
  }
  return { name: 'detailed_description', text: '' };
}
export const detailedDescription = (prompt) => descriptionSection(prompt).text;

export function dialogue(value) {
  if (typeof value !== 'string') return '';
  const text = value.trim();
  return /^(?:\(?no dialogue\)?|\(?no vocals\)?|N\/A|无对白|无台词|无旁白|静音|纯音乐)$/i.test(text) ? '' : text;
}

export function speechEntries(project, tab, filters = {}) {
  if (tab === 'characters') return project.characters.map((character, index) => ({ key: `character-${index}`, label: character.name || `人物 ${index + 1}`, text: typeof character.description === 'string' ? character.description.trim() : '' }));
  const shots = project.storyboard.flatMap((segment, segmentIndex) => segment.mvinfo.map((shot, shotIndex) => ({ shot, segmentIndex, key: `${segmentIndex}-${shotIndex}` })));
  if (tab === 'audio') {
    const plan = project.director_plan?.audio_plan ?? {};
    return [
      ...(plan.narrator_voice ? [{ key: 'voice-narrator', label: '旁白台词', text: dialogue(plan.narrator_voice.reference_text) }] : []),
      ...project.characters.flatMap((character, index) => character.voice_profile ? [{ key: `voice-character-${index}`, label: `${character.name} 台词`, text: dialogue(character.voice_profile.reference_text) }] : []),
      ...(plan.chapters ?? []).map((chapter, index) => ({ key: `chapter-${index}`, label: chapter.title || chapter.chapter_id, text: chapter.generation_mode === 'vocal' ? dialogue(chapter.lyrics) : '' })),
      ...shots.map(({ shot, key }) => ({ key: `dialogue-${key}`, label: `${shot.shot_id || '镜头'} 台词`, text: dialogue(shot.audio_plan?.audio_text ?? shot.lyrics) })),
    ];
  }
  if (tab === 'storyboard') return shots.filter(({ shot, segmentIndex }) =>
    (!filters.segment || String(segmentIndex) === filters.segment) &&
    (!filters.mode || shot.generation_plan?.mode === filters.mode) &&
    (!filters.search || JSON.stringify(shot).toLowerCase().includes(filters.search.toLowerCase()))
  ).map(({ shot, key }) => ({ key: `shot-${key}`, label: shot.shot_id || '镜头', text: detailedDescription(shot.video_prompt) }));
  return [];
}

export function selectVoice(voices, language) {
  // Match 04_VibeIdeaHelper's chooseVoice: named macOS voice, exact locale,
  // language family, then a language/name hint. Never prefer an arbitrary
  // localService voice over the familiar voice used by the reference app.
  const names = { 'ja-JP': ['Kyoko'], 'zh-CN': ['Ting-Ting', 'Ting Ting'], 'ko-KR': ['Yuna'], 'en-US': ['Samantha'] };
  const hints = {
    'ja-JP': ['japanese', '日本', 'kyoko'],
    'zh-CN': ['chinese', '中文', '普通话', 'mandarin', 'ting'],
    'ko-KR': ['korean', '한국', 'yuna'],
    'en-US': ['english', 'samantha'],
  };
  const normalize = (value) => String(value ?? '').toLowerCase().replaceAll('_', '-');
  const preferred = voices.find((voice) => (names[language] ?? []).some((name) => normalize(voice.name).includes(normalize(name))));
  return preferred
    ?? voices.find((voice) => normalize(voice.lang) === normalize(language))
    ?? voices.find((voice) => normalize(voice.lang).split('-')[0] === normalize(language).split('-')[0])
    ?? voices.find((voice) => (hints[language] ?? []).some((hint) => normalize(voice.name).includes(hint)));
}

export class SpeechReader {
  constructor({ synth, Utterance, onState = () => {} }) {
    this.synth = synth;
    this.Utterance = Utterance;
    this.onState = onState;
    this.run = 0;
    this.state = { active: false, paused: false, key: '', message: '' };
  }
  get supported() { return Boolean(this.synth && this.Utterance); }
  update(state) { this.state = { ...this.state, ...state }; this.onState(this.state); }
  stop() {
    this.run++;
    if (this.supported) this.synth.cancel();
    this.utterance = null;
    this.update({ active: false, paused: false, key: '', message: '' });
  }
  play(entries, language) {
    this.stop();
    if (!this.supported) { this.update({ message: '当前浏览器不支持语音朗读，请使用 Chrome、Edge 或 Safari。' }); return; }
    const items = entries.filter((entry) => entry.text?.trim());
    if (!items.length) { this.update({ message: '当前没有可朗读的文字。' }); return; }
    const voices = this.synth.getVoices();
    if (!voices.length) { this.update({ message: '设备语音尚未加载，请稍后再次点击朗读。' }); return; }
    const voice = selectVoice(voices, language);
    if (!voice) { this.update({ message: `设备未提供${SPEECH_LANGUAGES[language]}语音，请安装该语言语音或选择其他语言。` }); return; }
    // Speak a whole section, as in VibeIdeaHelper, to retain sentence context
    // and natural intonation. Read-all advances only when that section ends.
    const queue = items.map((entry, index) => ({ ...entry, text: entry.text.trim(), index }));
    const run = this.run;
    const next = () => {
      if (run !== this.run) return;
      const chunk = queue.shift();
      if (!chunk) { this.utterance = null; this.update({ active: false, paused: false, key: '', message: '朗读完成。' }); return; }
      this.update({ active: true, paused: false, key: chunk.key, message: `正在朗读 ${chunk.index + 1}/${items.length} · ${chunk.label}` });
      const utterance = new this.Utterance(chunk.text);
      utterance.voice = voice;
      utterance.lang = voice.lang || language;
      utterance.rate = 1;
      utterance.onend = next;
      utterance.onerror = (event) => {
        if (run !== this.run) return;
        this.stop();
        this.update({ message: event.error === 'not-allowed' ? '浏览器未允许朗读，请再次点击播放按钮。' : '朗读未能完成，请确认设备语音可用后重试。' });
      };
      // Keep a strong reference until completion (some engines otherwise stop early).
      this.utterance = utterance;
      try { this.synth.speak(utterance); } catch { utterance.onerror({ error: 'synthesis-failed' }); }
    };
    this.synth.resume();
    next();
  }
  togglePause() {
    if (!this.state.active) return;
    if (this.state.paused) this.synth.resume(); else this.synth.pause();
    this.update({ paused: !this.state.paused });
  }
}
