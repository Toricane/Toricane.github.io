#!/usr/bin/env node

/**
 * Copy static assets into public/ for Astro dev + build.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const publicDir = path.join(root, 'public');

function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  fs.cpSync(src, dest, { recursive: true, force: true });
}

function copyFile(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

fs.mkdirSync(publicDir, { recursive: true });

copyDir(path.join(root, 'assets'), path.join(publicDir, 'assets'));
copyDir(path.join(root, 'connect4'), path.join(publicDir, 'connect4'));

for (const name of [
  'CNAME',
  'robots.txt',
  'llms.txt',
  'site.webmanifest',
  'apple-touch-icon.png',
  'favicon-16x16.png',
  'favicon-32x32.png',
  'favicon.ico',
]) {
  copyFile(path.join(root, name), path.join(publicDir, name));
}

for (const json of ['colors.json', 'seo.json']) {
  const src = path.join(root, json);
  const dest = path.join(root, 'src', 'data', json);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
  }
}

const exportResult = spawnSync(process.execPath, ['scripts/export-data-json.mjs'], {
  cwd: root,
  stdio: 'inherit',
});
if (exportResult.status !== 0) {
  process.exit(exportResult.status ?? 1);
}

console.log('✓ Synced static files to public/ and src/data/*.json');
