export function initScrollButton() {
    const scrollBtn = document.getElementById("scrollMore");
    if (!scrollBtn) return;

    scrollBtn.addEventListener("click", () => {
        const content = document.getElementById("content");
        if (content) content.scrollIntoView({ behavior: "smooth" });
    });

    const hideScrollButton = () => scrollBtn.classList.add("hidden");
    const handleScroll = () => {
        if (window.scrollY > 50) {
            hideScrollButton();
            window.removeEventListener("scroll", handleScroll);
        }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
}
