#!/usr/bin/env node

/**
 * Rewrite src/content notes to Obsidian-friendly frontmatter (pipe images/links, list tags, significance).
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';
import {
  formatImageLine,
  formatLinkLine,
  parseImageEntry,
  parseLinkEntry,
  tagToObsidian,
} from './content-normalize.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const contentRoot = path.join(root, 'src', 'content');

function parseNote(filePath) {
  const text = fs.readFileSync(filePath, 'utf8');
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) return null;
  return { data: yaml.load(match[1]) || {}, body: match[2].trim(), filePath };
}

function yamlScalar(value) {
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  const s = String(value);
  if (/^[A-Za-z0-9_./:-]+$/.test(s)) return s;
  return JSON.stringify(s);
}

function listItemScalar(value) {
  const s = String(value);
  if (!/[":#,|]/.test(s)) return s;
  return JSON.stringify(s);
}

/** Markdown link lines must be quoted or YAML breaks on `:` in URLs. */
function linkListItem(value) {
  return JSON.stringify(String(value));
}

function formatWhenField(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, '0');
    return JSON.stringify(`${y}/${m}`);
  }
  const s = String(value).trim();
  if (/^\d{4}-\d{2}$/.test(s)) return JSON.stringify(s.replace('-', '/'));
  if (/^\d{4}\/\d{1,2}$/.test(s)) {
    const [y, m] = s.split('/');
    return JSON.stringify(`${y}/${m.padStart(2, '0')}`);
  }
  return JSON.stringify(s);
}

function formatDateField(value) {
  let iso = value;
  if (typeof iso === 'string') {
    const unquoted = iso.replace(/^"|"$/g, '');
    if (/^\d{4}-\d{2}-\d{2}$/.test(unquoted)) return JSON.stringify(unquoted);
    if (/GMT/.test(iso)) {
      const d = new Date(iso);
      if (!Number.isNaN(d.getTime())) iso = d.toISOString().slice(0, 10);
    } else {
      iso = unquoted;
    }
  }
  if (iso instanceof Date && !Number.isNaN(iso.getTime())) {
    iso = iso.toISOString().slice(0, 10);
  }
  if (typeof iso === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    return JSON.stringify(iso);
  }
  return JSON.stringify(String(iso));
}

function appendList(lines, key, items, formatter = listItemScalar) {
  if (!items?.length) return;
  lines.push(`${key}:`);
  for (const item of items) {
    lines.push(`  - ${formatter(item)}`);
  }
}

function writeNote(filePath, data, body) {
  const lines = ['---'];
  const skip = new Set(['gold', 'silver', 'images', 'links', 'tags', 'badges']);

  if (data.gold) data.significance = 'gold';
  else if (data.silver) data.significance = 'silver';
  delete data.gold;
  delete data.silver;

  const images = data.images;
  const links = data.links;
  const tags = data.tags;
  const badges = data.badges;
  delete data.images;
  delete data.links;
  delete data.tags;
  delete data.badges;

  for (const [key, value] of Object.entries(data)) {
    if (skip.has(key) || value === undefined || value === null || value === '') continue;
    if (key === 'significance' && !value) continue;
    if (key === 'startDate' || key === 'endDate') {
      lines.push(`${key}: ${formatDateField(value)}`);
      continue;
    }
    if (key === 'when') {
      lines.push(`${key}: ${formatWhenField(value)}`);
      continue;
    }
    lines.push(`${key}: ${yamlScalar(value)}`);
  }

  if (tags?.length) {
    appendList(lines, 'tags', tags.map(tagToObsidian));
  }
  if (badges?.length) {
    appendList(lines, 'badges', badges.map(tagToObsidian));
  }
  if (images?.length) {
    const formatted = images
      .map((img) => {
        const parsed = parseImageEntry(img);
        return parsed ? formatImageLine(parsed) : null;
      })
      .filter(Boolean);
    appendList(lines, 'images', formatted);
  }
  if (links?.length) {
    const formatted = links
      .map((link) => {
        const parsed = parseLinkEntry(link);
        return parsed ? formatLinkLine(parsed) : null;
      })
      .filter(Boolean);
    appendList(lines, 'links', formatted, linkListItem);
  }

  lines.push('---', '');
  fs.writeFileSync(filePath, `${lines.join('\n')}${body ? `${body}\n` : ''}`, 'utf8');
}

function walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const name of fs.readdirSync(dir)) {
    if (name.startsWith('_') || !name.endsWith('.md')) continue;
    const filePath = path.join(dir, name);
    const note = parseNote(filePath);
    if (note) writeNote(filePath, note.data, note.body);
  }
}

for (const sub of ['projects', 'hackathons', 'awards']) {
  walk(path.join(contentRoot, sub));
}

console.log('✓ Reformatted content notes for Obsidian');
