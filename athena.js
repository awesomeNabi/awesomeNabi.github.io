(() => {
  'use strict';
  document.documentElement.classList.add('js');
  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  const motionButton = document.querySelector('[data-motion-toggle]');
  let userMotion = null;
  try { userMotion = localStorage.getItem('siyu-motion'); } catch { /* Storage may be unavailable. */ }
  const updateMotion = () => {
    const off = motionQuery.matches || userMotion === 'off';
    document.documentElement.classList.toggle('motion-off', off);
    motionButton.textContent = `动态效果：${off ? '关闭' : '开启'}`;
    motionButton.setAttribute('aria-pressed', String(off));
    motionButton.title = motionQuery.matches ? '已遵循系统减少动态效果设置' : '切换装饰动画与悬浮动效';
  };
  motionButton.hidden = false;
  motionButton.addEventListener('click', () => {
    userMotion = document.documentElement.classList.contains('motion-off') ? 'on' : 'off';
    try { localStorage.setItem('siyu-motion', userMotion); } catch { /* Still applies to this visit. */ }
    updateMotion();
  });
  motionQuery.addEventListener('change', updateMotion);
  updateMotion();
  const menuButton = document.querySelector('.menu-toggle');
  const nav = document.querySelector('.site-nav');
  const mobile = window.matchMedia('(max-width: 600px)');
  const closeMenu = (returnFocus = false) => {
    nav.classList.remove('is-open');
    menuButton.setAttribute('aria-expanded', 'false');
    if (returnFocus) menuButton.focus();
  };
  const updateMenu = () => { menuButton.hidden = !mobile.matches; closeMenu(); };
  updateMenu();
  mobile.addEventListener('change', updateMenu);
  menuButton.addEventListener('click', () => {
    const open = nav.classList.toggle('is-open');
    menuButton.setAttribute('aria-expanded', String(open));
  });
  nav.addEventListener('click', event => { if (event.target.closest('a')) closeMenu(); });
  document.addEventListener('click', event => { if (!event.target.closest('.site-header')) closeMenu(); });
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && nav.classList.contains('is-open')) closeMenu(true); });
  document.addEventListener('focusin', event => { if (nav.classList.contains('is-open') && !event.target.closest('.site-header')) closeMenu(); });
  const header = document.querySelector('[data-header]');
  const progress = document.querySelector('.reading-progress');
  const navLinks = [...nav.querySelectorAll('a[href^="#"]')];
  const navSections = navLinks.map(link => document.querySelector(link.hash));
  let frame = 0;
  const updateScroll = () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    progress.style.transform = `scaleX(${max > 0 ? Math.min(1, window.scrollY / max) : 0})`;
    header.classList.toggle('is-scrolled', window.scrollY > 30);
    let active = null;
    navSections.forEach((section, index) => { if (section.getBoundingClientRect().top < 180) active = index; });
    navLinks.forEach((link, index) => { if (index === active) link.setAttribute('aria-current', 'location'); else link.removeAttribute('aria-current'); });
    frame = 0;
  };
  const requestScroll = () => { if (!frame) frame = requestAnimationFrame(updateScroll); };
  window.addEventListener('scroll', requestScroll, { passive: true });
  window.addEventListener('resize', requestScroll, { passive: true });
  window.addEventListener('load', requestScroll);
  document.querySelectorAll('details').forEach(details => details.addEventListener('toggle', requestScroll));
  updateScroll();
  const filters = document.querySelector('.project-filters');
  const projects = [...document.querySelectorAll('.project-card')];
  const filterButtons = [...filters.querySelectorAll('button')];
  const count = document.querySelector('.collection-count');
  const projectGrid = document.querySelector('.project-grid');
  filters.hidden = false;
  const setFilter = value => {
    projectGrid.dataset.filter = value;
    let total = 0;
    projects.forEach(project => { project.hidden = value !== 'all' && project.dataset.category !== value; if (!project.hidden) total++; });
    filterButtons.forEach(button => { const active = button.dataset.filter === value; button.classList.toggle('is-active', active); button.setAttribute('aria-pressed', String(active)); });
    count.textContent = `COLLECTION / ${String(total).padStart(2, '0')} WORKS`;
    requestScroll();
  };
  filterButtons.forEach(button => button.addEventListener('click', () => setFilter(button.dataset.filter)));
  const revealHash = () => {
    let target;
    try { target = document.getElementById(decodeURIComponent(location.hash.slice(1))); } catch { return; }
    if (!target) return;
    if (target.closest('.project-card')?.hidden) { setFilter('all'); target.scrollIntoView(); }
  };
  document.querySelectorAll('a[href^="#"]').forEach(link => link.addEventListener('click', () => {
    const target = document.getElementById(link.hash.slice(1));
    if (target?.closest('.project-card')?.hidden) setFilter('all');
  }));
  window.addEventListener('hashchange', revealHash);
  revealHash();
  const dialog = document.querySelector('.video-dialog');
  const video = dialog.querySelector('video');
  let opener = null;
  document.querySelectorAll('[data-video]').forEach(link => link.addEventListener('click', event => {
    if (typeof dialog.showModal !== 'function' || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    opener = link;
    document.getElementById('video-title').textContent = link.dataset.videoTitle;
    video.src = link.dataset.video;
    dialog.showModal();
    document.body.classList.add('dialog-open');
    video.play().catch(() => { /* Native controls remain available. */ });
  }));
  dialog.querySelector('[data-close-dialog]').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => {
    const rect = dialog.getBoundingClientRect();
    if (event.target === dialog && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) dialog.close();
  });
  dialog.addEventListener('close', () => { video.pause(); video.removeAttribute('src'); video.load(); document.body.classList.remove('dialog-open'); opener?.focus(); });
  const copyButton = document.querySelector('[data-copy-email]');
  const copyStatus = document.querySelector('.copy-status');
  if (navigator.clipboard?.writeText && window.isSecureContext) {
    copyButton.hidden = false;
    copyButton.addEventListener('click', async () => {
      try { await navigator.clipboard.writeText('1283466577@qq.com'); copyStatus.textContent = '邮箱已复制。'; }
      catch { copyStatus.textContent = '复制未完成，可选中上方邮箱手动复制。'; }
    });
  }
})();
