import { NextRequest, NextResponse } from 'next/server';
import { getWexaClient } from '@/lib/wexa';

// Use Wexa LLM API for generating replies
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://testing.api.wexa.ai';

interface WhatsAppMessage {
  from: string;
  text: string;
  timestamp: string;
  message_id: string;
}

interface WebhookPayload {
  connector_id: string;
  event: string;
  data: WhatsAppMessage;
}

// Smart reply patterns for basic automation
const SMART_REPLIES: { pattern: RegExp; replies: string[] }[] = [
  { 
    pattern: /^(hi|hello|hey|hii+|hola)/i, 
    replies: [
      "Hello! 👋 How can I help you today?",
      "Hi there! What can I do for you?",
      "Hey! Nice to hear from you. How can I assist?"
    ]
  },
  { 
    pattern: /(who is this|who are you|what is this)/i, 
    replies: [
      "Hi! I'm an AI assistant here to help you. Feel free to ask me anything! 🤖",
      "Hello! This is an automated assistant. How may I help you today?"
    ]
  },
  { 
    pattern: /(thanks|thank you|thx)/i, 
    replies: [
      "You're welcome! Let me know if you need anything else. 😊",
      "Happy to help! Don't hesitate to reach out again."
    ]
  },
  { 
    pattern: /(bye|goodbye|see you|later)/i, 
    replies: [
      "Goodbye! Take care! 👋",
      "See you later! Have a great day!"
    ]
  },
  { 
    pattern: /(help|support|issue|problem)/i, 
    replies: [
      "I'd be happy to help! Could you please describe your issue in detail?",
      "I'm here to assist. What seems to be the problem?"
    ]
  },
  {
    pattern: /(price|cost|how much)/i,
    replies: [
      "For pricing information, please let me know which product or service you're interested in.",
      "I can help with pricing! What would you like to know about?"
    ]
  }
];

// Generate AI reply - using pattern matching as fallback
async function generateAIReply(message: string, apiKey: string): Promise<string> {
  // First try LLM
  try {
    const response = await fetch(`${BASE_URL}/llm/execute/calls`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'x-api-key': apiKey
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini', // Using a common model
        messages: [
          {
            role: 'system',
            content: 'You are a helpful WhatsApp assistant. Generate brief, friendly replies. Keep responses under 50 words.'
          },
          {
            role: 'user',
            content: message
          }
        ]
      })
    });

    if (response.ok) {
      const data = await response.json();
      const reply = data.choices?.[0]?.message?.content || 
                    data.response || 
                    data.content;
      if (reply) return reply;
    }
  } catch (error) {
    console.error('LLM API not available, using smart replies:', error);
  }

  // Fallback to pattern-based smart replies
  const lowerMessage = message.toLowerCase();
  for (const { pattern, replies } of SMART_REPLIES) {
    if (pattern.test(lowerMessage)) {
      return replies[Math.floor(Math.random() * replies.length)];
    }
  }

  // Default fallback
  return `Thanks for your message! I received: "${message.substring(0, 50)}${message.length > 50 ? '...' : ''}". I'll get back to you shortly! 📩`;
}

// Send reply via WhatsApp using the API directly
async function sendWhatsAppReply(
  connectorId: string,
  phoneNumber: string,
  message: string,
  apiKey: string
): Promise<boolean> {
  try {
    // Use direct API call for sending message
    // API expects phone_numbers as string and text instead of message
    const response = await fetch(`${BASE_URL}/actions/whatsapp/start_chat/${connectorId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey
      },
      body: JSON.stringify({
        phone_numbers: phoneNumber, // String, not array
        text: message // 'text' not 'message'
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Send message API error:', error);
      return false;
    }

    const result = await response.json();
    console.log('Reply sent:', result);
    return true;
  } catch (error) {
    console.error('Failed to send reply:', error);
    return false;
  }
}

// POST /api/whatsapp/webhook - Receive webhook from Events Service
export async function POST(req: NextRequest) {
  try {
    const payload: WebhookPayload = await req.json();
    
    console.log('Webhook received:', JSON.stringify(payload, null, 2));
    
    // Validate payload
    if (!payload.connector_id || !payload.data?.text || !payload.data?.from) {
      console.log('Invalid webhook payload, skipping');
      return NextResponse.json({ status: 'skipped', reason: 'invalid_payload' });
    }
    
    // Skip if this is our own message (sender is 'me')
    if (payload.data.from === 'me') {
      console.log('Skipping own message');
      return NextResponse.json({ status: 'skipped', reason: 'own_message' });
    }
    
    const incomingMessage = payload.data.text;
    const senderPhone = payload.data.from;
    
    // Get API key from automation config (stored in environment or database)
    const apiKey = process.env.WEXA_API_KEY || '3abdc954-29ea-482d-af58-6494d6579ffb';
    
    console.log(`Processing message from ${senderPhone}: "${incomingMessage}"`);
    
    // Generate AI reply using Wexa LLM
    const aiReply = await generateAIReply(incomingMessage, apiKey);
    console.log(`AI generated reply: "${aiReply}"`);
    
    // Send reply
    const sent = await sendWhatsAppReply(
      payload.connector_id,
      senderPhone,
      aiReply,
      apiKey
    );
    
    return NextResponse.json({
      status: sent ? 'success' : 'failed',
      incoming_message: incomingMessage,
      reply: aiReply,
      sender: senderPhone
    });
    
  } catch (error: any) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: error.message || 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

// GET /api/whatsapp/webhook - Health check / verification
export async function GET(req: NextRequest) {
  return NextResponse.json({
    status: 'active',
    message: 'WhatsApp automation webhook is running',
    base_url: BASE_URL
  });
}

