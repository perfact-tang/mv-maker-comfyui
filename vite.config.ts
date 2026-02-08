
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tsconfigPaths from "vite-tsconfig-paths";
import { traeBadgePlugin } from 'vite-plugin-trae-solo-badge';

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
