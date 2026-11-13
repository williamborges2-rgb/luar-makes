import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// `vite build` gera o site normal (pasta dist/).
// `npm run build:prototype` gera UM arquivo HTML autônomo (usado no Claude Artifact).
export default defineConfig(({ mode }) => ({
  plugins: mode === 'prototype' ? [viteSingleFile()] : [],
  build: mode === 'prototype' ? { outDir: 'dist-prototype', assetsInlineLimit: 100000000, chunkSizeWarningLimit: 4000 } : {},
}));
