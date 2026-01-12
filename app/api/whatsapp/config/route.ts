import { NextRequest, NextResponse } from 'next/server';
import { getWexaClient } from '@/lib/wexa';

export async function POST(req: NextRequest) {
  try {
    const { projectID, orgId, config, apiKey } = await req.json();

    if (!projectID || !orgId || !config || !apiKey) {
      return NextResponse.json(
        { error: 'Missing required fields: projectID, orgId, config, apiKey' },
        { status: 400 }
      );
    }

    const client = getWexaClient(apiKey);
    
    // Build the full connector body as expected by Data-Service
    // This matches the ConnectorModel in server/models/connector.py
    const connectorBody = {
      name: 'WhatsApp',
      description: 'WhatsApp personal messaging connector',
      category: 'whatsapp',
      status: 'pending',
      connector_type: 'user',
      connector_group_tag: 'social',
      org_id: orgId,
      projectID: projectID,
      config: config,
      tags: [],
      logo: 'https://wexadev.blob.core.windows.net/connectors/whatsapp_logo.png',
      ui_form: [
        {
          field_id: 'phone_number',
          type: 'string',
          required: true,
          label: 'Phone Number (with country code)',
          description: 'The complete phone number with country code (e.g., 919999999999)',
          ui_component: 'textInput',
          info: 'Phone number to connect (919999999999)',
          is_secret: false
        },
        {
          field_id: 'email_id',
          type: 'string',
          required: true,
          label: 'Email ID',
          description: 'The email address where you will receive the authentication PIN',
          ui_component: 'textInput',
          info: 'Email id of the user to receive PIN',
          is_secret: false
        },
        {
          field_id: 'pin',
          type: 'string',
          required: true,
          label: 'PIN',
          description: 'Security PIN (preferably 4 digits) required to authenticate your WhatsApp account',
          ui_component: 'textInput',
          info: 'PIN for whatsapp login',
          is_secret: true
        }
      ],
      data_loaders: [],
      actions: [
        {
          name: 'List all Chats',
          description: 'Retrieves a comprehensive list of all active chat conversations from the connected WhatsApp account, including individual and group chats',
          sort: 'list_all_chats',
          logo: 'https://wexadev.blob.core.windows.net/connectors/whatsapp_logo.png',
          category: 'whatsapp',
          endpoint: '/whatsapp/list_all_chats',
          is_enabled: true,
          source_type: 'action'
        },
        {
          name: 'Send Message',
          description: 'Sends a text message to a specific recipient or group identified by their unique chat ID in WhatsApp',
          sort: 'send_message',
          logo: 'https://wexadev.blob.core.windows.net/connectors/whatsapp_logo.png',
          category: 'whatsapp',
          endpoint: '/whatsapp/send_message',
          is_enabled: true,
          source_type: 'action'
        },
        {
          name: 'Retrieve a Chat',
          description: 'Fetches the complete conversation history and metadata for a specific chat using its unique identifier',
          sort: 'retrieve_chat',
          logo: 'https://wexadev.blob.core.windows.net/connectors/whatsapp_logo.png',
          category: 'whatsapp',
          endpoint: '/whatsapp/retrieve_chat',
          is_enabled: true,
          source_type: 'action'
        },
        {
          name: 'Start a chat',
          description: 'Initiates a new conversation with a contact or group using their unique WhatsApp identifier',
          sort: 'start_chat',
          logo: 'https://wexadev.blob.core.windows.net/connectors/whatsapp_logo.png',
          category: 'whatsapp',
          endpoint: '/whatsapp/start_chat',
          is_enabled: true,
          source_type: 'action'
        },
        {
          name: 'List all Messages',
          description: 'Retrieves the complete message history for a specific conversation, including text, media, and system messages',
          sort: 'list_all_messages',
          logo: 'https://wexadev.blob.core.windows.net/connectors/whatsapp_logo.png',
          category: 'whatsapp',
          endpoint: '/whatsapp/list_all_messages',
          is_enabled: true,
          source_type: 'action'
        },
        {
          name: 'List Attendees',
          description: 'Provides a detailed list of all participants in a specific chat, including their contact information and status',
          sort: 'list_attendees',
          logo: 'https://wexadev.blob.core.windows.net/connectors/whatsapp_logo.png',
          category: 'whatsapp',
          endpoint: '/whatsapp/list_attendees',
          is_enabled: true,
          source_type: 'action'
        },
        {
          name: 'Retrieve Attendee',
          description: 'Fetches detailed information about a specific participant in a chat using their unique identifier',
          sort: 'retrieve_attendee',
          logo: 'https://wexadev.blob.core.windows.net/connectors/whatsapp_logo.png',
          category: 'whatsapp',
          endpoint: '/whatsapp/retrieve_attendee',
          is_enabled: true,
          source_type: 'action'
        },
        {
          name: 'Retrieve Message',
          description: 'Fetches the complete content and metadata of a specific message using its unique message identifier',
          sort: 'retrieve_message',
          logo: 'https://wexadev.blob.core.windows.net/connectors/whatsapp_logo.png',
          category: 'whatsapp',
          endpoint: '/whatsapp/retrieve_message',
          is_enabled: true,
          source_type: 'action'
        }
      ],
      is_configured: false,
      is_starred: false,
      is_deleted: false,
      triggers: [],
      available_events: [
        {
          name: 'On a new WhatsApp Message Received',
          description: 'Automatically triggers a workflow when any new message is received on the connected WhatsApp account, enabling real-time response capabilities',
          event: 'message_received'
        }
      ],
      is_premium: true
    };

    // POST to /actions/whatsapp/config
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'https://testing.api.wexa.ai'}/actions/whatsapp/config`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey
      },
      body: JSON.stringify(connectorBody)
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error('Data-Service error:', data);
      throw new Error(data.detail || data.error || 'Failed to configure WhatsApp connector');
    }

    return NextResponse.json(data, { status: 200 });
  } catch (error: any) {
    console.error('Failed to configure WhatsApp connector:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to configure WhatsApp connector' },
      { status: 500 }
    );
  }
}
