#!/usr/bin/env node

/**
 * Export root data.json from src/content Markdown (read-only mirror for tooling).
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';
import {
  formatBadges,
  formatTags,
  parseImages,
  parseLinks,
  significanceToMedals,
} from './content-normalize.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const contentRoot = path.join(root, 'src', 'content');

function parseNote(filePath) {
  const text = fs.readFileSync(filePath, 'utf8');
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) throw new Error(`Missing frontmatter: ${filePath}`);
  return { data: yaml.load(match[1]) || {}, body: match[2].trim() };
}

function listNotes(subdir) {
  const dir = path.join(contentRoot, subdir);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((name) => name.endsWith('.md'))
    .map((name) => parseNote(path.join(dir, name)));
}

function toLegacyDate(value) {
  if (!value) return undefined;
  return String(value).replace(/-/g, '/');
}

function toLegacyImages(images) {
  const parsed = parseImages(images);
  if (!parsed?.length) return undefined;
  return parsed.map((img) => {
    const entry = { path: img.path };
    if (img.label) entry.label = img.label;
    if (img.face) entry.face = true;
    return entry;
  });
}

function toLegacyLinks(links) {
  const parsed = parseLinks(links);
  if (!parsed?.length) return '';
  return parsed.map((link) => {
    const entry = {};
    if (link.label) entry.label = link.label;
    if (link.url) entry.url = link.url;
    if (link.date) entry.date = link.date;
    return entry;
  });
}

function parseYMD(s) {
  if (!s) return null;
  const parts = String(s).split(/[-/]/).map((p) => parseInt(p, 10));
  if (!parts.length || parts.some((x) => Number.isNaN(x))) return null;
  const [y, m, d] = parts;
  if (parts.length === 1) return new Date(y, 0, 1);
  if (parts.length === 2) return new Date(y, (m || 1) - 1, 1);
  return new Date(y, (m || 1) - 1, d || 1);
}

function projectEndTimestamp(project) {
  const end = parseYMD(project['end-date']);
  if (end) return end.getTime();
  const start = parseYMD(project['start-date']);
  if (start) return start.getTime();
  return Infinity;
}

function sortProjects(projects) {
  return [...projects].sort((a, b) => {
    const ta = projectEndTimestamp(a);
    const tb = projectEndTimestamp(b);
    if (ta === tb) return 0;
    if (ta === Infinity) return -1;
    if (tb === Infinity) return 1;
    return tb - ta;
  });
}

function sortTimelineGroups(groups) {
  return [...groups].sort((a, b) => {
    const [yearA, monthA] = a.when.split('/').map(Number);
    const [yearB, monthB] = b.when.split('/').map(Number);
    if (yearA !== yearB) return yearB - yearA;
    return monthB - monthA;
  });
}

function noteToProject({ data, body }) {
  const medals = significanceToMedals(data.significance, data);
  const project = {
    title: data.title,
    description: body,
  };
  if (data.from) project.from = data.from;
  if (data.live) project.live = data.live;
  if (data.date) project.date = data.date;
  const start = toLegacyDate(data.startDate);
  const end = toLegacyDate(data.endDate);
  if (start) project['start-date'] = start;
  if (end) project['end-date'] = end;
  const tags = formatTags(data.tags);
  if (tags?.length) project.tags = tags;
  const images = toLegacyImages(data.images);
  if (images) project.images = images;
  const link = toLegacyLinks(data.links);
  if (link !== '') project.link = link;
  if (medals.impactful) project.impactful = true;
  if (medals.notable) project.notable = true;
  return project;
}

function noteToTimelineItem({ data, body }) {
  const medals = significanceToMedals(data.significance, data);
  const item = {
    name: data.name,
    description: body,
    link: toLegacyLinks(data.links),
  };
  if (data.from) item.from = data.from;
  const badges = formatBadges(data.badges);
  if (badges?.length) item.badges = badges;
  const tags = formatTags(data.tags);
  if (tags?.length) item.tags = tags;
  const images = toLegacyImages(data.images);
  if (images) item.images = images;
  if (medals.impactful) item.impactful = true;
  if (medals.notable) item.notable = true;
  return item;
}

function groupTimeline(notes) {
  const groups = new Map();
  for (const note of notes) {
    const when = note.data.when;
    if (!groups.has(when)) {
      groups.set(when, {
        when,
        ...(note.data.groupSummary ? { summary: note.data.groupSummary } : {}),
        items: [],
      });
    }
    const group = groups.get(when);
    if (!group.summary && note.data.groupSummary) {
      group.summary = note.data.groupSummary;
    }
    group.items.push(noteToTimelineItem(note));
  }
  return sortTimelineGroups([...groups.values()]);
}

const coverflowImages = listNotes('coverflow').map(({ data }) => {
  const entry = {
    path: data.image,
    ...(data.face ? { face: true } : {}),
  };
  if (data.label) entry.label = data.label;
  return entry;
});

const portfolio = {
  ...(coverflowImages.length ? { coverflowImages } : {}),
  projects: sortProjects(listNotes('projects').map(noteToProject)),
  hackathons: groupTimeline(listNotes('hackathons')),
  awards: groupTimeline(listNotes('awards')),
};

const outPath = path.join(root, 'data.json');
fs.writeFileSync(outPath, `${JSON.stringify(portfolio, null, 2)}\n`, 'utf8');
console.log(`✓ Exported ${path.relative(root, outPath)} from src/content/`);
