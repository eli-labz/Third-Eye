import { describe, expect, it } from 'vitest';
import { MockCvModel } from '../models/mock_cv_model';
import { MockAnomalyModel } from '../models/mock_anomaly_model';
import { MockLlmPlanner } from '../models/mock_llm_planner';
import { RiskScoringService } from '../models/risk_scoring_service';
import type { ModelContext } from '../models/base_model';
import { deterministic, makeDetection } from './helpers';

function ctx(): ModelContext {
  return deterministic();
}

describe('models produce explainable, advisory recommendations', () => {
  it('CV model summarizes detections with explanation + review level', () => {
    const out = new MockCvModel().summarize(
      [makeDetection('a', 'aircraft', 1, 1), makeDetection('b', 'vessel', 2, 2)],
      [],
      ctx(),
    );
    expect(out.advisoryOnly).toBe(true);
    expect(out.recommendation.totalDetections).toBe(2);
    expect(out.explanation.length).toBeGreaterThan(0);
    expect(out.uncertaintyNotes.length).toBeGreaterThan(0);
    expect(out.recommendedReviewLevel).toBe('analyst');
    expect(out.confidence).toBeGreaterThanOrEqual(0);
    expect(out.confidence).toBeLessThanOrEqual(1);
  });

  it('anomaly model flags a large same-sensor position jump', () => {
    const dets = [
      makeDetection('t1', 'aircraft', 35, 45, { sensorId: 'S1' }),
      makeDetection('t2', 'aircraft', 36.5, 46.5, { sensorId: 'S1' }), // ~200km
    ];
    const out = new MockAnomalyModel().detect(dets, ctx());
    const jumps = out.recommendation.anomalies.filter((a) => a.type === 'position_jump');
    expect(jumps.length).toBeGreaterThanOrEqual(1);
    expect(out.advisoryOnly).toBe(true);
  });

  it('anomaly model flags low-confidence detections', () => {
    const out = new MockAnomalyModel().detect(
      [makeDetection('lc', 'vessel', 0, 0, { confidence: 0.3 })],
      ctx(),
    );
    expect(out.recommendation.anomalies.some((a) => a.type === 'low_confidence')).toBe(true);
  });

  it('planner generates non-kinetic, decision-support COAs only', () => {
    const out = new MockLlmPlanner().generateCoursesOfAction(
      { reports: [], events: [] },
      ctx(),
    );
    expect(out.recommendation.coursesOfAction.length).toBeGreaterThanOrEqual(2);
    for (const coa of out.recommendation.coursesOfAction) {
      expect(coa.decisionSupportOnly).toBe(true);
      expect(`${coa.name} ${coa.summary}`).not.toMatch(/strike|kinetic|target|weapon/i);
      expect(coa.steps.length).toBeGreaterThan(0);
    }
  });

  it('risk service produces an explainable, bounded score', () => {
    const out = new RiskScoringService().score(
      { events: [], detections: [makeDetection('d', 'aircraft', 1, 1)], anomalyCount: 1 },
      ctx(),
    );
    expect(out.recommendation.score).toBeGreaterThanOrEqual(0);
    expect(out.recommendation.score).toBeLessThanOrEqual(1);
    expect(out.recommendation.factors.length).toBeGreaterThan(0);
    expect(out.recommendation.confidenceExplanation).toContain('Confidence');
  });
});
