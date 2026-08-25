const MAX_CHARACTER_IMAGE_INPUT_BYTES = 40 * 1024 * 1024;
const MAX_CHARACTER_IMAGE_DIMENSION = 1600;
const TARGET_CHARACTER_IMAGE_BYTES = 450 * 1024;

export interface CompressedProjectImage {
  dataUrl: string;
  mimeType: string;
  originalBytes: number;
  outputBytes: number;
  originalWidth: number;
  originalHeight: number;
  outputWidth: number;
  outputHeight: number;
}

const blobToDataUrl = (blob: Blob) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => typeof reader.result === 'string'
    ? resolve(reader.result)
    : reject(new Error('图片读取失败，请重试。'));
  reader.onerror = () => reject(reader.error || new Error('图片读取失败，请重试。'));
  reader.readAsDataURL(blob);
});

const loadImageFile = (file: File) => new Promise<HTMLImageElement>((resolve, reject) => {
  const objectUrl = URL.createObjectURL(file);
  const image = new Image();
  image.onload = () => {
    URL.revokeObjectURL(objectUrl);
    resolve(image);
  };
  image.onerror = () => {
    URL.revokeObjectURL(objectUrl);
    reject(new Error('无法识别这张图片，请换用 PNG、JPG、WebP 等常见格式。'));
  };
  image.src = objectUrl;
});

const canvasToBlob = (canvas: HTMLCanvasElement, quality: number) => new Promise<Blob>((resolve, reject) => {
  canvas.toBlob(
    (blob) => blob ? resolve(blob) : reject(new Error('图片压缩失败，请重试。')),
    'image/webp',
    quality,
  );
});

export const compressProjectImage = async (file: File): Promise<CompressedProjectImage> => {
  if (!file.type.startsWith('image/')) {
    throw new Error('请选择有效的图片文件。');
  }
  if (file.size > MAX_CHARACTER_IMAGE_INPUT_BYTES) {
    throw new Error('原始图片不能超过 40 MB。');
  }

  const image = await loadImageFile(file);
  const originalWidth = image.naturalWidth;
  const originalHeight = image.naturalHeight;
  if (!originalWidth || !originalHeight) throw new Error('无法读取图片尺寸。');

  if (
    file.size <= TARGET_CHARACTER_IMAGE_BYTES
    && Math.max(originalWidth, originalHeight) <= MAX_CHARACTER_IMAGE_DIMENSION
  ) {
    return {
      dataUrl: await blobToDataUrl(file),
      mimeType: file.type,
      originalBytes: file.size,
      outputBytes: file.size,
      originalWidth,
      originalHeight,
      outputWidth: originalWidth,
      outputHeight: originalHeight,
    };
  }

  const initialScale = Math.min(1, MAX_CHARACTER_IMAGE_DIMENSION / Math.max(originalWidth, originalHeight));
  let outputWidth = Math.max(1, Math.round(originalWidth * initialScale));
  let outputHeight = Math.max(1, Math.round(originalHeight * initialScale));
  let quality = 0.86;
  let outputBlob: Blob | null = null;

  for (let attempt = 0; attempt < 20; attempt += 1) {
    const canvas = document.createElement('canvas');
    canvas.width = outputWidth;
    canvas.height = outputHeight;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('当前浏览器无法压缩图片。');
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    context.drawImage(image, 0, 0, outputWidth, outputHeight);
    outputBlob = await canvasToBlob(canvas, quality);

    if (outputBlob.size <= TARGET_CHARACTER_IMAGE_BYTES) break;
    if (quality > 0.58) {
      quality = Math.max(0.58, quality - 0.08);
    } else if (Math.max(outputWidth, outputHeight) > 720) {
      outputWidth = Math.max(1, Math.round(outputWidth * 0.82));
      outputHeight = Math.max(1, Math.round(outputHeight * 0.82));
      quality = 0.78;
    } else {
      break;
    }
  }

  if (!outputBlob) throw new Error('图片压缩失败，请重试。');
  return {
    dataUrl: await blobToDataUrl(outputBlob),
    mimeType: outputBlob.type,
    originalBytes: file.size,
    outputBytes: outputBlob.size,
    originalWidth,
    originalHeight,
    outputWidth,
    outputHeight,
  };
};

export const formatFileSize = (bytes: number) => bytes >= 1024 * 1024
  ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
  : `${Math.max(1, Math.round(bytes / 1024))} KB`;

export const isStorageQuotaError = (error: unknown) => {
  const detail = error instanceof Error ? `${error.name} ${error.message}` : String(error);
  return /quota|storage.*exceed/i.test(detail);
};

export const describeImageOptimization = (image: CompressedProjectImage) => {
  const wasOptimized = image.outputBytes < image.originalBytes
    || image.outputWidth !== image.originalWidth
    || image.outputHeight !== image.originalHeight;
  return wasOptimized
    ? `图片已自动优化：${formatFileSize(image.originalBytes)} → ${formatFileSize(image.outputBytes)}，${image.outputWidth}×${image.outputHeight}`
    : `图片已上传：${formatFileSize(image.outputBytes)}，${image.outputWidth}×${image.outputHeight}`;
};

export const compressedImageFilename = (filename: string, image: CompressedProjectImage) => {
  if (image.mimeType !== 'image/webp') return filename;
  const basename = filename.replace(/\.[^.]+$/, '') || 'reference-image';
  return `${basename}.webp`;
};
