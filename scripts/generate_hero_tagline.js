#!/usr/bin/env node

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");

const defaultInputPath = path.join(rootDir, "templates", "hero-tagline.md");
const defaultOutputPath = path.join(rootDir, "templates", "hero-tagline.html");

const ICON_ALT = {
  langara: "Langara College logo",
  ubc: "UBC logo",
  "vancouver-ai": "BC + AI Ecosystem logo",
  jarvis: "JARVIS project icon",
  "handy-andy": "Handy Andy project icon",
  hackthenorth: "Hack the North logo",
  nwhacks: "nwHacks logo",
};

const INTERNAL_HOSTS = new Set(["prajwal.is-a.dev", "www.prajwal.is-a.dev"]);

function isInternalHref(href) {
  if (!href || href.startsWith("/") || href.startsWith("#")) return true;
  try {
    const { hostname } = new URL(href);
    return INTERNAL_HOSTS.has(hostname);
  } catch {
    return false;
  }
}

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (c) => {
    if (c === "&") return "&amp;";
    if (c === "<") return "&lt;";
    if (c === ">") return "&gt;";
    if (c === '"') return "&quot;";
    return "&#39;";
  });
}

function escapeAttr(value = "") {
  return escapeHtml(value);
}

function parseInline(input, state) {
  let output = "";

  for (let i = 0; i < input.length; i += 1) {
    const ch = input[i];

    if (ch === "\\" && i + 1 < input.length) {
      output += escapeHtml(input[i + 1]);
      i += 1;
      continue;
    }

    if (ch === "[") {
      const closeBracket = input.indexOf("]", i + 1);
      if (closeBracket !== -1 && input[closeBracket + 1] === "(") {
        const closeParen = input.indexOf(")", closeBracket + 2);
        if (closeParen !== -1) {
          const label = input.slice(i + 1, closeBracket);
          const href = input.slice(closeBracket + 2, closeParen).trim();
          const labelHtml = parseInline(label, state);
          const internal = isInternalHref(href);
          const linkAttrs = internal
            ? ""
            : ' target="_blank" rel="noopener noreferrer"';
          output += `<a href="${escapeAttr(href)}"${linkAttrs}>${labelHtml}</a>`;
          i = closeParen;
          continue;
        }
      }
    }

    if (ch === "{") {
      const closeBrace = input.indexOf("}", i + 1);
      if (closeBrace !== -1) {
        const iconName = input.slice(i + 1, closeBrace).trim();
        if (/^[a-zA-Z0-9_-]+$/.test(iconName)) {
          const altText = ICON_ALT[iconName] || `${iconName} icon`;
          output += `<img class="tag-icon" src="assets/icons/${escapeAttr(
            iconName
          )}.webp" alt="${escapeAttr(altText)}" aria-hidden="true" width="15" height="15" />`;
          i = closeBrace;
          continue;
        }
      }
    }

    if (ch === "(") {
      const closeParen = input.indexOf(")", i + 1);
      if (closeParen !== -1) {
        const footnoteText = input.slice(i + 1, closeParen).trim();
        if (footnoteText.length) {
          state.footnoteCounter += 1;
          output += `<span class="footnote"><sup>${state.footnoteCounter}</sup><span class="footnote-content">${escapeHtml(
            footnoteText
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

function compileHeroTagline(markdownText) {
  const state = { footnoteCounter: 0 };
  const paragraphs = markdownText
    .split(/\r?\n\s*\r?\n/)
    .map((p) => p.replace(/\r?\n/g, " ").trim())
    .filter(Boolean);

  const rendered = paragraphs.map((p) => parseInline(p, state));
  return `${rendered.join("<br />\n<br />\n")}\n`;
}

export function generateHeroTagline(
  inputPath = defaultInputPath,
  outputPath = defaultOutputPath
) {
  const source = fs.readFileSync(inputPath, "utf-8");
  const compiled = compileHeroTagline(source);
  fs.writeFileSync(outputPath, compiled, "utf-8");
  return { outputPath, footnotes: (compiled.match(/<sup>/g) || []).length };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const result = generateHeroTagline();
  console.log(`Generated ${path.relative(rootDir, result.outputPath)} (${result.footnotes} footnotes).`);
}
