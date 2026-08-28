import assert from 'node:assert/strict';
import JSZip from 'jszip';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Header } from '../components/Header';
import { useGlobalSettings } from '../stores/useGlobalSettings';
import type { MVInfo, MVScriptData, StoryboardSegment } from '../types/mv-data';
import { addGeneratedVideosToZip, generatedVideoEntries } from './videoDownload';

const shot = (video?: string, prompt = 'animate'): MVInfo => ({
  timestamp: '00:00 - 00:05', type: 'New_Scene', lyrics: '', video_prompt: prompt,
  generated_assets: video ? { video } : undefined,
});
const segment = (id: number, shots: MVInfo[]): StoryboardSegment => ({
  segment_id: id, mvinfo: shots, movielength: '00:00-00:15',
  prompts: { first_frame: '', last_frame: '' }, content_narrative: '',
});
const project: MVScriptData = {
  proposal_id: 1, direction_name: 'partial videos', characters: [],
  basics: { outline: '', shooting_method: '', art_style_description: '' },
  storyboard: [segment(1, [shot('/one.mp4'), shot(), shot('/three.mp4', '')]), segment(2, [shot(), shot('/five.mp4')])],
};

const run = async () => {
  const originalFetch = globalThis.fetch;
  // Server rendering reads Zustand's initial snapshot, not its live client state.
  const initialState = useGlobalSettings.getInitialState();
  const originalProject = initialState.mvData;
  const before = JSON.stringify(project);
  try {
    const videos = generatedVideoEntries(project.storyboard);
    assert.deepEqual(videos.map(v => v.filename), ['segment_1_scene_1.mp4', 'segment_1_scene_3.mp4', 'segment_2_scene_2.mp4']);
    assert.equal(generatedVideoEntries([]).length, 0);
    assert.equal(generatedVideoEntries([segment(1, [shot(), shot(undefined, '')])]).length, 0);
    const renderHeader = (storyboard: StoryboardSegment[]) => {
      initialState.mvData = { ...project, storyboard };
      return renderToStaticMarkup(createElement(Header, { title: project.direction_name, proposalId: 1 }));
    };
    assert(!renderHeader([]).includes('下载所有动画'), 'empty project hides download');
    assert(!renderHeader([segment(1, [shot()])]).includes('下载所有动画'), 'no completed videos hides download');
    assert(renderHeader([segment(1, [shot('/one.mp4'), shot()])]).includes('下载所有动画（1）'), 'one completed video shows download despite pending shots');
    assert(renderHeader(project.storyboard).includes('下载所有动画（3）'), 'partial project shows total completed videos across segments');
    assert(renderHeader([segment(1, [shot('/one.mp4')])]).includes('下载所有动画（1）'), 'fully completed project still downloads');

    const fetched: string[] = [];
    globalThis.fetch = async (url) => {
      fetched.push(String(url));
      return new Response(new TextEncoder().encode(`video:${url}`), { headers: { 'content-type': 'video/mp4' } });
    };
    const zip = new JSZip();
    await addGeneratedVideosToZip(zip.folder('videos')!, videos);
    const reopened = await JSZip.loadAsync(await zip.generateAsync({ type: 'uint8array' }));
    assert.deepEqual(fetched, ['/one.mp4', '/three.mp4', '/five.mp4']);
    assert.deepEqual(Object.values(reopened.files).filter(f => !f.dir).map(f => f.name), videos.map(v => `videos/${v.filename}`));
    for (const video of videos) assert.equal(await reopened.file(`videos/${video.filename}`)!.async('string'), `video:${video.url}`);
    for (const response of [new Response(null, { status: 404 }), new Response(''), new Response('<html>fallback</html>', { headers: { 'content-type': 'text/html' } })]) {
      globalThis.fetch = async () => response;
      await assert.rejects(() => addGeneratedVideosToZip(new JSZip(), videos), /segment_1_scene_1.mp4 下载失败/);
    }
    globalThis.fetch = async () => { throw new Error('offline'); };
    await assert.rejects(() => addGeneratedVideosToZip(new JSZip(), videos), /offline/);
    assert.equal(JSON.stringify(project), before, 'download does not modify project or media');
    console.log('PASS partial-video download button, ZIP contents, stable numbering and readable download errors');
  } finally {
    globalThis.fetch = originalFetch;
    initialState.mvData = originalProject;
  }
};
run().catch(error => { console.error(error); process.exitCode = 1; });
