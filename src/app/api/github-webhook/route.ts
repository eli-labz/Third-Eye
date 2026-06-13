import { NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST(request: Request) {
    try {
        const payloadText = await request.text();
        const signature = request.headers.get('x-hub-signature-256');
        const secret = process.env.GITHUB_WEBHOOK_SECRET;

        if (secret) {
            if (!signature) {
                return NextResponse.json({ error: 'Unauthorized: Missing signature' }, { status: 401 });
            }
            const hmac = crypto.createHmac('sha256', secret);
            const digest = 'sha256=' + hmac.update(payloadText).digest('hex');
            
            // Use timingSafeEqual to prevent timing attacks
            try {
                if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest))) {
                    return NextResponse.json({ error: 'Unauthorized: Invalid signature' }, { status: 401 });
                }
            } catch {
                return NextResponse.json({ error: 'Unauthorized: Invalid signature format' }, { status: 401 });
            }
        }

        const payload = JSON.parse(payloadText);

        // Forward the payload to the local THIRD EYE Discord Bot running on Port 3005
        // Using the Tailscale internal IP of the Discord bot server
        const response = await fetch('http://100.68.100.15:3005/github/webhook', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(signature ? { 'x-hub-signature-256': signature } : {})
            },
            body: payloadText,
        });

        if (!response.ok) {
            console.error('Failed to forward webhook to Discord bot:', response.statusText);
            return NextResponse.json({ error: 'Failed to forward to bot' }, { status: 500 });
        }

        return NextResponse.json({ success: true, message: 'Webhook forwarded successfully' }, { status: 200 });

    } catch (error) {
        console.error('Error handling GitHub webhook:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
