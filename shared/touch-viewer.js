document.addEventListener('DOMContentLoaded', () => {
  const zoomableImages = Array.from(document.querySelectorAll('img[data-touch-zoom]'));
  if (!zoomableImages.length) return;

  const viewer = document.createElement('div');
  viewer.className = 'touch-viewer';
  viewer.hidden = true;
  viewer.setAttribute('role', 'dialog');
  viewer.setAttribute('aria-modal', 'true');
  viewer.setAttribute('aria-label', 'Magnified figure viewer');
  viewer.innerHTML = `
    <div class="touch-viewer__topbar">
      <p class="touch-viewer__title" data-touch-viewer-title></p>
      <button type="button" data-touch-viewer-close aria-label="Close magnified figure">&times;</button>
    </div>
    <div class="touch-viewer__stage" data-touch-viewer-stage>
      <img alt="" draggable="false">
    </div>
    <div>
      <div class="touch-viewer__controls" role="group" aria-label="Figure zoom controls">
        <button type="button" data-touch-viewer-out aria-label="Zoom out">&minus;</button>
        <span class="touch-viewer__status" data-touch-viewer-status aria-live="polite">100%</span>
        <button type="button" data-touch-viewer-in aria-label="Zoom in">+</button>
        <button type="button" data-touch-viewer-reset aria-label="Reset zoom and position">Reset</button>
      </div>
      <p class="touch-viewer__hint">Pinch to zoom &middot; drag to inspect &middot; use Reset to recenter</p>
    </div>`;
  document.body.appendChild(viewer);

  const stage = viewer.querySelector('[data-touch-viewer-stage]');
  const image = stage.querySelector('img');
  const title = viewer.querySelector('[data-touch-viewer-title]');
  const status = viewer.querySelector('[data-touch-viewer-status]');
  const closeButton = viewer.querySelector('[data-touch-viewer-close]');
  const zoomOutButton = viewer.querySelector('[data-touch-viewer-out]');
  const zoomInButton = viewer.querySelector('[data-touch-viewer-in]');
  const resetButton = viewer.querySelector('[data-touch-viewer-reset]');
  const minimumScale = 1;
  const maximumScale = 6;
  const pointers = new Map();
  let activeSource = null;
  let scale = minimumScale;
  let translateX = 0;
  let translateY = 0;
  let panStart = null;
  let pinchStart = null;

  const midpoint = (first, second) => ({
    x: (first.x + second.x) / 2,
    y: (first.y + second.y) / 2
  });

  const distance = (first, second) => Math.hypot(second.x - first.x, second.y - first.y);

  function clampTranslation() {
    const maximumX = image.clientWidth * (scale - 1) / 2;
    const maximumY = image.clientHeight * (scale - 1) / 2;
    translateX = Math.max(-maximumX, Math.min(maximumX, translateX));
    translateY = Math.max(-maximumY, Math.min(maximumY, translateY));
  }

  function render() {
    clampTranslation();
    image.style.transform = `translate3d(${translateX}px, ${translateY}px, 0) scale(${scale})`;
    status.textContent = `${Math.round(scale * 100)}%`;
    zoomOutButton.disabled = scale <= minimumScale;
    zoomInButton.disabled = scale >= maximumScale;
    resetButton.disabled = scale <= minimumScale && translateX === 0 && translateY === 0;
  }

  function setScale(nextScale) {
    const previousScale = scale;
    scale = Math.max(minimumScale, Math.min(maximumScale, nextScale));
    if (scale === minimumScale) {
      translateX = 0;
      translateY = 0;
    } else {
      const ratio = scale / previousScale;
      translateX *= ratio;
      translateY *= ratio;
    }
    render();
  }

  function resetView() {
    scale = minimumScale;
    translateX = 0;
    translateY = 0;
    pointers.clear();
    panStart = null;
    pinchStart = null;
    render();
  }

  function openViewer(source) {
    activeSource = source;
    image.src = source.currentSrc || source.src;
    image.alt = source.alt;
    title.textContent = source.alt || 'Magnified figure';
    viewer.hidden = false;
    document.body.classList.add('touch-viewer-open');
    resetView();
    closeButton.focus({ preventScroll: true });
  }

  function closeViewer() {
    if (viewer.hidden) return;
    viewer.hidden = true;
    document.body.classList.remove('touch-viewer-open');
    resetView();
    if (activeSource) activeSource.focus({ preventScroll: true });
    activeSource = null;
  }

  function beginPinch() {
    const [first, second] = Array.from(pointers.values());
    const center = midpoint(first, second);
    const bounds = stage.getBoundingClientRect();
    pinchStart = {
      distance: Math.max(1, distance(first, second)),
      scale,
      translateX,
      translateY,
      midpoint: center,
      focusX: center.x - bounds.left - bounds.width / 2,
      focusY: center.y - bounds.top - bounds.height / 2
    };
  }

  zoomInButton.addEventListener('click', () => setScale(scale + .5));
  zoomOutButton.addEventListener('click', () => setScale(scale - .5));
  resetButton.addEventListener('click', resetView);
  closeButton.addEventListener('click', closeViewer);
  image.addEventListener('load', render);

  stage.addEventListener('pointerdown', (event) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    try {
      stage.setPointerCapture(event.pointerId);
    } catch {
      // Window-level pointer events still allow the gesture to continue.
    }
    if (pointers.size === 1) {
      panStart = { x: event.clientX, y: event.clientY, translateX, translateY };
    } else if (pointers.size === 2) {
      beginPinch();
    }
    event.preventDefault();
  });

  stage.addEventListener('pointermove', (event) => {
    if (!pointers.has(event.pointerId)) return;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (pointers.size >= 2 && pinchStart) {
      const [first, second] = Array.from(pointers.values());
      const center = midpoint(first, second);
      const nextScale = Math.max(minimumScale, Math.min(maximumScale, pinchStart.scale * distance(first, second) / pinchStart.distance));
      const ratio = nextScale / pinchStart.scale;
      scale = nextScale;
      translateX = pinchStart.focusX - ratio * (pinchStart.focusX - pinchStart.translateX) + center.x - pinchStart.midpoint.x;
      translateY = pinchStart.focusY - ratio * (pinchStart.focusY - pinchStart.translateY) + center.y - pinchStart.midpoint.y;
      render();
    } else if (pointers.size === 1 && panStart && scale > minimumScale) {
      translateX = panStart.translateX + event.clientX - panStart.x;
      translateY = panStart.translateY + event.clientY - panStart.y;
      render();
    }
    event.preventDefault();
  });

  function endPointer(event) {
    if (!pointers.has(event.pointerId)) return;
    pointers.delete(event.pointerId);
    if (stage.hasPointerCapture(event.pointerId)) stage.releasePointerCapture(event.pointerId);
    pinchStart = null;
    if (pointers.size === 1) {
      const remaining = Array.from(pointers.values())[0];
      panStart = { x: remaining.x, y: remaining.y, translateX, translateY };
    } else {
      panStart = null;
    }
  }

  stage.addEventListener('pointerup', endPointer);
  stage.addEventListener('pointercancel', endPointer);
  viewer.addEventListener('click', (event) => {
    if (event.target === viewer) closeViewer();
  });
  document.addEventListener('keydown', (event) => {
    if (!viewer.hidden && event.key === 'Escape') closeViewer();
  });
  window.addEventListener('resize', render, { passive: true });

  zoomableImages.forEach((source) => {
    source.tabIndex = 0;
    source.setAttribute('role', 'button');
    source.setAttribute('aria-haspopup', 'dialog');
    source.setAttribute('aria-label', `${source.alt || 'Figure'}. Open magnified view.`);
    source.addEventListener('click', () => openViewer(source));
    source.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      openViewer(source);
    });
  });
});
