import { NextRequest, NextResponse } from 'next/server';
import { getWexaClient } from '@/lib/wexa';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const client = getWexaClient();
    const loginResult = await client.identity.auth.login(email, password);

    // Generate API key for the user
    const userId = loginResult.user._id;
    const orgId = loginResult.user.orgId;

    if (!userId || !orgId) {
      return NextResponse.json(
        { error: 'Failed to extract user information from token' },
        { status: 500 }
      );
    }

    const apiKeyResult = await client.identity.apiKeys.generate(userId, orgId);

    return NextResponse.json({
      user: loginResult.user,
      token: loginResult.token,
      apiKey: apiKeyResult.data?.secret_key || apiKeyResult.secret_key,
    });
  } catch (error: any) {
    console.error('Login failed:', error);
    return NextResponse.json(
      { error: error.message || 'Login failed' },
      { status: 401 }
    );
  }
}

