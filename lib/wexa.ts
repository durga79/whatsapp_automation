import { WexaClient } from 'wexa-sdk';

// Use testing API for now (production api.wexa.ai doesn't have login whitelisted yet)
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://testing.api.wexa.ai';

export function getWexaClient(apiKey?: string): WexaClient {
  return new WexaClient({ baseUrl: BASE_URL, apiKey: apiKey || '' });
}

export { BASE_URL };
