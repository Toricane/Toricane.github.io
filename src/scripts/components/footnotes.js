export function initFootnotes() {
    const footnotes = document.querySelectorAll(".footnote");

    const closeAllFootnotes = (exceptThisOne = null) => {
        footnotes.forEach((f) => {
            if (f !== exceptThisOne) {
                f.classList.remove("active", "flipped");
            }
        });
    };

    footnotes.forEach((footnote) => {
        const sup = footnote.querySelector("sup");
        if (!sup) return;

        sup.addEventListener("click", (e) => {
            e.stopPropagation();
            const wasActive = footnote.classList.contains("active");
            closeAllFootnotes(footnote);
            footnote.classList.toggle("active", !wasActive);

            if (!wasActive) {
                const content = footnote.querySelector(".footnote-content");
                if (content) {
                    setTimeout(() => {
                        const rect = content.getBoundingClientRect();
                        if (rect.top < 0) {
                            footnote.classList.add("flipped");
                        }
                        const viewportWidth = window.innerWidth;
                        if (rect.right > viewportWidth) {
                            const overflow = rect.right - viewportWidth;
                            content.style.transform = `translateX(calc(-50% - ${
                                overflow + 10
                            }px))`;
                        } else if (rect.left < 0) {
                            const overflow = -rect.left;
                            content.style.transform = `translateX(calc(-50% + ${
                                overflow + 10
                            }px))`;
                        }
                    }, 0);
                }
            } else {
                const content = footnote.querySelector(".footnote-content");
                if (content) content.style.transform = "";
            }
        });
    });

    document.addEventListener("click", () => closeAllFootnotes());
    window.addEventListener("scroll", () => closeAllFootnotes(), {
        passive: true,
    });
}
