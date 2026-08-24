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
    document.querySelectorAll('[data-carousel]').forEach(initializeCarousel);
});
