/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  THIRD EYE SDK — Client Controller                              ║
 * ║  Unified Intelligence Fusion Engine                             ║
 * ║                                                                 ║
 * ║  Subscribes to THIRD EYE feeds + external providers (Lattice),     ║
 * ║  normalizes all data into ThirdEyeEntity[], and emits a        ║
 * ║  fused Common Operating Picture stream.                         ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

import {
  type ThirdEyeEntity,
  type ThirdEyeClientConfig,
  type SDKStatus,
  type LatticeConnectionStatus,
  Domain,
  EntityType,
  ThreatLevel,
  Classification,
} from './types';
import { LatticeAdapter } from './LatticeAdapter';

// ── THIRD EYE Feed → Entity Translators ───────────────────────────────

function translateFlights(flights: any[], subtype: string): ThirdEyeEntity[] {
  if (!flights?.length) return [];
  const colorMap: Record<string, string> = {
    commercial: '#00E5FF', private: '#00E676', jets: '#FF69B4', military: '#FF3D3D',
  };
  const threatMap: Record<string, ThreatLevel> = {
    commercial: ThreatLevel.NONE, private: ThreatLevel.NONE,
    jets: ThreatLevel.LOW, military: ThreatLevel.ELEVATED,
  };
  return flights.map((f: any) => ({
    id: `thirdeye-air-${f.icao24 || f.callsign || Math.random().toString(36).slice(2)}`,
    name: f.callsign?.trim() || 'UNKNOWN',
    domain: Domain.AIR,
    entityType: EntityType.TRACK,
    position: { lat: f.lat, lng: f.lng, alt: f.alt, heading: f.heading, speed: f.speed_knots },
    threat: threatMap[subtype] || ThreatLevel.NONE,
    classification: Classification.UNCLASSIFIED,
    source: { provider: 'thirdeye', feed: `flights-${subtype}`, originalId: f.icao24, confidence: 0.9 },
    timestamp: new Date().toISOString(),
    properties: { model: f.model, registration: f.registration, icao24: f.icao24, subtype },
    display: { color: colorMap[subtype] || '#00E5FF', icon: `plane-${subtype === 'military' ? 'red' : 'cyan'}`, layerType: 'symbol' as const },
  }));
}

function translateMaritime(ships: any[]): ThirdEyeEntity[] {
  if (!ships?.length) return [];
  return ships.map((s: any) => ({
    id: `thirdeye-sea-${s.mmsi || s.id || Math.random().toString(36).slice(2)}`,
    name: s.name || `MMSI-${s.mmsi}`,
    domain: Domain.SEA,
    entityType: EntityType.TRACK,
    position: { lat: s.lat, lng: s.lng, heading: s.heading, speed: s.speed },
    threat: s.type === 'military' ? ThreatLevel.ELEVATED : ThreatLevel.NONE,
    classification: Classification.UNCLASSIFIED,
    source: { provider: 'thirdeye', feed: 'maritime-ais', originalId: s.mmsi?.toString(), confidence: 0.85 },
    timestamp: new Date().toISOString(),
    properties: { type: s.type, destination: s.destination, flag: s.flag, mmsi: s.mmsi },
    display: {
      color: s.type === 'military' ? '#FF1744' : s.type === 'tanker' ? '#FF9500' : '#00BCD4',
      icon: 'dot-orange', layerType: 'circle' as const,
    },
  }));
}

function translateEarthquakes(events: any[]): ThirdEyeEntity[] {
  if (!events?.length) return [];
  return events.map((eq: any) => ({
    id: `thirdeye-event-eq-${eq.id || Math.random().toString(36).slice(2)}`,
    name: `M${eq.magnitude} ${eq.place || 'Earthquake'}`,
    domain: Domain.LAND,
    entityType: EntityType.EVENT,
    position: { lat: eq.lat, lng: eq.lng },
    threat: eq.magnitude >= 6 ? ThreatLevel.CRITICAL : eq.magnitude >= 5 ? ThreatLevel.HIGH : eq.magnitude >= 4 ? ThreatLevel.ELEVATED : ThreatLevel.LOW,
    classification: Classification.UNCLASSIFIED,
    source: { provider: 'thirdeye', feed: 'usgs-earthquakes', originalId: eq.id, confidence: 0.99 },
    timestamp: new Date().toISOString(),
    properties: { magnitude: eq.magnitude, depth: eq.depth, place: eq.place },
    display: { color: eq.magnitude >= 6 ? '#FF1744' : '#FF9500', icon: 'dot-red', layerType: 'circle' as const, glow: eq.magnitude >= 5 },
  }));
}

function translateSatellites(sats: any[]): ThirdEyeEntity[] {
  if (!sats?.length) return [];
  return sats.map((s: any) => ({
    id: `thirdeye-space-${s.noradId || Math.random().toString(36).slice(2)}`,
    name: s.name || 'UNKNOWN SAT',
    domain: Domain.SPACE,
    entityType: EntityType.TRACK,
    position: { lat: s.lat, lng: s.lng, alt: s.alt ? s.alt * 1000 : undefined },
    threat: ThreatLevel.NONE,
    classification: Classification.UNCLASSIFIED,
    source: { provider: 'thirdeye', feed: 'satnogs', originalId: s.noradId?.toString(), confidence: 0.95 },
    timestamp: new Date().toISOString(),
    properties: { mission: s.mission, noradId: s.noradId, color: s.color },
    display: { color: s.color || '#D4AF37', icon: 'dot-gold', layerType: 'circle' as const },
  }));
}

function translateFires(fires: any[]): ThirdEyeEntity[] {
  if (!fires?.length) return [];
  return fires.map((f: any, i: number) => ({
    id: `thirdeye-event-fire-${i}`,
    name: 'Active Fire',
    domain: Domain.LAND,
    entityType: EntityType.EVENT,
    position: { lat: f.lat, lng: f.lng },
    threat: ThreatLevel.ELEVATED,
    classification: Classification.UNCLASSIFIED,
    source: { provider: 'thirdeye', feed: 'nasa-firms', confidence: 0.9 },
    timestamp: new Date().toISOString(),
    properties: { brightness: f.brightness },
    display: { color: '#FF6B00', icon: 'dot-fire', layerType: 'circle' as const },
  }));
}

function translateCCTV(cameras: any[]): ThirdEyeEntity[] {
  if (!cameras?.length) return [];
  return cameras.map((c: any) => ({
    id: `thirdeye-sensor-cctv-${c.id || Math.random().toString(36).slice(2)}`,
    name: c.name || 'Camera',
    domain: Domain.LAND,
    entityType: EntityType.SENSOR,
    position: { lat: c.lat, lng: c.lng },
    threat: ThreatLevel.NONE,
    classification: Classification.UNCLASSIFIED,
    source: { provider: 'thirdeye', feed: 'cctv-network', originalId: c.id, confidence: 1.0 },
    timestamp: new Date().toISOString(),
    properties: { city: c.city, country: c.country, source: c.source, feed_url: c.feed_url, stream_url: c.stream_url },
    display: { color: '#39FF14', icon: 'dot-cctv', layerType: 'circle' as const },
  }));
}

function translateRadiation(stations: any[]): ThirdEyeEntity[] {
  if (!stations?.length) return [];
  return stations.map((r: any) => ({
    id: `thirdeye-sensor-rad-${r.name || Math.random().toString(36).slice(2)}`,
    name: r.name || 'Radiation Monitor',
    domain: Domain.LAND,
    entityType: EntityType.SENSOR,
    position: { lat: r.lat, lng: r.lng },
    threat: r.status === 'DANGER' ? ThreatLevel.CRITICAL : r.status === 'WARNING' ? ThreatLevel.HIGH : ThreatLevel.LOW,
    classification: Classification.UNCLASSIFIED,
    source: { provider: 'thirdeye', feed: 'radiation-network', confidence: 0.95 },
    timestamp: new Date().toISOString(),
    properties: { reading: r.reading, status: r.status, network: r.network, city: r.city, country: r.country },
    display: {
      color: r.status === 'DANGER' ? '#FF1744' : r.status === 'WARNING' ? '#FF9500' : '#AB47BC',
      icon: 'dot-red', layerType: 'circle' as const, glow: r.status === 'DANGER',
    },
  }));
}

// ── Main Client ────────────────────────────────────────────────────

export class ThirdEyeClient {
  private config: ThirdEyeClientConfig;
  private latticeAdapter: LatticeAdapter | null = null;
  private entityStore: Map<string, ThirdEyeEntity> = new Map();
  private startTime: number = Date.now();
  private updateInterval: ReturnType<typeof setInterval> | null = null;
  private sseConnection: EventSource | null = null;

  constructor(config: ThirdEyeClientConfig) {
    this.config = config;

    // Initialize Lattice adapter if configured
    if (config.lattice) {
      this.latticeAdapter = new LatticeAdapter(config.lattice);
    }
  }

  /** Initialize the SDK and connect all feeds */
  async initialize(): Promise<void> {
    // Connect Lattice if configured
    if (this.latticeAdapter) {
      await this.latticeAdapter.connect();
    }

    // Try SSE stream first (for real-time updates)
    this.connectSSE();

    // Emit initial status
    this.config.onStatusChange?.(this.getStatus());
  }

  /** Connect to the THIRD EYE SSE stream endpoint */
  private connectSSE(): void {
    if (typeof EventSource === 'undefined') return;

    try {
      this.sseConnection = new EventSource(
        `${this.config.thirdeyeBaseUrl}/api/sdk/stream`
      );

      this.sseConnection.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'entity_update' && Array.isArray(data.payload)) {
            for (const entity of data.payload) {
              this.entityStore.set(entity.id, entity);
            }
            this.emitUpdate();
          }
        } catch {
          // Skip malformed events
        }
      };

      this.sseConnection.onerror = () => {
        // SSE failed, connection will auto-retry
      };
    } catch {
      // EventSource not available or connection failed
    }
  }

  /**
   * Ingest raw THIRD EYE data and translate it into ThirdEye entities.
   * This is the primary method called by page.tsx to feed data into the SDK.
   */
  ingestThirdEyeData(data: Record<string, any>): void {
    const entities: ThirdEyeEntity[] = [];

    // Air domain
    entities.push(...translateFlights(data.commercial_flights, 'commercial'));
    entities.push(...translateFlights(data.private_flights, 'private'));
    entities.push(...translateFlights(data.private_jets, 'jets'));
    entities.push(...translateFlights(data.military_flights, 'military'));

    // Sea domain
    entities.push(...translateMaritime(data.maritime_ships || []));

    // Space domain
    entities.push(...translateSatellites(data.satellites || []));

    // Land domain — Events
    entities.push(...translateEarthquakes(data.earthquakes || []));
    entities.push(...translateFires(data.fires || []));

    // Land domain — Sensors
    entities.push(...translateCCTV(data.cameras || []));
    entities.push(...translateRadiation(data.radiation || []));

    // Store all
    for (const entity of entities) {
      this.entityStore.set(entity.id, entity);
    }

    // Merge Lattice entities
    if (this.latticeAdapter) {
      for (const entity of this.latticeAdapter.getEntities()) {
        this.entityStore.set(entity.id, entity);
      }
    }

    this.emitUpdate();
  }

  /** Get all entities, optionally filtered by domain */
  getEntities(domain?: Domain): ThirdEyeEntity[] {
    const all = Array.from(this.entityStore.values());
    if (domain) return all.filter(e => e.domain === domain);
    return all;
  }

  /** Get entity count by domain */
  getEntityCountByDomain(): Record<Domain, number> {
    const counts = {} as Record<Domain, number>;
    for (const d of Object.values(Domain)) counts[d] = 0;
    for (const entity of this.entityStore.values()) {
      counts[entity.domain] = (counts[entity.domain] || 0) + 1;
    }
    return counts;
  }

  /** Get entities above a certain threat level */
  getThreats(minLevel: ThreatLevel = ThreatLevel.ELEVATED): ThirdEyeEntity[] {
    const levels = [ThreatLevel.NONE, ThreatLevel.LOW, ThreatLevel.ELEVATED, ThreatLevel.HIGH, ThreatLevel.CRITICAL];
    const minIndex = levels.indexOf(minLevel);
    return Array.from(this.entityStore.values())
      .filter(e => levels.indexOf(e.threat) >= minIndex);
  }

  /** Get current SDK status */
  getStatus(): SDKStatus {
    return {
      connected: true,
      feedCount: this.getActiveFeedCount(),
      entityCount: this.entityStore.size,
      latticeStatus: this.latticeAdapter?.getStatus() || 'disconnected',
      lastUpdate: new Date().toISOString(),
      uptime: Date.now() - this.startTime,
    };
  }

  /** Convert current entity store to GeoJSON FeatureCollection for MapLibre */
  toGeoJSON(domain?: Domain): GeoJSON.FeatureCollection {
    const entities = this.getEntities(domain);
    return {
      type: 'FeatureCollection',
      features: entities.map(e => ({
        type: 'Feature' as const,
        geometry: {
          type: 'Point' as const,
          coordinates: [e.position.lng, e.position.lat],
        },
        properties: {
          id: e.id,
          name: e.name,
          domain: e.domain,
          entityType: e.entityType,
          threat: e.threat,
          color: e.display.color,
          icon: e.display.icon,
          heading: e.position.heading || 0,
          alt: e.position.alt,
          speed: e.position.speed,
          glow: e.display.glow || false,
          scale: e.display.scale || 1.0,
          source: e.source.provider,
          ...e.properties,
        },
      })),
    };
  }

  /** Shutdown the SDK */
  destroy(): void {
    if (this.updateInterval) clearInterval(this.updateInterval);
    if (this.sseConnection) this.sseConnection.close();
    if (this.latticeAdapter) this.latticeAdapter.disconnect();
    this.entityStore.clear();
  }

  private emitUpdate(): void {
    this.config.onEntityUpdate?.(Array.from(this.entityStore.values()));
    this.config.onStatusChange?.(this.getStatus());
  }

  private getActiveFeedCount(): number {
    let count = 0;
    // Count THIRD EYE feeds that have data
    const feeds = ['commercial_flights', 'private_flights', 'military_flights', 'maritime_ships',
      'satellites', 'earthquakes', 'fires', 'cameras', 'radiation'];
    for (const feed of feeds) {
      if (this.entityStore.size > 0) count++; // Simplified: if store has data, feeds are active
    }
    if (this.latticeAdapter && this.latticeAdapter.getEntityCount() > 0) count++;
    return Math.min(count, feeds.length);
  }
}
