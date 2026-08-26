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

let coverProgressValue = 0;

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

  const getEntryScrollTop = () =>
    cover.offsetTop + Math.max(0, cover.offsetHeight - window.innerHeight);

  const getCoverProgress = () => {
    const scrollSpan = Math.max(1, cover.offsetHeight - window.innerHeight);
    return clampUnit((window.scrollY - cover.offsetTop) / scrollSpan);
  };

  const updateCover = () => {
    const progress = getCoverProgress();
    const coverExit = smoothStep(0.05, 0.78, progress);
    const cueExit = smoothStep(0.1, 0.42, progress);
    const siteReveal = smoothStep(0.08, 0.72, progress);

    coverProgressValue = progress;
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
    window.dispatchEvent(new CustomEvent("coverprogresschange", { detail: { progress } }));
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
  updateCover();
};

const setupBinaryPortrait = () => {
  const figure = document.querySelector("[data-binary-portrait]");
  const canvas = document.querySelector("[data-binary-canvas]");
  const lensCanvas = document.querySelector("[data-binary-lens]");
  const image = document.querySelector("#binary-portrait-source");
  const seedLabel = document.querySelector("[data-binary-seed]");
  const context = canvas?.getContext("2d");
  const lensContext = lensCanvas?.getContext("2d");
  const robotCanvas = document.createElement("canvas");
  const robotContext = robotCanvas.getContext("2d");

  if (!figure || !canvas || !lensCanvas || !image || !context || !lensContext || !robotContext) return;

  let animationFrame = 0;
  let resizeTimer = 0;
  let hasAnimated = false;
  let portraitSize = 0;
  let portraitPixelRatio = 1;
  let lensPoint = { x: 0, y: 0 };
  let lensActive = false;
  let touchLensTimer = 0;

  const createSeed = () => {
    if (window.crypto?.getRandomValues) {
      const seedBuffer = new Uint32Array(1);
      window.crypto.getRandomValues(seedBuffer);
      return seedBuffer[0] || 1;
    }
    return (Date.now() ^ Math.floor(performance.now() * 1000)) >>> 0;
  };

  const renderRobotLayer = (size, pixelRatio) => {
    robotCanvas.width = Math.round(size * pixelRatio);
    robotCanvas.height = Math.round(size * pixelRatio);
    robotContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    robotContext.clearRect(0, 0, size, size);

    const gridSize = 72;
    const unit = size / gridSize;
    const pixelSize = Math.max(2, unit * 0.82);
    const outline = ["#7de7ff", "#58c8eb", "#a6f1ff"];
    const armor = ["#246889", "#2f7fa0", "#3e93b2", "#5aabc5"];
    const shadow = ["#102d43", "#153a53", "#1d4862"];
    const accent = ["#ffc23f", "#ffe27a", "#baf267"];

    const paintPixel = (column, row, color, alpha = 1) => {
      robotContext.globalAlpha = alpha;
      robotContext.fillStyle = color;
      robotContext.fillRect(
        Math.round(column * unit),
        Math.round(row * unit),
        Math.ceil(pixelSize),
        Math.ceil(pixelSize),
      );
    };

    const fillPixels = (column, row, width, height, palette) => {
      for (let y = row; y < row + height; y += 1) {
        for (let x = column; x < column + width; x += 1) {
          paintPixel(x, y, palette[(x * 3 + y * 5) % palette.length]);
        }
      }
    };

    // Legs and feet sit beneath the human silhouette's lower body.
    fillPixels(24, 60, 10, 10, shadow);
    fillPixels(39, 60, 10, 10, shadow);
    fillPixels(21, 68, 14, 3, outline);
    fillPixels(38, 68, 14, 3, outline);

    // Arms and shoulder joints.
    fillPixels(10, 42, 8, 19, armor);
    fillPixels(55, 42, 8, 19, armor);
    fillPixels(8, 45, 4, 10, outline);
    fillPixels(63, 45, 4, 10, outline);
    fillPixels(11, 39, 12, 7, outline);
    fillPixels(50, 39, 12, 7, outline);
    fillPixels(10, 58, 9, 4, accent);
    fillPixels(54, 58, 9, 4, accent);

    // Tapered torso with a brighter pixel outline.
    for (let row = 39; row < 65; row += 1) {
      const taper = row > 58 ? 4 : row > 48 ? 2 : 0;
      const left = 16 + taper;
      const right = 56 - taper;
      for (let column = left; column < right; column += 1) {
        const edge = column === left || column === right - 1 || row === 39 || row === 64;
        const palette = edge ? outline : armor;
        paintPixel(column, row, palette[(column + row * 2) % palette.length]);
      }
    }

    fillPixels(26, 45, 21, 14, shadow);
    fillPixels(28, 47, 17, 10, ["#0c2235", "#12344b"]);
    fillPixels(34, 48, 5, 5, accent);
    paintPixel(36, 50, "#ffffff");
    fillPixels(22, 61, 29, 3, outline);

    // Neck and side connectors.
    fillPixels(30, 34, 13, 7, armor);
    fillPixels(32, 35, 9, 5, outline);
    fillPixels(15, 18, 4, 11, outline);
    fillPixels(54, 18, 4, 11, outline);
    fillPixels(13, 21, 3, 5, accent);
    fillPixels(58, 21, 3, 5, accent);

    // Pixelated robot head with chamfered corners.
    for (let row = 8; row < 35; row += 1) {
      const corner = row < 11 || row > 31 ? 5 : row < 14 || row > 29 ? 2 : 0;
      const left = 17 + corner;
      const right = 56 - corner;
      for (let column = left; column < right; column += 1) {
        const edge = column === left || column === right - 1 || row === 8 || row === 34;
        const palette = edge ? outline : armor;
        paintPixel(column, row, palette[(column * 2 + row) % palette.length]);
      }
    }

    fillPixels(21, 14, 31, 17, shadow);
    fillPixels(23, 16, 27, 13, ["#0a1e30", "#0d293d"]);

    // Eyes, pupils, mouth, and small diagnostic pixels.
    fillPixels(26, 19, 7, 6, ["#8feaff", "#c6f7ff"]);
    fillPixels(40, 19, 7, 6, ["#8feaff", "#c6f7ff"]);
    fillPixels(28, 21, 3, 3, accent);
    fillPixels(42, 21, 3, 3, accent);
    fillPixels(31, 27, 12, 2, outline);
    paintPixel(29, 26, "#58c8eb");
    paintPixel(44, 26, "#58c8eb");
    paintPixel(24, 12, "#ffc23f");
    paintPixel(49, 12, "#baf267");

    // Antenna and signal cap.
    fillPixels(35, 3, 3, 6, outline);
    fillPixels(33, 1, 7, 3, accent);
    paintPixel(36, 0, "#ffffff");

    // Sparse circuit highlights keep the robot visibly pixel-built.
    for (let row = 42; row < 62; row += 4) {
      paintPixel(21 + ((row * 3) % 8), row, "#8feaff", 0.9);
      paintPixel(48 - ((row * 5) % 7), row + 1, "#ffc23f", 0.9);
    }

    robotContext.globalAlpha = 1;
  };

  const clearLens = () => {
    lensContext.setTransform(1, 0, 0, 1, 0, 0);
    lensContext.clearRect(0, 0, lensCanvas.width, lensCanvas.height);
  };

  const hideLens = () => {
    lensActive = false;
    figure.classList.remove("is-lens-active");
    clearLens();
  };

  const drawLens = () => {
    if (!lensActive || !portraitSize || motionPreference.matches) return;

    const radius = Math.max(50, Math.min(86, portraitSize * 0.115));
    const x = Math.max(radius, Math.min(portraitSize - radius, lensPoint.x));
    const y = Math.max(radius, Math.min(portraitSize - radius, lensPoint.y));

    clearLens();
    lensContext.setTransform(portraitPixelRatio, 0, 0, portraitPixelRatio, 0, 0);
    lensContext.save();
    lensContext.beginPath();
    lensContext.arc(x, y, radius, 0, Math.PI * 2);
    lensContext.clip();
    lensContext.fillStyle = "#0b1d2e";
    lensContext.fillRect(x - radius, y - radius, radius * 2, radius * 2);

    const gridStep = Math.max(10, radius / 5.5);
    lensContext.beginPath();
    for (let gridX = x - radius; gridX <= x + radius; gridX += gridStep) {
      lensContext.moveTo(gridX, y - radius);
      lensContext.lineTo(gridX, y + radius);
    }
    for (let gridY = y - radius; gridY <= y + radius; gridY += gridStep) {
      lensContext.moveTo(x - radius, gridY);
      lensContext.lineTo(x + radius, gridY);
    }
    lensContext.lineWidth = 0.65;
    lensContext.strokeStyle = "rgba(116, 220, 247, 0.13)";
    lensContext.stroke();

    const robotUnit = portraitSize / 72;
    const parallaxX = ((lensPoint.x / portraitSize) - 0.5) * radius * 0.1;
    const parallaxY = ((lensPoint.y / portraitSize) - 0.5) * radius * 0.08;
    lensContext.imageSmoothingEnabled = false;
    lensContext.drawImage(
      robotCanvas,
      8 * robotUnit * portraitPixelRatio,
      0,
      56 * robotUnit * portraitPixelRatio,
      66 * robotUnit * portraitPixelRatio,
      x - radius * 0.72 + parallaxX,
      y - radius * 0.83 + parallaxY,
      radius * 1.44,
      radius * 1.68,
    );

    const glass = lensContext.createRadialGradient(
      x - radius * 0.34,
      y - radius * 0.38,
      0,
      x,
      y,
      radius,
    );
    glass.addColorStop(0, "rgba(255, 255, 255, 0.2)");
    glass.addColorStop(0.58, "rgba(255, 255, 255, 0)");
    glass.addColorStop(1, "rgba(74, 210, 239, 0.12)");
    lensContext.fillStyle = glass;
    lensContext.fillRect(x - radius, y - radius, radius * 2, radius * 2);
    lensContext.restore();

    lensContext.beginPath();
    lensContext.arc(x, y, radius - 1.5, 0, Math.PI * 2);
    lensContext.lineWidth = 3;
    lensContext.strokeStyle = "rgba(255, 255, 255, 0.96)";
    lensContext.stroke();
    lensContext.beginPath();
    lensContext.arc(x, y, radius - 4.5, 0, Math.PI * 2);
    lensContext.lineWidth = 1.35;
    lensContext.strokeStyle = "rgba(86, 210, 238, 0.86)";
    lensContext.stroke();
    lensContext.beginPath();
    lensContext.arc(x, y, radius - 7, -2.7, -1.25);
    lensContext.lineWidth = 3;
    lensContext.strokeStyle = "rgba(255, 194, 63, 0.92)";
    lensContext.stroke();
  };

  const updateLens = (event) => {
    const bounds = canvas.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;

    const x = ((event.clientX - bounds.left) / bounds.width) * portraitSize;
    const y = ((event.clientY - bounds.top) / bounds.height) * portraitSize;
    if (x < 0 || x > portraitSize || y < 0 || y > portraitSize) {
      hideLens();
      return;
    }

    lensPoint = { x, y };
    lensActive = true;
    figure.classList.add("is-lens-active");
    drawLens();
  };

  const renderPortrait = (animate = true) => {
    window.cancelAnimationFrame(animationFrame);

    const bounds = canvas.getBoundingClientRect();
    const size = Math.max(280, Math.min(900, Math.round(bounds.width || 680)));
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.65);
    const seed = createSeed();
    let randomState = seed;

    const random = () => {
      randomState = (randomState * 1664525 + 1013904223) >>> 0;
      return randomState / 4294967296;
    };

    if (seedLabel) seedLabel.textContent = seed.toString(16).toUpperCase().padStart(8, "0");

    canvas.width = Math.round(size * pixelRatio);
    canvas.height = Math.round(size * pixelRatio);
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    lensCanvas.width = canvas.width;
    lensCanvas.height = canvas.height;
    portraitSize = size;
    portraitPixelRatio = pixelRatio;
    renderRobotLayer(size, pixelRatio);
    clearLens();

    const targetCanvas = document.createElement("canvas");
    targetCanvas.width = size;
    targetCanvas.height = size;
    const targetContext = targetCanvas.getContext("2d", { willReadFrequently: true });
    if (!targetContext) return;

    const sourceScale = Math.min(size / image.naturalWidth, size / image.naturalHeight) * 0.91;
    const drawWidth = image.naturalWidth * sourceScale;
    const drawHeight = image.naturalHeight * sourceScale;
    const drawX = (size - drawWidth) / 2;
    const drawY = (size - drawHeight) / 2;
    targetContext.clearRect(0, 0, size, size);
    targetContext.drawImage(image, drawX, drawY, drawWidth, drawHeight);

    const pixels = targetContext.getImageData(0, 0, size, size).data;
    const cellSize = Math.max(4.8, Math.min(7.4, size / 118));
    const fontSize = cellSize * 1.28;
    const featurePalette = ["#244f70", "#326686", "#467b9a", "#5f91ad", "#789fb5"];
    const cells = [];

    for (let y = cellSize / 2; y < size; y += cellSize) {
      for (let x = cellSize / 2; x < size; x += cellSize) {
        const pixelX = Math.min(size - 1, Math.floor(x));
        const pixelY = Math.min(size - 1, Math.floor(y));
        const index = (pixelY * size + pixelX) * 4;
        const red = pixels[index];
        const green = pixels[index + 1];
        const blue = pixels[index + 2];
        const alpha = pixels[index + 3];
        if (alpha < 28) continue;

        const luminance = 0.2126 * red + 0.7152 * green + 0.0722 * blue;
        const facialFeature = luminance < 88 && blue > red * 1.18 && blue > green * 1.06;
        const coverage = facialFeature
          ? Math.min(1, alpha / 232)
          : Math.min(1, alpha / 255) * (0.96 + ((255 - luminance) / 255) * 0.04);
        if (random() > coverage) continue;

        const digit = random() > 0.5 ? "1" : "0";
        cells.push({
          x,
          y,
          color: facialFeature
            ? featurePalette[Math.floor(random() * featurePalette.length)]
            : `rgb(${red}, ${green}, ${blue})`,
          digit,
          alternate: digit === "1" ? "0" : "1",
          delay: Math.pow(random(), 1.22) * 0.72,
          jitterX: (random() - 0.5) * size * 0.44,
          jitterY: (random() - 0.5) * size * 0.38,
          phase: Math.floor(random() * 11),
        });
      }
    }

    context.textAlign = "center";
    context.textBaseline = "middle";
    context.font = `760 ${fontSize}px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`;

    const startTime = performance.now();
    const duration = motionPreference.matches || !animate ? 1 : 2050;

    const drawFrame = (now) => {
      const progress = duration === 1 ? 1 : clampUnit((now - startTime) / duration);
      context.clearRect(0, 0, size, size);

      cells.forEach((cell) => {
        const localProgress = clampUnit((progress - cell.delay) / Math.max(0.12, 1 - cell.delay));
        if (localProgress <= 0) return;

        const eased = 1 - Math.pow(1 - localProgress, 3);
        const flicker = (Math.floor(now / 72) + cell.phase) % 3;
        const digit = localProgress < 0.84 && flicker !== 0 ? cell.alternate : cell.digit;
        const x = cell.x + cell.jitterX * (1 - eased);
        const y = cell.y + cell.jitterY * (1 - eased);

        context.globalAlpha = Math.min(1, 0.12 + localProgress * 1.18);
        context.fillStyle = cell.color;
        context.fillText(digit, x, y);
      });

      context.globalAlpha = 1;
      figure.classList.add("is-canvas-ready");
      if (lensActive) drawLens();

      if (progress < 1) animationFrame = window.requestAnimationFrame(drawFrame);
    };

    animationFrame = window.requestAnimationFrame(drawFrame);
  };

  const startPortrait = () => {
    renderPortrait(!hasAnimated);
    hasAnimated = true;
  };

  if (image.complete && image.naturalWidth) startPortrait();
  else image.addEventListener("load", startPortrait, { once: true });

  image.addEventListener(
    "error",
    () => {
      if (seedLabel) seedLabel.textContent = "FALLBACK";
    },
    { once: true },
  );

  figure.addEventListener(
    "pointermove",
    (event) => {
      if (event.pointerType === "touch") return;
      updateLens(event);
    },
    { passive: true },
  );
  figure.addEventListener("pointerleave", hideLens);
  figure.addEventListener(
    "pointerdown",
    (event) => {
      if (event.pointerType !== "touch") return;
      window.clearTimeout(touchLensTimer);
      updateLens(event);
      touchLensTimer = window.setTimeout(hideLens, 850);
    },
    { passive: true },
  );
  window.addEventListener("coverprogresschange", (event) => {
    if (event.detail?.progress > 0.08) hideLens();
  });
  motionPreference.addEventListener?.("change", () => {
    if (motionPreference.matches) hideLens();
  });

  window.addEventListener(
    "resize",
    () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => renderPortrait(false), 160);
    },
    { passive: true },
  );
};

const setupFluidCover = () => {
  const cover = document.querySelector("[data-cover]");
  const scene = document.querySelector("[data-cover-scene]");
  const canvas = document.querySelector("[data-fluid-canvas]");
  const displacement = document.querySelector("#cover-displacement");

  if (!cover || !scene || !canvas) return;

  let pointerTarget = { x: 0.52, y: 0.5 };
  let pointerCurrent = { ...pointerTarget };
  let pointerVelocity = { x: 0, y: 0 };
  let energy = 0.2;
  let isVisible = true;
  let animationFrame = 0;
  let running = false;

  const updatePointer = (event) => {
    const bounds = scene.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;

    const nextX = clampUnit((event.clientX - bounds.left) / bounds.width);
    const nextY = clampUnit((event.clientY - bounds.top) / bounds.height);
    pointerVelocity.x += nextX - pointerTarget.x;
    pointerVelocity.y += nextY - pointerTarget.y;
    pointerTarget = { x: nextX, y: nextY };
    energy = Math.min(1, energy + Math.hypot(pointerVelocity.x, pointerVelocity.y) * 4 + 0.12);
  };

  cover.addEventListener("pointermove", updatePointer, { passive: true });
  cover.addEventListener(
    "pointerdown",
    (event) => {
      updatePointer(event);
      energy = 1;
    },
    { passive: true },
  );
  cover.addEventListener("pointerleave", () => {
    pointerTarget = { x: 0.52, y: 0.5 };
  });

  const setPortraitDistortion = () => {
    const speed = Math.hypot(pointerVelocity.x, pointerVelocity.y);
    const distortion = motionPreference.matches
      ? 0
      : Math.min(19, 1.2 + energy * 8.5 + speed * 44) * (1 - coverProgressValue * 0.75);

    displacement?.setAttribute("scale", distortion.toFixed(2));
    document.documentElement.style.setProperty("--portrait-shift-x", `${((pointerCurrent.x - 0.5) * 13).toFixed(2)}px`);
    document.documentElement.style.setProperty("--portrait-shift-y", `${((pointerCurrent.y - 0.5) * 9).toFixed(2)}px`);
  };

  const createShader = (gl, type, source) => {
    const shader = gl.createShader(type);
    if (!shader) return null;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.warn("Cover fluid shader could not be compiled.", gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  };

  const gl = canvas.getContext("webgl", {
    alpha: true,
    antialias: false,
    depth: false,
    stencil: false,
    powerPreference: "low-power",
  });

  if (!gl) {
    const context = canvas.getContext("2d");
    if (!context) return;

    const resizeFallback = () => {
      const bounds = canvas.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.max(1, Math.round(bounds.width * ratio));
      canvas.height = Math.max(1, Math.round(bounds.height * ratio));
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    };

    const drawFallback = (now) => {
      if (!running || motionPreference.matches) return;
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      pointerCurrent.x += (pointerTarget.x - pointerCurrent.x) * 0.075;
      pointerCurrent.y += (pointerTarget.y - pointerCurrent.y) * 0.075;
      pointerVelocity.x *= 0.88;
      pointerVelocity.y *= 0.88;
      energy += (0.18 - energy) * 0.035;
      context.clearRect(0, 0, width, height);

      const x = pointerCurrent.x * width;
      const y = pointerCurrent.y * height;
      const radius = Math.max(width, height) * (0.22 + energy * 0.08);
      const gradient = context.createRadialGradient(x, y, 0, x, y, radius);
      gradient.addColorStop(0, `rgba(53, 154, 235, ${0.2 + energy * 0.16})`);
      gradient.addColorStop(0.48, `rgba(255, 180, 36, ${0.08 + energy * 0.1})`);
      gradient.addColorStop(1, "rgba(255, 255, 255, 0)");
      context.fillStyle = gradient;
      context.fillRect(0, 0, width, height);
      setPortraitDistortion();
      animationFrame = window.requestAnimationFrame(drawFallback);
    };

    const startFallback = () => {
      if (running || !isVisible || motionPreference.matches || coverProgressValue > 0.995) return;
      running = true;
      animationFrame = window.requestAnimationFrame(drawFallback);
    };

    const stopFallback = () => {
      running = false;
      window.cancelAnimationFrame(animationFrame);
    };

    resizeFallback();
    window.addEventListener("resize", resizeFallback, { passive: true });
    window.addEventListener(
      "coverprogresschange",
      () => {
        if (coverProgressValue > 0.995) stopFallback();
        else startFallback();
      },
    );
    startFallback();
    motionPreference.addEventListener?.("change", () => {
      if (motionPreference.matches) stopFallback();
      else startFallback();
    });
    return;
  }

  const vertexShaderSource = `
    attribute vec2 a_position;
    varying vec2 v_uv;
    void main() {
      v_uv = a_position * 0.5 + 0.5;
      gl_Position = vec4(a_position, 0.0, 1.0);
    }
  `;

  const fragmentShaderSource = `
    precision mediump float;
    varying vec2 v_uv;
    uniform vec2 u_resolution;
    uniform vec2 u_pointer;
    uniform vec2 u_velocity;
    uniform float u_time;
    uniform float u_energy;
    uniform float u_scroll;

    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
    }

    float noise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      f = f * f * (3.0 - 2.0 * f);
      return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
                 mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
    }

    float fbm(vec2 p) {
      float value = 0.0;
      float amplitude = 0.52;
      for (int i = 0; i < 4; i++) {
        value += amplitude * noise(p);
        p = p * 2.03 + vec2(1.7, 4.9);
        amplitude *= 0.5;
      }
      return value;
    }

    void main() {
      vec2 uv = v_uv;
      vec2 aspect = vec2(u_resolution.x / max(u_resolution.y, 1.0), 1.0);
      vec2 delta = (uv - u_pointer) * aspect;
      float radius = length(delta) + 0.0001;
      vec2 normal = delta / radius;
      vec2 tangent = vec2(-normal.y, normal.x);
      float local = exp(-radius * 5.2) * (0.25 + u_energy * 0.9);
      float ripple = sin(radius * 31.0 - u_time * 3.8) * 0.5 + 0.5;
      float velocity = min(length(u_velocity) * 7.0, 1.0);
      vec2 warped = uv + tangent * local * (0.03 + velocity * 0.065)
        + normal * ripple * local * 0.018;
      float field = fbm(warped * 3.15 + vec2(u_time * 0.025, -u_time * 0.018));
      float secondField = fbm(warped * 4.9 + vec2(-u_time * 0.015, u_time * 0.022));
      vec3 cool = vec3(0.12, 0.53, 0.89);
      vec3 warm = vec3(1.0, 0.66, 0.12);
      vec3 green = vec3(0.31, 0.68, 0.19);
      vec3 color = mix(cool, warm, smoothstep(0.25, 0.82, field));
      color = mix(color, green, smoothstep(0.68, 0.94, secondField) * 0.5);
      float alpha = (0.055 + smoothstep(0.43, 0.88, field) * 0.16 + local * (0.22 + ripple * 0.19));
      alpha *= 1.0 - u_scroll * 0.72;
      gl_FragColor = vec4(color, alpha);
    }
  `;

  const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
  const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
  if (!vertexShader || !fragmentShader) {
    canvas.hidden = true;
    return;
  }

  const program = gl.createProgram();
  if (!program) return;
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.warn("Cover fluid program could not be linked.", gl.getProgramInfoLog(program));
    canvas.hidden = true;
    return;
  }

  const positionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
    gl.STATIC_DRAW,
  );

  const positionLocation = gl.getAttribLocation(program, "a_position");
  const resolutionLocation = gl.getUniformLocation(program, "u_resolution");
  const pointerLocation = gl.getUniformLocation(program, "u_pointer");
  const velocityLocation = gl.getUniformLocation(program, "u_velocity");
  const timeLocation = gl.getUniformLocation(program, "u_time");
  const energyLocation = gl.getUniformLocation(program, "u_energy");
  const scrollLocation = gl.getUniformLocation(program, "u_scroll");

  const resizeFluid = () => {
    const bounds = canvas.getBoundingClientRect();
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = Math.max(1, Math.round(bounds.width * pixelRatio));
    canvas.height = Math.max(1, Math.round(bounds.height * pixelRatio));
    gl.viewport(0, 0, canvas.width, canvas.height);
  };

  const drawFluid = (now) => {
    if (!running || motionPreference.matches) return;

    pointerCurrent.x += (pointerTarget.x - pointerCurrent.x) * 0.075;
    pointerCurrent.y += (pointerTarget.y - pointerCurrent.y) * 0.075;
    pointerVelocity.x *= 0.88;
    pointerVelocity.y *= 0.88;
    energy += (0.2 - energy) * 0.032;

    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
    gl.uniform2f(resolutionLocation, canvas.width, canvas.height);
    gl.uniform2f(pointerLocation, pointerCurrent.x, 1 - pointerCurrent.y);
    gl.uniform2f(velocityLocation, pointerVelocity.x, -pointerVelocity.y);
    gl.uniform1f(timeLocation, now * 0.001);
    gl.uniform1f(energyLocation, energy);
    gl.uniform1f(scrollLocation, coverProgressValue);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    setPortraitDistortion();

    animationFrame = window.requestAnimationFrame(drawFluid);
  };

  const startFluid = () => {
    if (running || !isVisible || motionPreference.matches || coverProgressValue > 0.995) return;
    running = true;
    canvas.hidden = false;
    animationFrame = window.requestAnimationFrame(drawFluid);
  };

  const stopFluid = () => {
    running = false;
    window.cancelAnimationFrame(animationFrame);
  };

  if ("IntersectionObserver" in window) {
    const visibilityObserver = new IntersectionObserver(
      ([entry]) => {
        isVisible = entry.isIntersecting;
        if (isVisible) startFluid();
        else stopFluid();
      },
      { threshold: 0.01 },
    );
    visibilityObserver.observe(cover);
  }

  resizeFluid();
  window.addEventListener("resize", resizeFluid, { passive: true });
  window.addEventListener(
    "coverprogresschange",
    () => {
      if (coverProgressValue > 0.995) stopFluid();
      else startFluid();
    },
  );
  motionPreference.addEventListener?.("change", () => {
    if (motionPreference.matches) {
      stopFluid();
      canvas.hidden = true;
      displacement?.setAttribute("scale", "0");
    } else {
      startFluid();
    }
  });
  startFluid();
};

setupCoverTransition();
setupBinaryPortrait();

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
