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
    video.removeAttribute('controls');
    video.setAttribute('autoplay', '');
    video.setAttribute('loop', '');
    video.setAttribute('muted', '');
    video.setAttribute('playsinline', '');

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

    viewport.addEventListener('pointerdown', (event) => {
        if (scale <= minimumScale || event.button !== 0 || event.target.closest('.video-zoom-controls')) return;
        const bounds = viewport.getBoundingClientRect();
        if (event.clientY > bounds.bottom - 64) return;
        activePointer = event.pointerId;
        pointerOriginX = event.clientX;
        pointerOriginY = event.clientY;
        dragOriginX = translateX;
        dragOriginY = translateY;
        viewport.classList.add('is-dragging');
        viewport.setPointerCapture(event.pointerId);
        event.preventDefault();
    });

    viewport.addEventListener('pointermove', (event) => {
        if (event.pointerId !== activePointer) return;
        translateX = dragOriginX + event.clientX - pointerOriginX;
        translateY = dragOriginY + event.clientY - pointerOriginY;
        render();
        event.preventDefault();
    });

    function endDrag(event) {
        if (event.pointerId !== activePointer) return;
        if (viewport.hasPointerCapture(event.pointerId)) viewport.releasePointerCapture(event.pointerId);
        activePointer = null;
        viewport.classList.remove('is-dragging');
    }

    viewport.addEventListener('pointerup', endDrag);
    viewport.addEventListener('pointercancel', endDrag);

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
