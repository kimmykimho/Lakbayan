const express = require('express');
const router = express.Router();
const { GoogleGenAI } = require('@google/genai');
const { supabaseAdmin } = require('../config/supabase');

// Initialize Gemini AI - API key is picked up from GEMINI_API_KEY env variable
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY
});

// Base system prompt
const KITCHARAO_SYSTEM_PROMPT = `You are a helpful tourism assistant specifically for Kitcharao, Agusan del Norte, Philippines. Your name is "Lakbayan Assistant".

IMPORTANT CONTEXT:
- You ONLY provide information about Kitcharao, Agusan del Norte
- This is a tourism platform called "Lakbayan sa Kitcharao" for Kitcharao tourism
- Users can book places to visit, request transportation, and explore tourist destinations
- All information should be accurate and specific to Kitcharao municipality

KITCHARAO BARANGAYS (11 total):
Bangayan, Canaway, Crossing, Hinimbangan, Jaliobong, Mahayahay, Poblacion, San Isidro, San Roque, Sangay, Songkoy

YOUR CAPABILITIES:
1. Provide information about Kitcharao tourist attractions, places to visit, and activities
2. Help with booking places through the platform
3. Assist with transportation requests (motorcycle, car, van, tricycle, jeepney)
4. Answer questions about Kitcharao's culture, history, and local attractions
5. Guide users on how to use the Lakbayan sa Kitcharao platform features
6. Answer questions about specific places, their ratings, visitors, and details
7. Tell users about upcoming events and achievements in Kitcharao
8. Recommend places based on category (food, accommodation, nature, shopping, etc.)

RESPONSE FORMATTING RULES (VERY IMPORTANT):
- DO NOT use markdown formatting like asterisks (*), bold (**), or bullet points (-)
- DO NOT use numbered lists with periods (1. 2. 3.)
- Write in clean, flowing paragraphs with proper sentences
- Use emojis sparingly at the start of paragraphs for visual appeal
- Separate different topics with line breaks
- Keep responses conversational and easy to read
- Maximum 3-4 short paragraphs per response

RESPONSE STYLE:
- Be warm, friendly, and professional
- Always mention "Kitcharao" when referring to locations
- Keep responses concise but helpful
- If asked about places outside Kitcharao, politely redirect to Kitcharao attractions
- When asked about specific places, use the REAL DATA provided below
- When recommending, prioritize places with higher ratings and visitors

Remember: You are ONLY for Kitcharao, Agusan del Norte tourism. Keep responses clean without any markdown symbols.`;

// Function to fetch platform data for AI context
async function fetchPlatformData() {
  try {
    // Fetch places with details
    const { data: places } = await supabaseAdmin
      .from('places')
      .select('name, description, category, location, rating, visitors, featured, status')
      .eq('status', 'active')
      .order('visitors->total', { ascending: false })
      .limit(20);

    // Fetch about items (events, achievements, heritage, etc.)
    const { data: aboutItems } = await supabaseAdmin
      .from('about_items')
      .select('title, description, category, event_date')
      .order('created_at', { ascending: false })
      .limit(15);

    // Fetch some stats
    const { count: totalPlaces } = await supabaseAdmin
      .from('places')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active');

    const { count: totalUsers } = await supabaseAdmin
      .from('users')
      .select('*', { count: 'exact', head: true });

    return { places, aboutItems, stats: { totalPlaces, totalUsers } };
  } catch (error) {
    console.error('Error fetching platform data for chatbot:', error);
    return { places: [], aboutItems: [], stats: {} };
  }
}

// Format platform data for AI context
function formatDataContext(data) {
  let context = '\n\n=== REAL-TIME PLATFORM DATA ===\n';

  // Stats
  context += `\nPLATFORM STATISTICS:\n`;
  context += `Total Active Places: ${data.stats.totalPlaces || 0}\n`;
  context += `Total Registered Users: ${data.stats.totalUsers || 0}\n`;

  // Places
  if (data.places && data.places.length > 0) {
    context += `\nLISTED PLACES IN KITCHARAO (sorted by popularity):\n`;
    data.places.forEach((place, i) => {
      const rating = place.rating?.average || 0;
      const visitors = place.visitors?.total || 0;
      context += `${i + 1}. ${place.name} - Category: ${place.category || 'General'}, Rating: ${rating}/5, Visitors: ${visitors}, Location: ${place.location || 'Kitcharao'}`;
      if (place.featured) context += ' [FEATURED]';
      context += `\n   Description: ${place.description?.substring(0, 100) || 'No description'}...\n`;
    });
  }

  // Events and Achievements
  if (data.aboutItems && data.aboutItems.length > 0) {
    const events = data.aboutItems.filter(item => item.category === 'events');
    const achievements = data.aboutItems.filter(item => item.category === 'achievements');
    const heritage = data.aboutItems.filter(item => ['heritage', 'culture', 'history'].includes(item.category));

    if (events.length > 0) {
      context += `\nUPCOMING EVENTS:\n`;
      events.forEach(event => {
        const date = event.event_date?.start ? new Date(event.event_date.start).toLocaleDateString() : 'TBA';
        context += `- ${event.title} (Date: ${date}): ${event.description?.substring(0, 80) || ''}...\n`;
      });
    }

    if (achievements.length > 0) {
      context += `\nKITCHARAO ACHIEVEMENTS:\n`;
      achievements.forEach(ach => {
        context += `- ${ach.title}: ${ach.description?.substring(0, 80) || ''}...\n`;
      });
    }

    if (heritage.length > 0) {
      context += `\nHERITAGE & CULTURE:\n`;
      heritage.forEach(item => {
        context += `- ${item.title}: ${item.description?.substring(0, 80) || ''}...\n`;
      });
    }
  }

  context += '\n=== END OF PLATFORM DATA ===\n';
  context += '\nUse this real data when answering user questions about places, events, achievements, or statistics. Always refer to actual place names and details from this data.\n';

  return context;
}

// @route   POST /api/chatbot
// @desc    Chat with Kitcharao Tourism Assistant (with real data)
// @access  Public
router.post('/', async (req, res) => {
  let lastError = null;

  try {
    const { message, conversationHistory = [] } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Message is required'
      });
    }

    // Fetch real platform data
    const platformData = await fetchPlatformData();
    const dataContext = formatDataContext(platformData);

    // Build conversation context with real data
    let conversationContext = KITCHARAO_SYSTEM_PROMPT + dataContext + '\n\n';

    // Add recent conversation history for context
    if (conversationHistory.length > 0) {
      conversationContext += 'Previous conversation:\n';
      conversationHistory.slice(-5).forEach(msg => {
        const role = msg.role === 'user' ? 'User' : 'Assistant';
        conversationContext += `${role}: ${msg.content}\n`;
      });
      conversationContext += '\n';
    }

    conversationContext += `User: ${message}\nAssistant:`;

    // Try models in order of preference
    const modelsToTry = [
      'gemini-2.5-flash',
      'gemini-1.5-flash',
      'gemini-1.5-pro'
    ];

    let response;

    for (const modelName of modelsToTry) {
      try {
        console.log(`Trying model: ${modelName}`);

        const result = await ai.models.generateContent({
          model: modelName,
          contents: conversationContext
        });

        response = result.text;

        if (!response) {
          throw new Error('No response text found in API result');
        }
        console.log(`✅ Successfully used model: ${modelName}`);
        break;
      } catch (error) {
        console.log(`❌ Model ${modelName} failed:`, error.message);
        lastError = error;
        continue;
      }
    }

    if (!response) {
      throw new Error(`All Gemini models failed. Last error: ${lastError?.message || 'Unknown error'}`);
    }

    // Filter response to ensure it's Kitcharao-focused
    const filteredResponse = filterKitcharaoResponse(response, message);

    res.json({
      success: true,
      response: filteredResponse
    });
  } catch (error) {
    console.error('Chatbot error:', error);

    if (error.message?.includes('API_KEY') || error.status === 401) {
      return res.status(500).json({
        success: false,
        message: 'Chatbot service configuration error. Please contact support.'
      });
    }

    if (error.status === 429 || error.status === 402 ||
      error.message?.includes('quota') ||
      error.message?.includes('billing') ||
      error.message?.includes('rate limit')) {
      return res.status(500).json({
        success: false,
        message: "I've reached my free tier limit for today. But I can still help! Visit our Places page to discover amazing Kitcharao destinations, or check the Transport page to book a ride."
      });
    }

    const fallbackResponses = [
      "I'm having trouble connecting right now, but I can tell you about Kitcharao! It's a beautiful municipality in Agusan del Norte with amazing tourist attractions. Check out our Places page to discover all destinations!",
      "I'm experiencing a technical issue, but you can still explore! Visit our Places page to see all the amazing tourist spots in Kitcharao.",
      "Sorry for the inconvenience! Browse our platform to discover Kitcharao's attractions in the Places section."
    ];

    const randomFallback = fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];

    res.status(500).json({
      success: false,
      message: randomFallback
    });
  }
});

// Helper function to filter and ensure Kitcharao-focused responses
function filterKitcharaoResponse(response, userMessage) {
  const nonKitcharaoKeywords = [
    'manila', 'cebu', 'davao', 'baguio', 'boracay', 'palawan',
    'siargao', 'bohol', 'iloilo', 'bacolod', 'batanes', 'buenavista'
  ];

  const userMessageLower = userMessage.toLowerCase();
  const mentionsNonKitcharao = nonKitcharaoKeywords.some(keyword =>
    userMessageLower.includes(keyword)
  );

  if (mentionsNonKitcharao) {
    return `I'm specialized in providing information about Kitcharao, Agusan del Norte only. While that's a wonderful destination, I can help you discover amazing places right here in Kitcharao! Would you like to explore our local attractions?`;
  }

  if (response.toLowerCase().includes('place') || response.toLowerCase().includes('visit') || response.toLowerCase().includes('tourist')) {
    if (!response.toLowerCase().includes('kitcharao') && !response.toLowerCase().includes('agusan')) {
      return response + '\n\n💡 All these attractions are located in Kitcharao, Agusan del Norte!';
    }
  }

  return response;
}

module.exports = router;

