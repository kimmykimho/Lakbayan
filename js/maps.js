// Maps Page JavaScript

// Initialize map
let map;
let markers = [];

// Places data with coordinates
const mapPlaces = [
    {
        id: 'manlangit',
        name: "Manlangit Nature's Park",
        lat: 8.9697,
        lng: 125.4286,
        distance: '6.8 miles away',
        image: 'images/places/manlangit-nature-park/main.jpg',
        description: 'One of the most beautiful view deck in Buenavista with breathtaking panoramic views.'
    },
    {
        id: 'plaza',
        name: 'Buenavista Municipal Plaza',
        lat: 8.9708,
        lng: 125.4297,
        distance: '240m away',
        image: 'images/places/municipal-plaza/main.jpg',
        description: 'The heart of our community featuring the historic town plaza and St. Joseph Parish Church.'
    },
    {
        id: 'masao',
        name: 'Masao Public Beach',
        lat: 8.9735,
        lng: 125.4310,
        distance: '3.2 miles away',
        image: 'images/places/masao-public-beach/main.jpg',
        description: 'Popular local beach perfect for family gatherings and weekend relaxation.'
    },
    {
        id: 'andis',
        name: "Andi's SnackBreak Delight",
        lat: 8.9715,
        lng: 125.4300,
        distance: '240m away',
        image: 'images/places/andis-snackbreak/main.jpg',
        description: 'Charming local snack spot serving a variety of Filipino treats and beverages.'
    }
];

function initMap() {
    // Center of Buenavista
    const center = [8.9708, 125.4297];
    
    // Create map
    map = L.map('map').setView(center, 14);
    
    // Add tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);
    
    // Add markers for each place
    mapPlaces.forEach(place => {
        const marker = L.marker([place.lat, place.lng])
            .addTo(map)
            .bindPopup(`<b>${place.name}</b><br>${place.distance}`)
            .on('click', () => showPlaceCard(place));
        
        markers.push({...place, marker});
    });
    
    // Add user location marker
    const userMarker = L.marker(center, {
        icon: L.divIcon({
            className: 'user-location-marker',
            html: '<div style="background: #2d7d4e; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>',
            iconSize: [20, 20]
        })
    }).addTo(map).bindPopup('<b>You are here</b>');
}

// Show place card
function showPlaceCard(place) {
    const card = document.getElementById('placeInfoCard');
    document.getElementById('cardImage').src = place.image;
    document.getElementById('cardTitle').textContent = place.name;
    document.getElementById('cardDistance').textContent = place.distance;
    document.getElementById('cardDescription').textContent = place.description;
    
    card.classList.add('active');
}

// Close place card
function closePlaceCard() {
    const card = document.getElementById('placeInfoCard');
    card.classList.remove('active');
}

// Filter places
function filterPlaces(category) {
    // Update active tab
    const tabs = document.querySelectorAll('.filter-tab');
    tabs.forEach(tab => tab.classList.remove('active'));
    event.target.classList.add('active');
    
    // In a real app, this would filter markers by category
    showNotification(`Showing ${category} places`, 'info');
}

// Start virtual tour
function startVirtualTour() {
    showNotification('Virtual tour feature coming soon!', 'info');
    // In a real app, this would start an automated tour of all places
}

// Get directions
function getDirections() {
    const placeName = document.getElementById('cardTitle').textContent;
    showNotification(`Opening directions to ${placeName}`, 'success');
    
    // In a real app, this would open navigation
    // Could integrate with Google Maps, Waze, etc.
}

// Search functionality
const searchInput = document.getElementById('searchInput');
if (searchInput) {
    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        
        if (query.length < 2) return;
        
        // Filter markers
        markers.forEach(({name, marker}) => {
            if (name.toLowerCase().includes(query)) {
                marker.setOpacity(1);
            } else {
                marker.setOpacity(0.3);
            }
        });
    });
}

// Initialize map when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMap);
} else {
    initMap();
}


