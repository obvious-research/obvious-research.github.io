document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.zoom-group').forEach((group) => {
    const sources = Array.from(group.querySelectorAll('.zoom-source'));
    const minimumZoom = 2;
    const maximumZoom = 8;
    let zoom = 4;
    let lensDiameter = 180;

    const normalizedWheelDelta = (event) => {
      if (event.deltaMode === WheelEvent.DOM_DELTA_LINE) return event.deltaY * 16;
      if (event.deltaMode === WheelEvent.DOM_DELTA_PAGE) return event.deltaY * window.innerHeight;
      return event.deltaY;
    };

    const syncLensDiameter = () => {
      const visibleWidths = sources.map((source) => source.clientWidth).filter((width) => width > 0);
      if (!visibleWidths.length) return;
      lensDiameter = Math.max(82, Math.min(180, ...visibleWidths.map((width) => width - 16)));
      sources.forEach((source) => source.style.setProperty('--zoom-diameter', `${lensDiameter}px`));
    };

    const applyZoom = () => {
      const zoomSize = `${zoom * 100}%`;
      sources.forEach((source) => source.style.setProperty('--zoom-size', zoomSize));
      group.dataset.zoomLevel = zoom.toFixed(2);
    };

    const updateLinkedFocus = (x, y) => {
      sources.forEach((source) => {
        const halfLens = lensDiameter / 2 + 4;
        const lensX = Math.max(halfLens, Math.min(source.clientWidth - halfLens, x * source.clientWidth));
        const lensY = Math.max(halfLens, Math.min(source.clientHeight - halfLens, y * source.clientHeight));
        source.style.setProperty('--zoom-focus-x', `${x * 100}%`);
        source.style.setProperty('--zoom-focus-y', `${y * 100}%`);
        source.style.setProperty('--zoom-lens-x', `${lensX}px`);
        source.style.setProperty('--zoom-lens-y', `${lensY}px`);
      });
    };

    sources.forEach((source) => {
      const image = source.querySelector('img');
      const setZoomImage = () => {
        source.style.setProperty('--zoom-image', `url("${image.currentSrc || image.src}")`);
      };
      if (image.complete) setZoomImage();
      image.addEventListener('load', setZoomImage, { once: true });

      source.addEventListener('pointerenter', syncLensDiameter);
      source.addEventListener('wheel', (event) => {
        if (!group.classList.contains('is-zooming')) return;

        const deltaY = normalizedWheelDelta(event);
        if (!deltaY || !event.cancelable) return;

        const nextZoom = Math.max(minimumZoom, Math.min(maximumZoom, zoom * Math.exp(-deltaY * 0.0015)));
        event.preventDefault();
        zoom = nextZoom;
        applyZoom();
      }, { passive: false });
    });

    group.addEventListener('pointermove', (event) => {
      if (event.pointerType === 'touch') return;
      const source = event.target.closest('.zoom-source');
      if (!source || !group.contains(source)) {
        group.classList.remove('is-zooming');
        return;
      }

      const bounds = source.getBoundingClientRect();
      const x = Math.min(1, Math.max(0, (event.clientX - bounds.left) / bounds.width));
      const y = Math.min(1, Math.max(0, (event.clientY - bounds.top) / bounds.height));

      updateLinkedFocus(x, y);
      group.classList.add('is-zooming');
    });

    group.addEventListener('pointerleave', () => group.classList.remove('is-zooming'));
    window.addEventListener('resize', syncLensDiameter, { passive: true });
    applyZoom();
  });
});
