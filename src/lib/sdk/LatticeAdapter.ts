/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  THIRD EYE SDK — Lattice Adapter                                ║
 * ║  Anduril Lattice Entity Translation Layer                       ║
 * ║                                                                 ║
 * ║  Translates Lattice Track/Sensor state → ThirdEye Entities     ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

import {
  type ThirdEyeEntity,
  type LatticeConfig,
  type LatticeConnectionStatus,
  Domain,
  EntityType,
  ThreatLevel,
  Classification,
} from './types';

// ── Lattice Raw Types (Simulated from Lattice SDK docs) ────────────

interface LatticeTrack {
  entityId: string;
  displayName: string;
  trackType: string;       // 'AIR' | 'SURFACE' | 'SUBSURFACE' | 'SPACE' | 'LAND'
  position: {
    latitude_deg: number;
    longitude_deg: number;
    altitude_hae_m?: number;
  };
  kinematics?: {
    speed_mps?: number;
    heading_deg?: number;
  };
  classification?: string;
  allegiance?: string;     // 'FRIENDLY' | 'HOSTILE' | 'NEUTRAL' | 'UNKNOWN'
  timestamp: string;
  metadata?: Record<string, string>;
}

// ── Domain Mapping ─────────────────────────────────────────────────

const LATTICE_DOMAIN_MAP: Record<string, Domain> = {
  'AIR':        Domain.AIR,
  'SURFACE':    Domain.SEA,
  'SUBSURFACE': Domain.SUBSURFACE,
  'SPACE':      Domain.SPACE,
  'LAND':       Domain.LAND,
};

const ALLEGIANCE_THREAT_MAP: Record<string, ThreatLevel> = {
  'HOSTILE':  ThreatLevel.CRITICAL,
  'SUSPECT':  ThreatLevel.HIGH,
  'UNKNOWN':  ThreatLevel.ELEVATED,
  'NEUTRAL':  ThreatLevel.LOW,
  'FRIENDLY': ThreatLevel.NONE,
};

const ALLEGIANCE_COLOR_MAP: Record<string, string> = {
  'HOSTILE':  '#FF1744',
  'SUSPECT':  '#FF9500',
  'UNKNOWN':  '#FFD700',
  'NEUTRAL':  '#00BCD4',
  'FRIENDLY': '#00E676',
};

// ── Adapter Class ──────────────────────────────────────────────────

export class LatticeAdapter {
  private config: LatticeConfig;
  private status: LatticeConnectionStatus = 'disconnected';
  private entityBuffer: Map<string, ThirdEyeEntity> = new Map();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private eventSource: EventSource | null = null;

  constructor(config: LatticeConfig) {
    this.config = config;
  }

  /** Current connection status */
  getStatus(): LatticeConnectionStatus {
    return this.status;
  }

  /** All currently tracked Lattice entities */
  getEntities(): ThirdEyeEntity[] {
    return Array.from(this.entityBuffer.values());
  }

  /** Entity count */
  getEntityCount(): number {
    return this.entityBuffer.size;
  }

  /**
   * Connect to Lattice entity stream.
   * In production, this would open a gRPC stream or SSE connection
   * to the Lattice API. For the SDK layer, we simulate the protocol.
   */
  async connect(): Promise<void> {
    this.setStatus('connecting');

    try {
      // In a real Lattice integration, this would be:
      // const stream = await latticeClient.subscribeToEntities(this.config.entityFilter);
      // stream.on('data', (track) => this.handleTrack(track));

      // For now, we validate the configuration and set up the adapter
      if (!this.config.endpoint || !this.config.token) {
        this.setStatus('disconnected');
        return;
      }

      this.setStatus('authenticated');

      // Attempt SSE connection to Lattice endpoint
      if (typeof EventSource !== 'undefined') {
        try {
          this.eventSource = new EventSource(
            `${this.config.endpoint}/v1/entities/stream?token=${this.config.token}`
          );

          this.eventSource.onopen = () => {
            this.setStatus('streaming');
          };

          this.eventSource.onmessage = (event) => {
            try {
              const track: LatticeTrack = JSON.parse(event.data);
              const entity = this.translateTrack(track);
              this.entityBuffer.set(entity.id, entity);
            } catch {
              // Skip malformed messages
            }
          };

          this.eventSource.onerror = () => {
            this.setStatus('error');
            this.scheduleReconnect();
          };
        } catch {
          // EventSource connection failed, adapter remains in authenticated state
          this.setStatus('authenticated');
        }
      }
    } catch {
      this.setStatus('error');
      this.scheduleReconnect();
    }
  }

  /** Disconnect from Lattice */
  disconnect(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.entityBuffer.clear();
    this.setStatus('disconnected');
  }

  /**
   * Manually ingest a Lattice track (for webhook/push integrations).
   * This is the public API for external systems to push Lattice-format
   * data directly into the ThirdEye COP.
   */
  ingestTrack(track: LatticeTrack): ThirdEyeEntity {
    const entity = this.translateTrack(track);
    this.entityBuffer.set(entity.id, entity);
    return entity;
  }

  /**
   * Translate a raw Lattice Track into a normalized ThirdEye Entity.
   * This is the core intelligence translation function.
   */
  private translateTrack(track: LatticeTrack): ThirdEyeEntity {
    const domain = LATTICE_DOMAIN_MAP[track.trackType] || Domain.LAND;
    const allegiance = track.allegiance || 'UNKNOWN';
    const threat = ALLEGIANCE_THREAT_MAP[allegiance] || ThreatLevel.ELEVATED;
    const color = ALLEGIANCE_COLOR_MAP[allegiance] || '#FFD700';

    // Determine icon based on domain
    let icon = 'dot-gold';
    if (domain === Domain.AIR) icon = 'plane-cyan';
    else if (domain === Domain.SEA) icon = 'dot-orange';
    else if (domain === Domain.SPACE) icon = 'dot-gold';

    return {
      id: `lattice-${track.entityId}`,
      name: track.displayName || `TRACK-${track.entityId.slice(0, 8)}`,
      domain,
      entityType: EntityType.TRACK,
      position: {
        lat: track.position.latitude_deg,
        lng: track.position.longitude_deg,
        alt: track.position.altitude_hae_m,
        heading: track.kinematics?.heading_deg,
        speed: track.kinematics?.speed_mps
          ? track.kinematics.speed_mps * 1.94384  // m/s → knots
          : undefined,
      },
      threat,
      classification: Classification.UNCLASSIFIED,
      source: {
        provider: 'anduril-lattice',
        feed: 'entity-stream',
        originalId: track.entityId,
        confidence: 0.95,
      },
      timestamp: track.timestamp || new Date().toISOString(),
      properties: {
        allegiance,
        trackType: track.trackType,
        ...track.metadata,
      },
      display: {
        color,
        icon,
        layerType: domain === Domain.AIR ? 'symbol' : 'circle',
        glow: threat >= ThreatLevel.HIGH,
        scale: threat >= ThreatLevel.CRITICAL ? 1.5 : 1.0,
      },
    };
  }

  private setStatus(status: LatticeConnectionStatus): void {
    this.status = status;
    this.config.onStatusChange?.(status);
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, 5000);
  }
}
