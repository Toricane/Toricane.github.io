// Optional tap mode that animates connection pills when ?tap=true
export function initTapMode(
    searchParams = new URLSearchParams(location.search)
) {
    if (searchParams.get("tap") !== "true") return;
    const conn = document.getElementById("connections");
    if (!conn) return;

    conn.classList.add("glow");
    const linkedinLink = conn.querySelector('a[href*="linkedin.com"]');
    const links = conn.querySelectorAll("a");
    links.forEach((a) => {
        a.style.opacity = 0;
        a.style.transform = "translateY(4px) scale(.95)";
    });

    const doAnime = () => {
        if (!window.anime) return setTimeout(doAnime, 60);

        window.anime
            .timeline({ easing: "easeOutQuad" })
            .add({
                targets: links,
                opacity: [0, 1],
                translateY: [4, 0],
                scale: [0.95, 1],
                delay: window.anime.stagger(70),
            })
            .add(
                {
                    targets: conn,
                    boxShadow: [
                        "0 0 0 0 rgba(77,181,255,.4)",
                        "0 0 0 18px rgba(77,181,255,0)",
                    ],
                    duration: 1400,
                },
                150
            );

        const isMobile = window.innerWidth <= 768;
        const sparkleDelay = isMobile ? 3000 : 1800;
        const pillGlowDelay = isMobile ? 5000 : 3000;
        const linkedinDelay = isMobile ? 3000 : 1500;
        const scheduleAnimation = (callback) => {
            if (window.requestIdleCallback) {
                requestIdleCallback(callback);
            } else {
                setTimeout(callback, 16);
            }
        };

        const sparkleInterval = setInterval(() => {
            scheduleAnimation(() => {
                if (document.visibilityState === "visible") {
                    window.anime({
                        targets:
                            links[Math.floor(Math.random() * links.length)],
                        translateY: [0, -2, 0],
                        duration: 600,
                    });
                }
            });
        }, sparkleDelay);

        const pillGlowInterval = setInterval(() => {
            scheduleAnimation(() => {
                if (document.visibilityState === "visible") {
                    window.anime({
                        targets: conn,
                        boxShadow: [
                            "0 0 0 1px #2b4b5f, 0 0 0 3px #2b4b5f55, 0 0 24px -4px #4db5ff44",
                            "0 0 0 1px #4db5ff, 0 0 0 6px #4db5ff33, 0 0 32px -2px #4db5ff66",
                            "0 0 0 1px #2b4b5f, 0 0 0 3px #2b4b5f55, 0 0 24px -4px #4db5ff44",
                        ],
                        duration: 2000,
                        easing: "easeInOutQuad",
                    });
                }
            });
        }, pillGlowDelay);

        const linkedinInterval = setInterval(() => {
            scheduleAnimation(() => {
                if (linkedinLink && document.visibilityState === "visible") {
                    linkedinLink.classList.add("linkedin-highlight");
                    window.anime({
                        targets: linkedinLink,
                        scale: [1, 1.05, 1],
                        boxShadow: [
                            "0 0 0 0 rgba(77,181,255,.6)",
                            "0 0 0 8px rgba(77,181,255,0)",
                        ],
                        duration: 1000,
                        easing: "easeOutQuad",
                        complete: () =>
                            linkedinLink.classList.remove("linkedin-highlight"),
                    });
                }
            });
        }, linkedinDelay);

        setTimeout(() => {
            clearInterval(sparkleInterval);
            clearInterval(pillGlowInterval);
            clearInterval(linkedinInterval);
            conn.classList.remove("glow");
            if (linkedinLink)
                linkedinLink.classList.remove("linkedin-highlight");
        }, 15000);
    };

    doAnime();
}
