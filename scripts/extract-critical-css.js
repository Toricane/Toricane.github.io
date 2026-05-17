import fs from 'fs';

/** Selectors / fragments whose rules are needed for above-the-fold hero paint. */
const CRITICAL_MATCHERS = [
  ':root',
  '[data-theme=',
  'html',
  'body',
  '*{',
  '.skip-link',
  '#hero',
  '.hero-inner',
  '.intro-col',
  '.media-col',
  '.site-title',
  '.last-name',
  '.tagline',
  '.tag-icon',
  '.footnote',
  '.connections',
  '.svg-icon',
  '.icon',
  '.coverflow-',
  '.theme-toggle',
  '.scroll-more',
  '.widgets',
  '@font-face',
  '@keyframes fade',
];

/**
 * Extract critical CSS blocks from the source stylesheet (pre-minify).
 * @param {string} cssSource
 * @returns {string}
 */
export function extractCriticalCss(cssSource) {
  const withoutFa = cssSource.replace(/@font-face\s*\{[^}]*font-awesome[^}]*\}/gi, '');

  const blocks = [];
  let depth = 0;
  let start = 0;
  let selectorStart = 0;

  for (let i = 0; i < withoutFa.length; i++) {
    const ch = withoutFa[i];
    if (ch === '{') {
      if (depth === 0) selectorStart = start;
      depth++;
    } else if (ch === '}') {
      depth--;
      if (depth === 0) {
        const block = withoutFa.slice(selectorStart, i + 1).trim();
        const selectorPart = block.slice(0, block.indexOf('{')).trim();
        const isCritical = CRITICAL_MATCHERS.some(
          (m) => selectorPart.includes(m) || block.includes(m),
        );
        if (isCritical && block.length > 2) {
          blocks.push(block);
        }
        start = i + 1;
      }
    }
  }

  return blocks.join('\n');
}

export function readCriticalCss(stylesPath) {
  const source = fs.readFileSync(stylesPath, 'utf-8');
  return extractCriticalCss(source);
}
