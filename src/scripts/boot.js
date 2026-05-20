/**
 * Client bootstrap (ported from scripts/main.js).
 */
import { initCoverFlow } from './components/coverflow.js';
import { initLazyThumbs } from './components/lazyThumbs.js';
import { initFootnotes } from './components/footnotes.js';
import { initImageViewerDelegates } from './components/imageViewer.js';
import {
  applyHashFromLocation,
  initHashNavigation,
  setTabActivator,
} from './components/navigation.js';
import { wireProjects } from './components/renderProjects.js';
import { wireTimeline } from './components/renderTimeline.js';
import { initScrollableTabs } from './components/scrollableTabs.js';
import { initScrollButton } from './components/scrollButton.js';
import { initTabs, setTabImages } from './components/tabs.js';
import { initTapMode } from './components/tapMode.js';
import { initThemeToggle, initYear } from './components/theme.js';
import { setupTilt } from './components/tilt.js';
import { initVisibilityPause } from './components/visibilityPause.js';
import { initAmbientBg } from './components/ambientBg.js';
import { initFilterBar } from './components/filter.js';

let coverflowScheduled = false;

function runWhenIdle(fn, timeout = 2500) {
  if ('requestIdleCallback' in window) {
    requestIdleCallback(fn, { timeout });
  } else {
    setTimeout(fn, 200);
  }
}

function timelineWireGroups(runtime, section) {
  return (runtime.timelineLinks || [])
    .filter((entry) => entry.section === section)
    .map((entry) => ({
      when: '',
      items: [{ name: entry.title, link: entry.links }],
    }));
}

function scheduleCoverFlowInit(faceImages, colors) {
  if (coverflowScheduled) return;
  coverflowScheduled = true;

  const root = document.querySelector('.coverflow-container');
  if (!root) return;

  const run = () => initCoverFlow(faceImages, colors || {});

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();
        runWhenIdle(run, 800);
      },
      { rootMargin: '120px 0px' },
    );
    observer.observe(root);
    runWhenIdle(() => {
      observer.disconnect();
      run();
    }, 4000);
    return;
  }

  runWhenIdle(run, 1500);
}

function hydrateFromRuntime(runtime) {
  const faceImages = runtime.faceImages || [];
  const coverflowColors = runtime.coverflowColors || {};
  scheduleCoverFlowInit(faceImages, coverflowColors);

  if (runtime.projectLinks) {
    wireProjects(
      runtime.projectLinks.map((p) => ({
        title: p.title,
        link: p.links,
      })),
    );
    wireTimeline('hackathons', timelineWireGroups(runtime, 'hackathons'), true);
    wireTimeline('awards', timelineWireGroups(runtime, 'awards'), false);
  }

  initLazyThumbs();
  applyHashFromLocation();

  if (runtime.sectionImages) {
    setTabImages({ sectionImages: runtime.sectionImages });
  }
}

export function boot(runtime) {
  if (!runtime) return;

  initAmbientBg();
  initYear();
  initThemeToggle();
  initScrollButton();

  const { activate } = initTabs();
  setTabActivator(activate);
  initHashNavigation();
  initFootnotes();
  initImageViewerDelegates();

  hydrateFromRuntime(runtime);
  initFilterBar();

  runWhenIdle(async () => {
    const { initWidgets } = await import('./components/widgets.js');
    initWidgets();
    initTapMode();
    initVisibilityPause();
    initScrollableTabs();

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!reduceMotion) {
      const highlightFigureEl = document.querySelector('.tab-highlight-figure');
      setupTilt(highlightFigureEl, { max: 12, scale: 1.02 });
    }
  });

  applyHashFromLocation();

  window.addEventListener(
    'load',
    () => {
      document.body.classList.add('page-ready');
    },
    { once: true },
  );
}

