// Transport Page JavaScript

// Set minimum date to today
document.addEventListener('DOMContentLoaded', function() {
    const dateInput = document.getElementById('date');
    if (dateInput) {
        const today = new Date().toISOString().split('T')[0];
        dateInput.setAttribute('min', today);
        dateInput.value = today;
    }
    
    // Set default time
    const timeInput = document.getElementById('time');
    if (timeInput) {
        const now = new Date();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        timeInput.value = `${hours}:${minutes}`;
    }
});

// Book transport
function bookTransport(event) {
    event.preventDefault();
    
    const pickup = document.getElementById('pickup').value;
    const destination = document.getElementById('destination').value;
    const transportType = document.getElementById('transportType').value;
    const date = document.getElementById('date').value;
    const time = document.getElementById('time').value;
    const passengers = document.getElementById('passengers').value;
    
    // Validate
    if (!pickup || !destination || !transportType) {
        showNotification('Please fill in all required fields', 'error');
        return;
    }
    
    if (pickup === destination) {
        showNotification('Pickup and destination cannot be the same', 'error');
        return;
    }
    
    // Format the booking info
    const pickupName = document.querySelector(`#pickup option[value="${pickup}"]`).textContent;
    const destName = document.querySelector(`#destination option[value="${destination}"]`).textContent;
    const transportName = document.querySelector(`#transportType option[value="${transportType}"]`).textContent;
    
    // Simulate booking
    showNotification('Processing your booking...', 'info');
    
    setTimeout(() => {
        showNotification('Booking confirmed!', 'success');
        
        setTimeout(() => {
            const confirmation = `
                Booking Details:
                From: ${pickupName}
                To: ${destName}
                Transport: ${transportName}
                Date: ${formatDate(date)}
                Time: ${time}
                Passengers: ${passengers}
                
                A driver will contact you shortly!
            `;
            
            alert(confirmation);
            
            // Reset form
            event.target.reset();
            
            // Reset date and time to defaults
            const today = new Date().toISOString().split('T')[0];
            document.getElementById('date').value = today;
            
            const now = new Date();
            const hours = String(now.getHours()).padStart(2, '0');
            const minutes = String(now.getMinutes()).padStart(2, '0');
            document.getElementById('time').value = `${hours}:${minutes}`;
        }, 1500);
    }, 1000);
}

// Format date for display
function formatDate(dateString) {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('en-US', options);
}

// Estimate fare (simple calculation)
function estimateFare(transportType, distance) {
    const baseRates = {
        tricycle: { base: 20, perKm: 10 },
        multicab: { base: 10, perKm: 5 },
        van: { base: 500, perKm: 50 },
        habal: { base: 30, perKm: 15 }
    };
    
    const rate = baseRates[transportType];
    if (!rate) return null;
    
    return rate.base + (distance * rate.perKm);
}

// Show fare estimate when transport type changes
const transportSelect = document.getElementById('transportType');
if (transportSelect) {
    transportSelect.addEventListener('change', function() {
        const transportType = this.value;
        if (transportType) {
            // In a real app, would calculate based on actual route
            const estimatedDistance = 5; // km
            const fare = estimateFare(transportType, estimatedDistance);
            
            if (fare) {
                showNotification(`Estimated fare: ₱${fare.toFixed(2)}`, 'info');
            }
        }
    });
}


