import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { projectID, connectorID, recipient, message, apiKey } = await req.json();

    if (!projectID || !connectorID || !recipient || !message || !apiKey) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Clean phone number - remove + and spaces
    const cleanPhoneNumber = recipient.replace(/[+\s-]/g, '');

    // Use start_chat action - this works for both new and existing contacts
    // POST /actions/whatsapp/start_chat/{connectorID}
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL || 'https://testing.api.wexa.ai'}/actions/whatsapp/start_chat/${connectorID}?projectID=${projectID}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
        },
        body: JSON.stringify({
          phone_numbers: cleanPhoneNumber,
          text: message,
        }),
      }
    );

    const data = await response.json();
    
    if (!response.ok) {
      console.error('WhatsApp API error:', data);
      throw new Error(data.detail || data.error || 'Failed to send WhatsApp message');
    }

    return NextResponse.json(data, { status: 200 });
  } catch (error: any) {
    console.error('Failed to send WhatsApp message:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to send WhatsApp message' },
      { status: 500 }
    );
  }
}
