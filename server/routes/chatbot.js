const express = require('express');
const router = express.Router();
const { queryAll } = require('../config/neon');
const { protect } = require('../middleware/auth');

// @route   POST /api/chatbot/message
// @desc    Handle chatbot message
// @access  Public
router.post('/message', async (req, res) => {
  try {
    const { message } = req.body;
    const lowerMessage = message.toLowerCase();

    // Simple keyword-based responses
    let response = '';
    let suggestions = [];

    if (lowerMessage.includes('hello') || lowerMessage.includes('hi')) {
      response = 'Hello! Welcome to Lakbayan. How can I help you today?';
      suggestions = ['Show me places', 'Transportation options', 'How to book'];
    } else if (lowerMessage.includes('place') || lowerMessage.includes('visit')) {
      const places = await queryAll("SELECT name, category FROM places WHERE status = 'active' LIMIT 5");
      response = `Here are some places you can visit: ${places.map(p => p.name).join(', ')}`;
      suggestions = ['Tell me more about a place', 'How to get there'];
    } else if (lowerMessage.includes('transport') || lowerMessage.includes('ride')) {
      response = 'We offer various transport options including tricycles, motorcycles, and vans. You can book transport when making a reservation.';
      suggestions = ['Book a ride', 'Transport prices'];
    } else if (lowerMessage.includes('book') || lowerMessage.includes('reservation')) {
      response = 'To make a booking, select a place and click "Book Now". You can specify the date, time, and number of visitors.';
      suggestions = ['Show me places', 'My bookings'];
    } else if (lowerMessage.includes('price') || lowerMessage.includes('cost') || lowerMessage.includes('fee')) {
      response = 'Entry fees vary by location. Some places are free while others may charge a small fee. Check the place details for specific pricing.';
      suggestions = ['Free places', 'Show me places'];
    } else {
      response = "I'm here to help you explore Lakbayan sa Kitcharao! You can ask me about places to visit, transportation, or how to make bookings.";
      suggestions = ['Show me places', 'Transportation options', 'How to book'];
    }

    res.json({
      success: true,
      data: {
        message: response,
        suggestions
      }
    });
  } catch (error) {
    console.error('Chatbot error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/chatbot/suggestions
// @desc    Get chatbot suggestions
// @access  Public
router.get('/suggestions', async (req, res) => {
  try {
    res.json({
      success: true,
      data: [
        'What places can I visit?',
        'How do I book a trip?',
        'What transport options are available?',
        'Tell me about Kitcharao'
      ]
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
