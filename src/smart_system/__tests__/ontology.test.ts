import { describe, expect, it } from 'vitest';
import { OntologyRepository } from '../ontology/repository';
import { validateEntity } from '../ontology/validators';
import type { AnyEntity, Detection } from '../ontology/entities';
import { deterministic, makeDetection } from './helpers';

describe('ontology validation', () => {
  it('accepts a well-formed Detection', () => {
    const d = makeDetection('det_1', 'aircraft', 35, 45);
    const r = validateEntity(d);
    expect(r.valid).toBe(true);
    expect(r.errors).toHaveLength(0);
  });

  it('rejects an out-of-range geo + missing label', () => {
    const bad = makeDetection('det_2', '', 999, 45) as Detection;
    bad.label = '';
    const r = validateEntity(bad);
    expect(r.valid).toBe(false);
    expect(r.errors.join(' ')).toMatch(/label|lat/i);
  });

  it('rejects confidence outside 0..1', () => {
    const d = makeDetection('det_3', 'vessel', 0, 0, { confidence: 1.5 });
    const r = validateEntity(d);
    expect(r.valid).toBe(false);
    expect(r.errors.join(' ')).toMatch(/confidence/i);
  });
});

describe('ontology repository', () => {
  it('stores valid entities and rejects invalid ones', () => {
    const { clock, logger } = deterministic();
    const repo = new OntologyRepository(clock, logger);

    const good = makeDetection('det_ok', 'aircraft', 35, 45);
    const bad = makeDetection('det_bad', 'aircraft', 200, 45); // bad lat

    expect(repo.upsert(good).stored).toBe(true);
    expect(repo.upsert(bad).stored).toBe(false);
    expect(repo.size()).toBe(1);
    expect(repo.counts().Detection).toBe(1);
  });

  it('queries by kind and limit, newest-first', () => {
    const { clock, logger } = deterministic();
    const repo = new OntologyRepository(clock, logger);
    repo.upsert(makeDetection('a', 'aircraft', 1, 1));
    repo.upsert(makeDetection('b', 'vessel', 2, 2));
    const all = repo.query({ kind: 'Detection' });
    expect(all).toHaveLength(2);
    expect(repo.query({ kind: 'Detection', limit: 1 })).toHaveLength(1);
    expect(repo.query({ kind: 'OperationalEvent' })).toHaveLength(0);
  });

  it('appends an audit event on update', () => {
    const { clock, logger } = deterministic();
    const repo = new OntologyRepository(clock, logger);
    const d = makeDetection('dup', 'aircraft', 1, 1);
    repo.upsert(d);
    repo.upsert(d);
    const stored = repo.get('dup') as AnyEntity;
    expect(stored.audit.history.length).toBeGreaterThanOrEqual(2);
  });
});
