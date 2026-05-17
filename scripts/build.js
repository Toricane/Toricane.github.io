#!/usr/bin/env node

/**
 * Build script: inject template/content and generate minified index.html
 */

import { build as esbuild } from 'esbuild';
import fs from 'fs';
import { minify } from 'html-minifier-terser';
import { JSDOM } from 'jsdom';
import path from 'path';
import { fileURLToPath } from 'url';
import { generateHeroTagline } from './generate_hero_tagline.js';
import { generateSitemap } from './generate-sitemap.js';
import { applySeoToDocument } from './seo.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const dataPath = path.join(rootDir, 'data.json');
const colorsPath = path.join(rootDir, 'colors.json');
const indexPath = path.join(rootDir, 'index.html');
const seoPath = path.join(rootDir, 'seo.json');
const heroTemplatePath = path.join(rootDir, 'templates', 'hero-tagline.html');
const bundledCssPath = path.join(rootDir, 'styles.min.css');
const bundledJsPath = path.join(rootDir, 'scripts', 'main.min.js');

const readUtf8 = (filePath) => fs.readFileSync(filePath, 'utf-8');

const LCP_IMAGE_PATH = 'assets/northernlights.webp';
const POPPINS_STYLESHEET_URL =
  'https://fonts.googleapis.com/css2?family=Poppins:wght@600;700&display=swap';

function applyPerformanceHead(document, siteData) {
  const head = document.head;
  if (!head) return;

  head
    .querySelectorAll('link[rel="preconnect"][href="https://api.rss2json.com"]')
    .forEach((el) => el.remove());

  if (!head.querySelector('link[rel="preconnect"][href="https://fonts.gstatic.com"]')) {
    const gstatic = document.createElement('link');
    gstatic.rel = 'preconnect';
    gstatic.href = 'https://fonts.gstatic.com';
    gstatic.crossOrigin = 'anonymous';
    const manifest = head.querySelector('link[rel="manifest"]');
    if (manifest?.nextSibling) {
      head.insertBefore(gstatic, manifest.nextSibling);
    } else {
      head.appendChild(gstatic);
    }
  }

  const lcpPath =
    siteData?.coverflowImages?.find((entry) => entry?.path)?.path ||
    LCP_IMAGE_PATH;

  if (!head.querySelector(`link[rel="preload"][href="${lcpPath}"]`)) {
    const lcpPreload = document.createElement('link');
    lcpPreload.rel = 'preload';
    lcpPreload.as = 'image';
    lcpPreload.href = lcpPath;
    lcpPreload.setAttribute('fetchpriority', 'high');
    if (head.firstChild) {
      head.insertBefore(lcpPreload, head.firstChild);
    } else {
      head.appendChild(lcpPreload);
    }
  }

  for (const link of head.querySelectorAll(
    'link[href*="fonts.googleapis.com/css2?family=Poppins"]',
  )) {
    link.setAttribute('href', POPPINS_STYLESHEET_URL);
    link.removeAttribute('onload');
  }

  const fontsPreload = head.querySelector(
    'link[rel="preload"][as="style"][href*="fonts.googleapis"]',
  );
  if (fontsPreload) {
    fontsPreload.setAttribute('href', POPPINS_STYLESHEET_URL);
    const hasStylesheet = head.querySelector(
      `link[rel="stylesheet"][href="${POPPINS_STYLESHEET_URL}"]`,
    );

    if (!hasStylesheet) {
      const fontsStylesheet = document.createElement('link');
      fontsStylesheet.rel = 'stylesheet';
      fontsStylesheet.href = POPPINS_STYLESHEET_URL;
      fontsPreload.insertAdjacentElement('afterend', fontsStylesheet);
    }
  } else {
    const fontsStylesheet = document.createElement('link');
    fontsStylesheet.rel = 'stylesheet';
    fontsStylesheet.href = POPPINS_STYLESHEET_URL;
    const styles = head.querySelector('link[rel="stylesheet"][href*="styles"]');
    if (styles) {
      head.insertBefore(fontsStylesheet, styles);
    } else {
      head.appendChild(fontsStylesheet);
    }
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

  try {
    await Promise.all([
      esbuild({
        entryPoints: [path.join(rootDir, 'scripts', 'main.js')],
        bundle: true,
        minify: true,
        format: 'iife',
        platform: 'browser',
        target: ['es2017'],
        outfile: bundledJsPath,
        legalComments: 'none',
      }),
      esbuild({
        entryPoints: [path.join(rootDir, 'styles.css')],
        bundle: true,
        minify: true,
        outfile: bundledCssPath,
        legalComments: 'none',
      }),
    ]);

    console.log('✓ Bundled scripts/main.js -> scripts/main.min.js');
    console.log('✓ Minified styles.css -> styles.min.css');
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

await bundleClientAssets();

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

const tagline = outputDocument.querySelector('#hero .tagline');
if (!tagline) {
  throw new Error('Missing hero tagline element (.tagline) in index.html');
}
tagline.innerHTML = heroTaglineTemplate;
console.log('✓ Injected hero tagline template');

applySeoToDocument(outputDocument, seo, dateModified);
console.log('✓ Applied canonical URL and JSON-LD structured data');

applyPerformanceHead(outputDocument, data);
console.log('✓ Applied performance head hints (LCP preload, preconnect cleanup)');

const stylesheetPreload = outputDocument.querySelector('link[rel="preload"][as="style"][href="styles.css"]');
if (stylesheetPreload) {
  stylesheetPreload.setAttribute('href', 'styles.min.css');
}

const stylesheetLink = outputDocument.querySelector('link[rel="stylesheet"][href="styles.css"]');
if (stylesheetLink) {
  stylesheetLink.setAttribute('href', 'styles.min.css');
}

const scriptTag =
  outputDocument.querySelector('script[src="scripts/main.js"]') ||
  outputDocument.querySelector('script[src="scripts/main.min.js"]');
if (scriptTag) {
  scriptTag.setAttribute('src', 'scripts/main.min.js');
  scriptTag.setAttribute('defer', '');
  scriptTag.removeAttribute('type');
}

for (const modulePreload of outputDocument.querySelectorAll('link[rel="modulepreload"]')) {
  modulePreload.remove();
}

// Keep the font-awesome preload onload handler parser-safe for HTML/JS tooling.
const fontAwesomePreload = outputDocument.querySelector(
  'link[rel="preload"][as="style"][href*="font-awesome"]'
);
if (fontAwesomePreload) {
  fontAwesomePreload.setAttribute('onload', "this.onload=null;this.rel='stylesheet';");
}

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
  • JS output: scripts/main.min.js
  • CSS output: styles.min.css
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
