// Places Page JavaScript

// Place data
const placesData = {
    manlangit: {
        title: "Manlangit Nature's Park",
        rating: 8.9,
        visitors: "150 today",
        image: "images/places/manlangit-nature-park/main.jpg",
        description: "Manlangit Nature Park is one of the most beautiful view deck in Buenavista, Agusan del Norte, Philippines. Experience breathtaking panoramic views and cool mountain breeze.",
        highlights: ["Great variety of snacks", "Welcoming atmosphere", "Quick service"],
        activities: ["Snack Tasting", "Coffee Break", "Pasalubong Shopping"]
    },
    masao: {
        title: "Masao Public Beach",
        rating: 8.5,
        visitors: "180 today",
        image: "images/places/masao-public-beach/main.jpg",
        description: "Popular local beach perfect for family gatherings and weekend relaxation. Enjoy the sun, sand, and sea with your loved ones.",
        highlights: ["Family-friendly", "Clean facilities", "Beautiful sunset views"],
        activities: ["Swimming", "Beach Volleyball", "Picnic", "Photography"]
    },
    plaza: {
        title: "Buenavista Municipal Plaza",
        rating: 8.9,
        visitors: "250 today",
        image: "images/places/municipal-plaza/main.jpg",
        description: "The heart of our community featuring the historic town plaza and St. Joseph Parish Church. A perfect blend of history, culture, and community life.",
        highlights: ["Historic landmark", "Cultural hub", "Community events"],
        activities: ["Sightseeing", "Photography", "Cultural Tours", "Evening Walks"]
    },
    andis: {
        title: "Andi's SnackBreak Delight",
        rating: 9,
        visitors: "90 today",
        image: "images/places/andis-snackbreak/main.jpg",
        description: "Charming local snack spot in Buenavista, Agusan, serving a variety of Filipino treats and beverages. A must-visit for food lovers!",
        highlights: ["Authentic Filipino snacks", "Cozy atmosphere", "Affordable prices"],
        activities: ["Snack Tasting", "Coffee Break", "Pasalubong Shopping"]
    }
};

// Scroll suggestions carousel
function scrollSuggestions(direction) {
    const container = document.getElementById('suggestionsContainer');
    const scrollAmount = 345; // card width + gap
    
    if (container) {
        container.scrollBy({
            left: direction * scrollAmount,
            behavior: 'smooth'
        });
    }
}

// Open place modal
function openPlaceModal(placeId) {
    const place = placesData[placeId];
    if (!place) return;

    const modal = document.getElementById('placeModal');
    
    // Populate modal
    document.getElementById('modalTitle').textContent = place.title;
    document.getElementById('modalRating').textContent = place.rating;
    document.getElementById('modalVisitors').textContent = place.visitors;
    document.getElementById('modalImage').src = place.image;
    document.getElementById('modalImage').alt = place.title;
    document.getElementById('modalDescription').textContent = place.description;

    // Populate highlights
    const highlightsContainer = document.getElementById('modalHighlights');
    highlightsContainer.innerHTML = '';
    place.highlights.forEach(highlight => {
        const tag = document.createElement('span');
        tag.className = 'highlight-tag';
        tag.textContent = highlight;
        highlightsContainer.appendChild(tag);
    });

    // Populate activities
    const activitiesContainer = document.getElementById('modalActivities');
    activitiesContainer.innerHTML = '';
    place.activities.forEach(activity => {
        const tag = document.createElement('span');
        tag.className = 'activity-tag';
        tag.textContent = activity;
        activitiesContainer.appendChild(tag);
    });

    // Show modal
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

// Close place modal
function closePlaceModal() {
    const modal = document.getElementById('placeModal');
    modal.classList.remove('active');
    document.body.style.overflow = 'auto';
}

// Close modal when clicking outside
document.getElementById('placeModal')?.addEventListener('click', function(e) {
    if (e.target === this) {
        closePlaceModal();
    }
});

// Close modal with Escape key
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closePlaceModal();
    }
});

// Book visit
function bookVisit() {
    const title = document.getElementById('modalTitle').textContent;
    showNotification(`Booking request for ${title} submitted!`, 'success');
    closePlaceModal();
    
    // In a real app, this would make an API call
    setTimeout(() => {
        showNotification('Tourism office will contact you shortly', 'info');
    }, 2000);
}

// Find transport
function findTransport() {
    closePlaceModal();
    window.location.href = 'transport.html';
}

// Show/hide suggestions based on URL parameter
function checkSuggestionsParam() {
    const urlParams = new URLSearchParams(window.location.search);
    const showSuggestions = urlParams.get('suggestions');
    
    if (showSuggestions === 'true') {
        const suggestionsSection = document.getElementById('aiSuggestions');
        if (suggestionsSection) {
            suggestionsSection.scrollIntoView({ behavior: 'smooth' });
        }
    }
}

// Check for place parameter and open modal
function checkPlaceParam() {
    const urlParams = new URLSearchParams(window.location.search);
    const placeId = urlParams.get('place');
    
    if (placeId && placesData[placeId]) {
        setTimeout(() => {
            openPlaceModal(placeId);
        }, 500);
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    checkSuggestionsParam();
    checkPlaceParam();
});

// Touch scroll for suggestions on mobile
let isDown = false;
let startX;
let scrollLeft;

const suggestionsContainer = document.getElementById('suggestionsContainer');

if (suggestionsContainer) {
    suggestionsContainer.addEventListener('mousedown', (e) => {
        isDown = true;
        startX = e.pageX - suggestionsContainer.offsetLeft;
        scrollLeft = suggestionsContainer.scrollLeft;
    });

    suggestionsContainer.addEventListener('mouseleave', () => {
        isDown = false;
    });

    suggestionsContainer.addEventListener('mouseup', () => {
        isDown = false;
    });

    suggestionsContainer.addEventListener('mousemove', (e) => {
        if (!isDown) return;
        e.preventDefault();
        const x = e.pageX - suggestionsContainer.offsetLeft;
        const walk = (x - startX) * 2;
        suggestionsContainer.scrollLeft = scrollLeft - walk;
    });
}


