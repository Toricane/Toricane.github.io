#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const title = process.argv.slice(2).join(' ').trim();

if (!title) {
  console.error('Usage: npm run new:project -- "Project Title"');
  process.exit(1);
}

function slugify(s) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const slug = slugify(title);
const dest = path.join(root, 'src', 'content', 'projects', `${slug}.md`);

if (fs.existsSync(dest)) {
  console.error(`Already exists: ${path.relative(root, dest)}`);
  process.exit(1);
}

const template = fs.readFileSync(
  path.join(root, 'src', 'content', '_templates', 'project.md'),
  'utf-8',
);

const body = template.replace('Project title', title.replace(/"/g, '\\"'));
fs.mkdirSync(path.dirname(dest), { recursive: true });
fs.writeFileSync(dest, body, 'utf-8');
console.log(`✓ Created ${path.relative(root, dest)}`);
