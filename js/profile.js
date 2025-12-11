// Profile Page JavaScript

// Show tab
function showTab(tabName) {
    // Hide all tab panes
    const tabPanes = document.querySelectorAll('.tab-pane');
    tabPanes.forEach(pane => pane.classList.remove('active'));
    
    // Remove active class from all tabs
    const tabs = document.querySelectorAll('.profile-tab');
    tabs.forEach(tab => tab.classList.remove('active'));
    
    // Show selected tab pane
    const selectedPane = document.getElementById(tabName);
    if (selectedPane) {
        selectedPane.classList.add('active');
    }
    
    // Add active class to clicked tab
    event.target.classList.add('active');
}

// Toggle favorite
function toggleFavorite(button) {
    button.classList.toggle('active');
    const isActive = button.classList.contains('active');
    
    if (isActive) {
        showNotification('Added to favorites', 'success');
    } else {
        showNotification('Removed from favorites', 'info');
    }
}

// Save settings
function saveSettings(event) {
    event.preventDefault();
    
    showNotification('Saving changes...', 'info');
    
    // Simulate API call
    setTimeout(() => {
        showNotification('Settings saved successfully!', 'success');
    }, 1000);
}

// Edit avatar
document.querySelector('.edit-avatar')?.addEventListener('click', function() {
    // In a real app, this would open a file picker
    showNotification('Avatar upload feature coming soon!', 'info');
});

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    // Add click handlers to booking cards
    const bookingCards = document.querySelectorAll('.booking-card');
    bookingCards.forEach(card => {
        card.style.cursor = 'pointer';
        card.addEventListener('click', function(e) {
            if (!e.target.closest('button')) {
                const placeName = this.querySelector('h3').textContent;
                showNotification(`Viewing booking details for ${placeName}`, 'info');
            }
        });
    });
    
    // Add click handlers to review cards
    const reviewCards = document.querySelectorAll('.review-card');
    reviewCards.forEach(card => {
        const editBtn = card.querySelector('.btn');
        if (editBtn) {
            editBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                const placeName = card.querySelector('h3').textContent;
                showNotification(`Edit review for ${placeName}`, 'info');
            });
        }
    });
    
    // Add click handlers to favorite cards
    const favoriteCards = document.querySelectorAll('.favorite-card');
    favoriteCards.forEach(card => {
        card.addEventListener('click', function(e) {
            if (!e.target.closest('.favorite-btn')) {
                const placeName = this.querySelector('h3').textContent;
                const placeType = this.querySelector('p').textContent;
                window.location.href = `places.html?place=${encodeURIComponent(placeName.toLowerCase().replace(/['\s]+/g, '-'))}`;
            }
        });
    });
});


