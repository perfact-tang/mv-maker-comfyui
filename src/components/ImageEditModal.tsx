import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  ImagePlus,
  Loader2,
  Sparkles,
  Upload,
  Workflow,
  X,
} from 'lucide-react';
import { executeComfyWorkflow, uploadImageToComfy } from '../utils/comfyApi';
import { createQwenImageEditWorkflow, IMAGE_EDIT_WORKFLOW_NAME } from '../utils/imageEditWorkflow';

interface ImageEditModalProps {
  isOpen: boolean;
  characterName: string;
  currentImage?: string;
  sourceHelper?: string;
  successMessage?: string;
  staleOutputWarning?: string;
  referenceCandidates?: Array<{
    name: string;
    imageUrl: string;
    role?: string;
  }>;
  onClose: () => void;
  onApply: (imageUrl: string) => void;
}

interface ImageSelection {
  url: string;
  file?: File;
}

const DEFAULT_PROMPT = '使用参考图一的画面，然后把参考图二的人脸（尤其是五官）换到参考图一上。';

const imageToBlob = async (image: ImageSelection) => {
  if (image.file) return image.file;
  const response = await fetch(image.url);
  if (!response.ok) throw new Error(`读取参考图失败（${response.status}）`);
  return response.blob();
};

const ReferenceImageField: React.FC<{
  id: string;
  label: string;
  helper: string;
  selection: ImageSelection | null;
  onChange: (selection: ImageSelection) => void;
}> = ({ id, label, helper, selection, onChange }) => {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="min-w-0">
      <div className="mb-2 flex items-end justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-white">{label}</p>
          <p className="mt-0.5 text-[11px] text-gray-500">{helper}</p>
        </div>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="inline-flex flex-none items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-[11px] text-gray-300 transition-colors hover:border-neon-cyan/40 hover:text-white"
        >
          <Upload size={12} /> {selection ? '替换' : '上传'}
        </button>
      </div>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="group relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-xl border border-dashed border-white/15 bg-black/35 text-gray-500 transition-colors hover:border-neon-cyan/45 hover:bg-black/50"
      >
        {selection ? (
          <img src={selection.url} alt={label} className="h-full w-full object-contain" />
        ) : (
          <span className="flex flex-col items-center gap-2 text-xs">
            <ImagePlus size={28} strokeWidth={1.4} />
            点击选择图片
          </span>
        )}
        {selection && (
          <span className="absolute inset-x-0 bottom-0 bg-black/70 py-2 text-center text-[11px] text-gray-300 opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100">
            点击替换图片
          </span>
        )}
      </button>
      <input
        ref={inputRef}
        id={id}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (!file) return;
          onChange({ file, url: URL.createObjectURL(file) });
          event.target.value = '';
        }}
      />
    </div>
  );
};

export const ImageEditModal: React.FC<ImageEditModalProps> = ({
  isOpen,
  characterName,
  currentImage,
  sourceHelper = '人物当前生成图 · 修改后将被覆盖',
  successMessage = '新图已生成，并已覆盖人物当前生成图。',
  staleOutputWarning = '生成后将覆盖当前人物图片。',
  referenceCandidates,
  onClose,
  onApply,
}) => {
  const [sourceImage, setSourceImage] = useState<ImageSelection | null>(null);
  const [referenceImage, setReferenceImage] = useState<ImageSelection | null>(null);
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  const wasOpenRef = useRef(false);

  useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      setSourceImage(currentImage ? { url: currentImage } : null);
      setReferenceImage(null);
      setPrompt(DEFAULT_PROMPT);
      setError(null);
      setIsComplete(false);
    }
    wasOpenRef.current = isOpen;
  }, [currentImage, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isGenerating) onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isGenerating, isOpen, onClose]);

  if (!isOpen) return null;

  const handleGenerate = async () => {
    if (!sourceImage || !referenceImage) {
      setError('请先准备参考图一和参考图二。');
      return;
    }
    if (!prompt.trim()) {
      setError('请输入需要 AI 执行的修改描述。');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setIsComplete(false);
    try {
      const timestamp = Date.now();
      const [sourceFilename, referenceFilename] = await Promise.all([
        imageToBlob(sourceImage).then((blob) => uploadImageToComfy(blob, `qwen_edit_source_${timestamp}.png`)),
        imageToBlob(referenceImage).then((blob) => uploadImageToComfy(blob, `qwen_edit_reference_${timestamp}.png`)),
      ]);
      const workflow = createQwenImageEditWorkflow({
        sourceImage: sourceFilename,
        referenceImage: referenceFilename,
        prompt: prompt.trim(),
      });
      const outputs = await executeComfyWorkflow(workflow);
      const resultImage = outputs.images.find((url) => url.includes('type=output')) ?? outputs.images[0];
      if (!resultImage) throw new Error('工作流已执行，但没有返回图片。');

      setSourceImage({ url: resultImage });
      setIsComplete(true);
      onApply(resultImage);
    } catch (generationError) {
      setError(generationError instanceof Error ? generationError.message : String(generationError));
    } finally {
      setIsGenerating(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isGenerating) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="image-edit-title"
        className="max-h-[calc(100vh-2rem)] w-full max-w-4xl overflow-y-auto rounded-2xl border border-white/10 bg-[#11121b] shadow-[0_28px_100px_rgba(0,0,0,0.7)]"
      >
        <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-white/10 bg-[#11121b]/95 px-5 py-4 backdrop-blur md:px-6">
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-md border border-neon-cyan/25 bg-neon-cyan/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-cyan-200">
                <Workflow size={12} /> 当前工作流
              </span>
              <span className="text-xs font-semibold text-white">{IMAGE_EDIT_WORKFLOW_NAME}</span>
            </div>
            <h2 id="image-edit-title" className="text-xl font-bold text-white md:text-2xl">AI 图片修改</h2>
            <p className="mt-1 text-xs text-gray-500">{characterName} · 用第二张图调整第一张图</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isGenerating}
            aria-label="关闭图片编辑"
            className="rounded-lg border border-white/10 p-2 text-gray-400 transition-colors hover:bg-white/5 hover:text-white disabled:opacity-40"
          >
            <X size={18} />
          </button>
        </header>

        <div className="p-5 md:p-6">
          <div className="grid items-center gap-4 md:grid-cols-[1fr_auto_1fr]">
            <ReferenceImageField
              id="qwen-edit-source"
              label="参考图一"
              helper={sourceHelper}
              selection={sourceImage}
              onChange={setSourceImage}
            />
            <ArrowRight className="mx-auto hidden text-gray-700 md:block" size={20} />
            <ReferenceImageField
              id="qwen-edit-reference"
              label="参考图二"
              helper="人脸、服装或风格参考"
              selection={referenceImage}
              onChange={setReferenceImage}
            />
          </div>

          {referenceCandidates !== undefined && (
          <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-3 md:ml-[calc(50%+18px)]">
            <div className="mb-2 flex items-center justify-between gap-3">
              <span className="text-[11px] font-bold text-gray-300">从人物展示选择</span>
              <span className="text-[10px] text-gray-600">用于参考图二</span>
            </div>
            {referenceCandidates.length > 0 ? (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {referenceCandidates.map((candidate) => {
                  const isSelected = referenceImage?.url === candidate.imageUrl;
                  return (
                    <button
                      key={`${candidate.name}-${candidate.imageUrl}`}
                      type="button"
                      onClick={() => setReferenceImage({ url: candidate.imageUrl })}
                      aria-pressed={isSelected}
                      className={`flex min-w-0 items-center gap-2 rounded-lg border p-1.5 text-left transition-colors ${
                        isSelected
                          ? 'border-neon-cyan/60 bg-neon-cyan/10'
                          : 'border-white/10 bg-white/[0.03] hover:border-white/25'
                      }`}
                    >
                      <img
                        src={candidate.imageUrl}
                        alt={candidate.name}
                        className="h-9 w-9 flex-none rounded-md object-cover"
                      />
                      <span className="min-w-0">
                        <span className="block truncate text-[11px] font-medium text-gray-200">{candidate.name}</span>
                        <span className="block truncate text-[9px] text-gray-600">{candidate.role || '人物展示'}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="text-[11px] text-gray-600">人物展示暂无已生成的角色图片，也可以直接上传参考图。</p>
            )}
          </div>
          )}

          <label htmlFor="qwen-edit-prompt" className="mt-6 block">
            <span className="mb-2 block text-sm font-bold text-white">修改描述</span>
            <textarea
              id="qwen-edit-prompt"
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              rows={4}
              placeholder="例如：保留参考图一的构图和服装，将人物面部替换为参考图二中的人脸。"
              className="w-full resize-y rounded-xl border border-white/10 bg-black/35 p-4 text-sm leading-6 text-gray-200 outline-none transition-colors placeholder:text-gray-700 focus:border-neon-cyan/50"
            />
          </label>

          {error && (
            <div className="mt-4 flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-950/25 px-3 py-2.5 text-xs text-red-300">
              <AlertCircle size={15} className="mt-0.5 flex-none" /> {error}
            </div>
          )}
          {isComplete && !error && (
            <div className="mt-4 flex items-center gap-2 rounded-lg border border-emerald-400/20 bg-emerald-950/20 px-3 py-2.5 text-xs text-emerald-300">
              <CheckCircle2 size={15} /> {successMessage}
            </div>
          )}

          <div className="mt-6 flex flex-col-reverse gap-3 border-t border-white/10 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[11px] leading-5 text-gray-600">{staleOutputWarning}</p>
            <button
              type="button"
              onClick={handleGenerate}
              disabled={isGenerating}
              className="inline-flex min-w-[150px] items-center justify-center gap-2 rounded-lg bg-neon-magenta px-5 py-3 text-sm font-bold text-white shadow-[0_0_20px_rgba(217,70,239,0.24)] transition-colors hover:bg-fuchsia-500 disabled:cursor-wait disabled:opacity-60"
            >
              {isGenerating ? <Loader2 size={17} className="animate-spin" /> : <Sparkles size={17} />}
              {isGenerating ? 'AI 生成中' : 'AI 生成'}
            </button>
          </div>
        </div>
      </section>
    </div>,
    document.body,
  );
};

