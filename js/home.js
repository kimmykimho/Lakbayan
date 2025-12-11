// Home Page JavaScript

let currentSlide = 0;
const slides = document.querySelectorAll('.carousel-slide');
const totalSlides = slides.length;
let autoplayInterval;

// Initialize carousel
function initCarousel() {
    createDots();
    startAutoplay();
}

// Create carousel dots
function createDots() {
    const dotsContainer = document.getElementById('carouselDots');
    if (!dotsContainer) return;
    
    for (let i = 0; i < totalSlides; i++) {
        const dot = document.createElement('div');
        dot.className = 'carousel-dot';
        if (i === 0) dot.classList.add('active');
        dot.onclick = () => goToSlide(i);
        dotsContainer.appendChild(dot);
    }
}

// Go to specific slide
function goToSlide(index) {
    // Remove active class from current slide
    slides[currentSlide].classList.remove('active');
    const dots = document.querySelectorAll('.carousel-dot');
    if (dots.length > 0) {
        dots[currentSlide].classList.remove('active');
    }
    
    // Update current slide
    currentSlide = index;
    if (currentSlide >= totalSlides) currentSlide = 0;
    if (currentSlide < 0) currentSlide = totalSlides - 1;
    
    // Add active class to new slide
    slides[currentSlide].classList.add('active');
    if (dots.length > 0) {
        dots[currentSlide].classList.add('active');
    }
    
    // Reset autoplay
    stopAutoplay();
    startAutoplay();
}

// Next slide
function nextSlide() {
    goToSlide(currentSlide + 1);
}

// Previous slide
function prevSlide() {
    goToSlide(currentSlide - 1);
}

// Autoplay
function startAutoplay() {
    autoplayInterval = setInterval(() => {
        nextSlide();
    }, 5000); // Change slide every 5 seconds
}

function stopAutoplay() {
    if (autoplayInterval) {
        clearInterval(autoplayInterval);
    }
}

// Keyboard navigation
document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') prevSlide();
    if (e.key === 'ArrowRight') nextSlide();
});

// Touch/Swipe support for mobile
let touchStartX = 0;
let touchEndX = 0;

const carousel = document.getElementById('heroCarousel');
if (carousel) {
    carousel.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
    }, false);

    carousel.addEventListener('touchend', (e) => {
        touchEndX = e.changedTouches[0].screenX;
        handleSwipe();
    }, false);
}

function handleSwipe() {
    if (touchEndX < touchStartX - 50) {
        nextSlide(); // Swipe left
    }
    if (touchEndX > touchStartX + 50) {
        prevSlide(); // Swipe right
    }
}

// Pause autoplay on hover
if (carousel) {
    carousel.addEventListener('mouseenter', stopAutoplay);
    carousel.addEventListener('mouseleave', startAutoplay);
}

// Initialize when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCarousel);
} else {
    initCarousel();
}

// Simulate real-time visitor updates
function updateVisitorCounts() {
    const visitorCounts = document.querySelectorAll('.visitor-count');
    visitorCounts.forEach(count => {
        const currentNum = parseInt(count.textContent.match(/\d+/)[0]);
        const variation = Math.floor(Math.random() * 5) - 2; // -2 to +2
        const newNum = Math.max(0, currentNum + variation);
        count.innerHTML = `<i class="fas fa-users"></i> ${newNum} people are here`;
    });
}

// Update visitor counts every 30 seconds
setInterval(updateVisitorCounts, 30000);

// Animate progress bars on scroll
const observerOptions = {
    threshold: 0.5,
    rootMargin: '0px 0px -100px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const progressFills = entry.target.querySelectorAll('.progress-fill');
            progressFills.forEach(fill => {
                const width = fill.style.width;
                fill.style.width = '0%';
                setTimeout(() => {
                    fill.style.width = width;
                }, 100);
            });
        }
    });
}, observerOptions);

const placesSection = document.querySelector('.most-visited-section');
if (placesSection) {
    observer.observe(placesSection);
}


