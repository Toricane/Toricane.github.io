export function initScrollableTabs() {
    const wrap = document.querySelector(".tab-scroll-wrap");
    if (!wrap) return;
    const bar = wrap.querySelector(".tab-bar");
    if (!bar) return;

    function updateButtons() {
        const canScrollLeft = bar.scrollLeft > 2;
        const canScrollRight =
            bar.scrollWidth - bar.clientWidth - bar.scrollLeft > 2;
        wrap.classList.toggle("can-scroll-left", canScrollLeft);
        wrap.classList.toggle("can-scroll-right", canScrollRight);
    }

    bar.addEventListener(
        "scroll",
        () => {
            if (window.requestAnimationFrame) {
                window.requestAnimationFrame(updateButtons);
            } else {
                setTimeout(updateButtons, 50);
            }
        },
        { passive: true }
    );

    let isDown = false;
    let startX = 0;
    let scrollLeftStart = 0;
    let hasMoved = false;
    const dragThreshold = 6;

    bar.addEventListener("pointerdown", (e) => {
        if (e.target && e.target.closest && e.target.closest(".tab")) return;
        isDown = true;
        bar.setPointerCapture && bar.setPointerCapture(e.pointerId);
        startX = e.clientX;
        scrollLeftStart = bar.scrollLeft;
        bar.classList.add("dragging");
    });

    bar.addEventListener("pointermove", (e) => {
        if (!isDown) return;
        const dx = startX - e.clientX;
        if (!hasMoved && Math.abs(dx) < dragThreshold) return;
        hasMoved = true;
        bar.scrollLeft = scrollLeftStart + dx;
    });

    const stopPointer = (e) => {
        if (!isDown) return;
        isDown = false;
        try {
            bar.releasePointerCapture && bar.releasePointerCapture(e.pointerId);
        } catch (_) {}
        bar.classList.remove("dragging");
        setTimeout(() => updateButtons(), 10);
        hasMoved = false;
    };

    bar.addEventListener("pointerup", stopPointer);
    bar.addEventListener("pointercancel", stopPointer);
    bar.addEventListener("pointerleave", stopPointer);

    window.addEventListener("resize", updateButtons);
    window.addEventListener("load", updateButtons);

    if ("MutationObserver" in window) {
        const mo = new MutationObserver(() => updateButtons());
        mo.observe(bar, { childList: true, subtree: false });
    }

    updateButtons();
}
