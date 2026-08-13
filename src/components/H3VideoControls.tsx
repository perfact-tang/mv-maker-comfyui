import React, { useRef } from 'react';
import { ChevronDown, ImagePlus, X } from 'lucide-react';
import { useGlobalSettings, type H3AudioMode, type H3GenerationMode } from '../stores/useGlobalSettings';

const LENGTH_OPTIONS = [
  { label: '5 秒', value: 141 },
  { label: '10 秒', value: 260 },
  { label: '15 秒', value: 379 },
  { label: '20 秒', value: 498 },
];

export const H3VideoControls: React.FC = () => {
  const {
    h3GenerationMode,
    setH3GenerationMode,
    h3AudioMode,
    setH3AudioMode,
    h3VideoLength,
    setH3VideoLength,
    h3ReferenceImages,
    setH3ReferenceImage,
    setH3ReferencePrompt,
  } = useGlobalSettings();
  const inputRefs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];

  const handleImageSelected = (index: 0 | 1, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setH3ReferenceImage(index, {
        dataUrl: reader.result as string,
        filename: file.name,
        prompt: h3ReferenceImages[index]?.prompt || `<Picture ${index + 1}>：`,
      });
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="glass-card bg-black/40 border border-fuchsia-400/20 rounded-lg p-3 flex flex-col gap-3 basis-full">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1.5 min-w-[190px]">
          <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">H3 默认生成方式（旧项目 fallback）</label>
          <div className="relative">
            <select
              value={h3GenerationMode}
              onChange={(event) => setH3GenerationMode(event.target.value as H3GenerationMode)}
              className="bg-black/50 text-xs text-gray-200 border border-white/10 rounded px-2.5 py-1.5 w-full appearance-none pr-8"
            >
              <option value="first-frame">首帧生成视频</option>
              <option value="reference-images">上参考图生成视频</option>
              <option value="director-routed">按每个镜头计划自动路由</option>
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        </div>

        <div className="flex flex-col gap-1.5 min-w-[160px]">
          <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">音乐模式</label>
          <div className="relative">
            <select
              value={h3AudioMode}
              onChange={(event) => setH3AudioMode(event.target.value as H3AudioMode)}
              className="bg-black/50 text-xs text-gray-200 border border-white/10 rounded px-2.5 py-1.5 w-full appearance-none pr-8"
            >
              <option value="native-audio">H3 原生声画（自动生成声音）</option>
              <option value="drive-audio">Drive Audio（驱动音乐）</option>
              <option value="reference-audio">参考音乐</option>
              <option value="no-audio">静音导出（不写入音轨）</option>
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        </div>

        <div className="flex flex-col gap-1.5 min-w-[120px]">
          <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">生成长度</label>
          <div className="relative">
            <select
              value={h3VideoLength}
              onChange={(event) => setH3VideoLength(Number(event.target.value))}
              className="bg-black/50 text-xs text-gray-200 border border-white/10 rounded px-2.5 py-1.5 w-full appearance-none pr-8"
            >
              {LENGTH_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {h3GenerationMode === 'reference-images' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 border-t border-white/10 pt-3">
          {([0, 1] as const).map((index) => {
            const image = h3ReferenceImages[index];
            return (
              <div key={index} className="rounded border border-white/10 bg-black/30 p-2.5 flex gap-3">
                <input
                  ref={inputRefs[index]}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => handleImageSelected(index, event)}
                />
                <button
                  type="button"
                  onClick={() => inputRefs[index].current?.click()}
                  className="w-28 aspect-video shrink-0 rounded border border-dashed border-fuchsia-400/30 bg-black/40 overflow-hidden flex items-center justify-center hover:border-fuchsia-300/70 transition-colors"
                  title={`上传参考图 ${index + 1}`}
                >
                  {image ? (
                    <img src={image.dataUrl} alt={`参考图 ${index + 1}`} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-[10px] text-gray-400 flex flex-col items-center gap-1"><ImagePlus size={18} />参考图 {index + 1}</span>
                  )}
                </button>
                <div className="min-w-0 flex-1 flex flex-col gap-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] text-fuchsia-200 truncate">{image?.filename || `必须上传参考图 ${index + 1}`}</span>
                    {image && (
                      <button type="button" onClick={() => setH3ReferenceImage(index, null)} className="text-gray-500 hover:text-red-300" title="移除">
                        <X size={13} />
                      </button>
                    )}
                  </div>
                  <input
                    value={image?.prompt || ''}
                    disabled={!image}
                    onChange={(event) => setH3ReferencePrompt(index, event.target.value)}
                    placeholder={`<Picture ${index + 1}>：说明人物、服装、场景或风格`}
                    className="bg-black/50 text-[11px] text-gray-200 border border-white/10 rounded px-2 py-1.5 disabled:opacity-40 focus:outline-none focus:border-fuchsia-400"
                  />
                  <p className="text-[9px] text-gray-500">此声明会自动加入每一段视频提示词，并与该参考图一同提交。</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
