/* The overview is encoded at 2x; the box close-up keeps its original timing. */
(() => {
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const previews = new Map(Array.from(document.querySelectorAll("[data-motion-preview]"), video => [video, {
    visible: false, started: false, resumeAfterDialog: false,
  }]));
  const dialog = document.getElementById("box-detail-dialog");

  function startPreview(video, state) {
    if (state.started || !state.visible || reducedMotion.matches || document.hidden || dialog?.open) return;
    state.started = true;
    video.play().catch(() => {
      // Native controls and the close-up link remain available if autoplay is blocked.
    });
  }

  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        const state = previews.get(entry.target);
        state.visible = entry.isIntersecting && entry.intersectionRatio >= 0.25;
        if (state.visible) startPreview(entry.target, state);
        else entry.target.pause();
      }
    }, { threshold: 0.25 });
    for (const video of previews.keys()) observer.observe(video);
  }

  reducedMotion.addEventListener("change", () => {
    for (const [video, state] of previews) {
      if (reducedMotion.matches) video.pause();
      else startPreview(video, state);
    }
  });
  document.addEventListener("visibilitychange", () => {
    for (const [video, state] of previews) {
      if (document.hidden) video.pause();
      else startPreview(video, state);
    }
    if (document.hidden) document.getElementById("box-detail-player")?.pause();
  });

  const opener = document.getElementById("box-detail-open");
  const player = document.getElementById("box-detail-player");
  const closeButton = document.getElementById("box-detail-close");
  if (!dialog || !opener || !player || !closeButton || typeof dialog.showModal !== "function") return;

  opener.addEventListener("click", event => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    const preview = document.getElementById("box-detail-preview");
    const time = preview?.currentTime || 0;
    for (const [video, state] of previews) {
      state.resumeAfterDialog = !video.paused;
      video.pause();
    }
    dialog.showModal();
    if (player.readyState >= 1) player.currentTime = time;
    else player.addEventListener("loadedmetadata", () => { player.currentTime = time; }, { once: true });
    player.play().catch(() => {});
  });

  closeButton.addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", event => {
    if (event.target !== dialog) return;
    const bounds = dialog.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
  });
  dialog.addEventListener("close", () => {
    player.pause();
    for (const [video, state] of previews) {
      if (state.resumeAfterDialog && state.visible && !reducedMotion.matches && !document.hidden) video.play().catch(() => {});
      state.resumeAfterDialog = false;
    }
    opener.focus({ preventScroll: true });
  });
})();
