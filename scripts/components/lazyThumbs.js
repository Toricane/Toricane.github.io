// Deferred loading for project/timeline thumbnail previews (data-preview).

let thumbObserver = null;

function getThumbObserver() {
  if (thumbObserver) return thumbObserver;

  thumbObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        const preview = el.dataset.preview;
        if (preview) {
          el.style.backgroundImage = `url("${preview}")`;
          el.removeAttribute("data-preview");
        }
        el.classList.remove("thumb-pending");
        observer.unobserve(el);
      });
    },
    { rootMargin: "200px", threshold: 0.01 },
  );

  return thumbObserver;
}

function observeThumb(el) {
  if (!el.classList.contains("thumb-pending")) return;
  getThumbObserver().observe(el);
}

export function initLazyThumbs(root = document) {
  const scope = root instanceof Element ? root : document;
  scope
    .querySelectorAll(".card-thumb.thumb-pending, .timeline-thumb.thumb-pending")
    .forEach(observeThumb);
}

export function refreshLazyThumbs(container) {
  if (!container) return;
  initLazyThumbs(container);
}
