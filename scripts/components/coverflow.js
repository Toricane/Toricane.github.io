export function initCoverFlow() {
    const coverflowContainer = document.querySelector(".coverflow-cards");
    const coverflowWrapper = document.querySelector(".coverflow-container");
    const coverflowGroups = document.querySelectorAll(".coverflow-group");
    if (!coverflowContainer || !coverflowWrapper || !coverflowGroups.length)
        return;

    let isPaused = false;
    const toggleAnimation = () => {
        isPaused = !isPaused;
        const playState = isPaused ? "paused" : "running";
        coverflowGroups.forEach((group) => {
            group.style.animationPlayState = playState;
        });
    };

    coverflowWrapper.addEventListener("click", (e) => {
        if (
            e.target === coverflowWrapper ||
            e.target === coverflowContainer ||
            e.target.classList.contains("coverflow-group")
        ) {
            toggleAnimation();
        }
    });

    const cards = coverflowContainer.querySelectorAll(".coverflow-card");
    cards.forEach((card) => {
        card.addEventListener(
            "touchstart",
            (e) => {
                e.preventDefault();
                toggleAnimation();
            },
            { passive: false }
        );

        card.setAttribute("tabindex", "0");
        card.addEventListener("keydown", (e) => {
            if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                toggleAnimation();
            }
        });
    });

    coverflowContainer.setAttribute("tabindex", "0");
    coverflowContainer.setAttribute("role", "region");
    coverflowContainer.setAttribute("aria-label", "Image carousel");

    coverflowContainer.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
            isPaused = false;
            coverflowGroups.forEach((group) => {
                group.style.animationPlayState = "running";
            });
        }
    });
}
