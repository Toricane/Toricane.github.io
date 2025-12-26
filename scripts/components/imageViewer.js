// Basic fullscreen image viewer reused by cards and timelines
let viewerList = [];
let viewerIndex = 0;
let viewerKeyHandler = null;

export function initImageViewerDelegates() {
    document.body.addEventListener("click", (e) => {
        const btn =
            e.target.closest &&
            e.target.closest("button.card-thumb, button.timeline-thumb");
        if (!btn) return;
        const gallery = btn.closest(".card-images, .timeline-images");
        let list = [];
        let startIndex = 0;
        if (gallery) {
            const thumbs = Array.from(
                gallery.querySelectorAll(
                    "button.card-thumb, button.timeline-thumb"
                )
            );
            list = thumbs
                .map((t) => ({
                    path: t.getAttribute("data-src"),
                    label: t.getAttribute("data-label") || "",
                }))
                .filter((x) => x.path);
            startIndex = thumbs.indexOf(btn);
            if (startIndex < 0) startIndex = 0;
        } else {
            list = [
                {
                    path: btn.getAttribute("data-src"),
                    label: btn.getAttribute("data-label") || "",
                },
            ];
            startIndex = 0;
        }
        if (list.length) openImageViewer(list, startIndex);
    });
}

function openImageViewer(list, startIndex = 0) {
    if (!list || !list.length) return;
    viewerList = list;
    viewerIndex = Math.max(0, Math.min(startIndex || 0, list.length - 1));

    let viewer = document.getElementById("_img_viewer");
    if (!viewer) {
        viewer = document.createElement("div");
        viewer.id = "_img_viewer";
        viewer.className = "_img_viewer";
        viewer.innerHTML = `
                <button class="viewer-nav viewer-prev" aria-label="Previous image">‹</button>
                <div class="viewer-inner">
                    <div class="viewer-media">
                        <div class="viewer-spinner" aria-hidden="true"></div>
                        <img id="_img_viewer_img" src="" alt="" />
                    </div>
                    <div id="_img_viewer_caption" class="viewer-caption"></div>
                    <div id="_img_viewer_pos" class="viewer-pos" aria-hidden="true"></div>
                </div>
                <button class="viewer-nav viewer-next" aria-label="Next image">›</button>
            `;
        document.body.appendChild(viewer);

        viewer.addEventListener("click", (e) => {
            if (e.target === viewer) closeViewer();
        });

        viewer.querySelector(".viewer-prev").addEventListener("click", (e) => {
            e.stopPropagation();
            showImageAt(viewerIndex - 1);
        });
        viewer.querySelector(".viewer-next").addEventListener("click", (e) => {
            e.stopPropagation();
            showImageAt(viewerIndex + 1);
        });

        let pointerDown = false;
        let startX = 0;
        let startY = 0;
        const swipeThreshold = 40;

        const onPointerDown = (ev) => {
            if (
                ev.pointerType &&
                ev.pointerType !== "touch" &&
                ev.pointerType !== "pen"
            )
                return;
            pointerDown = true;
            startX = ev.clientX;
            startY = ev.clientY;
            ev.target.setPointerCapture?.(ev.pointerId);
        };
        const onPointerMove = (ev) => {
            if (!pointerDown) return;
            const dx = ev.clientX - startX;
            const dy = ev.clientY - startY;
            if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > swipeThreshold) {
                if (dx < 0) showImageAt(viewerIndex + 1);
                else showImageAt(viewerIndex - 1);
                pointerDown = false;
            }
        };
        const onPointerUp = () => {
            if (!pointerDown) return;
            pointerDown = false;
        };

        viewer.addEventListener("pointerdown", onPointerDown);
        viewer.addEventListener("pointermove", onPointerMove);
        viewer.addEventListener("pointerup", onPointerUp);
        viewer.addEventListener("pointercancel", onPointerUp);
    }

    showImageAt(viewerIndex);

    if (!viewerKeyHandler) {
        viewerKeyHandler = (e) => {
            if (!document.getElementById("_img_viewer")) return;
            if (e.key === "Escape") closeViewer();
            if (e.key === "ArrowLeft") showImageAt(viewerIndex - 1);
            if (e.key === "ArrowRight") showImageAt(viewerIndex + 1);
        };
        document.addEventListener("keydown", viewerKeyHandler);
    }
}

function closeViewer() {
    const viewer = document.getElementById("_img_viewer");
    if (viewer) viewer.remove();
    viewerList = [];
    viewerIndex = 0;
    if (viewerKeyHandler) {
        document.removeEventListener("keydown", viewerKeyHandler);
        viewerKeyHandler = null;
    }
}

function showImageAt(idx) {
    if (!viewerList || !viewerList.length) return;
    if (idx < 0) idx = viewerList.length - 1;
    if (idx >= viewerList.length) idx = 0;
    viewerIndex = idx;
    const imgObj = viewerList[viewerIndex];
    const imgEl = document.getElementById("_img_viewer_img");
    const cap = document.getElementById("_img_viewer_caption");
    const pos = document.getElementById("_img_viewer_pos");
    const spinner = document.querySelector(".viewer-spinner");

    if (pos) pos.textContent = `${viewerIndex + 1} / ${viewerList.length}`;

    if (imgEl) {
        spinner && (spinner.style.display = "block");
        imgEl.style.opacity = 0;
        const temp = new Image();
        temp.onload = () => {
            imgEl.src = imgObj.path;
            imgEl.alt = imgObj.label || "";
            requestAnimationFrame(() => {
                imgEl.style.transition = "opacity .22s ease";
                imgEl.style.opacity = 1;
                spinner && (spinner.style.display = "none");
            });
        };
        temp.onerror = () => {
            spinner && (spinner.style.display = "none");
            imgEl.style.opacity = 1;
        };
        temp.src = imgObj.path;

        const prevIdx =
            (viewerIndex - 1 + viewerList.length) % viewerList.length;
        const nextIdx = (viewerIndex + 1) % viewerList.length;
        [prevIdx, nextIdx].forEach((i) => {
            const n = new Image();
            n.src = viewerList[i].path;
        });
    }
    if (cap) cap.textContent = imgObj.label || "";
}
