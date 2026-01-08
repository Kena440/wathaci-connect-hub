import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

const CISO_SYSTEM_PROMPT = `You are Ciso, the friendly AI assistant for WATHACI Connect - Zambia's premier business services ecosystem. Your name "Ciso" is inspired by the Zambian spirit of community and support.

## About WATHACI Connect
WATHACI Connect is a comprehensive platform that:
- Connects SMEs, investors, professionals, and donors across Zambia
- Provides AI-powered business matching and funding discovery
- Offers a marketplace for services and products
- Facilitates partnerships and collaborations
- Supports business compliance and due diligence

## Your Personality
- Warm, helpful, and professional
- Knowledgeable about Zambian business environment
- Supportive of entrepreneurs and small businesses
- Clear and concise in explanations
- Uses simple language, avoiding jargon

## Your Capabilities
1. **Platform Navigation**: Help users find features (Marketplace, Funding Hub, Freelancer Hub, Partnership Hub, etc.)
2. **Business Guidance**: Provide tips on business registration, compliance, and growth in Zambia
3. **Funding Information**: Explain funding opportunities and how to apply
4. **Service Discovery**: Help users find the right professionals or services
5. **Technical Support**: Assist with platform issues and direct to support@wathaci.com for complex issues

## Key Platform Features to Know
- **Marketplace**: Browse and purchase services from verified providers
- **Funding Hub**: Discover grants, loans, and investment opportunities
- **Freelancer Hub**: Find or offer professional services
- **Partnership Hub**: Apply for partnership programs
- **Wallet**: Manage payments in ZMW and USD
- **Messages**: Communicate with other users

## Response Guidelines
- Keep responses concise but complete
- Use bullet points for lists
- Include relevant links when helpful (e.g., "/marketplace", "/funding-hub")
- For account-specific issues, direct to support@wathaci.com
- Always be encouraging and supportive of business growth

## Important Notes
- Platform payments are processed through Lenco (mobile money and bank)
- All transactions are in ZMW or USD
- The platform operates under Zambian business law
- For urgent support: support@wathaci.com`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, conversationHistory = [] } = await req.json();

    // Input validation
    if (!message) {
      return new Response(
        JSON.stringify({ error: 'Message is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate and sanitize message
    const sanitizedMessage = String(message).trim();
    if (sanitizedMessage.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Message cannot be empty' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (sanitizedMessage.length > 2000) {
      return new Response(
        JSON.stringify({ error: 'Message too long. Maximum 2000 characters.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate conversation history
    if (!Array.isArray(conversationHistory)) {
      return new Response(
        JSON.stringify({ error: 'Invalid conversation history format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Limit conversation history to prevent abuse
    const limitedHistory = conversationHistory.slice(-10).filter(
      (msg: any) => msg && typeof msg.type === 'string' && typeof msg.content === 'string'
    );

    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY is not configured');
      return new Response(
        JSON.stringify({ 
          response: "I'm having trouble connecting right now. Please try again later or contact support@wathaci.com for assistance.",
          error: 'API key not configured'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build messages array with conversation history (using sanitized inputs)
    const messages = [
      { role: 'system', content: CISO_SYSTEM_PROMPT },
      ...limitedHistory.map((msg: { type: string; content: string }) => ({
        role: msg.type === 'user' ? 'user' : 'assistant',
        content: String(msg.content).slice(0, 2000) // Limit each message length
      })),
      { role: 'user', content: sanitizedMessage }
    ];

    console.log('Calling Lovable AI with message:', message);

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages,
        max_tokens: 1024,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Lovable AI error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ 
            response: "I'm receiving many requests right now. Please wait a moment and try again.",
            error: 'Rate limit exceeded'
          }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ 
            response: "There's a temporary service issue. Please try again later or contact support@wathaci.com.",
            error: 'Payment required'
          }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content || "I apologize, but I couldn't process your request. Please try again.";

    console.log('Ciso response generated successfully');

    // Generate contextual suggestions based on the conversation
    const suggestions = generateSuggestions(message, aiResponse);

    return new Response(
      JSON.stringify({ 
        response: aiResponse,
        suggestions 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Ciso assistant error:', error);
    return new Response(
      JSON.stringify({ 
        response: "I'm sorry, I'm experiencing technical difficulties. Please try again or contact support@wathaci.com for assistance.",
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function generateSuggestions(userMessage: string, aiResponse: string): string[] {
  const lowerMessage = userMessage.toLowerCase();
  const suggestions: string[] = [];

  // Context-based suggestions
  if (lowerMessage.includes('fund') || lowerMessage.includes('invest') || lowerMessage.includes('money')) {
    suggestions.push('How do I apply for funding?');
    suggestions.push('What grants are available?');
  } else if (lowerMessage.includes('service') || lowerMessage.includes('hire') || lowerMessage.includes('freelanc')) {
    suggestions.push('Find accountants');
    suggestions.push('How to hire professionals');
  } else if (lowerMessage.includes('partner') || lowerMessage.includes('collaborat')) {
    suggestions.push('Partnership benefits');
    suggestions.push('How to become a partner');
  } else if (lowerMessage.includes('pay') || lowerMessage.includes('wallet') || lowerMessage.includes('transaction')) {
    suggestions.push('Set up mobile money');
    suggestions.push('Check transaction history');
  } else if (lowerMessage.includes('regist') || lowerMessage.includes('account') || lowerMessage.includes('start')) {
    suggestions.push('Complete my profile');
    suggestions.push('Subscription plans');
  } else {
    // Default suggestions
    suggestions.push('Explore funding opportunities');
    suggestions.push('Find services');
    suggestions.push('Contact support');
  }

  return suggestions.slice(0, 3);
}
