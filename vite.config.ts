
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tsconfigPaths from "vite-tsconfig-paths";
import { traeBadgePlugin } from 'vite-plugin-trae-solo-badge';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { mkdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { buildAtempoFilterChain } from './src/utils/audioTempo';

const readRequestBody = async (request: import('node:http').IncomingMessage) => {
  const chunks: Buffer[] = [];

  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return Buffer.concat(chunks);
};

const runFfmpeg = (args: string[]) => new Promise<void>((resolve, reject) => {
  const child = spawn('ffmpeg', args);
  let stderr = '';

  child.stderr.on('data', (chunk) => {
    stderr += chunk.toString();
  });

  child.on('error', reject);
  child.on('close', (code) => {
    if (code === 0) {
      resolve();
      return;
    }

    reject(new Error(stderr || `ffmpeg exited with code ${code}`));
  });
});

const audioUploadPlugin = () => ({
  name: 'mv-maker-audio-upload',
  configureServer(server: import('vite').ViteDevServer) {
    server.middlewares.use('/api/audio/split', async (req, res) => {
      if (req.method !== 'POST') {
        res.statusCode = 405;
        res.end('Method Not Allowed');
        return;
      }

      try {
        const originalName = decodeURIComponent(String(req.headers['x-file-name'] || 'audio.mp3'));
        const extension = path.extname(originalName).toLowerCase();
        const rawShotDurations = String(req.headers['x-shot-durations'] || '');
        const shotDurations = JSON.parse(rawShotDurations) as number[];
        const allowedShotDurations = new Set([5, 10, 15, 20]);

        if (!['.wav', '.mp3'].includes(extension)) {
          res.statusCode = 400;
          res.end('Only WAV and MP3 files are supported.');
          return;
        }

        if (
          !Array.isArray(shotDurations)
          || shotDurations.length === 0
          || shotDurations.length > 500
          || shotDurations.some((duration) => !allowedShotDurations.has(duration))
        ) {
          res.statusCode = 400;
          res.end('Shot durations must be a non-empty list containing only 5, 10, 15, or 20 seconds.');
          return;
        }

        const body = await readRequestBody(req);
        if (!body.length) {
          res.statusCode = 400;
          res.end('Audio file is empty.');
          return;
        }

        const proposalId = String(req.headers['x-proposal-id'] || 'project').replace(/[^a-zA-Z0-9_-]/g, '');
        const uploadId = createHash('sha1').update(`${originalName}-${Date.now()}`).digest('hex').slice(0, 10);
        const publicRoot = path.resolve(process.cwd(), 'public');
        const outputDir = path.join(publicRoot, 'uploads', 'audio', `${proposalId}-${uploadId}`);
        const sourcePath = path.join(outputDir, `source${extension}`);

        await mkdir(outputDir, { recursive: true });
        await writeFile(sourcePath, body);

        const totalDuration = shotDurations.reduce((total, duration) => total + duration, 0);
        const chunkFiles: Array<{ file: string; index: number; size: number; sourceStartSeconds: number }> = [];
        let sourceStartSeconds = 0;

        // Duration labels are inclusive: a 00:00-00:05 shot must contain the
        // whole fifth second and therefore ends immediately before 00:06.
        // The next shot still starts at 00:05, creating the intended 1s overlap.
        for (const [index, shotDuration] of shotDurations.entries()) {
          const clipDuration = shotDuration + 1;
          const file = `scene_${String(index).padStart(3, '0')}.mp3`;
          const outputPath = path.join(outputDir, file);

          await runFfmpeg([
            '-y',
            '-ss', String(sourceStartSeconds),
            '-i', sourcePath,
            '-vn',
            '-map', '0:a:0',
            '-t', String(clipDuration),
            '-c:a', 'libmp3lame',
            '-b:a', '192k',
            outputPath,
          ]);

          chunkFiles.push({ file, index, size: (await stat(outputPath)).size, sourceStartSeconds });
          sourceStartSeconds += shotDuration;
        }

        const chunks = chunkFiles
          .filter(({ size }) => size > 1024)
          .map(({ file, index, sourceStartSeconds: chunkStart }) => ({
            filename: file,
            url: `/uploads/audio/${proposalId}-${uploadId}/${file}`,
            durationSeconds: shotDurations[index] + 1,
            sourceStartSeconds: chunkStart,
          }));

        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ chunks, shotDurations, totalDuration, inclusiveEndSecond: true }));
      } catch (error) {
        console.error('[audio split] failed:', error);
        res.statusCode = 500;
        res.end(error instanceof Error ? error.message : String(error));
      }
    });

    server.middlewares.use('/api/audio/drive-split', async (req, res) => {
      if (req.method !== 'POST') {
        res.statusCode = 405;
        res.end('Method Not Allowed');
        return;
      }
      try {
        const originalName = decodeURIComponent(String(req.headers['x-file-name'] || 'music3.mp3'));
        const extension = path.extname(originalName).toLowerCase();
        const shots = JSON.parse(String(req.headers['x-audio-shots'] || '[]')) as Array<{ shotId: string; start: number; duration: number }>;
        if (!['.wav', '.mp3', '.flac', '.aac', '.m4a', '.ogg'].includes(extension)) throw new Error('Unsupported audio format.');
        if (!Array.isArray(shots) || !shots.length || shots.length > 500 || shots.some((shot) => !shot.shotId || !Number.isFinite(shot.start) || shot.start < 0 || ![5, 10, 15].includes(shot.duration))) {
          throw new Error('Audio shots must contain a shotId, non-negative start, and a 5/10/15 second duration.');
        }
        const body = await readRequestBody(req);
        if (!body.length) throw new Error('Audio file is empty.');
        const proposalId = String(req.headers['x-proposal-id'] || 'project').replace(/[^a-zA-Z0-9_-]/g, '');
        const chapterId = String(req.headers['x-chapter-id'] || 'chapter').replace(/[^a-zA-Z0-9_-]/g, '_');
        const splitId = createHash('sha1').update(`${originalName}-${Date.now()}`).digest('hex').slice(0, 10);
        const publicRoot = path.resolve(process.cwd(), 'public');
        const outputDir = path.join(publicRoot, 'uploads', 'audio', `${proposalId}-${chapterId}-${splitId}`);
        const sourcePath = path.join(outputDir, `source${extension}`);
        await mkdir(outputDir, { recursive: true });
        await writeFile(sourcePath, body);

        const chunks = [] as Array<{ shotId: string; filename: string; url: string; durationSeconds: number; sourceStartSeconds: number }>;
        for (const [index, shot] of shots.entries()) {
          const safeShotId = shot.shotId.replace(/[^a-zA-Z0-9_-]/g, '_');
          const filename = `${String(index).padStart(3, '0')}_${safeShotId}.mp3`;
          const outputPath = path.join(outputDir, filename);
          await runFfmpeg([
            '-y', '-ss', String(shot.start), '-i', sourcePath, '-vn',
            '-af', `apad=pad_dur=${shot.duration}`, '-t', String(shot.duration),
            '-c:a', 'libmp3lame', '-b:a', '256k', outputPath,
          ]);
          if ((await stat(outputPath)).size <= 1024) throw new Error(`Empty audio chunk for ${shot.shotId}`);
          chunks.push({
            shotId: shot.shotId,
            filename,
            url: `/uploads/audio/${proposalId}-${chapterId}-${splitId}/${filename}`,
            durationSeconds: shot.duration,
            sourceStartSeconds: shot.start,
          });
        }
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ chunks }));
      } catch (error) {
        console.error('[drive audio split] failed:', error);
        res.statusCode = 500;
        res.end(error instanceof Error ? error.message : String(error));
      }
    });

    server.middlewares.use('/api/audio/normalize-tts', async (req, res) => {
      if (req.method !== 'POST') {
        res.statusCode = 405;
        res.end('Method Not Allowed');
        return;
      }
      try {
        const duration = Number(req.headers['x-shot-duration']);
        if (![5, 10, 15].includes(duration)) throw new Error('TTS shot duration must be 5, 10, or 15 seconds.');
        const actualDuration = Number(req.headers['x-actual-duration']);
        const playbackRate = Number(req.headers['x-playback-rate'] || 1);
        if (!Number.isFinite(actualDuration) || actualDuration <= 0) throw new Error('TTS actual duration is invalid.');
        if (!Number.isFinite(playbackRate) || playbackRate < 1) throw new Error('TTS playback rate must be at least 1.0.');
        const body = await readRequestBody(req);
        if (!body.length) throw new Error('TTS audio is empty.');
        const proposalId = String(req.headers['x-proposal-id'] || 'project').replace(/[^a-zA-Z0-9_-]/g, '');
        const shotId = String(req.headers['x-shot-id'] || 'shot').replace(/[^a-zA-Z0-9_-]/g, '_');
        const originalName = decodeURIComponent(String(req.headers['x-file-name'] || 'tts.wav'));
        const extension = path.extname(originalName).toLowerCase() || '.wav';
        const normalizeId = createHash('sha1').update(`${shotId}-${Date.now()}`).digest('hex').slice(0, 10);
        const publicRoot = path.resolve(process.cwd(), 'public');
        const outputDir = path.join(publicRoot, 'uploads', 'audio', `${proposalId}-qwen3-${normalizeId}`);
        const sourcePath = path.join(outputDir, `source${extension}`);
        const filename = `${shotId}-voice.mp3`;
        const outputPath = path.join(outputDir, filename);
        await mkdir(outputDir, { recursive: true });
        await writeFile(sourcePath, body);
        const audioFilters = [...buildAtempoFilterChain(playbackRate), `apad=pad_dur=${duration}`].join(',');
        await runFfmpeg([
          '-y', '-i', sourcePath, '-vn', '-af', audioFilters, '-t', String(duration),
          '-c:a', 'libmp3lame', '-b:a', '256k', outputPath,
        ]);
        if ((await stat(outputPath)).size <= 1024) throw new Error('Normalized TTS audio is empty.');
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ shotId, filename, url: `/uploads/audio/${proposalId}-qwen3-${normalizeId}/${filename}`, durationSeconds: duration, actualDurationSeconds: actualDuration, playbackRate, sourceStartSeconds: 0 }));
      } catch (error) {
        console.error('[normalize TTS] failed:', error);
        res.statusCode = 500;
        res.end(error instanceof Error ? error.message : String(error));
      }
    });

    server.middlewares.use('/api/audio/mix-shot', async (req, res) => {
      if (req.method !== 'POST') {
        res.statusCode = 405;
        res.end('Method Not Allowed');
        return;
      }
      try {
        const publicRoot = path.resolve(process.cwd(), 'public');
        const audioRoot = path.resolve(publicRoot, 'uploads', 'audio');
        const resolveAudio = (header: string | string[] | undefined) => {
          const url = decodeURIComponent(String(header || ''));
          if (!url.startsWith('/uploads/audio/')) throw new Error('Mix inputs must be generated local audio files.');
          const resolved = path.resolve(publicRoot, url.replace(/^\//, ''));
          if (!resolved.startsWith(`${audioRoot}${path.sep}`)) throw new Error('Invalid mix audio path.');
          return resolved;
        };
        const voicePath = resolveAudio(req.headers['x-voice-audio-url']);
        const musicPath = resolveAudio(req.headers['x-music-audio-url']);
        await stat(voicePath);
        await stat(musicPath);
        const proposalId = String(req.headers['x-proposal-id'] || 'project').replace(/[^a-zA-Z0-9_-]/g, '');
        const shotId = String(req.headers['x-shot-id'] || 'shot').replace(/[^a-zA-Z0-9_-]/g, '_');
        const mixId = createHash('sha1').update(`${shotId}-${Date.now()}`).digest('hex').slice(0, 10);
        const outputDir = path.join(audioRoot, `${proposalId}-mix-${mixId}`);
        const filename = `${shotId}-drive.mp3`;
        const outputPath = path.join(outputDir, filename);
        await mkdir(outputDir, { recursive: true });
        await runFfmpeg([
          '-y', '-i', voicePath, '-i', musicPath,
          '-filter_complex', '[0:a]volume=1.0[voice];[1:a]volume=0.18[music];[voice][music]amix=inputs=2:duration=first:dropout_transition=0[a]',
          '-map', '[a]', '-c:a', 'libmp3lame', '-b:a', '256k', outputPath,
        ]);
        if ((await stat(outputPath)).size <= 1024) throw new Error('Mixed Drive Audio is empty.');
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ shotId, filename, url: `/uploads/audio/${proposalId}-mix-${mixId}/${filename}`, durationSeconds: 0, sourceStartSeconds: 0 }));
      } catch (error) {
        console.error('[mix shot audio] failed:', error);
        res.statusCode = 500;
        res.end(error instanceof Error ? error.message : String(error));
      }
    });

    server.middlewares.use('/api/media/mux-drive-audio', async (req, res) => {
      if (req.method !== 'POST') {
        res.statusCode = 405;
        res.end('Method Not Allowed');
        return;
      }
      try {
        const driveAudioUrl = decodeURIComponent(String(req.headers['x-drive-audio-url'] || ''));
        if (!driveAudioUrl.startsWith('/uploads/audio/')) throw new Error('Drive audio must be a generated local audio chunk.');
        const publicRoot = path.resolve(process.cwd(), 'public');
        const audioPath = path.resolve(publicRoot, driveAudioUrl.replace(/^\//, ''));
        const audioRoot = path.resolve(publicRoot, 'uploads', 'audio');
        if (!audioPath.startsWith(`${audioRoot}${path.sep}`)) throw new Error('Invalid drive audio path.');
        await stat(audioPath);

        const videoBody = await readRequestBody(req);
        if (!videoBody.length) throw new Error('Video file is empty.');
        const proposalId = String(req.headers['x-proposal-id'] || 'project').replace(/[^a-zA-Z0-9_-]/g, '');
        const shotId = String(req.headers['x-shot-id'] || 'shot').replace(/[^a-zA-Z0-9_-]/g, '_');
        const muxId = createHash('sha1').update(`${shotId}-${Date.now()}`).digest('hex').slice(0, 10);
        const outputDir = path.join(publicRoot, 'uploads', 'video', `${proposalId}-${muxId}`);
        const sourcePath = path.join(outputDir, 'source.mp4');
        const filename = `${shotId}.mp4`;
        const outputPath = path.join(outputDir, filename);
        await mkdir(outputDir, { recursive: true });
        await writeFile(sourcePath, videoBody);
        await runFfmpeg([
          '-y', '-i', sourcePath, '-i', audioPath,
          '-map', '0:v:0', '-map', '1:a:0', '-c:v', 'copy',
          '-af', 'apad', '-c:a', 'aac', '-b:a', '192k', '-shortest', outputPath,
        ]);
        if ((await stat(outputPath)).size <= 1024) throw new Error('Muxed video is empty.');
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ url: `/uploads/video/${proposalId}-${muxId}/${filename}` }));
      } catch (error) {
        console.error('[drive audio mux] failed:', error);
        res.statusCode = 500;
        res.end(error instanceof Error ? error.message : String(error));
      }
    });
  },
});

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, process.cwd(), '')
  const comfyApiUrl = env.VITE_COMFY_API_URL || 'http://127.0.0.1:8188';
  const mvStoryBoardPort = Number(env.VITE_MV_STORY_BOARD_PORT) || 18889;

  return {
    plugins: [
      react({
        babel: {
          plugins: [
            'react-dev-locator',
          ],
        },
      }),
      traeBadgePlugin({
        variant: 'dark',
        position: 'bottom-right',
        prodOnly: true,
        clickable: true,
        clickUrl: 'https://www.trae.ai/solo?showJoin=1',
        autoTheme: true,
        autoThemeTarget: '#root'
      }), 
      audioUploadPlugin(),
      tsconfigPaths(),
    ],
    server: {
      port: mvStoryBoardPort,
      host: true,
      proxy: {
        '/comfy-api': {
          target: comfyApiUrl,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/comfy-api/, ''),
          secure: false,
        }
      }
    }
  }
})
