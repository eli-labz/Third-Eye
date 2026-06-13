/**
 * Mock computer-vision model — object detection summarization.
 *
 * Simulation-safe: performs deterministic aggregation over already-ingested
 * Detection/SatelliteImage entities. No image processing, no external model
 * calls. Output is an advisory summary recommendation.
 */

import type { Detection, SatelliteImage } from '../ontology/entities';
import type { ModelContext, ModelOutput } from './base_model';
import { BaseModel } from './base_model';

export interface CvSummary {
  totalDetections: number;
  byLabel: Record<string, number>;
  imageCount: number;
  meanCloudCoverPct: number;
  notable: Array<{ id: string; label: string; confidence: number }>;
}

export class MockCvModel extends BaseModel {
  readonly name = 'mock-cv-summarizer';
  readonly version = '0.1.0';
  readonly task = 'object_detection_summary';
  readonly description =
    'Aggregates Detection objects and SatelliteImage metadata into an advisory exploitation summary.';

  summarize(
    detections: Detection[],
    images: SatelliteImage[],
    ctx: ModelContext,
  ): ModelOutput<CvSummary> {
    const byLabel: Record<string, number> = {};
    for (const d of detections) {
      byLabel[d.label] = (byLabel[d.label] ?? 0) + 1;
    }
    const meanCloud =
      images.length > 0
        ? images.reduce((s, i) => s + i.cloudCoverPct, 0) / images.length
        : 0;
    const notable = [...detections]
      .sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0))
      .slice(0, 3)
      .map((d) => ({ id: d.id, label: d.label, confidence: d.confidence ?? 0 }));

    const summary: CvSummary = {
      totalDetections: detections.length,
      byLabel,
      imageCount: images.length,
      meanCloudCoverPct: Math.round(meanCloud * 10) / 10,
      notable,
    };

    // Confidence degrades with high cloud cover and sparse detections.
    const cloudPenalty = meanCloud / 200; // up to -0.5
    const sparsity = detections.length === 0 ? 0.4 : 0;
    const confidence = 0.85 - cloudPenalty - sparsity;

    const explanation =
      `Aggregated ${detections.length} detections across ${images.length} image(s). ` +
      `Most frequent label(s): ${Object.entries(byLabel)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([k, v]) => `${k}×${v}`)
        .join(', ') || 'none'}.`;

    const uncertaintyNotes =
      meanCloud > 40
        ? `Elevated mean cloud cover (${summary.meanCloudCoverPct}%) reduces imagery reliability.`
        : 'Nominal imagery conditions; counts derived from mock detections only.';

    return this.buildOutput<CvSummary>(ctx, {
      inputRefs: [...detections.map((d) => d.id), ...images.map((i) => i.id)],
      confidence,
      explanation,
      uncertaintyNotes,
      recommendedReviewLevel: detections.length > 0 ? 'analyst' : 'none',
      recommendation: summary,
    });
  }
}
