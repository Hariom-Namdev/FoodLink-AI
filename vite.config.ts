import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'fs';
import { resolve } from 'path';

function parseEnvFile(path: string): Record<string, string> {
  try {
    const content = readFileSync(path, 'utf-8');
    const env: Record<string, string> = {};
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const value = trimmed.slice(eqIdx + 1).trim();
      if (key) env[key] = value;
    }
    return env;
  } catch {
    return {};
  }
}

export default defineConfig(({ mode }) => {
  // Load .env.production explicitly and inject into process.env so Vite's
  // import.meta.env inlining uses these values even if the hosting platform
  // (e.g. Vercel) has stale VITE_ env vars set in its dashboard.
  const envFile = parseEnvFile(resolve(process.cwd(), '.env.production'));
  for (const [key, value] of Object.entries(envFile)) {
    if (key.startsWith('VITE_') && !process.env[key]) {
      process.env[key] = value;
    }
  }

  return {
    plugins: [react()],
    server: {
      host: true,
      port: 5173,
    },
    optimizeDeps: {
      include: ['react', 'react-dom', 'react-router-dom', 'framer-motion', 'lucide-react', 'recharts', 'three', '@react-three/fiber', '@react-three/drei', 'leaflet', 'react-leaflet'],
    },
    build: {
      chunkSizeWarningLimit: 1500,
      rollupOptions: {
        output: {
          manualChunks: {
            three: ['three', '@react-three/fiber', '@react-three/drei'],
            charts: ['recharts'],
            maps: ['leaflet', 'react-leaflet'],
          },
        },
      },
    },
  };
});
