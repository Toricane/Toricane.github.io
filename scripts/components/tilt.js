export function setupTilt(target, opts = {}) {
    if (!target) return;
    const isMobile = window.innerWidth <= 768 || "ontouchstart" in window;
    if (isMobile) return;

    const cfg = Object.assign({ max: 14, glare: false, scale: 1.015 }, opts);
    if (!target.parentElement.classList.contains("tilt-origin")) {
        const wrapper = document.createElement("div");
        wrapper.className = "tilt-origin";
        target.parentElement.insertBefore(wrapper, target);
        wrapper.appendChild(target);
        target.classList.add("tilt-inner");
    }
    const wrapperEl = target.parentElement;
    let hovering = false;
    let rafId = null;
    const state = { rx: 0, ry: 0, tz: 0, scale: 1 };
    const targetState = { rx: 0, ry: 0, tz: 0, scale: 1 };
    const lerp = (a, b, t) => a + (b - a) * t;
    const apply = () => {
        const { rx, ry, tz, scale } = state;
        target.style.transform = `translateZ(${tz}px) rotateX(${rx}deg) rotateY(${ry}deg) scale(${scale})`;
    };

    let lastFrameTime = 0;
    const targetFPS = 30;
    const frameInterval = 1000 / targetFPS;

    function loop(currentTime) {
        if (currentTime - lastFrameTime >= frameInterval) {
            state.rx = lerp(state.rx, targetState.rx, 0.16);
            state.ry = lerp(state.ry, targetState.ry, 0.16);
            state.tz = lerp(state.tz, targetState.tz, 0.18);
            state.scale = lerp(state.scale, targetState.scale, 0.18);
            apply();
            lastFrameTime = currentTime;
        }
        if (
            hovering ||
            Math.abs(state.rx) > 0.05 ||
            Math.abs(state.ry) > 0.05 ||
            Math.abs(state.tz) > 0.2 ||
            Math.abs(state.scale - 1) > 0.001
        ) {
            rafId = requestAnimationFrame(loop);
        } else {
            rafId = null;
        }
    }
    function ensureLoop() {
        if (rafId == null) rafId = requestAnimationFrame(loop);
    }

    let lastMoveTime = 0;
    const moveThrottle = 16;

    function handleMove(e) {
        const currentTime = Date.now();
        if (currentTime - lastMoveTime < moveThrottle) return;
        lastMoveTime = currentTime;
        if (!hovering) return;
        const rect = wrapperEl.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width;
        const y = (e.clientY - rect.top) / rect.height;
        targetState.ry = lerp(-cfg.max, cfg.max, x);
        targetState.rx = lerp(cfg.max, -cfg.max, y);
        targetState.tz = 18;
        targetState.scale = cfg.scale;
        ensureLoop();
    }

    function enter() {
        hovering = true;
        targetState.scale = cfg.scale;
        targetState.tz = 12;
        ensureLoop();
    }

    function leave() {
        hovering = false;
        targetState.rx = 0;
        targetState.ry = 0;
        targetState.tz = 0;
        targetState.scale = 1;
        ensureLoop();
    }

    wrapperEl.addEventListener("pointerenter", enter);
    wrapperEl.addEventListener("pointermove", handleMove);
    wrapperEl.addEventListener("pointerleave", leave);
    wrapperEl.addEventListener("touchstart", (e) => enter(e));
    wrapperEl.addEventListener("touchend", leave);
}
