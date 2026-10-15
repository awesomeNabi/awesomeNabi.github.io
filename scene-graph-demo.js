/* The media is encoded at 2x; keep the browser playback rate at its default. */
(() => {
  const video = document.getElementById("rerun-video");
  if (!video) return;

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let hasStarted = false;
  let isVisible = false;

  function startPreview() {
    if (hasStarted || !isVisible || reducedMotion.matches || document.hidden) return;
    hasStarted = true;
    video.play().catch(() => {
      // Native controls remain available when autoplay is blocked.
    });
  }

  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(([entry]) => {
      isVisible = entry.isIntersecting;
      if (isVisible) startPreview();
      else video.pause();
    }, { threshold: 0.25 });
    observer.observe(video);
  }

  reducedMotion.addEventListener("change", () => {
    if (reducedMotion.matches) video.pause();
    else startPreview();
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) video.pause();
    else startPreview();
  });
})();
