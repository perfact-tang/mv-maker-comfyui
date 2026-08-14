
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tsconfigPaths from "vite-tsconfig-paths";
import { traeBadgePlugin } from 'vite-plugin-trae-solo-badge';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { mkdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

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
