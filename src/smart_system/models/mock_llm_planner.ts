/**
 * Mock LLM planner — report summarization + course-of-action generation.
 *
 * Simulation-safe: deterministic, template-based text generation. No external
 * LLM calls. Crucially, every generated Course of Action is non-kinetic and
 * `decisionSupportOnly: true` — observation / analysis / logistics options that
 * must be reviewed and confirmed by a human. There is NO targeting, weapons,
 * or execution output of any kind.
 */

import type { Clock, IdGen } from '../runtime';
import type { Logger } from '../logger';
import type {
  AreaOfInterest,
  CourseOfAction,
  IntelligenceReport,
  OperationalEvent,
} from '../ontology/entities';
import { makeEntityBase } from '../ontology/entities';
import type { ModelContext, ModelOutput } from './base_model';
import { BaseModel } from './base_model';

export interface ReportSummary {
  reportCount: number;
  summary: string;
  keyPoints: string[];
}

export interface CoaSet {
  coursesOfAction: CourseOfAction[];
}

export interface PlanningContext {
  aoi?: AreaOfInterest;
  reports: IntelligenceReport[];
  events: OperationalEvent[];
}

function firstSentence(text: string): string {
  const m = text.match(/[^.!?]+[.!?]/);
  return (m ? m[0] : text).trim();
}

export class MockLlmPlanner extends BaseModel {
  readonly name = 'mock-llm-planner';
  readonly version = '0.1.0';
  readonly task = 'planning';
  readonly description =
    'Summarizes reports and generates non-kinetic, decision-support courses of action (advisory).';

  /** Report summarization. */
  summarizeReports(
    reports: IntelligenceReport[],
    ctx: ModelContext,
  ): ModelOutput<ReportSummary> {
    const keyPoints = reports.slice(0, 5).map((r) => `${r.title}: ${firstSentence(r.body)}`);
    const summary =
      reports.length === 0
        ? 'No reports available to summarize.'
        : `Synthesis of ${reports.length} report(s). Overall posture appears routine; ` +
          `lowest-confidence item warrants analyst review. ${keyPoints.length} key point(s) extracted.`;

    const meanConf =
      reports.length > 0
        ? reports.reduce((s, r) => s + (r.confidence ?? 0.5), 0) / reports.length
        : 0.4;

    return this.buildOutput<ReportSummary>(ctx, {
      task: 'report_summarization',
      inputRefs: reports.map((r) => r.id),
      confidence: Math.min(0.8, 0.4 + meanConf / 2),
      explanation: `Template synthesis over ${reports.length} report(s); key points extracted from titles/lead sentences.`,
      uncertaintyNotes:
        'Extractive mock summary — no semantic reasoning. Confidence reflects mean source confidence only.',
      recommendedReviewLevel: reports.length > 0 ? 'analyst' : 'none',
      recommendation: { reportCount: reports.length, summary, keyPoints },
    });
  }

  /** Generate non-kinetic, decision-support courses of action for comparison. */
  generateCoursesOfAction(
    context: PlanningContext,
    ctx: ModelContext,
  ): ModelOutput<CoaSet> {
    const inputRefs = [
      ...(context.aoi ? [context.aoi.id] : []),
      ...context.reports.map((r) => r.id),
      ...context.events.map((e) => e.id),
    ];
    const aoiName = context.aoi?.name ?? 'the area of interest';

    const templates: Array<{
      name: string;
      summary: string;
      steps: string[];
      riskScore: number;
      durationMin: number;
      footprint: string;
    }> = [
      {
        name: 'COA-1: Sustain Passive Observation',
        summary: `Maintain current ISR posture over ${aoiName} and continue analysis.`,
        steps: [
          'Continue existing sensor coverage without change',
          'Increase analyst review cadence on incoming detections',
          'Re-evaluate in next planning cycle',
        ],
        riskScore: 0.2,
        durationMin: 720,
        footprint: 'No additional assets',
      },
      {
        name: 'COA-2: Surge ISR Coverage',
        summary: `Recommend (for human approval) re-tasking available ISR to close coverage gaps over ${aoiName}.`,
        steps: [
          'Identify coverage gaps from operational events',
          'Draft ISR collection request for approval',
          'On approval, schedule additional observation windows',
        ],
        riskScore: 0.45,
        durationMin: 480,
        footprint: '1–2 additional ISR observation windows',
      },
      {
        name: 'COA-3: Reposition Logistics Support',
        summary: `Plan logistics repositioning to improve sustainment near ${aoiName}.`,
        steps: [
          'Assess current logistics unit readiness',
          'Model repositioning options and timelines',
          'Prepare recommendation package for command review',
        ],
        riskScore: 0.55,
        durationMin: 960,
        footprint: 'Logistics movement (planning only)',
      },
    ];

    const coursesOfAction: CourseOfAction[] = templates.map((t) => ({
      ...makeEntityBase({
        id: ctx.idGen.next('coa'),
        kind: 'CourseOfAction',
        source: `${this.name}@${this.version}`,
        timestamp: ctx.clock.iso(),
        confidence: 0.6,
        classification: 'SIMULATED',
        provenance: {
          adapterId: this.name,
          sourceType: 'operational',
          ingestedAt: ctx.clock.iso(),
          pipeline: ['model:planner', 'generate-coa'],
          simulated: true,
        },
        clock: ctx.clock,
        tags: ['coa', 'decision-support'],
      }),
      kind: 'CourseOfAction',
      name: t.name,
      summary: t.summary,
      steps: t.steps.map((description, i) => ({ order: i + 1, description })),
      riskScore: t.riskScore,
      estimatedDurationMin: t.durationMin,
      resourceFootprint: t.footprint,
      decisionSupportOnly: true,
    }));

    return this.buildOutput<CoaSet>(ctx, {
      task: 'course_of_action_generation',
      inputRefs,
      confidence: 0.6,
      explanation:
        `Generated ${coursesOfAction.length} non-kinetic course(s) of action (observation/ISR/logistics) ` +
        `for human comparison and approval.`,
      uncertaintyNotes:
        'Template-based options on mock context. All COAs are decision-support only and require human confirmation. ' +
        'No kinetic, targeting, or execution options are produced.',
      recommendedReviewLevel: 'supervisor',
      recommendation: { coursesOfAction },
    });
  }
}

// Re-export runtime types referenced above for convenience in DI wiring.
export type { Clock, IdGen, Logger };
