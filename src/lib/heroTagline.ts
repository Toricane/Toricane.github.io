import fs from 'node:fs';
import path from 'node:path';

const ICON_ALT: Record<string, string> = {
  langara: 'Langara College logo',
  ubc: 'UBC logo',
  'vancouver-ai': 'BC + AI Ecosystem logo',
  jarvis: 'JARVIS project icon',
  'handy-andy': 'Handy Andy project icon',
  hackthenorth: 'Hack the North logo',
  nwhacks: 'nwHacks logo',
};

const INTERNAL_HOSTS = new Set(['prajwal.is-a.dev', 'www.prajwal.is-a.dev']);

function isInternalHref(href: string) {
  if (!href || href.startsWith('/') || href.startsWith('#')) return true;
  try {
    return INTERNAL_HOSTS.has(new URL(href).hostname);
  } catch {
    return false;
  }
}

function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, (c) => {
    if (c === '&') return '&amp;';
    if (c === '<') return '&lt;';
    if (c === '>') return '&gt;';
    if (c === '"') return '&quot;';
    return '&#39;';
  });
}

function escapeAttr(value = '') {
  return escapeHtml(value);
}

function parseInline(input: string, state: { footnoteCounter: number }) {
  let output = '';

  for (let i = 0; i < input.length; i += 1) {
    const ch = input[i];

    if (ch === '\\' && i + 1 < input.length) {
      output += escapeHtml(input[i + 1]);
      i += 1;
      continue;
    }

    if (ch === '[') {
      const closeBracket = input.indexOf(']', i + 1);
      if (closeBracket !== -1 && input[closeBracket + 1] === '(') {
        const closeParen = input.indexOf(')', closeBracket + 2);
        if (closeParen !== -1) {
          const label = input.slice(i + 1, closeBracket);
          const href = input.slice(closeBracket + 2, closeParen).trim();
          const labelHtml = parseInline(label, state);
          const internal = isInternalHref(href);
          const linkAttrs = internal ? '' : ' target="_blank" rel="noopener noreferrer"';
          output += `<a href="${escapeAttr(href)}"${linkAttrs}>${labelHtml}</a>`;
          i = closeParen;
          continue;
        }
      }
    }

    if (ch === '{') {
      const closeBrace = input.indexOf('}', i + 1);
      if (closeBrace !== -1) {
        const iconName = input.slice(i + 1, closeBrace).trim();
        if (/^[a-zA-Z0-9_-]+$/.test(iconName)) {
          output += `<img class="tag-icon" src="/assets/icons/${escapeAttr(
            iconName,
          )}.webp" alt="" width="15" height="15" decoding="async" />`;
          i = closeBrace;
          continue;
        }
      }
    }

    if (ch === '(') {
      const closeParen = input.indexOf(')', i + 1);
      if (closeParen !== -1) {
        const footnoteText = input.slice(i + 1, closeParen).trim();
        if (footnoteText.length) {
          state.footnoteCounter += 1;
          output += `<span class="footnote"><sup>${state.footnoteCounter}</sup><span class="footnote-content">${escapeHtml(
            footnoteText,
          )}</span></span>`;
          i = closeParen;
          continue;
        }
      }
    }

    output += escapeHtml(ch);
  }

  return output;
}

export function compileHeroTagline(markdownText: string) {
  const state = { footnoteCounter: 0 };
  const paragraphs = markdownText
    .split(/\r?\n\s*\r?\n/)
    .map((p) => p.replace(/\r?\n/g, ' ').trim())
    .filter(Boolean);

  return paragraphs.map((p) => parseInline(p, state)).join('<br />\n<br />\n');
}

export function loadHeroTaglineHtml(rootDir: string) {
  const mdPath = path.join(rootDir, 'src', 'content', 'hero', 'intro.md');
  const source = fs.readFileSync(mdPath, 'utf-8');
  return compileHeroTagline(source);
}
