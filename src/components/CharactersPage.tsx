import React, { forwardRef, useCallback, useImperativeHandle, useRef, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  Fingerprint,
  Loader2,
  PencilLine,
  Play,
  Sparkles,
  UserRound,
  WandSparkles,
} from 'lucide-react';
import { CharacterProfile } from '../types/mv-data';
import { useGlobalSettings } from '../stores/useGlobalSettings';
import { generateComfyImage } from '../utils/comfyApi';
import { VIDEO_DIMENSIONS } from '../utils/characterVideoWorkflow';
import { VideoOrientationControl } from './VideoOrientationControl';
import { ImageEditModal } from './ImageEditModal';

interface CharactersPageProps {
  characters: CharacterProfile[];
  directionName: string;
  proposalId: number;
}

interface CharacterCardHandle {
  generate: () => Promise<void>;
}

interface CharacterCardProps {
  character: CharacterProfile;
  index: number;
}

type GenerationStage = 'idle' | 'image' | 'done';

const CharacterGenerationCard = forwardRef<CharacterCardHandle, CharacterCardProps>(({ character, index }, ref) => {
  const {
    selectedWorkflow,
    videoOrientation,
    updateCharacterDescription,
    replaceCharacterImage,
  } = useGlobalSettings();
  const [stage, setStage] = useState<GenerationStage>('idle');
  const [error, setError] = useState<string | null>(null);
  const [isImageEditOpen, setIsImageEditOpen] = useState(false);
  const dimensions = character.reference_sheet
    ? VIDEO_DIMENSIONS.landscape
    : VIDEO_DIMENSIONS[videoOrientation];
  const isGenerating = stage === 'image';

  const generate = useCallback(async () => {
    if (isGenerating) return;
    const description = character.description.trim();
    if (!description) {
      setError('请先填写人物描述。');
      return;
    }

    setError(null);
    try {
      setStage('image');
      const imageUrl = await generateComfyImage(
        description,
        undefined,
        selectedWorkflow,
        dimensions,
      );
      replaceCharacterImage(index, imageUrl);
      setStage('done');
    } catch (generationError) {
      setStage('idle');
      setError(generationError instanceof Error ? generationError.message : String(generationError));
    }
  }, [
    character.description,
    dimensions,
    index,
    isGenerating,
    replaceCharacterImage,
    selectedWorkflow,
  ]);

  useImperativeHandle(ref, () => ({ generate }), [generate]);

  return (
    <article className="glass-card overflow-hidden rounded-2xl border border-white/10 p-5 md:p-6">
      <div className="grid gap-6 lg:grid-cols-[minmax(280px,0.9fr)_minmax(0,1.1fr)]">
        <div className="flex min-h-[250px] items-center justify-center rounded-xl border border-white/10 bg-black/35 p-3">
          <div
            onClick={() => setIsImageEditOpen(true)}
            className={`relative w-full cursor-pointer overflow-hidden rounded-lg bg-black ${videoOrientation === 'portrait' ? 'max-w-[220px]' : 'max-w-full'}`}
            style={{ aspectRatio: `${dimensions.width} / ${dimensions.height}` }}
          >
            {character.generated_assets?.image ? (
              <img src={character.generated_assets.image} alt={`${character.name} 生成预览`} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-3 text-gray-600">
                <UserRound size={36} strokeWidth={1.3} />
                <span className="text-xs">等待生成人物图片</span>
              </div>
            )}
            <span className="absolute left-2 top-2 rounded-md border border-white/10 bg-black/70 px-2 py-1 font-mono text-[10px] text-gray-300 backdrop-blur">
              {dimensions.label} · {dimensions.width}×{dimensions.height}
            </span>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                setIsImageEditOpen(true);
              }}
              className="absolute bottom-2 right-2 inline-flex items-center gap-1.5 rounded-md border border-white/15 bg-black/75 px-2.5 py-1.5 text-[11px] font-medium text-gray-200 opacity-80 backdrop-blur transition-all hover:border-neon-cyan/40 hover:text-white hover:opacity-100"
            >
              <PencilLine size={12} /> 图片编辑
            </button>
          </div>
        </div>

        <div className="flex min-w-0 flex-col">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="mb-1 font-mono text-[10px] uppercase tracking-[0.2em] text-gray-600">Character {String(index + 1).padStart(2, '0')}</p>
              <h3 className="text-2xl font-bold text-white">{character.name}</h3>
            </div>
            <span className="rounded-full border border-neon-magenta/30 bg-neon-magenta/10 px-3 py-1 text-[10px] font-bold tracking-wider text-fuchsia-200">
              {character.role || '人物'}
            </span>
          </div>

          <label htmlFor={`character-description-${index}`} className="mb-2 mt-5 text-[10px] font-bold uppercase tracking-[0.18em] text-gray-500">
            人物描述 / 生成提示词
          </label>
          <textarea
            id={`character-description-${index}`}
            value={character.description}
            onChange={(event) => updateCharacterDescription(index, event.target.value)}
            rows={6}
            className="min-h-[150px] w-full resize-y rounded-xl border border-white/10 bg-black/30 p-4 text-sm leading-7 text-gray-200 outline-none transition-colors placeholder:text-gray-700 focus:border-neon-cyan/50 focus:bg-black/45"
            placeholder="描述人物的外观、服装、气质、动作与镜头表现……"
          />

          {character.traits && character.traits.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {character.traits.map((trait) => (
                <span key={trait} className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-black/20 px-2.5 py-1.5 text-[11px] text-gray-400">
                  <Sparkles size={10} className="text-neon-cyan" /> {trait}
                </span>
              ))}
            </div>
          )}

          <div className="mt-auto pt-5">
            {error && (
              <div className="mb-3 flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-950/25 px-3 py-2 text-xs text-red-300">
                <AlertCircle size={14} className="mt-0.5 flex-none" /> {error}
              </div>
            )}
            <button
              type="button"
              onClick={generate}
              disabled={isGenerating}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-neon-cyan px-4 py-3 text-sm font-bold text-black shadow-[0_0_18px_rgba(6,182,212,0.22)] transition-all hover:bg-cyan-300 disabled:cursor-wait disabled:opacity-60"
            >
              {stage === 'image' ? <><Loader2 size={17} className="animate-spin" /> 正在生成人物图片</> :
                stage === 'done' ? <><CheckCircle2 size={17} /> 重新生成人物图片</> :
                <><Play size={17} /> 生成人物图片</>}
            </button>
          </div>
        </div>
      </div>
      <ImageEditModal
        isOpen={isImageEditOpen}
        characterName={character.name}
        currentImage={character.generated_assets?.image}
        onClose={() => setIsImageEditOpen(false)}
        onApply={(imageUrl) => replaceCharacterImage(index, imageUrl)}
      />
    </article>
  );
});

CharacterGenerationCard.displayName = 'CharacterGenerationCard';

export const CharactersPage: React.FC<CharactersPageProps> = ({ characters, directionName, proposalId }) => {
  const {
    selectedWorkflow,
    setSelectedWorkflow,
    videoOrientation,
    setVideoOrientation,
  } = useGlobalSettings();
  const cardRefs = useRef<Array<CharacterCardHandle | null>>([]);
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);
  const dimensions = VIDEO_DIMENSIONS[videoOrientation];
  const usesReferenceSheets = characters.some((character) => Boolean(character.reference_sheet));

  const generateAll = async () => {
    if (isGeneratingAll) return;
    setIsGeneratingAll(true);
    try {
      for (let index = 0; index < characters.length; index += 1) {
        await cardRefs.current[index]?.generate();
      }
    } finally {
      setIsGeneratingAll(false);
    }
  };

  return (
    <main className="animate-in fade-in slide-in-from-bottom-2 duration-500">
      <section className="mb-8">
        <div className="mb-8 flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div>
            <div className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.24em] text-neon-cyan">
              <Fingerprint size={14} /> Character studio
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-white md:text-4xl">人物展示</h1>
            <p className="mt-2 text-sm text-gray-500">{directionName} · 提案 {String(proposalId).padStart(3, '0')}</p>
          </div>
          <button
            type="button"
            onClick={generateAll}
            disabled={isGeneratingAll}
            className="flex items-center justify-center gap-2 rounded-lg bg-neon-magenta px-5 py-3 text-sm font-bold text-white shadow-[0_0_20px_rgba(217,70,239,0.25)] transition-all hover:bg-fuchsia-500 disabled:cursor-wait disabled:opacity-60"
          >
            {isGeneratingAll ? <Loader2 size={17} className="animate-spin" /> : <WandSparkles size={17} />}
            {isGeneratingAll ? '正在逐个生成图片' : '全部生成人物图片'}
          </button>
        </div>

        <div className="glass-card grid gap-5 rounded-2xl border border-white/10 p-5 lg:grid-cols-[1fr_1.25fr]">
          <label className="block">
            <span className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-gray-500">首帧生成 Workflow</span>
            <span className="relative block">
              <select value={selectedWorkflow} onChange={(event) => setSelectedWorkflow(event.target.value)} className="w-full appearance-none rounded-lg border border-white/10 bg-black/35 px-3 py-2.5 pr-9 text-xs text-gray-200 outline-none focus:border-neon-cyan/50">
                <option value="Krea2 Turbo">Krea2 Turbo</option>
                <option value="Z-Image-Turbo">Z-Image-Turbo</option>
              </select>
              <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-500" />
            </span>
          </label>
          <div>
            <span className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-gray-500">本次生成尺寸</span>
            {usesReferenceSheets ? (
              <div className="rounded-lg border border-neon-cyan/20 bg-neon-cyan/5 px-3 py-2.5 text-xs text-cyan-100">
                角色参考设定板固定横版 · {VIDEO_DIMENSIONS.landscape.width} × {VIDEO_DIMENSIONS.landscape.height}
              </div>
            ) : (
              <VideoOrientationControl value={videoOrientation} onChange={setVideoOrientation} />
            )}
          </div>
        </div>

        <p className="mt-3 text-right font-mono text-[10px] text-gray-600">
          当前输出：{usesReferenceSheets ? VIDEO_DIMENSIONS.landscape.label : dimensions.label} · {usesReferenceSheets ? VIDEO_DIMENSIONS.landscape.width : dimensions.width} × {usesReferenceSheets ? VIDEO_DIMENSIONS.landscape.height : dimensions.height}
        </p>
      </section>

      <section className="space-y-5" aria-label="人物生成列表">
        {characters.map((character, index) => (
          <CharacterGenerationCard
            key={`${character.name}-${index}`}
            ref={(node) => { cardRefs.current[index] = node; }}
            character={character}
            index={index}
          />
        ))}
      </section>
    </main>
  );
};
