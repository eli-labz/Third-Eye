/**
 * Asset tracking & visibility service.
 *
 * Read-only situational-awareness surface: sensor/drone metadata review,
 * friendly-unit (blue-force) visibility, logistics visibility, and force
 * tracking over real ingested tracks. No control, command, or tasking.
 */

import type { OntologyRepository } from '../ontology/repository';
import type { Logger } from '../logger';
import type { Detection, DroneAsset, Unit } from '../ontology/entities';

export interface AssetVisibility {
  /** Sensor/track detections grouped by label (aircraft/vessel/satellite). */
  trackCountsByLabel: Record<string, number>;
  totalTracks: number;
  /** Drone/sensor assets (empty until a real drone feed is wired). */
  drones: Array<{ id: string; callsign: string; status: string }>;
  /** Friendly units (empty until a real blue-force feed is wired). */
  friendlyUnits: Array<{ id: string; designation: string; readiness?: string }>;
  notes: string;
}

export class AssetTrackingService {
  constructor(
    private readonly repo: OntologyRepository,
    private readonly logger: Logger,
  ) {}

  /** Snapshot of asset/track visibility from real ingested data. */
  visibility(): AssetVisibility {
    const tracks = this.repo.query({ kind: 'Detection' }) as Detection[];
    const drones = this.repo.query({ kind: 'DroneAsset' }) as DroneAsset[];
    const units = this.repo.query({ kind: 'Unit' }) as Unit[];

    const byLabel: Record<string, number> = {};
    for (const t of tracks) byLabel[t.label] = (byLabel[t.label] ?? 0) + 1;

    const empties: string[] = [];
    if (drones.length === 0) empties.push('no drone/sensor feed connected');
    if (units.length === 0) empties.push('no blue-force feed connected');

    return {
      trackCountsByLabel: byLabel,
      totalTracks: tracks.length,
      drones: drones.map((d) => ({ id: d.id, callsign: d.callsign, status: d.status })),
      friendlyUnits: units.map((u) => ({ id: u.id, designation: u.designation, readiness: u.readiness })),
      notes: empties.length ? empties.join('; ') : 'all asset feeds reporting',
    };
  }
}
