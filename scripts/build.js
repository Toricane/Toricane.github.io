#!/usr/bin/env node

/**
 * Build script: inject template/content and generate minified index.html
 */

import * as esbuild from 'esbuild';
import crypto from 'crypto';
import fs from 'fs';
import { minify } from 'html-minifier-terser';
import { JSDOM } from 'jsdom';
import path from 'path';
import { fileURLToPath } from 'url';
import { extractCriticalCss } from './extract-critical-css.js';
import { generateHeroTagline } from './generate_hero_tagline.js';
import { generateSitemap } from './generate-sitemap.js';
import { applySvgIcons, replaceFaIcons } from './icons.js';
import { applySeoToDocument } from './seo.js';
import {
  getCoverflowImageSources,
  pickLcpFaceImage,
  renderStaticLcpCardHtml,
} from './utils/coverflowShared.js';
import { collectFaceImages, generateRuntimePayload } from './utils/siteData.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const dataPath = path.join(rootDir, 'data.json');
const colorsPath = path.join(rootDir, 'colors.json');
const indexPath = path.join(rootDir, 'index.html');
const seoPath = path.join(rootDir, 'seo.json');
const heroTemplatePath = path.join(rootDir, 'templates', 'hero-tagline.html');
const manifestPath = path.join(rootDir, 'asset-manifest.json');
const stylesSourcePath = path.join(rootDir, 'styles.css');
const readUtf8 = (filePath) => fs.readFileSync(filePath, 'utf-8');

function hashContent(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex').slice(0, 10);
}

function loadAssetManifest() {
  try {
    return JSON.parse(readUtf8(manifestPath));
  } catch {
    return null;
  }
}

function pruneHashedAssets(keepRelativePaths) {
  const keep = new Set(keepRelativePaths.map((p) => p.replace(/\\/g, '/')));
  const scanDirs = [rootDir, path.join(rootDir, 'scripts')];
  const patterns = [
    /^styles\.[a-f0-9]+\.min\.css$/,
    /^main-[A-Za-z0-9]+\.js$/,
    /^chunk-[A-Za-z0-9]+\.js$/,
  ];

  for (const dir of scanDirs) {
    if (!fs.existsSync(dir)) continue;
    for (const name of fs.readdirSync(dir)) {
      if (!patterns.some((re) => re.test(name))) continue;
      const rel = path.relative(rootDir, path.join(dir, name)).replace(/\\/g, '/');
      if (keep.has(rel)) continue;
      fs.unlinkSync(path.join(dir, name));
    }
  }
}

function cleanupLegacyHead(document) {
  const head = document.head;
  if (!head) return;

  const removeSelector = [
    'link[rel="preload"][href="data.json"]',
    'link[rel="preload"][href*="northernlights"]',
    'link[rel="preload"][as="fetch"]',
    'link[rel="preload"][href*="styles"]',
    'link[href*="fonts.googleapis"]',
    'link[href*="font-awesome"]',
    'link[rel="preconnect"][href="https://fonts.gstatic.com"]',
    'link[rel="preconnect"][href="https://cdnjs.cloudflare.com"]',
    'script[src*="animejs"]',
    'script[src*="anime.min.js"]',
    '#site-runtime',
    'style#critical',
    'link[data-deferred-styles]',
  ];

  for (const sel of removeSelector) {
    head.querySelectorAll(sel).forEach((el) => el.remove());
  }

  head
    .querySelectorAll('link[rel="preconnect"][href="https://api.rss2json.com"]')
    .forEach((el) => el.remove());

  head.querySelectorAll('link[rel="stylesheet"][href*="styles"]').forEach((el) => {
    el.remove();
  });

  head.querySelectorAll('noscript:empty').forEach((el) => el.remove());
}

function injectStylesheet(document, { cssHref, criticalCss }) {
  const head = document.head;
  if (!head || !cssHref) return;

  head.querySelectorAll('style#critical').forEach((el) => el.remove());
  head.querySelectorAll('link[data-deferred-styles]').forEach((el) => el.remove());
  head.querySelectorAll('noscript[data-styles-fallback]').forEach((el) => el.remove());

  if (criticalCss) {
    const style = document.createElement('style');
    style.id = 'critical';
    style.textContent = criticalCss;
    const canonical = head.querySelector('link[rel="canonical"]');
    if (canonical) {
      head.insertBefore(style, canonical);
    } else {
      head.appendChild(style);
    }
  }

  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = cssHref;
  link.media = 'print';
  link.setAttribute('data-deferred-styles', '1');
  link.setAttribute(
    'onload',
    "this.onload=null;this.media='all';",
  );

  const canonical = head.querySelector('link[rel="canonical"]');
  if (canonical) {
    head.insertBefore(link, canonical);
  } else {
    head.appendChild(link);
  }

  const noscript = document.createElement('noscript');
  noscript.setAttribute('data-styles-fallback', '1');
  const fallbackLink = document.createElement('link');
  fallbackLink.rel = 'stylesheet';
  fallbackLink.href = cssHref;
  noscript.appendChild(fallbackLink);
  head.appendChild(noscript);
}

/** Remove stray escaped <link> text nodes left by older builds (JSDOM + innerHTML). */
function cleanupBodyStylesheetArtifacts(document) {
  const body = document.body;
  if (!body) return;

  for (const node of [...body.childNodes]) {
    if (node.nodeType !== 3) continue;
    const text = node.textContent || '';
    if (/&lt;link\s+rel=["']?stylesheet/i.test(text) || /^<link\s+rel=["']?stylesheet/i.test(text)) {
      node.remove();
    }
  }
}

function injectCoverflowLcp(document, faceImages, colors) {
  const lcpImage = pickLcpFaceImage(faceImages);
  const cardsEl = document.getElementById('coverflowCards');
  if (!lcpImage || !cardsEl) return;

  cardsEl.innerHTML = renderStaticLcpCardHtml(lcpImage, colors);

  const sources = getCoverflowImageSources(lcpImage.path);
  if (!sources.src) return;

  const head = document.head;
  if (!head) return;

  let preload = head.querySelector('link[data-coverflow-lcp]');
  if (!preload) {
    preload = document.createElement('link');
    preload.rel = 'preload';
    preload.as = 'image';
    preload.setAttribute('data-coverflow-lcp', '1');
    const anchor = head.querySelector('style#critical') || head.querySelector('link[rel="canonical"]');
    if (anchor) {
      head.insertBefore(preload, anchor);
    } else {
      head.appendChild(preload);
    }
  }

  preload.href = sources.src;
  if (sources.srcset) {
    preload.setAttribute('imagesrcset', sources.srcset);
    preload.setAttribute('imagesizes', sources.sizes);
  } else {
    preload.removeAttribute('imagesrcset');
    preload.removeAttribute('imagesizes');
  }
}

function injectRuntimeScript(document, runtimePayload) {
  const existing = document.getElementById('site-runtime');
  if (existing) existing.remove();

  const script = document.createElement('script');
  script.id = 'site-runtime';
  script.textContent = `window.__SITE_RUNTIME__=${JSON.stringify(runtimePayload)};`;

  const mainScript =
    document.querySelector('script[src="scripts/main.js"]') ||
    document.querySelector('script[src*="scripts/main"]');
  if (mainScript?.parentNode) {
    mainScript.parentNode.insertBefore(script, mainScript);
  } else {
    document.body.appendChild(script);
  }
}

function loadJsonWithFallback(filePath, fallback = {}) {
  try {
    return JSON.parse(readUtf8(filePath));
  } catch {
    return fallback;
  }
}

async function bundleClientAssets() {
  console.log('\n⚙️  Bundling client assets...');

  const previousManifest = loadAssetManifest();
  const criticalCss = extractCriticalCss(readUtf8(stylesSourcePath));

  try {
    const scriptsDir = path.join(rootDir, 'scripts');
    const jsResult = await esbuild.build({
      entryPoints: [path.join(scriptsDir, 'main.js')],
      bundle: true,
      splitting: true,
      minify: true,
      format: 'esm',
      platform: 'browser',
      target: ['es2017'],
      outdir: scriptsDir,
      entryNames: 'main-[hash]',
      chunkNames: 'chunk-[hash]',
      legalComments: 'none',
      metafile: true,
    });

    let jsRel = 'scripts/main.min.js';
    const chunks = [];
    for (const [outfile, info] of Object.entries(jsResult.metafile.outputs)) {
      const rel = path.relative(rootDir, outfile).replace(/\\/g, '/');
      const entry = info.entryPoint?.replace(/\\/g, '/');
      if (entry?.endsWith('scripts/main.js')) {
        jsRel = rel;
      } else if (rel.startsWith('scripts/chunk-')) {
        chunks.push(rel);
      }
    }

    const cssTmp = path.join(rootDir, '.styles-bundle.tmp.css');
    await esbuild.build({
      entryPoints: [stylesSourcePath],
      bundle: true,
      minify: true,
      outfile: cssTmp,
      legalComments: 'none',
    });
    const cssBuffer = fs.readFileSync(cssTmp);
    fs.unlinkSync(cssTmp);

    const cssHash = hashContent(cssBuffer);
    const cssRel = `styles.${cssHash}.min.css`;
    fs.writeFileSync(path.join(rootDir, cssRel), cssBuffer);

    const manifest = { css: cssRel, js: jsRel, chunks };
    const keepPaths = [cssRel, jsRel, ...chunks];
    pruneHashedAssets(keepPaths);
    fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

    const legacyAssets = [
      path.join(rootDir, 'styles.min.css'),
      path.join(rootDir, 'scripts', 'main.min.js'),
    ];
    for (const legacyPath of legacyAssets) {
      if (fs.existsSync(legacyPath)) fs.unlinkSync(legacyPath);
    }

    console.log(`✓ Bundled scripts/main.js -> ${jsRel}${chunks.length ? ` (+${chunks.length} chunks)` : ''}`);
    console.log(`✓ Minified styles.css -> ${cssRel}`);
    console.log(`✓ Critical CSS extracted (${criticalCss.length} bytes)`);

    return { manifest, criticalCss };
  } catch (err) {
    console.error(`✗ Asset bundling failed: ${err.message}`);
    process.exit(1);
  }
}

console.log('📦 Loading source files...');

try {
  const generated = generateHeroTagline();
  console.log(`✓ Generated ${path.relative(rootDir, generated.outputPath)} from hero-tagline.md`);
} catch (err) {
  console.error(`✗ Failed to generate hero template from markdown: ${err.message}`);
  process.exit(1);
}

let data;
try {
  data = JSON.parse(readUtf8(dataPath));
  console.log(`✓ Loaded data.json (${Object.keys(data).length} top-level keys)`);
} catch (err) {
  console.error(`✗ Failed to parse data.json: ${err.message}`);
  process.exit(1);
}

const colors = loadJsonWithFallback(colorsPath, {});
console.log('✓ Loaded colors.json (or fallback {})');

let seo;
try {
  seo = JSON.parse(readUtf8(seoPath));
  console.log('✓ Loaded seo.json');
} catch (err) {
  console.error(`✗ Failed to parse seo.json: ${err.message}`);
  process.exit(1);
}

const buildDate = new Date();
const dateModified = buildDate.toISOString().slice(0, 10);

try {
  const sitemapResult = generateSitemap({ buildDate });
  console.log(
    `✓ Generated sitemap.xml (${sitemapResult.urlCount} URLs, lastmod ${sitemapResult.lastmod})`
  );
} catch (err) {
  console.error(`✗ Failed to generate sitemap.xml: ${err.message}`);
  process.exit(1);
}

let heroTaglineTemplate = '';
try {
  heroTaglineTemplate = readUtf8(heroTemplatePath).trim();
  console.log('✓ Loaded templates/hero-tagline.html');
} catch (err) {
  console.error(`✗ Failed to read hero template: ${err.message}`);
  process.exit(1);
}

let indexHtml = '';
try {
  indexHtml = readUtf8(indexPath);
  console.log(`✓ Loaded index.html (${indexHtml.length} bytes)`);
} catch (err) {
  console.error(`✗ Failed to read index.html: ${err.message}`);
  process.exit(1);
}

const { manifest: assetManifest, criticalCss } = await bundleClientAssets();

console.log('\n🌐 Rendering tab content in build DOM...');

const minimalHtml = `
  <!DOCTYPE html>
  <html>
    <head><title>Build Temp</title></head>
    <body>
      <main id="content" class="content">
        <section class="tabs">
          <div class="tab-panels">
            <div id="projects" class="tab-panel"></div>
            <div id="hackathons" class="tab-panel"></div>
            <div id="awards" class="tab-panel"></div>
          </div>
        </section>
      </main>
    </body>
  </html>
`;

const buildDom = new JSDOM(minimalHtml, { url: 'file://' + rootDir });
global.document = buildDom.window.document;
global.window = buildDom.window;

// Mock fetch for our render functions (they may try to fetch resources)
global.fetch = async (url) => {
  if (url === 'data.json') {
    return { json: async () => data };
  }
  if (url === 'colors.json') {
    return { json: async () => colors };
  }
  return { json: async () => ({}) };
};

console.log('✓ DOM environment ready');

console.log('\n🎨 Running existing renderers...');

try {
  // Import the render functions as ES modules
  const { renderProjects } = await import('./components/renderProjects.js');
  const { renderTimeline } = await import('./components/renderTimeline.js');

  // Call render functions
  renderProjects(data.projects || []);
  console.log(`✓ Rendered ${(data.projects || []).length} projects`);

  renderTimeline('hackathons', data.hackathons || [], true);
  console.log(`✓ Rendered hackathons`);

  renderTimeline('awards', data.awards || [], false);
  console.log(`✓ Rendered awards`);
} catch (err) {
  console.error(`✗ Rendering failed: ${err.message}`);
  console.error(err.stack);
  process.exit(1);
}

console.log('\n📄 Extracting generated tab HTML...');

/** JSDOM render attaches listeners and sets data-wired; strip before serializing HTML. */
function stripRuntimePanelAttrs(html) {
  return html.replace(/\s*data-wired="1"/g, '');
}

const projectsHtml = stripRuntimePanelAttrs(
  document.getElementById('projects')?.innerHTML || '',
);
const hackathonsHtml = stripRuntimePanelAttrs(
  document.getElementById('hackathons')?.innerHTML || '',
);
const awardsHtml = stripRuntimePanelAttrs(
  document.getElementById('awards')?.innerHTML || '',
);

console.log(`✓ Projects: ${projectsHtml.length} bytes`);
console.log(`✓ Hackathons: ${hackathonsHtml.length} bytes`);
console.log(`✓ Awards: ${awardsHtml.length} bytes`);

console.log('\n🔧 Injecting templates into index DOM...');

const outputDom = new JSDOM(indexHtml, { url: 'file://' + rootDir });
const outputDocument = outputDom.window.document;

const setPanelHtml = (id, html) => {
  const panel = outputDocument.getElementById(id);
  if (!panel) {
    throw new Error(`Missing #${id} panel in index.html`);
  }
  panel.innerHTML = html;
};

setPanelHtml('projects', projectsHtml);
setPanelHtml('hackathons', hackathonsHtml);
setPanelHtml('awards', awardsHtml);

function injectWorkHeading(document) {
  const content = document.getElementById('content');
  const tabs = content?.querySelector('.tabs');
  if (!content || !tabs) return;
  if (content.querySelector('#work-heading')) return;
  const h2 = document.createElement('h2');
  h2.id = 'work-heading';
  h2.className = 'visually-hidden';
  h2.textContent = 'Work';
  content.insertBefore(h2, tabs);
}

function setTabPanelVisibility(document) {
  for (const id of ['projects', 'hackathons', 'awards']) {
    const panel = document.getElementById(id);
    if (!panel) continue;
    const isActive = id === 'projects';
    panel.classList.toggle('active', isActive);
    panel.toggleAttribute('hidden', !isActive);
  }
}

function fixTabHighlightA11y(document) {
  const highlight = document.querySelector('.tab-highlight');
  if (!highlight) return;
  highlight.removeAttribute('aria-hidden');
  highlight.setAttribute('role', 'region');
  highlight.setAttribute('aria-label', 'Featured portfolio images');
}

injectWorkHeading(outputDocument);
setTabPanelVisibility(outputDocument);
fixTabHighlightA11y(outputDocument);

const tagline = outputDocument.querySelector('#hero .tagline');
if (!tagline) {
  throw new Error('Missing hero tagline element (.tagline) in index.html');
}
tagline.innerHTML = heroTaglineTemplate;
console.log('✓ Injected hero tagline template');

applySeoToDocument(outputDocument, seo, dateModified);
console.log('✓ Applied canonical URL and JSON-LD structured data');

replaceFaIcons(outputDocument);
applySvgIcons(outputDocument);
console.log('✓ Applied inline SVG icons');

cleanupLegacyHead(outputDocument);

const faceImages = collectFaceImages(data);
injectCoverflowLcp(outputDocument, faceImages, colors);
console.log('✓ Injected static coverflow LCP card + image preload');

const runtimePayload = generateRuntimePayload(data, colors);
injectRuntimeScript(outputDocument, runtimePayload);
console.log(
  `✓ Injected site runtime payload (${JSON.stringify(runtimePayload).length} bytes)`,
);
injectStylesheet(outputDocument, {
  cssHref: assetManifest.css,
  criticalCss,
});
console.log(`✓ Inlined critical CSS; deferred full stylesheet (${assetManifest.css})`);

const scriptTag =
  outputDocument.querySelector('script[src="scripts/main.js"]') ||
  outputDocument.querySelector('script[src*="scripts/main"]');
if (scriptTag) {
  scriptTag.setAttribute('src', assetManifest.js);
  scriptTag.setAttribute('type', 'module');
  scriptTag.setAttribute('defer', '');
}

for (const modulePreload of outputDocument.querySelectorAll('link[rel="modulepreload"]')) {
  modulePreload.remove();
}

cleanupBodyStylesheetArtifacts(outputDocument);

let serialized = outputDom.serialize();

// Ensure previous generated comment does not accumulate across runs.
serialized = serialized.replace(
  /<!-- Generated by build\.js on [^>]*-->\s*/g,
  ''
);

const now = buildDate.toISOString();
serialized = serialized.replace(
  /<!DOCTYPE html>/i,
  `<!doctype html>\n<!-- Generated by build.js on ${now} -->`
);

console.log('\n🗜️  Minifying index.html...');

let minified = '';
try {
  minified = await minify(serialized, {
    collapseWhitespace: true,
    conservativeCollapse: true,
    collapseInlineTagWhitespace: false,
    removeComments: true,
    minifyCSS: true,
    minifyJS: false,
    keepClosingSlash: true,
  });

  // Some toolchains parse HTML event handlers as JS and choke on encoded quotes.
  // Normalize this known preload handler to a parser-safe form.
  minified = minified.replace(
    /onload="this\.onload=null,?\s*this\.rel=&quot;stylesheet&quot;"/g,
    "onload=\"this.onload=null;this.rel='stylesheet';\""
  );

  console.log(`✓ Minified HTML (${serialized.length} -> ${minified.length} bytes)`);
} catch (err) {
  console.error(`✗ Minification failed: ${err.message}`);
  process.exit(1);
}

console.log('\n💾 Writing generated index.html...');

try {
  fs.writeFileSync(indexPath, minified, 'utf-8');
  console.log(`✓ Successfully wrote minified index.html (${minified.length} bytes)`);
} catch (err) {
  console.error(`✗ Failed to write index.html: ${err.message}`);
  process.exit(1);
}

console.log('\n✅ Build complete!');
console.log(`
Summary:
  • Projects: ${(data.projects || []).length} items
  • Hackathons: ${(data.hackathons || []).length} groups
  • Awards: ${(data.awards || []).length} groups
  • Hero markdown source: templates/hero-tagline.md
  • Hero tagline source: templates/hero-tagline.html
  • JS output: ${assetManifest.js}
  • CSS output: ${assetManifest.css}
  • Asset manifest: asset-manifest.json
  • Output: minified index.html generated

Next steps:
  1. Edit data.json and/or templates/hero-tagline.md
  2. Run npm run build-html
  3. Commit index.html plus source changes
  4. Push to GitHub
  5. GitHub Pages will auto-deploy

To verify:
  • Open index.html in a browser
  • Confirm hero tagline reflects template changes
  • Confirm tabs render with JS disabled
`);

process.exit(0);
