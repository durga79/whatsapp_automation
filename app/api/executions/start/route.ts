import { NextRequest, NextResponse } from 'next/server';
import { getWexaClient } from '@/lib/wexa';

export async function POST(req: NextRequest) {
  try {
    const { agentflow_id, projectID, executedBy, goal, input_variables, apiKey } = await req.json();

    if (!agentflow_id || !projectID || !executedBy || !goal || !input_variables || !apiKey) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const client = getWexaClient(apiKey);
    const response = await client.executions.start({
      agentflow_id,
      projectID,
      executed_by: executedBy,
      goal,
      input_variables,
    });

    return NextResponse.json(response, { status: 201 });
  } catch (error: any) {
    console.error('Failed to start execution:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to start execution' },
      { status: 500 }
    );
  }
}
