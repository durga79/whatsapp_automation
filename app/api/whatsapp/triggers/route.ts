import { NextRequest, NextResponse } from 'next/server';
import { getWexaClient } from '@/lib/wexa';

// GET /api/whatsapp/triggers?connectorId=...
export async function GET(req: NextRequest) {
  try {
    const connectorId = req.nextUrl.searchParams.get('connectorId');
    const apiKey = req.headers.get('x-api-key');

    if (!connectorId || !apiKey) {
      return NextResponse.json(
        { error: 'Missing connectorId or apiKey' },
        { status: 400 }
      );
    }

    const client = getWexaClient(apiKey);
    const result = await client.triggers.listByConnector(connectorId);

    return NextResponse.json({
      triggers: result?.triggers || [],
      connector_id: connectorId,
    });
  } catch (error: any) {
    console.error('Failed to fetch triggers:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch triggers', triggers: [] },
      { status: 500 }
    );
  }
}

// POST /api/whatsapp/triggers - Create a new trigger
export async function POST(req: NextRequest) {
  try {
    const { connectorId, apiKey, trigger } = await req.json();

    if (!connectorId || !apiKey || !trigger) {
      return NextResponse.json(
        { error: 'Missing required fields: connectorId, apiKey, trigger' },
        { status: 400 }
      );
    }

    const client = getWexaClient(apiKey);
    const result = await client.triggers.addCoworkerTrigger(
      connectorId,
      'whatsapp',
      {
        name: trigger.name,
        event: trigger.event || 'message_received',
        agentflow_id: trigger.agentflow_id,
        goal: trigger.goal,
        start_from_agent_id: trigger.start_from_agent_id,
      }
    );

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Failed to create trigger:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create trigger' },
      { status: 500 }
    );
  }
}

// DELETE /api/whatsapp/triggers - Delete a trigger
export async function DELETE(req: NextRequest) {
  try {
    const { connectorId, triggerId, apiKey } = await req.json();

    if (!connectorId || !triggerId || !apiKey) {
      return NextResponse.json(
        { error: 'Missing required fields: connectorId, triggerId, apiKey' },
        { status: 400 }
      );
    }

    const client = getWexaClient(apiKey);
    const result = await client.triggers.remove(connectorId, 'whatsapp', triggerId);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Failed to delete trigger:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete trigger' },
      { status: 500 }
    );
  }
}



