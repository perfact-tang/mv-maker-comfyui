import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js';
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, sendPasswordResetEmail, signOut } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js';
import { parseProject, shotsOf, overview, characters, audio, storyboard } from './viewer.js';
import { SpeechReader, speechEntries, SPEECH_LANGUAGES, selectVoice } from './speech.js';

const $ = (id) => document.getElementById(id);
let auth, currentUser = null, documentProject = null, activeTab = 'overview', importId = 0;
const reader = new SpeechReader({ synth: window.speechSynthesis, Utterance: window.SpeechSynthesisUtterance, onState: updateSpeechControls });
try { const saved = localStorage.getItem('aimovieview-speech-language'); if (saved in SPEECH_LANGUAGES) $('speech-language').value = saved; } catch { /* Storage may be unavailable in private browsing. */ }
function currentSpeechEntries() {
  return documentProject ? speechEntries(documentProject.project, activeTab, { search: $('search').value.trim(), segment: $('segment-filter').value, mode: $('mode-filter').value }) : [];
}
function updateSpeechControls(state = reader.state) {
  $('speech-status').textContent = state.message;
  $('pause-speech').disabled = !state.active;
  $('pause-speech').textContent = state.paused ? '继续' : '暂停';
  $('stop-speech').disabled = !state.active;
  $('read-all').disabled = !reader.supported || !currentSpeechEntries().some((entry) => entry.text);
  $('content').querySelectorAll('[data-read]').forEach((button) => {
    const active = button.dataset.read === state.key;
    button.setAttribute('aria-pressed', String(active));
    button.textContent = active ? (state.paused ? '已暂停' : '■ 停止朗读') : button.dataset.label;
    button.disabled = !reader.supported || !currentSpeechEntries().some((entry) => entry.key === button.dataset.read && entry.text);
  });
}
function updateVoiceHint() {
  const language = $('speech-language').value;
  const voices = reader.supported ? window.speechSynthesis.getVoices() : [];
  const voice = selectVoice(voices, language);
  $('speech-hint').textContent = !reader.supported ? '当前浏览器不支持语音朗读。'
    : !voices.length ? '正在加载设备语音…'
    : !voice ? `设备未提供${SPEECH_LANGUAGES[language]}语音，请安装该语言语音或选择其他语言。`
    : `朗读语音：${voice.name || SPEECH_LANGUAGES[language]} · 原文朗读，不自动翻译。`;
}
$('speech-language').addEventListener('change', () => { reader.stop(); try { localStorage.setItem('aimovieview-speech-language', $('speech-language').value); } catch { /* Optional preference. */ } updateVoiceHint(); });
$('read-all').addEventListener('click', () => { $('content').querySelectorAll('audio,video').forEach((element) => element.pause()); reader.play(currentSpeechEntries(), $('speech-language').value); });
$('pause-speech').addEventListener('click', () => reader.togglePause());
$('stop-speech').addEventListener('click', () => reader.stop());
$('content').addEventListener('click', (event) => {
  const button = event.target.closest('[data-read]');
  if (!button || button.disabled) return;
  if (reader.state.key === button.dataset.read) { reader.stop(); return; }
  const entry = currentSpeechEntries().find((entry) => entry.key === button.dataset.read);
  if (entry) { $('content').querySelectorAll('audio,video').forEach((element) => element.pause()); reader.play([entry], $('speech-language').value); }
});
// Avoid overlapping the browser voice with generated audio/video playback.
$('content').addEventListener('play', () => reader.stop(), true);
window.addEventListener('pagehide', () => reader.stop());
window.speechSynthesis?.addEventListener('voiceschanged', updateVoiceHint);
updateVoiceHint();
const messages = {
  'auth/invalid-credential': '邮箱或密码不正确。', 'auth/user-not-found': '邮箱或密码不正确。', 'auth/wrong-password': '邮箱或密码不正确。',
  'auth/invalid-email': '请输入有效的邮箱地址。', 'auth/user-disabled': '此账号已停用。', 'auth/too-many-requests': '尝试次数过多，请稍后再试。',
  'auth/unauthorized-domain': '当前域名尚未获准登录，请联系管理员。', 'auth/operation-not-allowed': '此登录方式尚未启用。',
  'auth/popup-blocked': '请允许浏览器弹出登录窗口。', 'auth/network-request-failed': '网络连接失败，请重试。',
  'auth/account-exists-with-different-credential': '此邮箱已使用其他方式注册，请使用原登录方式。',
};
async function connectAuth() {
  $('retry-auth').hidden = true;
  try {
    const response = await fetch('/__/firebase/init.json');
    if (!response.ok) throw new Error('无法读取 Firebase 配置。请在 Firebase Hosting 或 Hosting 模拟器上打开页面。');
    const config = await response.json();
    if (config.projectId !== 'vibecodingjapan') throw new Error('Firebase 项目配置不正确。');
    auth = getAuth(initializeApp(config));
    onAuthStateChanged(auth, (user) => {
      currentUser = user;
      $('loading').hidden = true;
      $('login').hidden = Boolean(user);
      $('workspace').hidden = !user;
      $('password').value = '';
      $('user-label').textContent = user?.displayName || user?.email || '';
      if (!user) { reader.stop(); importId++; documentProject = null; $('content').replaceChildren(); $('project').hidden = true; $('empty').hidden = false; }
    }, showConnectionError);
  } catch (error) { showConnectionError(error); }
}
function showConnectionError(error) {
  $('loading').hidden = true; $('login').hidden = false;
  $('login-error').textContent = error.message || '登录服务连接失败。'; $('retry-auth').hidden = false;
}
async function authenticate(action) {
  $('login-fields').disabled = true;
  $('login-error').textContent = ''; $('login-message').textContent = '';
  try { if (!auth) throw new Error('登录服务未连接，请点击重新连接。'); await action(); }
  catch (error) { if (!['auth/popup-closed-by-user', 'auth/cancelled-popup-request'].includes(error.code)) $('login-error').textContent = messages[error.code] || (error.code ? '登录失败，请稍后再试。' : error.message); }
  finally { $('login-fields').disabled = false; }
}
$('login-form').addEventListener('submit', (event) => { event.preventDefault(); void authenticate(() => signInWithEmailAndPassword(auth, $('email').value.trim(), $('password').value)); });
$('reset-password').addEventListener('click', () => void authenticate(async () => { await sendPasswordResetEmail(auth, $('email').value.trim()); $('login-message').textContent = '如果此邮箱已注册，你将收到密码重置邮件。'; }));
$('retry-auth').addEventListener('click', () => { $('login-error').textContent = ''; void connectAuth(); });
$('logout').addEventListener('click', async () => { try { await signOut(auth); $('notice').textContent = ''; $('file-error').textContent = ''; } catch { $('file-error').textContent = '退出失败，请重试。'; } });

function setProject(parsed, filename) {
  reader.stop();
  documentProject = parsed; activeTab = 'overview';
  const project = parsed.project, director = project.director_plan ?? {};
  $('project-title').textContent = project.direction_name;
  $('project-meta').textContent = `PROJECT ${String(project.proposal_id ?? '').padStart(3, '0')} / ${director.content_form ?? '创作项目'}`;
  $('project-outline').textContent = project.basics?.outline ?? '';
  const duration = director.total_duration_seconds ?? shotsOf(project).reduce((sum, shot) => sum + Number(shot.generation_plan?.duration_seconds ?? shot.audio_plan?.duration_seconds ?? 0), 0);
  $('project-stats').textContent = `${project.characters.length} 位人物　 ·　 ${project.storyboard.length} 个段落　 ·　 ${shotsOf(project).length} 个镜头　 ·　 ${duration}s　 ·　 ${director.aspect_ratio ?? '—'}`;
  $('notice').textContent = `已打开 ${filename}`; $('file-error').textContent = '';
  $('empty').hidden = true; $('project').hidden = false;
  $('search').value = ''; $('mode-filter').value = '';
  $('segment-filter').replaceChildren(new Option('全部段落', ''), ...project.storyboard.map((segment, index) => new Option(`段落 ${segment.segment_id}`, String(index))));
  render();
}
function render() {
  if (!currentUser || !documentProject) return;
  reader.stop();
  $('content').querySelectorAll('audio,video').forEach((element) => element.pause());
  const { project, settings } = documentProject;
  document.querySelectorAll('[data-tab]').forEach((element) => { element.setAttribute('aria-selected', String(element.dataset.tab === activeTab)); element.tabIndex = element.dataset.tab === activeTab ? 0 : -1; });
  $('content').setAttribute('aria-labelledby', `tab-${activeTab}`);
  $('filters').hidden = activeTab !== 'storyboard';
  $('speech-toolbar').hidden = activeTab === 'overview';
  $('read-all').textContent = activeTab === 'storyboard' && ($('search').value.trim() || $('segment-filter').value || $('mode-filter').value) ? '▶ 朗读全部（筛选结果）' : '▶ 朗读全部';
  const renders = { overview: () => overview(project, settings), characters: () => characters(project), audio: () => audio(project), storyboard: () => storyboard(project, { search: $('search').value.trim(), segment: $('segment-filter').value, mode: $('mode-filter').value }) };
  $('content').innerHTML = renders[activeTab]();
  updateSpeechControls();
  $('content').querySelectorAll('[data-media]').forEach((element) => element.addEventListener('error', () => { const message = document.createElement('p'); message.className = 'rounded-lg bg-gray-100 p-4 text-xs text-gray-500'; message.textContent = '素材无法加载：原地址可能已失效或不可公开访问。'; element.replaceWith(message); }, { once: true }));
}
document.querySelectorAll('[data-tab]').forEach((element, index, tabs) => {
  element.addEventListener('click', () => { activeTab = element.dataset.tab; render(); });
  element.addEventListener('keydown', (event) => { if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) { event.preventDefault(); const target = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length; tabs[target].focus(); tabs[target].click(); } });
});
['search', 'segment-filter', 'mode-filter'].forEach((id) => $(id).addEventListener('input', render));
$('import-button').addEventListener('click', () => $('file-input').click());
async function importFile(file) {
  if (!currentUser || !file) return;
  const id = ++importId;
  try {
    if (!file.name.toLowerCase().endsWith('.json')) throw new Error('请选择 JSON 文件。');
    if (file.size > 100 * 1024 * 1024) throw new Error('文件超过 100 MB，请使用较小的项目存档。');
    const parsed = parseProject(await file.text());
    if (id === importId && currentUser) setProject(parsed, file.name);
  } catch (error) { if (id === importId) $('file-error').textContent = error instanceof SyntaxError ? 'JSON 无法解析，请检查文件格式。' : error.message; }
  $('file-input').value = '';
}
$('file-input').addEventListener('change', () => void importFile($('file-input').files[0]));
document.addEventListener('dragover', (event) => { if (currentUser) event.preventDefault(); });
document.addEventListener('drop', (event) => { if (currentUser) { event.preventDefault(); void importFile(event.dataTransfer.files[0]); } });
$('load-sample').addEventListener('click', async () => {
  const id = ++importId; $('load-sample').disabled = true;
  try { const response = await fetch('/sample-project.json'); if (!response.ok) throw new Error('示例加载失败。'); const parsed = parseProject(await response.text()); if (id === importId && currentUser) setProject(parsed, 'Pet Together · 示例项目'); }
  catch (error) { if (id === importId) $('file-error').textContent = error.message; }
  finally { $('load-sample').disabled = false; }
});
void connectAuth();
