document.documentElement.classList.add("js");

const header = document.querySelector("[data-header]");
const navLinks = [...document.querySelectorAll('.site-nav a[href^="#"]')];
const sections = navLinks
  .map((link) => document.querySelector(link.getAttribute("href")))
  .filter(Boolean);

const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
const autoplayVideos = [...document.querySelectorAll("video[autoplay]")];

const syncAutoplayVideos = () => {
  autoplayVideos.forEach((video) => {
    if (motionPreference.matches) video.pause();
    else video.play().catch(() => {});
  });
};

syncAutoplayVideos();
motionPreference.addEventListener?.("change", syncAutoplayVideos);

const activateNav = (hash) => {
  navLinks.forEach((link) => {
    const active = link.getAttribute("href") === hash;
    link.classList.toggle("is-active", active);
    if (active) link.setAttribute("aria-current", "location");
    else link.removeAttribute("aria-current");
  });
};

let manualNavigationUntil = 0;
let manualNavigationTimer = 0;

navLinks.forEach((link) => {
  link.addEventListener("click", (event) => {
    const hash = link.getAttribute("href");
    const target = document.querySelector(hash);
    if (!target) return;

    event.preventDefault();
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    manualNavigationUntil = performance.now() + (reduceMotion ? 120 : 1800);
    activateNav(hash);
    target.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
    history.replaceState(null, "", hash);
    window.clearTimeout(manualNavigationTimer);
    manualNavigationTimer = window.setTimeout(syncActiveNav, reduceMotion ? 150 : 1850);
  });
});

const setHeaderState = () => {
  header?.classList.toggle("is-scrolled", window.scrollY > 18);
};

window.addEventListener("scroll", setHeaderState, { passive: true });
setHeaderState();

const revealElements = [...document.querySelectorAll(".reveal")];

if ("IntersectionObserver" in window) {
  const revealObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.08, rootMargin: "0px 0px -4% 0px" },
  );

  revealElements.forEach((element) => revealObserver.observe(element));

} else {
  revealElements.forEach((element) => element.classList.add("is-visible"));
}

function syncActiveNav() {
  if (!sections.length || performance.now() < manualNavigationUntil) return;

  const headerHeight = header?.getBoundingClientRect().height ?? 0;
  const marker = window.scrollY + headerHeight + Math.min(window.innerHeight * 0.22, 170);
  let activeSection = sections[0];

  sections.forEach((section) => {
    if (section.offsetTop <= marker) activeSection = section;
  });

  const reachedPageEnd = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
  if (reachedPageEnd) activeSection = sections.at(-1);
  activateNav(`#${activeSection.id}`);
}

let navFramePending = false;
window.addEventListener(
  "scroll",
  () => {
    if (navFramePending) return;
    navFramePending = true;
    window.requestAnimationFrame(() => {
      syncActiveNav();
      navFramePending = false;
    });
  },
  { passive: true },
);

window.addEventListener("hashchange", () => {
  if (sections.some((section) => `#${section.id}` === window.location.hash)) {
    activateNav(window.location.hash);
  }
});

if (sections.some((section) => `#${section.id}` === window.location.hash)) {
  activateNav(window.location.hash);
} else {
  syncActiveNav();
}

// Some browsers throttle observer callbacks in background tabs and screenshot runs.
window.setTimeout(() => {
  revealElements.forEach((element) => element.classList.add("is-visible"));
}, 900);
