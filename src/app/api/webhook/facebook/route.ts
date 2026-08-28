import { NextResponse } from 'next/server';

// Facebook Webhook Verification (GET)
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  const VERIFY_TOKEN = process.env.FACEBOOK_VERIFY_TOKEN || 'terax_secret_token';

  if (mode && token) {
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('WEBHOOK_VERIFIED');
      return new Response(challenge, { status: 200 });
    } else {
      return new Response('Forbidden', { status: 403 });
    }
  }
  return new Response('Missing parameters', { status: 400 });
}

// Receive incoming messages/events from Facebook Page (POST)
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Verify this is a page subscription event
    if (body.object === 'page') {
      body.entry?.forEach((entry: any) => {
        const webhookEvent = entry.messaging?.[0];
        console.log('Incoming FB Messaging Event:', webhookEvent);
        // Future workflow: parse sender, recipient, message content and append to PostgreSQL
      });

      return NextResponse.json({ status: 'EVENT_RECEIVED' }, { status: 200 });
    }
    
    return NextResponse.json({ error: 'Not a page event' }, { status: 404 });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
