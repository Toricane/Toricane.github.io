// Pause CSS animations while page is hidden (mobile performance helper)
export function initVisibilityPause() {
    document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "hidden") {
            document.querySelectorAll("*").forEach((el) => {
                if (el.style.animationPlayState !== "paused") {
                    el.style.animationPlayState = "paused";
                }
            });
        } else {
            document.querySelectorAll("*").forEach((el) => {
                if (el.style.animationPlayState === "paused") {
                    el.style.animationPlayState = "running";
                }
            });
        }
    });
}
