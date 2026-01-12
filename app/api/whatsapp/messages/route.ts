import { NextResponse } from 'next/server';
import { getWexaClient } from '@/lib/wexa';

/**
 * WhatsApp Messages API
 * 
 * Flow:
 * 1. Get connector config from Data Service (contains Unipile credentials)
 * 2. Use Unipile API directly to fetch chats/messages
 * 
 * This bypasses the Data Service's broken GET endpoints that expect body params
 */

interface UnipileConfig {
  api_key: string;
  api_sub_domain: string;
  port: string;
  account_id: string;
}

async function getConnectorConfig(apiKey: string, connectorId: string): Promise<UnipileConfig | null> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://testing.api.wexa.ai';
    const response = await fetch(`${baseUrl}/connector/${connectorId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
    });

    if (!response.ok) {
      console.error('Failed to get connector:', response.status);
      return null;
    }

    const data = await response.json();
    // The connector config contains the Unipile credentials
    const config = data.config?.config || data.config || {};
    
    return {
      api_key: config.api_key,
      api_sub_domain: config.api_sub_domain,
      port: config.port || '13443',
      account_id: config.account_id,
    };
  } catch (err) {
    console.error('Failed to get connector config:', err);
    return null;
  }
}

async function fetchChatsFromUnipile(config: UnipileConfig): Promise<any[]> {
  try {
    const url = `https://${config.api_sub_domain}.unipile.com:${config.port}/api/v1/chats?account_id=${config.account_id}&account_type=WHATSAPP&limit=50`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'accept': 'application/json',
        'X-API-KEY': config.api_key,
      },
    });

    if (!response.ok) {
      console.error('Unipile chats fetch failed:', response.status);
      return [];
    }

    const data = await response.json();
    return data.items || [];
  } catch (err) {
    console.error('Failed to fetch chats from Unipile:', err);
    return [];
  }
}

async function fetchMessagesFromUnipile(config: UnipileConfig, chatId: string): Promise<any[]> {
  try {
    const url = `https://${config.api_sub_domain}.unipile.com:${config.port}/api/v1/chats/${chatId}/messages?limit=50`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'accept': 'application/json',
        'X-API-KEY': config.api_key,
      },
    });

    if (!response.ok) {
      console.error('Unipile messages fetch failed:', response.status);
      return [];
    }

    const data = await response.json();
    return data.items || [];
  } catch (err) {
    console.error('Failed to fetch messages from Unipile:', err);
    return [];
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const connectorID = searchParams.get('connectorID');
    const chatId = searchParams.get('chatId');
    const apiKey = request.headers.get('x-api-key');

    if (!connectorID) {
      return NextResponse.json({ error: 'connectorID is required' }, { status: 400 });
    }

    if (!apiKey) {
      return NextResponse.json({ error: 'API key is required' }, { status: 401 });
    }

    // Step 1: Get the connector config with Unipile credentials
    const config = await getConnectorConfig(apiKey, connectorID);
    
    if (!config || !config.api_key) {
      console.error('Could not get Unipile config from connector');
      return NextResponse.json({ 
        chats: [], 
        messages: [],
        error: 'Could not retrieve connector configuration' 
      });
    }

    console.log('Got Unipile config:', { 
      subdomain: config.api_sub_domain, 
      hasApiKey: !!config.api_key,
      accountId: config.account_id 
    });

    // Step 2: If chatId provided, fetch messages for that chat
    if (chatId) {
      const rawMessages = await fetchMessagesFromUnipile(config, chatId);
      
      const messages = rawMessages.map((msg: any) => ({
        id: msg.id || `msg_${Date.now()}_${Math.random()}`,
        text: msg.text || msg.body || '',
        sender: msg.is_sender ? 'me' : 'them',
        timestamp: new Date(msg.timestamp || msg.date || Date.now()),
        status: 'sent',
      }));

      return NextResponse.json({ messages });
    }

    // Step 3: Fetch all chats
    const rawChats = await fetchChatsFromUnipile(config);
    
    const chats = rawChats.map((chat: any) => {
      const lastMessage = chat.last_message || {};
      const attendees = chat.attendees || [];
      const otherPerson = attendees.find((a: any) => !a.is_self) || attendees[0] || {};
      
      // Extract clean phone number from WhatsApp format (e.g., "919704933657@s.whatsapp.net" -> "919704933657")
      const rawIdentifier = otherPerson.identifier || chat.provider_id || chat.id || '';
      const phoneNumber = rawIdentifier.split('@')[0] || rawIdentifier;
      
      // Use display name if available, otherwise format the phone number
      const displayName = otherPerson.display_name || otherPerson.name;
      const formattedName = displayName || (phoneNumber.length > 10 ? `+${phoneNumber}` : phoneNumber) || 'Unknown';
      
      // Determine chat type (group, individual, broadcast)
      const isGroup = rawIdentifier.includes('@g.us');
      const isBroadcast = rawIdentifier.includes('@broadcast');
      
      return {
        phoneNumber: phoneNumber,
        name: isGroup ? `Group: ${formattedName}` : isBroadcast ? 'Status Updates' : formattedName,
        chatId: chat.id,
        messages: [],
        lastMessage: lastMessage.text || lastMessage.body || '',
        lastMessageTime: lastMessage.timestamp ? new Date(lastMessage.timestamp) : 
                         chat.updated_at ? new Date(chat.updated_at) : undefined,
        unread: chat.unread_count || 0,
        isGroup,
        isBroadcast,
      };
    });

    console.log(`Fetched ${chats.length} chats from Unipile`);
    return NextResponse.json({ chats });

  } catch (error: any) {
    console.error('Failed to fetch messages:', error);
    return NextResponse.json({ chats: [], messages: [], error: error.message }, { status: 200 });
  }
}
