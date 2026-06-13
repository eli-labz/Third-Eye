/**
 * Imagery exploitation service.
 *
 * Application-facing read/analysis surface. Combines ingested Detection and
 * SatelliteImage entities with the CV summarizer to produce an advisory
 * exploitation summary. Pure analysis — produces no tasking.
 */

import type { Clock, IdGen } from '../runtime';
import type { Logger } from '../logger';
import type { OntologyRepository } from '../ontology/repository';
import type { Detection, SatelliteImage } from '../ontology/entities';
import type { ModelContext, ModelOutput } from '../models/base_model';
import type { CvSummary, MockCvModel } from '../models/mock_cv_model';

export interface ImageryExploitation {
  imageCount: number;
  detectionCount: number;
  summary: ModelOutput<CvSummary>;
}

export class ImageryService {
  constructor(
    private readonly repo: OntologyRepository,
    private readonly cv: MockCvModel,
    private readonly clock: Clock,
    private readonly idGen: IdGen,
    private readonly logger: Logger,
  ) {}

  private modelCtx(): ModelContext {
    return { clock: this.clock, idGen: this.idGen, logger: this.logger };
  }

  /** Build an advisory imagery-exploitation summary from real ingested data. */
  exploit(): ImageryExploitation {
    const detections = this.repo.query({ kind: 'Detection' }) as Detection[];
    const images = this.repo.query({ kind: 'SatelliteImage' }) as SatelliteImage[];
    const summary = this.cv.summarize(detections, images, this.modelCtx());
    this.logger.info(
      `imagery exploitation: ${detections.length} detections, ${images.length} images`,
    );
    return { imageCount: images.length, detectionCount: detections.length, summary };
  }
}
