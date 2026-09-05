document.documentElement.classList.add("js");

const header = document.querySelector("[data-header]");
const navLinks = [...document.querySelectorAll('.site-nav a[href^="#"]')];
const sections = navLinks
  .map((link) => document.querySelector(link.getAttribute("href")))
  .filter(Boolean);

const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
const clampUnit = (value) => Math.min(1, Math.max(0, value));
const smoothStep = (edge0, edge1, value) => {
  const unit = clampUnit((value - edge0) / Math.max(edge1 - edge0, 0.0001));
  return unit * unit * (3 - 2 * unit);
};

const setupCoverTransition = () => {
  const cover = document.querySelector("[data-cover]");
  const siteContent = document.querySelector("[data-site-content]");
  const entryLinks = [...document.querySelectorAll('a[href="#top"]')];

  if (!cover || !siteContent) return;

  let framePending = false;
  let snapTimer = 0;
  let snapLockUntil = 0;
  let scrollDirection = 1;
  let previousScrollY = window.scrollY;

  const scene = cover.querySelector("[data-cover-scene]");
  const getScrollSpan = () => motionPreference.matches
    ? cover.offsetHeight
    : Math.max(1, cover.offsetHeight - scene.offsetHeight);
  const getEntryScrollTop = () => cover.offsetTop + getScrollSpan();

  const getCoverProgress = () => {
    const scrollSpan = getScrollSpan();
    return clampUnit((window.scrollY - cover.offsetTop) / scrollSpan);
  };

  const updateCover = () => {
    const progress = getCoverProgress();
    const coverExit = smoothStep(0.05, 0.78, progress);
    const cueExit = smoothStep(0.1, 0.42, progress);
    const siteReveal = smoothStep(0.08, 0.72, progress);

    document.documentElement.style.setProperty("--cover-progress", progress.toFixed(4));
    document.documentElement.style.setProperty("--cover-scene-shift", `${(-7 * coverExit).toFixed(3)}svh`);
    document.documentElement.style.setProperty("--cover-scale", (1 - 0.045 * coverExit).toFixed(4));
    document.documentElement.style.setProperty("--cover-opacity", Math.max(0.02, 1 - 0.98 * coverExit).toFixed(4));
    document.documentElement.style.setProperty("--cover-cue-opacity", Math.max(0, 1 - cueExit).toFixed(4));
    document.documentElement.style.setProperty("--cover-copy-shift", `${(-22 * coverExit).toFixed(2)}px`);
    document.documentElement.style.setProperty("--site-reveal", siteReveal.toFixed(4));
    document.documentElement.style.setProperty("--site-shift", `${(8 * (1 - siteReveal)).toFixed(3)}svh`);
    document.documentElement.style.setProperty("--site-opacity", siteReveal.toFixed(4));
    const transitioned = progress > 0.985;
    cover.classList.toggle("is-transitioned", transitioned);
    cover.classList.toggle("is-cue-hidden", progress > 0.42);
    siteContent.classList.toggle("is-transitioned", transitioned);
    framePending = false;
  };

  const requestCoverUpdate = () => {
    if (framePending) return;
    framePending = true;
    window.requestAnimationFrame(updateCover);
  };

  const snapTo = (top, hash = "") => {
    snapLockUntil = performance.now() + 1000;
    window.clearTimeout(snapTimer);
    window.scrollTo({
      top,
      behavior: motionPreference.matches ? "auto" : "smooth",
    });

    if (hash) history.replaceState(null, "", hash);
    else history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
  };

  const snapCoverAtThreshold = () => {
    if (motionPreference.matches || performance.now() < snapLockUntil) return;

    const progress = getCoverProgress();
    if (progress <= 0.01 || progress >= 0.985) return;

    if (scrollDirection > 0 && progress >= 0.56) {
      snapTo(getEntryScrollTop(), "#top");
    } else if (scrollDirection < 0 && progress <= 0.44) {
      snapTo(cover.offsetTop);
    }
  };

  const handleCoverScroll = () => {
    const currentScrollY = window.scrollY;
    const delta = currentScrollY - previousScrollY;
    if (Math.abs(delta) > 1) scrollDirection = Math.sign(delta);
    previousScrollY = currentScrollY;
    requestCoverUpdate();

    if (performance.now() < snapLockUntil) return;
    window.clearTimeout(snapTimer);
    snapTimer = window.setTimeout(snapCoverAtThreshold, 170);
  };

  entryLinks.forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      snapTo(getEntryScrollTop(), "#top");
    });
  });

  window.addEventListener("scroll", handleCoverScroll, { passive: true });
  window.addEventListener("resize", requestCoverUpdate, { passive: true });
  window.addEventListener("pageshow", requestCoverUpdate);
  motionPreference.addEventListener?.("change", requestCoverUpdate);
  updateCover();
};

setupCoverTransition();

const setupRetroConsole = () => {
  const gameConsole = document.querySelector("[data-game-console]");
  if (!gameConsole) return;

  const destinations = [
    { hash: "#about", label: "01 / ABOUT", title: "个人简介" },
    { hash: "#research", label: "02 / RESEARCH", title: "研究工作" },
    { hash: "#intern", label: "03 / INTERN", title: "实习交流" },
    { hash: "#projects", label: "04 / PROJECTS", title: "项目实践" },
  ];
  const openLinks = [...gameConsole.querySelectorAll("[data-game-open]")];
  const label = gameConsole.querySelector("[data-game-label]");
  const menuButtons = [...gameConsole.querySelectorAll("[data-game-choice]")];
  const screen = gameConsole.querySelector(".crt-screen");
  const monitor = gameConsole.querySelector(".crt-monitor");
  const powerButton = gameConsole.querySelector("[data-crt-power]");
  const powerStatus = gameConsole.querySelector("[data-crt-status]");
  const screenUI = screen.querySelector(".ps1-ui");
  const noiseCanvas = screen.querySelector("[data-crt-noise]");
  const noiseContext = noiseCanvas.getContext("2d", { alpha: false });
  const noiseImage = noiseContext?.createImageData(noiseCanvas.width, noiseCanvas.height);
  const cover = gameConsole.closest("[data-cover]");
  let standby = false;
  let noiseFrame = 0;
  let lastNoiseTime = 0;
  let screenInView = true;
  let powerTransitionTimer = 0;
  let scanFrame = 0;
  let scanStarted = 0;
  let lastScanTime = 0;
  const distortionLayer = document.createElement("div");
  distortionLayer.className = "crt-screen__distorted";
  distortionLayer.setAttribute("aria-hidden", "true");
  distortionLayer.inert = true;
  screen.append(distortionLayer);
  const syncDistortion = () => {
    // A masked copy shifts only the narrow area currently crossed by the beam.
    const copy = screenUI.cloneNode(true);
    copy.querySelectorAll("*").forEach((element) => {
      [...element.attributes].forEach(({ name }) => {
        if (name.startsWith("data-") || name === "id" || name === "aria-live") element.removeAttribute(name);
      });
    });
    distortionLayer.replaceChildren(copy);
  };

  const paintNoise = () => {
    if (!noiseImage) return;
    const pixels = noiseImage.data;
    for (let index = 0; index < pixels.length; index += 4) {
      const gray = 42 + Math.floor(Math.random() * 160);
      pixels[index] = gray;
      pixels[index + 1] = gray;
      pixels[index + 2] = gray;
      pixels[index + 3] = 255;
    }
    noiseContext.putImageData(noiseImage, 0, 0);
  };
  const shouldAnimateNoise = () => standby && noiseContext && screenInView
    && !document.hidden && !motionPreference.matches && !cover.classList.contains("is-transitioned");
  const stopNoise = () => {
    window.cancelAnimationFrame(noiseFrame);
    noiseFrame = 0;
  };
  const animateNoise = (time) => {
    noiseFrame = 0;
    if (!shouldAnimateNoise()) return;
    // Updating the texture at 12.5 fps keeps the noise subtle and inexpensive.
    if (time - lastNoiseTime >= 80) {
      paintNoise();
      lastNoiseTime = time;
    }
    noiseFrame = window.requestAnimationFrame(animateNoise);
  };
  const syncNoisePlayback = () => {
    if (!shouldAnimateNoise()) stopNoise();
    else if (!noiseFrame) noiseFrame = window.requestAnimationFrame(animateNoise);
  };

  const stopScreenEffect = () => {
    screen.classList.remove("is-screen-active");
    window.cancelAnimationFrame(scanFrame);
    scanFrame = 0;
  };
  const animateScan = (time) => {
    scanFrame = 0;
    if (standby || motionPreference.matches || document.hidden || !screenInView || cover.classList.contains("is-transitioned")) {
      stopScreenEffect();
      return;
    }
    if (time - lastScanTime >= 32) {
      const progress = ((time - scanStarted) % 2600) / 2600;
      screen.style.setProperty("--scan-position", `${(-20 + progress * 140).toFixed(2)}%`);
      screen.style.setProperty("--scan-drift-x", `${(Math.sin(time * .027) * 1.8).toFixed(2)}px`);
      screen.style.setProperty("--scan-drift-y", `${(Math.sin(time * .018) * .45).toFixed(2)}px`);
      lastScanTime = time;
    }
    scanFrame = window.requestAnimationFrame(animateScan);
  };
  screen.addEventListener("pointerenter", (event) => {
    if (event.pointerType === "touch" || standby || motionPreference.matches) return;
    stopScreenEffect();
    screen.classList.add("is-screen-active");
    screen.style.setProperty("--scan-position", "-20%");
    scanStarted = performance.now();
    lastScanTime = 0;
    scanFrame = window.requestAnimationFrame(animateScan);
  });
  screen.addEventListener("pointerleave", stopScreenEffect);
  screen.addEventListener("pointercancel", stopScreenEffect);
  motionPreference.addEventListener?.("change", () => {
    stopScreenEffect();
    if (standby) paintNoise();
    syncNoisePlayback();
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stopScreenEffect();
    syncNoisePlayback();
  });
  window.addEventListener("pagehide", () => { stopNoise(); stopScreenEffect(); });
  window.addEventListener("pageshow", syncNoisePlayback);
  window.addEventListener("scroll", () => window.requestAnimationFrame(syncNoisePlayback), { passive: true });
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(([entry]) => {
      screenInView = entry.isIntersecting;
      syncNoisePlayback();
    }).observe(screen);
  }
  powerButton.disabled = !noiseContext;
  powerButton.addEventListener("click", () => {
    standby = !standby;
    stopScreenEffect();
    screen.classList.toggle("is-standby", standby);
    monitor.classList.toggle("is-standby", standby);
    screenUI.inert = standby;
    powerButton.setAttribute("aria-pressed", String(standby));
    powerButton.title = standby ? "唤醒屏幕" : "进入待机（雪花屏）";
    powerStatus.textContent = standby ? "屏幕已待机，按电源键唤醒。" : "屏幕已唤醒。";
    window.clearTimeout(powerTransitionTimer);
    if (!motionPreference.matches) {
      monitor.classList.add("is-power-switching");
      powerTransitionTimer = window.setTimeout(() => monitor.classList.remove("is-power-switching"), 340);
    }
    if (standby) paintNoise();
    syncNoisePlayback();
  });
  let selected = 0;
  const select = (index) => {
    if (standby) return;
    selected = (index + destinations.length) % destinations.length;
    const destination = destinations[selected];
    label.textContent = destination.label;
    menuButtons.forEach((button, index) => {
      button.classList.toggle("is-selected", index === selected);
      button.setAttribute("aria-pressed", String(index === selected));
    });
    openLinks.forEach((link) => {
      link.href = destination.hash;
      link.setAttribute("aria-label", `查看${destination.title}`);
    });
    syncDistortion();
  };
  menuButtons.forEach((button, index) => button.addEventListener("click", () => select(index)));
  gameConsole.querySelector("[data-game-reset]").addEventListener("click", () => select(0));
  gameConsole.addEventListener("keydown", (event) => {
    if (standby || event.altKey || event.ctrlKey || event.metaKey) return;
    if (["ArrowLeft", "ArrowUp", "ArrowRight", "ArrowDown"].includes(event.key)) {
      event.preventDefault();
      select(selected + (["ArrowLeft", "ArrowUp"].includes(event.key) ? -1 : 1));
    } else if (["a", "z"].includes(event.key.toLowerCase())) {
      event.preventDefault();
      openLinks[0].click();
    } else if (["b", "x"].includes(event.key.toLowerCase())) {
      event.preventDefault();
      select(0);
    } else if (event.key === "Enter" && event.target === gameConsole) {
      event.preventDefault();
      gameConsole.querySelector("[data-scroll-start]").click();
    }
  });
  select(0);
};

setupRetroConsole();


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
