// Pause CSS animations while the page tab is hidden (cheap class toggle).
export function initVisibilityPause() {
  const sync = () => {
    document.documentElement.classList.toggle(
      "page-hidden",
      document.visibilityState === "hidden",
    );
  };
  document.addEventListener("visibilitychange", sync);
  sync();
}
