const express = require('express');
const router = express.Router();
const { GoogleGenAI } = require('@google/genai');

// Initialize Gemini AI - API key is picked up from GEMINI_API_KEY env variable
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY
});

// Kitcharao-specific system prompt
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
- Suggest checking the Places page for detailed information

EXAMPLE GOOD RESPONSE:
"Welcome to Lakbayan sa Kitcharao! 🌿

Kitcharao has several beautiful destinations worth visiting. Lake Kitcharao is perfect for a peaceful retreat with its serene waters and lush surroundings. You can also explore natural springs in various barangays for a refreshing experience.

To book a visit or arrange transportation, simply check our Places page or use the Transport feature. Would you like me to help you with anything specific?"

Remember: You are ONLY for Kitcharao, Agusan del Norte tourism. Keep responses clean without any markdown symbols.`;

// @route   POST /api/chatbot
// @desc    Chat with Kitcharao Tourism Assistant
// @access  Public
router.post('/', async (req, res) => {
  let lastError = null; // Declare outside try block for error handling

  try {
    const { message, conversationHistory = [] } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Message is required'
      });
    }

    // Build conversation context
    let conversationContext = KITCHARAO_SYSTEM_PROMPT + '\n\n';

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

    // Try models in order of preference until one works
    // Free tier supports: gemini-2.5-flash (newest), gemini-1.5-flash, gemini-1.5-pro
    const modelsToTry = [
      'gemini-2.5-flash',  // Latest model, best for free tier
      'gemini-1.5-flash',  // Fast and reliable
      'gemini-1.5-pro'     // More capable
    ];

    let response;

    for (const modelName of modelsToTry) {
      try {
        console.log(`Trying model: ${modelName}`);

        // Use the correct API format from the quick start guide
        // The contents parameter should be a string for simple queries
        const result = await ai.models.generateContent({
          model: modelName,
          contents: conversationContext
        });

        // Extract text from response - the API returns response.text
        response = result.text;

        if (!response) {
          console.log('Response structure:', JSON.stringify(result, null, 2));
          throw new Error('No response text found in API result');
        }
        console.log(`✅ Successfully used model: ${modelName}`);
        break; // Success, exit loop
      } catch (error) {
        console.log(`❌ Model ${modelName} failed:`, error.message);
        if (error.status) {
          console.log(`   Status: ${error.status}, StatusText: ${error.statusText}`);
        }
        lastError = error;
        // Continue to next model
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
    console.error('Error details:', {
      message: error.message,
      status: error.status,
      statusText: error.statusText
    });

    // Handle specific Gemini API errors
    if (error.message?.includes('API_KEY') || error.status === 401) {
      return res.status(500).json({
        success: false,
        message: 'Chatbot service configuration error. Please contact support.'
      });
    }

    if (error.status === 404) {
      return res.status(500).json({
        success: false,
        message: 'Chatbot model not available. Please contact support.'
      });
    }

    // Handle free tier quota/billing issues
    if (error.status === 429 || error.status === 402 ||
      error.message?.includes('quota') ||
      error.message?.includes('billing') ||
      error.message?.includes('rate limit')) {
      return res.status(500).json({
        success: false,
        message: "I've reached my free tier limit for today. But I can still help! Visit our Places page to discover amazing Kitcharao destinations, or check the Transport page to book a ride. You can also try asking me again later!"
      });
    }

    const fallbackResponses = [
      "I'm having trouble connecting right now, but I can tell you about Kitcharao! It's a beautiful municipality in Agusan del Norte with amazing tourist attractions. You can explore our places section to see all the wonderful destinations available for booking.",
      "I'm experiencing a technical issue, but you can still get help! Check out our Places page to see all the amazing tourist spots in Kitcharao, or use the Transport page to request transportation to visit them.",
      "Sorry for the inconvenience! While I'm having connection issues, you can browse our platform to discover Kitcharao's attractions. Visit the Places section to see all available destinations and book your visit."
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
  // Check if user is asking about non-Kitcharao locations
  const nonKitcharaoKeywords = [
    'manila', 'cebu', 'davao', 'baguio', 'boracay', 'palawan',
    'siargao', 'bohol', 'iloilo', 'bacolod', 'batanes', 'buenavista'
  ];

  const userMessageLower = userMessage.toLowerCase();
  const mentionsNonKitcharao = nonKitcharaoKeywords.some(keyword =>
    userMessageLower.includes(keyword)
  );

  if (mentionsNonKitcharao) {
    return `I'm specialized in providing information about Kitcharao, Agusan del Norte only. While that's a wonderful destination, I can help you discover amazing places right here in Kitcharao! Would you like to explore our local attractions, nature spots, cultural sites, or adventure activities?`;
  }

  // Ensure response mentions Kitcharao if it's about locations
  if (response.toLowerCase().includes('place') || response.toLowerCase().includes('visit') || response.toLowerCase().includes('tourist')) {
    if (!response.toLowerCase().includes('kitcharao') && !response.toLowerCase().includes('agusan')) {
      // Add Kitcharao context if missing
      return response + '\n\n💡 Remember: All these attractions are located in Kitcharao, Agusan del Norte!';
    }
  }

  return response;
}

module.exports = router;
