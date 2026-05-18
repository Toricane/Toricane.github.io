import type { FaceImage } from './siteRuntime';

const COVERFLOW_SIZES = '(width <= 600px) 90vw, 480px';

function publicAsset(path: string) {
  if (!path) return '';
  return path.startsWith('/') ? path : `/${path}`;
}

export function getCoverflowImageSources(originalPath: string) {
  if (!originalPath) {
    return { src: '', srcset: '', sizes: '' };
  }

  if (originalPath === 'assets/northernlights.webp') {
    return {
      src: publicAsset('assets/northernlights-960.webp'),
      srcset: `${publicAsset('assets/northernlights-640.webp')} 640w, ${publicAsset('assets/northernlights-960.webp')} 960w, ${publicAsset('assets/northernlights.webp')} 1600w`,
      sizes: COVERFLOW_SIZES,
    };
  }

  if (originalPath.includes('tab-panels/')) {
    const base = originalPath.replace(/\/preview\//, '/').replace(/\/small\//, '/');
    const smallPath = base.replace('tab-panels/', 'tab-panels/small/');
    return {
      src: publicAsset(base),
      srcset: `${publicAsset(smallPath)} 800w, ${publicAsset(base)} 1600w`,
      sizes: COVERFLOW_SIZES,
    };
  }

  return { src: publicAsset(originalPath), srcset: '', sizes: '' };
}

export type CoverflowLcpPreload = {
  src: string;
  srcset?: string;
  sizes?: string;
};

export function getCoverflowLcpPreload(
  faceImages: FaceImage[],
): CoverflowLcpPreload | null {
  const lcp = pickLcpFaceImage(faceImages);
  if (!lcp) return null;
  const sources = getCoverflowImageSources(lcp.path);
  if (!sources.src) return null;
  return {
    src: sources.src,
    srcset: sources.srcset || undefined,
    sizes: sources.sizes || undefined,
  };
}

export function pickLcpFaceImage(faceImages: FaceImage[]) {
  if (!faceImages?.length) return null;
  const sorted = [...faceImages].sort((a, b) =>
    String(a.path || '').localeCompare(String(b.path || '')),
  );
  return sorted[0];
}

function escapeHtml(value: unknown) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function renderStaticLcpCardHtml(
  image: FaceImage,
  colors: Record<string, string> = {},
) {
  if (!image?.path) return '';

  const sources = getCoverflowImageSources(image.path);
  const rgb = colors[image.path] || '77, 181, 255';
  const alt = escapeHtml(image.label || 'Photo');
  const src = escapeHtml(sources.src);
  const srcsetAttr = sources.srcset
    ? ` srcset="${escapeHtml(sources.srcset)}" sizes="${escapeHtml(sources.sizes)}"`
    : '';

  let overlay = '';
  const hasDate = image.date && String(image.date).trim();
  const hasTitle = image.title && String(image.title).trim();
  if (hasDate || hasTitle) {
    const titleHtml = hasTitle
      ? image.link && String(image.link).trim()
        ? `<span class="coverflow-overlay-title"><a href="${escapeHtml(image.link.trim())}"${image.link.trim().startsWith('#') ? '' : ' target="_blank" rel="noopener noreferrer"'}>${escapeHtml(image.title.trim())}</a></span>`
        : `<span class="coverflow-overlay-title">${escapeHtml(image.title.trim())}</span>`
      : '';
    const dateHtml = hasDate
      ? `<span class="coverflow-overlay-date">${escapeHtml(String(image.date).trim())}</span>`
      : '';
    overlay = `<div class="coverflow-overlay">${titleHtml}${dateHtml}</div>`;
  }

  return `<div class="coverflow-card coverflow-static-lcp is-loaded" data-path="${escapeHtml(image.path)}" data-coverflow-static-lcp="1" style="--card-glow-rgb:${escapeHtml(rgb)}"><img class="coverflow-main" alt="${alt}" decoding="sync" loading="eager" fetchpriority="high" crossorigin="anonymous" src="${src}"${srcsetAttr}>${overlay}</div>`;
}
