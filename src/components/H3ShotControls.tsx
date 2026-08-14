import React, { useRef, useState } from 'react';
import { ImagePlus, UploadCloud, UserRound, X } from 'lucide-react';
import { H3ShotGenerationPlan, H3ShotMode, MVInfo } from '../types/mv-data';
import { useGlobalSettings } from '../stores/useGlobalSettings';
import { resolveReferenceImage } from '../utils/characterReferences';

const DURATION_OPTIONS = [
  { seconds: 5 as const, frames: 141 as const },
  { seconds: 10 as const, frames: 260 as const },
  { seconds: 15 as const, frames: 379 as const },
];

interface H3ShotControlsProps {
  info: MVInfo;
  segmentId: number;
  infoIndex: number;
}

export const H3ShotControls: React.FC<H3ShotControlsProps> = ({ info, segmentId, infoIndex }) => {
  const {
    h3GenerationMode,
    h3AudioMode,
    h3VideoLength,
    mvData,
    updateMVInfoGenerationPlan,
  } = useGlobalSettings();
  const fileRefs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];
  const [selectingReferenceIndex, setSelectingReferenceIndex] = useState<0 | 1 | null>(null);
  const fallbackDuration = DURATION_OPTIONS.find((item) => item.frames === h3VideoLength) ?? DURATION_OPTIONS[0];
  const plan: H3ShotGenerationPlan = info.generation_plan ?? {
    model: 'minimax-h3',
    mode: h3GenerationMode === 'reference-images' ? 'Ref2VA' : 'I2VA',
    duration_seconds: fallbackDuration.seconds,
    duration_frames: fallbackDuration.frames,
    audio_mode: h3AudioMode,
    reference_images: h3GenerationMode === 'reference-images'
      ? [
          { label: '<Picture 1>', purpose: '第一张人物、场景或风格参考图', prompt: '<Picture 1> 定义第一项必须保持的视觉参考。' },
        ]
      : [],
  };

  const commit = (next: H3ShotGenerationPlan) => updateMVInfoGenerationPlan(segmentId, infoIndex, next);
  const setMode = (mode: H3ShotMode) => commit({
    ...plan,
    mode,
    reference_images: mode === 'Ref2VA'
      ? (plan.reference_images.length >= 1 && plan.reference_images.length <= 2 ? plan.reference_images : [
          { label: '<Picture 1>', purpose: '人物、产品、场景或风格身份参考', prompt: '<Picture 1> 定义第一项必须保持的视觉参考。' },
        ])
      : [],
  });

  const handleReferenceFile = (index: 0 | 1, file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const refs = [...plan.reference_images];
      refs[index] = {
        ...refs[index],
        asset: { dataUrl: reader.result as string, filename: file.name },
      };
      commit({ ...plan, reference_images: refs });
      setSelectingReferenceIndex(null);
    };
    reader.readAsDataURL(file);
  };

  const selectCharacterReference = (index: 0 | 1, characterIndex: number) => {
    const character = mvData?.characters[characterIndex];
    if (!character?.generated_assets?.image) return;
    const refs = [...plan.reference_images];
    const current = refs[index];
    const oldName = current.source_character?.trim();
    const replaceOldName = (value: string) => (
      oldName && value.includes(oldName) ? value.split(oldName).join(character.name) : value
    );
    refs[index] = {
      ...current,
      source_character: character.name,
      source_character_id: character.id ?? character.character_id,
      purpose: replaceOldName(current.purpose),
      prompt: replaceOldName(current.prompt),
      asset: undefined,
    };
    commit({ ...plan, reference_images: refs });
    setSelectingReferenceIndex(null);
  };

  return (
    <div className="mb-4 rounded border border-fuchsia-400/20 bg-fuchsia-500/5 p-3">
      <div className="mb-2 flex flex-wrap gap-3">
        <label className="flex min-w-[150px] flex-1 flex-col gap-1 text-[10px] font-bold uppercase tracking-wider text-fuchsia-200">
          本镜头 H3 模式
          <select value={plan.mode} onChange={(event) => setMode(event.target.value as H3ShotMode)} className="rounded border border-white/10 bg-black/50 px-2 py-1.5 text-xs normal-case text-gray-200">
            <option value="I2VA">I2VA · 首帧推进</option>
            <option value="FL2VA">FL2VA · 首尾帧</option>
            <option value="Ref2VA">Ref2VA · 一至两张参考图</option>
          </select>
        </label>
        <label className="flex min-w-[120px] flex-col gap-1 text-[10px] font-bold uppercase tracking-wider text-fuchsia-200">
          本镜头时长
          <select value={plan.duration_seconds} onChange={(event) => {
            const duration = DURATION_OPTIONS.find((item) => item.seconds === Number(event.target.value)) ?? DURATION_OPTIONS[0];
            commit({ ...plan, duration_seconds: duration.seconds, duration_frames: duration.frames });
          }} className="rounded border border-white/10 bg-black/50 px-2 py-1.5 text-xs normal-case text-gray-200">
            {DURATION_OPTIONS.map((item) => <option key={item.seconds} value={item.seconds}>{item.seconds} 秒 · {item.frames} 帧</option>)}
          </select>
        </label>
        <label className="flex min-w-[150px] flex-1 flex-col gap-1 text-[10px] font-bold uppercase tracking-wider text-fuchsia-200">
          本镜头音频
          <select value={plan.audio_mode} onChange={(event) => commit({ ...plan, audio_mode: event.target.value as H3ShotGenerationPlan['audio_mode'] })} className="rounded border border-white/10 bg-black/50 px-2 py-1.5 text-xs normal-case text-gray-200">
            <option value="native-audio">H3 原生声画</option>
            <option value="drive-audio">Drive Audio</option>
            <option value="reference-audio">参考音乐</option>
            <option value="no-audio">静音导出</option>
          </select>
        </label>
      </div>

      {plan.mode === 'Ref2VA' && (
        <div className="border-t border-white/10 pt-2">
          <div className="grid gap-2 lg:grid-cols-2">
          {plan.reference_images.map((reference, rawIndex) => {
            const index = rawIndex as 0 | 1;
            const resolvedImage = resolveReferenceImage(mvData?.characters ?? [], reference);
            return (
              <div key={index} className="flex gap-2 rounded border border-white/10 bg-black/30 p-2">
                <input ref={fileRefs[index]} type="file" accept="image/*" className="hidden" onChange={(event) => handleReferenceFile(index, event.target.files?.[0])} />
                <button type="button" onClick={() => setSelectingReferenceIndex(index)} title="从人物展示选择角色图片" className="relative flex h-16 w-24 shrink-0 items-center justify-center overflow-hidden rounded border border-dashed border-fuchsia-300/30 hover:border-cyan-300/60">
                  {resolvedImage ? <img src={resolvedImage.dataUrl} alt={reference.label} className="h-full w-full object-cover" /> : <ImagePlus size={18} className="text-gray-500" />}
                  <span className="absolute inset-x-0 bottom-0 bg-black/70 py-0.5 text-center text-[8px] text-cyan-200">选择人物</span>
                </button>
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center justify-between text-[10px] text-fuchsia-200">
                    <span>{reference.label}</span>
                    {index === 1 ? (
                      <button type="button" title="移除第二张参考图" onClick={() => {
                        setSelectingReferenceIndex(null);
                        commit({ ...plan, reference_images: plan.reference_images.slice(0, 1) });
                      }} className="flex items-center gap-1 text-gray-400 hover:text-red-300"><X size={12} />移除</button>
                    ) : reference.asset && <button type="button" title="清除本地覆盖图片" onClick={() => {
                      const refs = [...plan.reference_images];
                      refs[index] = { ...reference, asset: undefined };
                      commit({ ...plan, reference_images: refs });
                    }}><X size={12} /></button>}
                  </div>
                  <input value={reference.source_character ?? ''} onChange={(event) => {
                    const refs = [...plan.reference_images];
                    refs[index] = { ...reference, source_character: event.target.value || undefined };
                    commit({ ...plan, reference_images: refs });
                  }} placeholder="可填项目人物名称自动取图" className="w-full rounded border border-white/10 bg-black/50 px-2 py-1 text-[10px] text-gray-200" />
                  <input value={reference.prompt} onChange={(event) => {
                    const refs = [...plan.reference_images];
                    refs[index] = { ...reference, prompt: event.target.value };
                    commit({ ...plan, reference_images: refs });
                  }} className="w-full rounded border border-white/10 bg-black/50 px-2 py-1 text-[10px] text-gray-200" />
                  {resolvedImage?.source === 'character' && (
                    <p className="truncate text-[9px] text-cyan-300">已从人物展示自动引用：{resolvedImage.character?.name}</p>
                  )}
                  {!resolvedImage && reference.source_character && (
                    <p className="truncate text-[9px] text-amber-300">人物展示中未找到同名/同 ID 的已生成图片</p>
                  )}
                </div>
              </div>
            );
          })}
          </div>
          {plan.reference_images.length === 1 && (
            <button type="button" onClick={() => commit({
              ...plan,
              reference_images: [
                ...plan.reference_images,
                { label: '<Picture 2>', purpose: '可选的第二张人物、产品、场景或风格参考', prompt: '<Picture 2> 定义第二项需要保持的视觉参考。' },
              ],
            })} className="mt-2 flex w-full items-center justify-center gap-2 rounded border border-dashed border-cyan-300/30 bg-cyan-500/5 px-3 py-2 text-xs text-cyan-200 hover:border-cyan-300/60 hover:bg-cyan-500/10">
              <ImagePlus size={14} /> 添加第二张参考图（可选）
            </button>
          )}
        </div>
      )}
      {selectingReferenceIndex !== null && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm" onClick={() => setSelectingReferenceIndex(null)}>
          <div className="w-full max-w-3xl rounded-xl border border-cyan-300/30 bg-[#171923] p-5 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-white">选择 {plan.reference_images[selectingReferenceIndex].label} 的人物</h3>
                <p className="mt-1 text-xs text-gray-400">图片来自“人物展示”；选择后自动绑定同名/同 ID 角色。</p>
              </div>
              <button type="button" onClick={() => setSelectingReferenceIndex(null)} className="rounded p-2 text-gray-400 hover:bg-white/10 hover:text-white"><X size={18} /></button>
            </div>

            <div className="grid max-h-[60vh] grid-cols-2 gap-3 overflow-y-auto pr-1 sm:grid-cols-3 md:grid-cols-4">
              {(mvData?.characters ?? []).map((character, characterIndex) => {
                const imageUrl = character.generated_assets?.image;
                const referenceCharacterId = plan.reference_images[selectingReferenceIndex].source_character_id;
                const characterId = character.id ?? character.character_id;
                const selected = plan.reference_images[selectingReferenceIndex].source_character === character.name
                  || (referenceCharacterId !== undefined && characterId !== undefined && String(referenceCharacterId) === String(characterId));
                return (
                  <button
                    type="button"
                    key={`${character.id ?? character.character_id ?? character.name}-${characterIndex}`}
                    disabled={!imageUrl}
                    onClick={() => selectCharacterReference(selectingReferenceIndex, characterIndex)}
                    className={`overflow-hidden rounded-lg border text-left transition ${selected ? 'border-cyan-300 bg-cyan-500/10 ring-1 ring-cyan-300/50' : 'border-white/10 bg-black/30 hover:border-cyan-300/40'} disabled:cursor-not-allowed disabled:opacity-40`}
                  >
                    <div className="flex aspect-video items-center justify-center overflow-hidden bg-black/50">
                      {imageUrl ? <img src={imageUrl} alt={character.name} className="h-full w-full object-cover" /> : <UserRound size={24} className="text-gray-600" />}
                    </div>
                    <div className="p-2">
                      <p className="truncate text-xs font-bold text-white">{character.name}</p>
                      <p className="mt-0.5 truncate text-[9px] text-gray-500">{imageUrl ? character.role || '人物' : '尚未生成人物图片'}</p>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-4">
              <p className="text-[10px] text-gray-500">人物展示没有合适图片时，可以使用本地图片覆盖。</p>
              <button type="button" onClick={() => fileRefs[selectingReferenceIndex].current?.click()} className="flex items-center gap-2 rounded border border-white/15 bg-white/5 px-3 py-2 text-xs text-gray-200 hover:border-cyan-300/40 hover:text-cyan-200">
                <UploadCloud size={14} /> 本地上传
              </button>
            </div>
          </div>
        </div>
      )}
      {!info.generation_plan && <p className="mt-2 text-[9px] text-gray-500">当前显示全局兼容默认值；修改任意选项后会写入本镜头计划。</p>}
    </div>
  );
};
