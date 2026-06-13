/**
 * Risk-scoring service — situational risk scoring + confidence explanation.
 *
 * Transparent, weighted heuristic over real ingested entities (operational
 * events, track detections, anomalies). Produces an advisory 0..1 risk score
 * with a factor-by-factor breakdown so the score is explainable. Advisory only.
 */

import type { Detection, OperationalEvent } from '../ontology/entities';
import type { ModelContext, ModelOutput } from './base_model';
import { BaseModel } from './base_model';

export interface RiskFactor {
  name: string;
  weight: number;
  contribution: number; // weight * normalized signal
  detail: string;
}

export interface RiskAssessment {
  score: number; // 0..1
  band: 'low' | 'moderate' | 'elevated' | 'high';
  factors: RiskFactor[];
  confidenceExplanation: string;
}

function band(score: number): RiskAssessment['band'] {
  if (score >= 0.75) return 'high';
  if (score >= 0.5) return 'elevated';
  if (score >= 0.25) return 'moderate';
  return 'low';
}

export interface RiskInputs {
  events: OperationalEvent[];
  detections: Detection[];
  /** Count of anomalies flagged by the anomaly model, if available. */
  anomalyCount?: number;
}

export class RiskScoringService extends BaseModel {
  readonly name = 'risk-scoring-service';
  readonly version = '0.1.0';
  readonly task = 'risk_scoring';
  readonly description =
    'Weighted, explainable situational risk score over real ingested events/tracks/anomalies (advisory).';

  score(inputs: RiskInputs, ctx: ModelContext): ModelOutput<RiskAssessment> {
    const { events, detections } = inputs;
    const anomalyCount = inputs.anomalyCount ?? 0;

    const severityWeight: Record<OperationalEvent['severity'], number> = {
      info: 0,
      low: 0.25,
      medium: 0.6,
      high: 1,
    };
    const meanSeverity =
      events.length > 0
        ? events.reduce((s, e) => s + severityWeight[e.severity], 0) / events.length
        : 0;

    // Normalize signals to 0..1.
    const trackDensity = Math.min(1, detections.length / 200);
    const anomalySignal = Math.min(1, anomalyCount / 5);

    const factors: RiskFactor[] = [
      {
        name: 'event_severity',
        weight: 0.5,
        contribution: 0.5 * meanSeverity,
        detail: `mean operational-event severity ${meanSeverity.toFixed(2)} over ${events.length} event(s)`,
      },
      {
        name: 'track_density',
        weight: 0.2,
        contribution: 0.2 * trackDensity,
        detail: `${detections.length} track detection(s) (normalized ${trackDensity.toFixed(2)})`,
      },
      {
        name: 'anomalies',
        weight: 0.3,
        contribution: 0.3 * anomalySignal,
        detail: `${anomalyCount} anomaly candidate(s) (normalized ${anomalySignal.toFixed(2)})`,
      },
    ];

    const score = Math.max(0, Math.min(1, factors.reduce((s, f) => s + f.contribution, 0)));

    // Confidence reflects data availability — sparse inputs => low confidence.
    const dataPoints = events.length + detections.length;
    const confidence = Math.max(0.2, Math.min(0.85, dataPoints / 100));
    const confidenceExplanation =
      `Confidence ${confidence.toFixed(2)} derived from data volume (${dataPoints} entities). ` +
      `Heuristic weights are fixed and transparent; no learned model is used.`;

    const assessment: RiskAssessment = {
      score: Math.round(score * 1000) / 1000,
      band: band(score),
      factors,
      confidenceExplanation,
    };

    return this.buildOutput<RiskAssessment>(ctx, {
      inputRefs: [...events.map((e) => e.id), ...detections.map((d) => d.id)],
      confidence,
      explanation:
        `Situational risk ${assessment.score} (${assessment.band}). ` +
        factors.map((f) => `${f.name}=${f.contribution.toFixed(2)}`).join(', ') + '.',
      uncertaintyNotes:
        'Fixed-weight heuristic on real but partial data; not a calibrated probability. ' +
        'Intended to prioritize human review, not to drive action.',
      recommendedReviewLevel: assessment.band === 'high' ? 'command' : assessment.band === 'elevated' ? 'supervisor' : 'analyst',
      recommendation: assessment,
    });
  }
}
