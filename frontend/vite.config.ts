import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(() => {
    return {
      // Read env from the repo root (../.env) instead of frontend/.env.local
      // so backend + frontend share a single file locally. VITE_* keys still
      // gate what ships in the client bundle.
      envDir: path.resolve(__dirname, '..'),
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
