import { NextRequest, NextResponse } from 'next/server';
import { getWexaClient } from '@/lib/wexa';

// Use Wexa LLM API for generating replies
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://testing.api.wexa.ai';

// Store for tracking processed messages to avoid duplicate replies
const processedMessages = new Set<string>();

// Smart reply patterns
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

function generateSmartReply(message: string): string {
  const lowerMessage = message.toLowerCase();
  for (const { pattern, replies } of SMART_REPLIES) {
    if (pattern.test(lowerMessage)) {
      return replies[Math.floor(Math.random() * replies.length)];
    }
  }
  return `Thanks for your message! I received: "${message.substring(0, 50)}${message.length > 50 ? '...' : ''}". I'll get back to you shortly! 📩`;
}

// POST /api/whatsapp/auto-reply - Check for new messages and auto-reply
export async function POST(req: NextRequest) {
  try {
    const { connectorID, apiKey, enableAutoReply } = await req.json();

    if (!connectorID || !apiKey) {
      return NextResponse.json(
        { error: 'Missing connectorID or apiKey' },
        { status: 400 }
      );
    }

    if (!enableAutoReply) {
      return NextResponse.json({ status: 'auto_reply_disabled' });
    }

    const client = getWexaClient(apiKey);

    // Get connector details to extract Unipile credentials
    const connectorDetails = await client.connectors.getById(connectorID);
    if (!connectorDetails?.config?.config) {
      return NextResponse.json({ error: 'Connector configuration not found' }, { status: 404 });
    }

    const unipileConfig = connectorDetails.config.config;
    const { api_key: unipileApiKey, api_sub_domain, port, account_id } = unipileConfig;

    if (!unipileApiKey || !api_sub_domain || !port || !account_id) {
      return NextResponse.json({ error: 'Unipile credentials missing' }, { status: 400 });
    }

    const headers = {
      'accept': 'application/json',
      'X-API-KEY': unipileApiKey,
    };

    // Fetch recent chats
    const chatsUrl = `https://${api_sub_domain}.unipile.com:${port}/api/v1/chats?account_id=${account_id}&account_type=WHATSAPP&unread=true&limit=10`;
    const chatsResponse = await fetch(chatsUrl, { headers });

    if (!chatsResponse.ok) {
      return NextResponse.json({ error: 'Failed to fetch chats' }, { status: chatsResponse.status });
    }

    const chatsData = await chatsResponse.json();
    const unreadChats = chatsData.items || [];

    const replies: { chatId: string; phoneNumber: string; incomingMessage: string; reply: string; sent: boolean }[] = [];

    // Process each unread chat
    for (const chat of unreadChats) {
      if (chat.unread_count === 0) continue;
      
      const chatId = chat.id;
      
      // Get messages for this chat
      const messagesUrl = `https://${api_sub_domain}.unipile.com:${port}/api/v1/chats/${chatId}/messages?limit=5`;
      const messagesResponse = await fetch(messagesUrl, { headers });
      
      if (!messagesResponse.ok) continue;
      
      const messagesData = await messagesResponse.json();
      const messages = messagesData.items || [];

      // Find unread messages from them (not from us)
      for (const msg of messages) {
        if (msg.is_sender) continue; // Skip our own messages
        
        const messageId = msg.id;
        const messageKey = `${connectorID}:${messageId}`;
        
        // Skip if already processed
        if (processedMessages.has(messageKey)) continue;
        
        const messageText = msg.text || msg.body || msg.content || '';
        if (!messageText) continue;

        // Generate smart reply
        const reply = generateSmartReply(messageText);

        // Send the reply
        try {
          const sendResponse = await fetch(`${BASE_URL}/actions/whatsapp/start_chat/${connectorID}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': apiKey
            },
            body: JSON.stringify({
              phone_numbers: chat.phone_number?.replace('@s.whatsapp.net', '').replace('@c.us', '') || '',
              text: reply
            })
          });

          const sent = sendResponse.ok;
          
          replies.push({
            chatId,
            phoneNumber: chat.phone_number || '',
            incomingMessage: messageText,
            reply,
            sent
          });

          // Mark as processed
          processedMessages.add(messageKey);
          
          // Keep set size manageable
          if (processedMessages.size > 1000) {
            const iterator = processedMessages.values();
            for (let i = 0; i < 500; i++) {
              processedMessages.delete(iterator.next().value);
            }
          }

        } catch (error) {
          console.error('Failed to send auto-reply:', error);
        }
      }
    }

    return NextResponse.json({
      status: 'success',
      unreadChats: unreadChats.length,
      repliesSent: replies.length,
      replies
    });

  } catch (error: any) {
    console.error('Auto-reply error:', error);
    return NextResponse.json(
      { error: error.message || 'Auto-reply failed' },
      { status: 500 }
    );
  }
}

// GET - Status check
export async function GET() {
  return NextResponse.json({
    status: 'active',
    processedMessagesCount: processedMessages.size,
    message: 'Auto-reply service is running'
  });
}



