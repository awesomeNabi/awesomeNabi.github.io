document.documentElement.classList.add("js");

const header = document.querySelector("[data-header]");
const navLinks = [...document.querySelectorAll('.site-nav a[href^="#"]')];
const sections = navLinks
  .map((link) => document.querySelector(link.getAttribute("href")))
  .filter(Boolean);

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

  const activeSectionObserver = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

      if (!visible) return;
      navLinks.forEach((link) => {
        const active = link.getAttribute("href") === `#${visible.target.id}`;
        link.classList.toggle("is-active", active);
        if (active) link.setAttribute("aria-current", "location");
        else link.removeAttribute("aria-current");
      });
    },
    { rootMargin: "-18% 0px -62% 0px", threshold: [0.08, 0.25, 0.5] },
  );

  sections.forEach((section) => activeSectionObserver.observe(section));
} else {
  revealElements.forEach((element) => element.classList.add("is-visible"));
}

// Some browsers throttle observer callbacks in background tabs and screenshot runs.
window.setTimeout(() => {
  revealElements.forEach((element) => element.classList.add("is-visible"));
}, 900);
