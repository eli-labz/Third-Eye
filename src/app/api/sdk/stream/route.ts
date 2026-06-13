import { NextResponse } from 'next/server';

/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  THIRD EYE SDK — SSE Stream Endpoint                            ║
 * ║  Server-Sent Events for real-time entity streaming              ║
 * ║                                                                 ║
 * ║  GET /api/sdk/stream → Opens an SSE connection that pushes      ║
 * ║  normalized ThirdEye entities to the client in real-time.       ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

// In-memory entity store shared across the SDK endpoints
const globalForSDK = globalThis as unknown as {
  sdkEntityStore: Map<string, any>;
  sdkLastUpdate: number;
};

if (!globalForSDK.sdkEntityStore) {
  globalForSDK.sdkEntityStore = new Map();
  globalForSDK.sdkLastUpdate = Date.now();
}

export const dynamic = 'force-dynamic';

export async function GET() {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // Send initial status
      const statusEvent = {
        type: 'status',
        timestamp: new Date().toISOString(),
        payload: {
          connected: true,
          entityCount: globalForSDK.sdkEntityStore.size,
          feedCount: 9,
          latticeStatus: 'disconnected',
          lastUpdate: new Date().toISOString(),
          uptime: Date.now() - globalForSDK.sdkLastUpdate,
        },
      };
      controller.enqueue(encoder.encode(`data: ${JSON.stringify(statusEvent)}\n\n`));

      // Send heartbeat every 15 seconds
      const heartbeat = setInterval(() => {
        try {
          const hb = {
            type: 'heartbeat',
            timestamp: new Date().toISOString(),
            payload: { entityCount: globalForSDK.sdkEntityStore.size },
          };
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(hb)}\n\n`));
        } catch {
          clearInterval(heartbeat);
        }
      }, 15000);

      // Send entity updates every 5 seconds if data has changed
      let lastSentVersion = 0;
      const entityPush = setInterval(() => {
        try {
          if (globalForSDK.sdkLastUpdate > lastSentVersion) {
            lastSentVersion = globalForSDK.sdkLastUpdate;
            const entities = Array.from(globalForSDK.sdkEntityStore.values()).slice(0, 500);
            const event = {
              type: 'entity_update',
              timestamp: new Date().toISOString(),
              payload: entities,
            };
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
          }
        } catch {
          clearInterval(entityPush);
          clearInterval(heartbeat);
        }
      }, 5000);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
