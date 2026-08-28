import { NextResponse } from 'next/server';

// Zalo webhook verification and event handler (POST)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log('Incoming Zalo Event:', body);

    // Zalo webhook validation check
    const eventName = body.event_name;
    const messageId = body.message?.msg_id;
    const senderId = body.sender?.id;

    if (eventName === 'user_send_text') {
      const text = body.message?.text;
      console.log(`Zalo User ${senderId} sent text: "${text}" (msg_id: ${messageId})`);
      // Future integration: Parse and insert message into PG 'messages' & 'conversations' tables
    }

    return NextResponse.json({ status: 'OK', event: eventName }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
