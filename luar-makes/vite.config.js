import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

// Troca __BUILD_ID__ em dist/sw.js a cada build: assim o service worker muda a cada publicação,
// o navegador instala a versão nova e as caches antigas são apagadas.
function swBuildId() {
  let outDir = 'dist';
  return {
    name: 'luar-sw-build-id',
    apply: 'build',
    configResolved(c) { outDir = c.build.outDir; },
    closeBundle() {
      const f = resolve(outDir, 'sw.js');
      if (!existsSync(f)) return;
      writeFileSync(f, readFileSync(f, 'utf8').replaceAll('__BUILD_ID__', Date.now().toString(36)));
    },
  };
}

// `vite build` gera o site normal (pasta dist/).
// `npm run build:prototype` gera UM arquivo HTML autônomo (usado no Claude Artifact).
export default defineConfig(({ mode }) => ({
  plugins: mode === 'prototype' ? [viteSingleFile()] : [swBuildId()],
  build: mode === 'prototype' ? { outDir: 'dist-prototype', assetsInlineLimit: 100000000, chunkSizeWarningLimit: 4000 } : {},
}));
