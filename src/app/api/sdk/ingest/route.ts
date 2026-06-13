import { NextRequest, NextResponse } from 'next/server';

/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  THIRD EYE SDK — Ingestion Endpoint                             ║
 * ║  Secure webhook for external platform data push                 ║
 * ║                                                                 ║
 * ║  POST /api/sdk/ingest → Accepts ThirdEye-format entities       ║
 * ║  from external systems (e.g., Anduril Lattice) and merges       ║
 * ║  them into the Common Operating Picture.                        ║
 * ║                                                                 ║
 * ║  GET  /api/sdk/ingest → Returns current SDK entity count        ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

// Share the entity store with the stream endpoint
const globalForSDK = globalThis as unknown as {
  sdkEntityStore: Map<string, any>;
  sdkLastUpdate: number;
  sdkIngestLog: Array<{ source: string; count: number; timestamp: string }>;
};

if (!globalForSDK.sdkEntityStore) {
  globalForSDK.sdkEntityStore = new Map();
  globalForSDK.sdkLastUpdate = Date.now();
}
if (!globalForSDK.sdkIngestLog) {
  globalForSDK.sdkIngestLog = [];
}

// Simple API key validation (in production, use proper auth)
const VALID_KEYS = new Set([
  process.env.SDK_INGEST_KEY || 'thirdeye-dev-key',
  'lattice-integration-key',
]);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate structure
    if (!body.source || !body.apiKey || !Array.isArray(body.entities)) {
      return NextResponse.json({
        accepted: 0,
        rejected: 0,
        errors: ['Invalid payload structure. Required: { source, apiKey, entities[] }'],
        timestamp: new Date().toISOString(),
      }, { status: 400 });
    }

    // Validate API key
    if (!VALID_KEYS.has(body.apiKey)) {
      return NextResponse.json({
        accepted: 0,
        rejected: 0,
        errors: ['Invalid API key'],
        timestamp: new Date().toISOString(),
      }, { status: 401 });
    }

    let accepted = 0;
    let rejected = 0;
    const errors: string[] = [];

    for (const entity of body.entities) {
      // Validate minimum required fields
      if (!entity.id || !entity.position?.lat || !entity.position?.lng) {
        rejected++;
        errors.push(`Entity missing required fields (id, position.lat, position.lng): ${entity.id || 'unknown'}`);
        continue;
      }

      // Normalize and store
      const normalized = {
        id: `ext-${body.source}-${entity.id}`,
        name: entity.name || `ENTITY-${entity.id}`,
        domain: entity.domain || 'LAND',
        entityType: entity.entityType || 'TRACK',
        position: {
          lat: entity.position.lat,
          lng: entity.position.lng,
          alt: entity.position.alt,
          heading: entity.position.heading,
          speed: entity.position.speed,
        },
        threat: entity.threat || 'NONE',
        classification: entity.classification || 'UNCLASSIFIED',
        source: {
          provider: body.source,
          feed: 'ingest-api',
          originalId: entity.id,
          confidence: entity.confidence || 0.8,
        },
        timestamp: entity.timestamp || new Date().toISOString(),
        properties: entity.properties || {},
        display: entity.display || {
          color: '#D4AF37',
          icon: 'dot-gold',
          layerType: 'circle',
          glow: false,
          scale: 1.0,
        },
      };

      globalForSDK.sdkEntityStore.set(normalized.id, normalized);
      accepted++;
    }

    // Update timestamp to trigger SSE push
    globalForSDK.sdkLastUpdate = Date.now();

    // Log ingestion
    globalForSDK.sdkIngestLog.push({
      source: body.source,
      count: accepted,
      timestamp: new Date().toISOString(),
    });
    // Keep log to last 100 entries
    if (globalForSDK.sdkIngestLog.length > 100) {
      globalForSDK.sdkIngestLog = globalForSDK.sdkIngestLog.slice(-100);
    }

    return NextResponse.json({
      accepted,
      rejected,
      errors: errors.slice(0, 10), // Limit error list
      timestamp: new Date().toISOString(),
    });
  } catch (e) {
    return NextResponse.json({
      accepted: 0,
      rejected: 0,
      errors: [`Server error: ${e instanceof Error ? e.message : 'Unknown'}`],
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    sdk: 'thirdeye',
    version: '1.0.0',
    entityCount: globalForSDK.sdkEntityStore.size,
    recentIngestions: globalForSDK.sdkIngestLog.slice(-10),
    timestamp: new Date().toISOString(),
  });
}
