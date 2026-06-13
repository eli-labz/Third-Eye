/**
 * Smart System — model registry.
 *
 * Discoverability layer for models. The composition root registers each model
 * instance here so the status surface can list available capabilities and so
 * orchestration code can look models up by name or task. Typed orchestration
 * still holds direct references (DI); the registry is for enumeration/metadata.
 */

import type { Logger } from '../logger';
import type { Model, ModelInfo } from './base_model';

export class ModelRegistry {
  private readonly models = new Map<string, Model>();

  constructor(private readonly logger: Logger) {}

  register(model: Model): this {
    this.models.set(model.name, model);
    this.logger.info(`registered model ${model.name}@${model.version} (${model.task})`);
    return this;
  }

  get(name: string): Model | undefined {
    return this.models.get(name);
  }

  byTask(task: string): Model[] {
    return Array.from(this.models.values()).filter((m) => m.task === task);
  }

  list(): ModelInfo[] {
    return Array.from(this.models.values()).map((m) => m.info());
  }

  size(): number {
    return this.models.size;
  }
}
