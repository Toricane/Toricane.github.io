// Optional tap mode that animates connection pills when ?tap=true

const ANIME_URL =
    "https://cdnjs.cloudflare.com/ajax/libs/animejs/3.2.1/anime.min.js";
const ANIME_INTEGRITY =
    "sha512-z4OUqw38qNLpn1libAN9BsoDx6nbNFio5lA6CuTp9NlK83b89hgyCVq+N5FdBJptINztxn1Z3SaKSKUS5UP60Q==";

let animeLoadPromise = null;

function loadAnime() {
    if (window.anime) return Promise.resolve(window.anime);
    if (animeLoadPromise) return animeLoadPromise;

    animeLoadPromise = new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = ANIME_URL;
        script.integrity = ANIME_INTEGRITY;
        script.crossOrigin = "anonymous";
        script.referrerPolicy = "no-referrer";
        script.onload = () => resolve(window.anime);
        script.onerror = reject;
        document.head.appendChild(script);
    });

    return animeLoadPromise;
}

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

    const runAnimations = () => {
        const isMobile = window.innerWidth <= 768;
        const sparkleDelay = isMobile ? 3000 : 1800;
        const pillGlowDelay = isMobile ? 5000 : 3000;
        const linkedinDelay = 1000;
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

        const pulseLinkedIn = () => {
            if (!linkedinLink || document.visibilityState !== "visible") return;
            linkedinLink.classList.add("linkedin-highlight");
            window.anime({
                targets: linkedinLink,
                opacity: [null, 1],
                scale: [1, 1.12, 1],
                boxShadow: [
                    "0 0 0 2px rgba(77,181,255,0.9), 0 0 20px 4px rgba(77,181,255,0.55)",
                    "0 0 0 8px rgba(77,181,255,0.45), 0 0 32px 10px rgba(77,181,255,0.65)",
                    "0 0 0 2px rgba(77,181,255,0.35), 0 0 14px 2px rgba(77,181,255,0.2)",
                ],
                duration: 500,
                easing: "easeOutQuad",
                complete: () =>
                    linkedinLink.classList.remove("linkedin-highlight"),
            });
        };

        pulseLinkedIn();
        const linkedinInterval = setInterval(
            () => scheduleAnimation(pulseLinkedIn),
            linkedinDelay
        );

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

        setTimeout(() => {
            clearInterval(sparkleInterval);
            clearInterval(pillGlowInterval);
            clearInterval(linkedinInterval);
            conn.classList.remove("glow");
            if (linkedinLink)
                linkedinLink.classList.remove("linkedin-highlight");
        }, 15000);
    };

    loadAnime()
        .then(runAnimations)
        .catch(() => {
            links.forEach((a) => {
                a.style.opacity = 1;
                a.style.transform = "";
            });
        });
}
