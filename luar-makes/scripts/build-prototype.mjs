// Gera o protótipo em UM arquivo HTML (dist-prototype/index.html), com dados de demonstração.
import { spawnSync } from 'node:child_process';
const r = spawnSync('npx', ['vite', 'build', '--mode', 'prototype'], {
  stdio: 'inherit',
  env: { ...process.env, VITE_PROTOTYPE: '1' },
});
process.exit(r.status ?? 1);
