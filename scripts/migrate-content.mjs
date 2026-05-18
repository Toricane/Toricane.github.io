#!/usr/bin/env node

/**
 * One-time migration: data.json → src/content/* YAML files (optional authoring layout).
 * The Astro site currently reads src/data/portfolio.json; run this when you want per-file content.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const data = JSON.parse(fs.readFileSync(path.join(root, 'data.json'), 'utf-8'));

function yamlEscape(value) {
  if (value == null) return '""';
  const s = String(value);
  if (s.includes('\n') || s.includes(':') || s.includes('"')) {
    return `|\n${s
      .split('\n')
      .map((line) => `  ${line}`)
      .join('\n')}`;
  }
  return JSON.stringify(s);
}

function writeYaml(filePath, obj) {
  const lines = ['---'];
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) continue;
    if (Array.isArray(value) || (value && typeof value === 'object')) {
      lines.push(`${key}: ${JSON.stringify(value, null, 2)}`);
    } else {
      lines.push(`${key}: ${yamlEscape(value)}`);
    }
  }
  lines.push('---', '');
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, lines.join('\n'), 'utf-8');
}

const out = path.join(root, 'src', 'content');

for (const project of data.projects || []) {
  const slug = (project.title || 'item')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  writeYaml(path.join(out, 'projects', `${slug}.yaml`), {
    ...project,
    description: project.description,
  });
}

for (const section of ['hackathons', 'awards']) {
  for (const group of data[section] || []) {
    const slug = `${group.when}-${(group.summary || section).slice(0, 40)}`
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    writeYaml(path.join(out, section, `${slug}.yaml`), group);
  }
}

console.log(`✓ Wrote content files under ${path.relative(root, out)}/`);
