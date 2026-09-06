export const persistFixedVoiceBlob = async (blob: Blob, voiceId: string): Promise<string> => {
  if (!blob.size) throw new Error(`${voiceId} 的固定音色为空，未替换已有音色。`);
  const response = await fetch('/api/audio/fixed-voice', {
    method: 'POST',
    headers: { 'Content-Type': blob.type || 'application/octet-stream', 'X-Voice-Id': voiceId },
    body: blob,
  });
  if (!response.ok) throw new Error(`保存固定音色失败：${await response.text()}`);
  const result = await response.json() as { url?: string };
  if (!result.url?.startsWith('/uploads/audio/fixed-voices/')) throw new Error('固定音色保存结果无效。');
  return result.url;
};

/** Copy ComfyUI temporary output into this project's durable, content-addressed media store. */
export const persistFixedVoiceAudio = async (audioUrl: string, voiceId: string): Promise<string> => {
  const source = await fetch(audioUrl);
  if (!source.ok) throw new Error(`无法保存 ${voiceId} 的固定音色：HTTP ${source.status}`);
  return persistFixedVoiceBlob(await source.blob(), voiceId);
};

export const fixedVoiceReadError = (voiceId: string, status: number) => (
  `无法读取 ${voiceId} 的参考音色文件：HTTP ${status}。` +
  (status === 404
    ? '旧版固定音色可能保存在 ComfyUI 临时目录，重启后已被清理。请在“人物展示”（或“旁白固定音色”）重新创建该音色，再从当前镜头继续。已有镜头配音不会删除。'
    : '请检查 ComfyUI 连接和参考音频文件后重试。已有镜头配音不会删除。')
);
