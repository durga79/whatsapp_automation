import { NextRequest, NextResponse } from 'next/server';
import { getWexaClient } from '@/lib/wexa';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const projectID = searchParams.get('projectID');
    const authHeader = req.headers.get('Authorization');
    const apiKey = authHeader?.replace('Bearer ', '');

    if (!projectID || !apiKey) {
      return NextResponse.json(
        { error: 'Missing projectID or API Key' },
        { status: 400 }
      );
    }

    const client = getWexaClient(apiKey);
    const response = await client.executions.list(projectID);

    return NextResponse.json(response, { status: 200 });
  } catch (error: any) {
    console.error('Failed to list executions:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to list executions' },
      { status: 500 }
    );
  }
}
