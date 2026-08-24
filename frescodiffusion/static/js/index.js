window.HELP_IMPROVE_VIDEOJS = false;

// More Works Dropdown Functionality
function toggleMoreWorks() {
    const dropdown = document.getElementById('moreWorksDropdown');
    const button = document.querySelector('.more-works-btn');

    if (dropdown.classList.contains('show')) {
        dropdown.classList.remove('show');
        button.classList.remove('active');
    } else {
        dropdown.classList.add('show');
        button.classList.add('active');
    }
}

// Close dropdown when clicking outside
document.addEventListener('click', function(event) {
    const container = document.querySelector('.more-works-container');
    const dropdown = document.getElementById('moreWorksDropdown');
    const button = document.querySelector('.more-works-btn');

    if (container && !container.contains(event.target)) {
        dropdown.classList.remove('show');
        button.classList.remove('active');
    }
});

// Close dropdown on escape key
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        const dropdown = document.getElementById('moreWorksDropdown');
        const button = document.querySelector('.more-works-btn');
        dropdown.classList.remove('show');
        button.classList.remove('active');
    }
});

// Copy BibTeX to clipboard
function copyBibTeX() {
    const bibtexElement = document.getElementById('bibtex-code');
    const button = document.querySelector('.copy-bibtex-btn');
    const copyText = button.querySelector('.copy-text');

    if (bibtexElement) {
        navigator.clipboard.writeText(bibtexElement.textContent).then(function() {
            // Success feedback
            button.classList.add('copied');
            copyText.textContent = 'Copied';

            setTimeout(function() {
                button.classList.remove('copied');
                copyText.textContent = 'Copy';
            }, 2000);
        }).catch(function(err) {
            console.error('Failed to copy: ', err);
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = bibtexElement.textContent;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);

            button.classList.add('copied');
            copyText.textContent = 'Copied';
            setTimeout(function() {
                button.classList.remove('copied');
                copyText.textContent = 'Copy';
            }, 2000);
        });
    }
}

// Scroll to top functionality
function scrollToTop() {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
}

// Show/hide scroll to top button
window.addEventListener('scroll', function() {
    const scrollButton = document.querySelector('.scroll-to-top');
    if (window.pageYOffset > 300) {
        scrollButton.classList.add('visible');
    } else {
        scrollButton.classList.remove('visible');
    }
});

function playVideo(video) {
    const playPromise = video.play();
    if (playPromise) {
        playPromise.catch(() => {
            // Muted autoplay can still be blocked by user or browser preferences.
        });
    }
}

function initializeInteractiveVideo(video) {
    video.autoplay = true;
    video.loop = true;
    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;
    video.setAttribute('autoplay', '');
    video.setAttribute('loop', '');
    video.setAttribute('muted', '');
    video.setAttribute('playsinline', '');

    const canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    if (!canHover) {
        video.controls = true;
        return;
    }

    video.removeAttribute('controls');

    const revealControls = () => {
        video.controls = true;
    };
    const concealControls = () => {
        video.controls = false;
    };

    video.addEventListener('pointerenter', revealControls);
    video.addEventListener('pointerleave', concealControls);
    video.addEventListener('focus', revealControls);
    video.addEventListener('blur', concealControls);
}

function initializeVideoPanZoom(viewport) {
    const video = viewport.querySelector('video');
    const dragSurface = viewport.querySelector('[data-video-drag-surface]');
    const zoomInButton = viewport.querySelector('[data-video-zoom-in]');
    const zoomOutButton = viewport.querySelector('[data-video-zoom-out]');
    const resetButton = viewport.querySelector('[data-video-zoom-reset]');
    const status = viewport.querySelector('[data-video-zoom-status]');
    const minimumScale = 1;
    const maximumScale = 4;
    let scale = minimumScale;
    let translateX = 0;
    let translateY = 0;
    let activePointer = null;
    let dragOriginX = 0;
    let dragOriginY = 0;
    let pointerOriginX = 0;
    let pointerOriginY = 0;
    let touchGesture = null;

    function clampTranslation() {
        const maximumX = viewport.clientWidth * (scale - 1) / 2;
        const maximumY = viewport.clientHeight * (scale - 1) / 2;
        translateX = Math.max(-maximumX, Math.min(maximumX, translateX));
        translateY = Math.max(-maximumY, Math.min(maximumY, translateY));
    }

    function render() {
        clampTranslation();
        video.style.transform = `translate3d(${translateX}px, ${translateY}px, 0) scale(${scale})`;
        viewport.classList.toggle('is-zoomed', scale > minimumScale);
        viewport.dataset.zoom = scale.toFixed(2);
        viewport.dataset.panX = Math.round(translateX);
        viewport.dataset.panY = Math.round(translateY);
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
        } else if (previousScale > 0) {
            const scaleRatio = scale / previousScale;
            translateX *= scaleRatio;
            translateY *= scaleRatio;
        }
        render();
    }

    function resetView() {
        scale = minimumScale;
        translateX = 0;
        translateY = 0;
        render();
    }

    function panBy(deltaX, deltaY) {
        if (scale <= minimumScale) return;
        translateX += deltaX;
        translateY += deltaY;
        render();
    }

    const touchDistance = (first, second) => Math.hypot(second.clientX - first.clientX, second.clientY - first.clientY);

    const touchMidpoint = (first, second) => ({
        x: (first.clientX + second.clientX) / 2,
        y: (first.clientY + second.clientY) / 2
    });

    function startTouchGesture(event) {
        if (event.target.closest('.video-zoom-controls')) return;
        const bounds = viewport.getBoundingClientRect();
        const touchesNativeControls = event.touches.length === 1 && event.touches[0].clientY >= bounds.bottom - 64;
        if (touchesNativeControls) return;

        if (event.touches.length >= 2) {
            const center = touchMidpoint(event.touches[0], event.touches[1]);
            touchGesture = {
                type: 'pinch',
                distance: Math.max(1, touchDistance(event.touches[0], event.touches[1])),
                scale,
                translateX,
                translateY,
                midpoint: center,
                focusX: center.x - bounds.left - bounds.width / 2,
                focusY: center.y - bounds.top - bounds.height / 2
            };
        } else if (event.touches.length === 1 && scale > minimumScale) {
            touchGesture = {
                type: 'pan',
                x: event.touches[0].clientX,
                y: event.touches[0].clientY,
                translateX,
                translateY
            };
        } else {
            touchGesture = null;
            return;
        }

        viewport.classList.add('is-dragging');
        event.preventDefault();
    }

    zoomInButton.addEventListener('click', () => setScale(scale + 0.5));
    zoomOutButton.addEventListener('click', () => setScale(scale - 0.5));
    resetButton.addEventListener('click', resetView);

    viewport.addEventListener('wheel', (event) => {
        if (event.target.closest('.video-zoom-controls')) return;
        event.preventDefault();
        setScale(scale + (event.deltaY < 0 ? 0.25 : -0.25));
    }, { passive: false });

    viewport.addEventListener('dblclick', (event) => {
        if (event.target.closest('.video-zoom-controls')) return;
        event.preventDefault();
        if (scale > minimumScale) resetView();
        else setScale(2);
    });

    dragSurface.addEventListener('pointerdown', (event) => {
        if (event.pointerType === 'touch' || scale <= minimumScale || event.button !== 0 || event.target.closest('.video-zoom-controls')) return;
        activePointer = event.pointerId;
        pointerOriginX = event.clientX;
        pointerOriginY = event.clientY;
        dragOriginX = translateX;
        dragOriginY = translateY;
        viewport.classList.add('is-dragging');
        try {
            dragSurface.setPointerCapture(event.pointerId);
        } catch {
            // Window-level listeners below keep dragging functional when capture is unavailable.
        }
        event.preventDefault();
    });

    window.addEventListener('pointermove', (event) => {
        if (event.pointerId !== activePointer) return;
        translateX = dragOriginX + event.clientX - pointerOriginX;
        translateY = dragOriginY + event.clientY - pointerOriginY;
        render();
        event.preventDefault();
    });

    function endDrag(event) {
        if (event.pointerId !== activePointer) return;
        if (dragSurface.hasPointerCapture(event.pointerId)) dragSurface.releasePointerCapture(event.pointerId);
        activePointer = null;
        viewport.classList.remove('is-dragging');
    }

    window.addEventListener('pointerup', endDrag);
    window.addEventListener('pointercancel', endDrag);

    viewport.addEventListener('touchstart', startTouchGesture, { passive: false });
    viewport.addEventListener('touchmove', (event) => {
        if (!touchGesture || event.target.closest('.video-zoom-controls')) return;

        if (touchGesture.type === 'pinch' && event.touches.length >= 2) {
            const center = touchMidpoint(event.touches[0], event.touches[1]);
            const nextScale = Math.max(minimumScale, Math.min(maximumScale, touchGesture.scale * touchDistance(event.touches[0], event.touches[1]) / touchGesture.distance));
            const ratio = nextScale / touchGesture.scale;
            scale = nextScale;
            translateX = touchGesture.focusX - ratio * (touchGesture.focusX - touchGesture.translateX) + center.x - touchGesture.midpoint.x;
            translateY = touchGesture.focusY - ratio * (touchGesture.focusY - touchGesture.translateY) + center.y - touchGesture.midpoint.y;
            render();
        } else if (touchGesture.type === 'pan' && event.touches.length === 1) {
            translateX = touchGesture.translateX + event.touches[0].clientX - touchGesture.x;
            translateY = touchGesture.translateY + event.touches[0].clientY - touchGesture.y;
            render();
        }
        event.preventDefault();
    }, { passive: false });

    function endTouchGesture(event) {
        touchGesture = null;
        viewport.classList.remove('is-dragging');
        if (event.touches.length) startTouchGesture(event);
    }

    viewport.addEventListener('touchend', endTouchGesture, { passive: false });
    viewport.addEventListener('touchcancel', endTouchGesture, { passive: false });

    viewport.addEventListener('keydown', (event) => {
        if (event.key === '+' || event.key === '=') setScale(scale + 0.5);
        else if (event.key === '-' || event.key === '_') setScale(scale - 0.5);
        else if (event.key === '0') resetView();
        else if (event.key === 'ArrowLeft') panBy(48, 0);
        else if (event.key === 'ArrowRight') panBy(-48, 0);
        else if (event.key === 'ArrowUp') panBy(0, 48);
        else if (event.key === 'ArrowDown') panBy(0, -48);
        else return;
        event.preventDefault();
    });

    window.addEventListener('resize', render, { passive: true });
    render();
}

function initializeCarousel(carousel) {
    const slides = Array.from(carousel.querySelectorAll('[data-carousel-slide]'));
    const previousButton = carousel.querySelector('[data-carousel-prev]');
    const nextButton = carousel.querySelector('[data-carousel-next]');
    const status = carousel.querySelector('[data-carousel-status]');
    let currentIndex = Math.max(0, slides.findIndex((slide) => slide.classList.contains('is-active')));

    function showSlide(nextIndex) {
        currentIndex = (nextIndex + slides.length) % slides.length;
        slides.forEach((slide, index) => {
            const isActive = index === currentIndex;
            slide.classList.toggle('is-active', isActive);
            slide.setAttribute('aria-hidden', String(!isActive));
            slide.querySelectorAll('video').forEach((video) => {
                if (isActive) {
                    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) video.controls = true;
                    playVideo(video);
                } else {
                    video.pause();
                    video.controls = false;
                }
            });
        });
        status.textContent = `${currentIndex + 1} / ${slides.length}`;
    }

    previousButton.addEventListener('click', () => showSlide(currentIndex - 1));
    nextButton.addEventListener('click', () => showSlide(currentIndex + 1));
    carousel.addEventListener('keydown', (event) => {
        if (event.key === 'ArrowLeft') {
            event.preventDefault();
            showSlide(currentIndex - 1);
        }
        if (event.key === 'ArrowRight') {
            event.preventDefault();
            showSlide(currentIndex + 1);
        }
    });

    showSlide(currentIndex);
}

document.addEventListener('DOMContentLoaded', function() {
    document.querySelectorAll('video').forEach(initializeInteractiveVideo);
    document.querySelectorAll('[data-video-panzoom]').forEach(initializeVideoPanZoom);
    document.querySelectorAll('[data-carousel]').forEach(initializeCarousel);
    document.querySelectorAll('video').forEach((video) => {
        if (!video.closest('[data-carousel]')) {
            playVideo(video);
        }
    });
});
