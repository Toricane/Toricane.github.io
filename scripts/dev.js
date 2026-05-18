#!/usr/bin/env node

/**
 * Local dev: rebuild on source changes + static server on :8080.
 */

import { spawn } from 'child_process';
import fs from 'fs';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const port = Number(process.env.PORT) || 8080;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.xml': 'application/xml',
  '.txt': 'text/plain; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
};

let building = false;
let queued = false;

function runBuild() {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['scripts/build.js'], {
      cwd: rootDir,
      stdio: 'inherit',
    });
    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`build exited with code ${code}`));
    });
  });
}

async function queueBuild(reason = 'change') {
  if (building) {
    queued = true;
    return;
  }
  building = true;
  console.log(`\n[dev] Rebuilding (${reason})...`);
  try {
    await runBuild();
    console.log('[dev] Build OK — refresh the browser\n');
  } catch (err) {
    console.error(`[dev] Build failed: ${err.message}`);
  }
  building = false;
  if (queued) {
    queued = false;
    await queueBuild('queued');
  }
}

function safeUrlPath(urlPath) {
  const decoded = decodeURIComponent(urlPath.split('?')[0]);
  const normalized = path.normalize(decoded).replace(/^(\.\.(\/|\\|$))+/, '');
  return normalized;
}

function createServer() {
  return http.createServer((req, res) => {
    let urlPath = req.url === '/' ? '/index.html' : req.url;
    urlPath = safeUrlPath(urlPath);
    const filePath = path.join(rootDir, urlPath);

    if (!filePath.startsWith(rootDir)) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }

    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(404);
        res.end('Not found');
        return;
      }
      const ext = path.extname(filePath).toLowerCase();
      res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
      res.end(data);
    });
  });
}

function watchPath(targetPath) {
  if (!fs.existsSync(targetPath)) return;
  const opts = fs.statSync(targetPath).isDirectory() ? { recursive: true } : {};
  fs.watch(targetPath, opts, () => queueBuild(path.relative(rootDir, targetPath)));
}

console.log(`[dev] Initial build...`);
await queueBuild('startup');

const server = createServer();
server.listen(port, () => {
  console.log(`[dev] Serving http://127.0.0.1:${port}`);
});

for (const target of [
  'data.json',
  'colors.json',
  'seo.json',
  'styles.css',
  'index.html',
  'scripts',
  'templates',
]) {
  watchPath(path.join(rootDir, target));
}
