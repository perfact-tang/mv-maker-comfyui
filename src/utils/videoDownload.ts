import type JSZip from 'jszip';
import type { StoryboardSegment } from '../types/mv-data';

export const generatedVideoEntries = (storyboard: StoryboardSegment[]) => storyboard.flatMap(segment => (
  segment.mvinfo.flatMap((shot, index) => shot.generated_assets?.video ? [{
    url: shot.generated_assets.video,
    filename: `segment_${segment.segment_id}_scene_${index + 1}.mp4`,
  }] : [])
));

/** Only completed videos are included; keep original scene numbers across gaps. */
export const addGeneratedVideosToZip = async (folder: JSZip, videos: ReturnType<typeof generatedVideoEntries>) => {
  for (const video of videos) {
    try {
      const response = await fetch(video.url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      if (response.headers.get('content-type')?.includes('text/html')) throw new Error('视频链接已失效');
      const bytes = await response.arrayBuffer();
      if (!bytes.byteLength) throw new Error('视频文件为空');
      folder.file(video.filename, bytes);
    } catch (error) {
      throw new Error(`${video.filename} 下载失败：${error instanceof Error ? error.message : String(error)}`);
    }
  }
};
