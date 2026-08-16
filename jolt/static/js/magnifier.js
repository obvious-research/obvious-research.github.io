document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.zoom-group').forEach((group) => {
    const sources = Array.from(group.querySelectorAll('.zoom-source'));

    sources.forEach((source) => {
      const image = source.querySelector('img');
      const setZoomImage = () => {
        source.style.setProperty('--zoom-image', `url("${image.currentSrc || image.src}")`);
      };
      if (image.complete) setZoomImage();
      image.addEventListener('load', setZoomImage, { once: true });
    });

    group.addEventListener('pointermove', (event) => {
      if (event.pointerType === 'touch') return;
      const source = event.target.closest('.zoom-source');
      if (!source || !group.contains(source)) {
        group.classList.remove('is-zooming');
        return;
      }

      const bounds = source.getBoundingClientRect();
      const x = Math.min(100, Math.max(0, ((event.clientX - bounds.left) / bounds.width) * 100));
      const y = Math.min(100, Math.max(0, ((event.clientY - bounds.top) / bounds.height) * 100));

      sources.forEach((item) => {
        item.style.setProperty('--zoom-x', `${x}%`);
        item.style.setProperty('--zoom-y', `${y}%`);
      });
      group.classList.add('is-zooming');
    });

    group.addEventListener('pointerleave', () => group.classList.remove('is-zooming'));
  });
});
