document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.zoom-group').forEach((group) => {
    const sources = Array.from(group.querySelectorAll('.zoom-source'));
    const minimumZoom = 2;
    const maximumZoom = 8;
    let zoom = 4;
    let lensDiameter = 180;
    let activeTouchSource = null;
    let pendingTouch = null;
    let pinchStartDistance = 0;
    let pinchStartZoom = zoom;

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

    const updateFocusFromPoint = (source, clientX, clientY) => {
      const bounds = source.getBoundingClientRect();
      const x = Math.min(1, Math.max(0, (clientX - bounds.left) / bounds.width));
      const y = Math.min(1, Math.max(0, (clientY - bounds.top) / bounds.height));
      updateLinkedFocus(x, y);
    };

    const touchDistance = (first, second) => Math.hypot(second.clientX - first.clientX, second.clientY - first.clientY);

    const touchMidpoint = (first, second) => ({
      x: (first.clientX + second.clientX) / 2,
      y: (first.clientY + second.clientY) / 2
    });

    const beginTouchPinch = (touches) => {
      if (touches.length < 2) return;
      pinchStartDistance = Math.max(1, touchDistance(touches[0], touches[1]));
      pinchStartZoom = zoom;
    };

    const activateTouchZoom = (source, clientX, clientY) => {
      activeTouchSource = source;
      syncLensDiameter();
      updateFocusFromPoint(source, clientX, clientY);
      group.classList.add('is-zooming', 'is-touch-zooming');
    };

    const deactivateTouchZoom = () => {
      activeTouchSource = null;
      pendingTouch = null;
      pinchStartDistance = 0;
      group.classList.remove('is-zooming', 'is-touch-zooming');
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

      source.addEventListener('touchstart', (event) => {
        if (activeTouchSource !== source) {
          const touch = event.touches[0];
          pendingTouch = touch ? {
            source,
            startX: touch.clientX,
            startY: touch.clientY,
            currentX: touch.clientX,
            currentY: touch.clientY,
            moved: false
          } : null;
          return;
        }

        event.preventDefault();
        if (event.touches.length >= 2) {
          beginTouchPinch(event.touches);
          const center = touchMidpoint(event.touches[0], event.touches[1]);
          updateFocusFromPoint(source, center.x, center.y);
        } else if (event.touches.length === 1) {
          updateFocusFromPoint(source, event.touches[0].clientX, event.touches[0].clientY);
        }
      }, { passive: false });

      source.addEventListener('touchmove', (event) => {
        if (activeTouchSource !== source) {
          if (pendingTouch && pendingTouch.source === source && event.touches.length) {
            const touch = event.touches[0];
            pendingTouch.currentX = touch.clientX;
            pendingTouch.currentY = touch.clientY;
            pendingTouch.moved = pendingTouch.moved || Math.hypot(touch.clientX - pendingTouch.startX, touch.clientY - pendingTouch.startY) > 10;
          }
          return;
        }

        event.preventDefault();
        if (event.touches.length >= 2) {
          if (!pinchStartDistance) beginTouchPinch(event.touches);
          const center = touchMidpoint(event.touches[0], event.touches[1]);
          zoom = Math.max(minimumZoom, Math.min(maximumZoom, pinchStartZoom * touchDistance(event.touches[0], event.touches[1]) / pinchStartDistance));
          updateFocusFromPoint(source, center.x, center.y);
          applyZoom();
        } else if (event.touches.length === 1) {
          pinchStartDistance = 0;
          updateFocusFromPoint(source, event.touches[0].clientX, event.touches[0].clientY);
        }
      }, { passive: false });

      source.addEventListener('touchend', (event) => {
        if (activeTouchSource === source) {
          pinchStartDistance = 0;
          if (event.cancelable) event.preventDefault();
          return;
        }

        if (pendingTouch && pendingTouch.source === source && !pendingTouch.moved) {
          const touch = event.changedTouches[0];
          const x = touch ? touch.clientX : pendingTouch.currentX;
          const y = touch ? touch.clientY : pendingTouch.currentY;
          activateTouchZoom(source, x, y);
          if (event.cancelable) event.preventDefault();
        }
        pendingTouch = null;
      }, { passive: false });

      source.addEventListener('touchcancel', () => {
        pendingTouch = null;
        pinchStartDistance = 0;
      }, { passive: true });
    });

    group.addEventListener('pointermove', (event) => {
      if (event.pointerType === 'touch') return;
      const source = event.target.closest('.zoom-source');
      if (!source || !group.contains(source)) {
        group.classList.remove('is-zooming');
        return;
      }

      updateFocusFromPoint(source, event.clientX, event.clientY);
      group.classList.add('is-zooming');
    });

    group.addEventListener('pointerleave', () => {
      if (!activeTouchSource) group.classList.remove('is-zooming');
    });
    document.addEventListener('touchstart', (event) => {
      if (activeTouchSource && !group.contains(event.target)) deactivateTouchZoom();
    }, { capture: true, passive: true });
    window.addEventListener('resize', syncLensDiameter, { passive: true });
    applyZoom();
  });
});
