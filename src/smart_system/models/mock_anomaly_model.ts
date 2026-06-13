/**
 * Mock anomaly-detection model — anomalies over track detections.
 *
 * Simulation-safe heuristic: flags implausible position jumps between
 * consecutive detections from the same sensor, and low-confidence tracks.
 * Advisory only.
 */

import type { Detection } from '../ontology/entities';
import type { ModelContext, ModelOutput } from './base_model';
import { BaseModel } from './base_model';

export interface TrackAnomaly {
  detectionId: string;
  type: 'position_jump' | 'low_confidence';
  detail: string;
  severity: 'low' | 'medium' | 'high';
}

export interface AnomalyReport {
  evaluated: number;
  anomalies: TrackAnomaly[];
}

/** Haversine-ish great-circle distance in km (good enough for heuristics). */
function distanceKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

export class MockAnomalyModel extends BaseModel {
  readonly name = 'mock-anomaly-detector';
  readonly version = '0.1.0';
  readonly task = 'anomaly_detection';
  readonly description =
    'Flags implausible track position jumps and low-confidence detections (heuristic, advisory).';

  /** Distance beyond which a same-sensor jump is considered anomalous (km). */
  private readonly jumpThresholdKm = 25;
  private readonly lowConfidenceThreshold = 0.6;

  detect(detections: Detection[], ctx: ModelContext): ModelOutput<AnomalyReport> {
    const anomalies: TrackAnomaly[] = [];

    // Group by sensor, order by time, check consecutive jumps.
    const bySensor = new Map<string, Detection[]>();
    for (const d of detections) {
      const key = d.sensorId ?? 'unknown';
      const arr = bySensor.get(key) ?? [];
      arr.push(d);
      bySensor.set(key, arr);
    }
    for (const arr of bySensor.values()) {
      arr.sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp));
      for (let i = 1; i < arr.length; i++) {
        const km = distanceKm(arr[i - 1].location, arr[i].location);
        if (km > this.jumpThresholdKm) {
          anomalies.push({
            detectionId: arr[i].id,
            type: 'position_jump',
            detail: `${Math.round(km)} km from prior detection on same sensor (${arr[i].sensorId ?? 'unknown'})`,
            severity: km > 60 ? 'high' : 'medium',
          });
        }
      }
    }
    for (const d of detections) {
      if ((d.confidence ?? 1) < this.lowConfidenceThreshold) {
        anomalies.push({
          detectionId: d.id,
          type: 'low_confidence',
          detail: `confidence ${(d.confidence ?? 0).toFixed(2)} below ${this.lowConfidenceThreshold}`,
          severity: 'low',
        });
      }
    }

    const report: AnomalyReport = { evaluated: detections.length, anomalies };
    const hasHigh = anomalies.some((a) => a.severity === 'high');

    return this.buildOutput<AnomalyReport>(ctx, {
      inputRefs: detections.map((d) => d.id),
      confidence: detections.length >= 2 ? 0.7 : 0.4,
      explanation:
        `Evaluated ${detections.length} track detection(s); found ${anomalies.length} anomaly candidate(s) ` +
        `(${anomalies.filter((a) => a.type === 'position_jump').length} jump, ` +
        `${anomalies.filter((a) => a.type === 'low_confidence').length} low-confidence).`,
      uncertaintyNotes:
        'Heuristic thresholds on mock data; no kinematic model or sensor error budget applied. ' +
        'Jumps may be legitimate (sensor handoff, sparse sampling).',
      recommendedReviewLevel: hasHigh ? 'supervisor' : anomalies.length > 0 ? 'analyst' : 'none',
      recommendation: report,
    });
  }
}
