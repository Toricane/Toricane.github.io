// Scroll to next section on down arrow click
document.getElementById("downArrow").addEventListener("click", function () {
    window.scroll({
        top: document.getElementById("work-in-progress").offsetTop, // TODO: replace with "about" when done
        behavior: "smooth",
    });
});

// Show the up arrow when not at the top of the page
window.addEventListener("scroll", function () {
    let upArrow = document.getElementById("upArrow");
    if (window.scrollY > window.innerHeight) {
        upArrow.style.display = "block";
    } else {
        upArrow.style.display = "none";
    }
});

// Scroll to top on up arrow click
document.getElementById("upArrow").addEventListener("click", function () {
    window.scroll({
        top: 0,
        behavior: "smooth",
    });
});

// Update the progress bar on scroll
window.addEventListener("scroll", function () {
    let scrollTop = window.scrollY;
    let docHeight = document.documentElement.scrollHeight - window.innerHeight;
    let progress = (scrollTop / docHeight) * 100;
    document.getElementById("progressBar").style.width = progress + "%";
});

// Toggle fixed navigation bar on scroll
// window.addEventListener("scroll", function () {
//     const nav = document.querySelector("nav");
//     const heroHeight = document.getElementById("hero").offsetHeight;
//     if (window.scrollY >= heroHeight) {
//         nav.classList.add("fixed-nav");
//     } else {
//         nav.classList.remove("fixed-nav");
//     }
// });

document.addEventListener("DOMContentLoaded", function () {
    const nav = document.querySelector("nav");
    const heroHeight = document.getElementById("hero").offsetHeight;

    function toggleNav() {
        if (window.scrollY >= heroHeight) {
            nav.classList.remove("nav-hidden");
            nav.classList.add("fixed-nav");
        } else if (window.scrollY >= heroHeight / 4) {
            nav.classList.remove("fixed-nav");
            nav.classList.add("nav-hidden");
        } else if (window.scrollY < heroHeight / 4) {
            nav.classList.remove("nav-hidden");
            nav.classList.remove("fixed-nav");
        }
    }

    window.addEventListener("scroll", toggleNav);

    // Ensure the nav is visible on initial load if already scrolled past hero
    toggleNav();
});

// Toggle nav links on mobile
document.getElementById("menu-button").addEventListener("click", function () {
    const navLinks = document.getElementById("nav-links");
    navLinks.classList.toggle("open");
});

document.getElementById("nav-links").childNodes.forEach((link) => {
    link.addEventListener("click", function () {
        document.getElementById("nav-links").classList.remove("open");
    });
});

document.addEventListener("DOMContentLoaded", function () {
    const sections = document.querySelectorAll("section");

    const observerOptions = {
        root: null,
        rootMargin: "0px",
        threshold: 0.25, // Adjust this threshold as needed
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            const sectionId = entry.target.id;
            const navLink = document.querySelector(
                `.nav-links a[href="#${sectionId}"]`
            );

            if (entry.isIntersecting) {
                navLink.classList.add("active");
            } else {
                navLink.classList.remove("active");
            }
        });
    }, observerOptions);

    sections.forEach((section) => {
        observer.observe(section);
    });
});
