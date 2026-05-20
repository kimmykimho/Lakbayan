const express = require('express');
const router = express.Router();
const { queryAll } = require('../config/neon');

const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY;
const MISTRAL_URL = 'https://api.mistral.ai/v1/chat/completions';

/**
 * Call Mistral AI API with retry
 */
async function callMistral(messages, maxTokens = 500) {
  const models = ['mistral-small-latest', 'open-mistral-nemo'];
  
  for (const model of models) {
    try {
      const response = await fetch(MISTRAL_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${MISTRAL_API_KEY}`
        },
        body: JSON.stringify({ model, messages, max_tokens: maxTokens, temperature: 0.7 })
      });

      if (response.status === 429) {
        console.log(`Mistral ${model} rate limited, trying next model...`);
        continue;
      }
      if (!response.ok) {
        console.error(`Mistral ${model} error: ${response.status}`);
        continue;
      }

      const data = await response.json();
      return data.choices[0].message.content;
    } catch (err) {
      console.error(`Mistral ${model} failed:`, err.message);
      continue;
    }
  }
  return null;
}

// @route   POST /api/chatbot
// @desc    Handle chatbot message (root path - used by frontend Chatbot component)
// @access  Public
router.post('/', async (req, res) => {
  // Delegate to the /message handler logic
  const { message, conversationHistory = [] } = req.body;

  if (!MISTRAL_API_KEY) {
    return res.json({
      success: true,
      data: {
        message: "The AI chatbot is not configured yet. Please contact the administrator.",
        suggestions: ['Show me places', 'How to book', 'Transport options']
      }
    });
  }

  try {
    const places = await queryAll("SELECT name, category, description FROM places WHERE status = 'active' LIMIT 20");
    const placeContext = places.map(p => `- ${p.name} (${p.category}): ${(p.description || '').substring(0, 100)}`).join('\n');

    const systemPrompt = `You are the official tourism assistant for "Lakbayan sa Kitcharao" web platform — a booking and tourism system for Kitcharao, Agusan del Norte, Philippines.

AVAILABLE DESTINATIONS ON THE PLATFORM:
${placeContext}

IMPORTANT RULES:
- You ONLY know about Kitcharao tourism and this platform
- When users ask how to book, tell them to use THIS platform: browse Places, click a destination, select date and visitors, then click Book
- When users ask about transport, tell them they can request tricycle/motorcycle/van rides through the Transport page
- NEVER mention Airbnb, Booking.com, or any external platform
- NEVER use markdown formatting (no **, no ##, no bullet symbols). Write plain text only.
- Keep responses under 120 words
- Be warm and conversational, like a local tour guide
- Reference specific place names from the list above when relevant

Format 2-3 suggestion buttons at the end like: [SUGGESTIONS: suggestion1 | suggestion2 | suggestion3]`;

    const history = (conversationHistory || []).slice(-6).map(h => ({
      role: h.sender === 'user' ? 'user' : 'assistant',
      content: h.text || h.content || h.message || ''
    })).filter(h => h.content);

    const messages = [
      { role: 'system', content: systemPrompt },
      ...history,
      { role: 'user', content: message }
    ];

    const aiResponse = await callMistral(messages);

    if (!aiResponse) {
      return res.json({
        success: true,
        data: {
          message: "I'm temporarily unavailable. The AI service is at capacity — please try again in a minute.",
          suggestions: ['Show me places', 'How to book', 'Transport options']
        }
      });
    }

    let responseText = aiResponse;
    let suggestions = ['Show me places', 'How to book', 'Transport options'];

    const sugMatch = aiResponse.match(/\[SUGGESTIONS?:\s*(.+?)\]/i);
    if (sugMatch) {
      suggestions = sugMatch[1].split('|').map(s => s.trim()).filter(Boolean);
      responseText = aiResponse.replace(/\[SUGGESTIONS?:\s*.+?\]/i, '').trim();
    }

    // Strip any markdown formatting the AI might use
    responseText = responseText
      .replace(/\*\*/g, '')
      .replace(/\*/g, '')
      .replace(/#{1,4}\s*/g, '')
      .replace(/^-\s+/gm, '• ')
      .replace(/---/g, '')
      .trim();

    res.json({
      success: true,
      data: { message: responseText, suggestions }
    });
  } catch (error) {
    console.error('Chatbot error:', error.message);
    res.json({
      success: true,
      data: {
        message: "I'm having trouble connecting right now. Please try again in a moment.",
        suggestions: ['Show me places', 'How to book', 'Transport options']
      }
    });
  }
});

// @route   POST /api/chatbot/message
// @desc    Handle chatbot message with Mistral AI
// @access  Public
router.post('/message', async (req, res) => {
  try {
    const { message, history = [] } = req.body;

    if (!MISTRAL_API_KEY) {
      return res.json({
        success: true,
        data: {
          message: "I'm sorry, the AI chatbot is not configured yet. Please contact the administrator.",
          suggestions: ['Show me places', 'How to book', 'Transport options']
        }
      });
    }

    // Get context about available places
    const places = await queryAll("SELECT name, category, description FROM places WHERE status = 'active' LIMIT 20");
    const placeContext = places.map(p => `- ${p.name} (${p.category}): ${(p.description || '').substring(0, 100)}`).join('\n');

    const systemPrompt = `You are a friendly tourism assistant for "Lakbayan sa Kitcharao", a tourism platform for Kitcharao, Agusan del Norte, Philippines. 

Available places to visit:
${placeContext}

Your role:
- Help tourists discover places to visit in Kitcharao
- Provide information about destinations, transport, and bookings
- Be warm, helpful, and concise (keep responses under 150 words)
- Suggest relevant follow-up questions
- If asked about something you don't know, suggest checking the platform

Always end with 2-3 short suggestion buttons the user might want to ask next.
Format suggestions as: [SUGGESTIONS: suggestion1 | suggestion2 | suggestion3]`;

    // Build conversation messages
    const messages = [
      { role: 'system', content: systemPrompt },
      ...history.slice(-6).map(h => ({ role: h.role, content: h.content })),
      { role: 'user', content: message }
    ];

    const aiResponse = await callMistral(messages);

    // Parse suggestions from response
    let responseText = aiResponse;
    let suggestions = ['Show me places', 'How to book', 'Transport options'];

    const sugMatch = aiResponse.match(/\[SUGGESTIONS?:\s*(.+?)\]/i);
    if (sugMatch) {
      suggestions = sugMatch[1].split('|').map(s => s.trim()).filter(Boolean);
      responseText = aiResponse.replace(/\[SUGGESTIONS?:\s*.+?\]/i, '').trim();
    }

    res.json({
      success: true,
      data: {
        message: responseText,
        suggestions
      }
    });
  } catch (error) {
    console.error('Chatbot error:', error.message);
    res.json({
      success: true,
      data: {
        message: "I'm having trouble connecting right now. Please try again in a moment.",
        suggestions: ['Show me places', 'How to book', 'Transport options']
      }
    });
  }
});

// @route   POST /api/chatbot/recommendations
// @desc    Get AI-powered recommendations based on association rule data
// @access  Private/Admin
router.post('/recommendations', async (req, res) => {
  try {
    const { analysisData } = req.body;

    if (!MISTRAL_API_KEY) {
      return res.status(500).json({ success: false, message: 'Mistral API key not configured' });
    }

    const systemPrompt = `You are a senior tourism data analyst for the Municipality of Kitcharao, Agusan del Norte, Philippines. You specialize in analyzing tourist behavior data to improve local tourism planning.

Analyze the association rule mining results and provide a STRUCTURED report with these exact sections:

## Key Findings
- 3-5 data-backed findings about tourist behavior patterns

## Tourism Route Packages
- Suggest 2-3 specific tourism route packages (day tours) based on which destinations tourists visit together
- Include estimated time, target tourist type, and why these destinations work together

## Marketing Strategy
- How to use these patterns to attract more tourists
- Which destinations to cross-promote together
- Seasonal or time-based insights if visible

## Action Items for Tourism Office
- 3-5 specific, practical actions the Kitcharao Tourism Office should take
- Prioritize by impact and feasibility

Be specific — use actual destination names and metrics from the data. Write in a professional but accessible tone. Keep the total response under 800 words.`;

    const userPrompt = `Tourism Association Rule Analysis for Kitcharao, Agusan del Norte:

DATA SUMMARY:
- Total tourists analyzed: ${analysisData.stats?.totalTransactions || 0}
- Destinations in analysis: ${analysisData.stats?.uniqueItems || 0}  
- Average destinations per tourist: ${analysisData.stats?.avgTransactionSize || 0}
- Data source: ${analysisData.stats?.analysisType || 'bookings'}
- Period: ${analysisData.stats?.period || 'all time'}

FREQUENTLY VISITED TOGETHER (Destination Groups):
${(analysisData.frequentItemsets || []).slice(0, 10).map(is => `- ${is.itemNames.join(' + ')} — visited together by ${(is.support * 100).toFixed(1)}% of tourists (${is.count} tourists)`).join('\n') || '- No frequent groups found'}

ASSOCIATION RULES (Tourism Patterns):
${(analysisData.rules || []).slice(0, 10).map(r => `- Tourists who visit ${r.antecedent.join(', ')} → ${(r.confidence * 100).toFixed(0)}% also visit ${r.consequent.join(', ')} (${r.lift.toFixed(1)}x more likely than random)`).join('\n') || '- No rules found'}

${analysisData.deepInsights ? `
DEEP INSIGHTS:
- Most popular destination: ${analysisData.deepInsights.topDestination?.name || 'N/A'} (visited by ${analysisData.deepInsights.topDestination?.percentage || 0}% of tourists)
- Most connected hub destination: ${analysisData.deepInsights.mostConnectedDestination?.name || 'N/A'} (appears in ${analysisData.deepInsights.mostConnectedDestination?.connections || 0} destination pairings)
- Strongest tourism link: ${analysisData.deepInsights.strongestPair ? `${analysisData.deepInsights.strongestPair.from.join(', ')} → ${analysisData.deepInsights.strongestPair.to.join(', ')} (${analysisData.deepInsights.strongestPair.lift.toFixed(1)}x lift)` : 'N/A'}
` : ''}

Provide actionable, data-driven recommendations for the Kitcharao municipal tourism office.`;

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ];

    const aiResponse = await callMistral(messages, 1000);

    res.json({
      success: true,
      data: { recommendations: aiResponse }
    });
  } catch (error) {
    console.error('AI Recommendations error:', error.message);
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
