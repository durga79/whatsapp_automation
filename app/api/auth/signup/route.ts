import { NextRequest, NextResponse } from 'next/server';
import { getWexaClient } from '@/lib/wexa';

export async function POST(req: NextRequest) {
  try {
    const { name, email, password } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'Name, email, and password are required' },
        { status: 400 }
      );
    }

    const client = getWexaClient();
    const signupResult = await client.identity.auth.signup(
      name,
      email,
      password,
      process.env.NEXT_PUBLIC_VERIFY_REDIRECT_URL || 'https://app.wexa.ai/verify'
    );

    return NextResponse.json(signupResult);
  } catch (error: any) {
    console.error('Signup failed:', error);
    return NextResponse.json(
      { error: error.message || 'Signup failed' },
      { status: 400 }
    );
  }
}

