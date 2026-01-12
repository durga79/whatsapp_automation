import { NextRequest, NextResponse } from 'next/server';
import { getWexaClient } from '@/lib/wexa';

export async function POST(req: NextRequest) {
  try {
    const { name, goal, inputVariables, projectID, apiKey, executedBy } = await req.json();

    if (!name || !goal || !inputVariables || !projectID || !apiKey || !executedBy) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const client = getWexaClient(apiKey);
    const response = await client.agentflows.create({
      name,
      goal,
      input_variables: inputVariables,
      projectID,
      executed_by: executedBy,
    });

    return NextResponse.json(response, { status: 201 });
  } catch (error: any) {
    console.error('Failed to create AgentFlow:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create AgentFlow' },
      { status: 500 }
    );
  }
}
