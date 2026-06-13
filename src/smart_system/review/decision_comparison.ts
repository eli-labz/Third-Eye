/**
 * Smart System — AI-vs-human decision comparison.
 *
 * Produces a side-by-side diff between the AI recommendation payload and the
 * human-modified version, so reviewers can see exactly what a human changed.
 * Shallow-to-nested field diff over JSON-serializable recommendation payloads.
 */

export type ChangeKind = 'added' | 'removed' | 'changed' | 'unchanged';

export interface FieldChange {
  path: string;
  kind: ChangeKind;
  aiValue?: unknown;
  humanValue?: unknown;
}

export interface DecisionComparison {
  changed: boolean;
  changes: FieldChange[];
  summary: string;
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function diff(ai: unknown, human: unknown, path: string, out: FieldChange[]): void {
  if (isObject(ai) && isObject(human)) {
    const keys = new Set([...Object.keys(ai), ...Object.keys(human)]);
    for (const k of keys) {
      const childPath = path ? `${path}.${k}` : k;
      const inAi = k in ai;
      const inHuman = k in human;
      if (inAi && !inHuman) out.push({ path: childPath, kind: 'removed', aiValue: ai[k] });
      else if (!inAi && inHuman) out.push({ path: childPath, kind: 'added', humanValue: human[k] });
      else diff(ai[k], human[k], childPath, out);
    }
    return;
  }
  const equal = JSON.stringify(ai) === JSON.stringify(human);
  out.push({
    path: path || '(root)',
    kind: equal ? 'unchanged' : 'changed',
    aiValue: ai,
    humanValue: human,
  });
}

/**
 * Compare an AI recommendation payload to a human-modified version.
 * Pass `undefined` for `humanVersion` when the human approved verbatim.
 */
export function compareDecision(aiVersion: unknown, humanVersion: unknown): DecisionComparison {
  if (humanVersion === undefined) {
    return { changed: false, changes: [], summary: 'Human accepted the AI recommendation without changes.' };
  }
  const all: FieldChange[] = [];
  diff(aiVersion, humanVersion, '', all);
  const changes = all.filter((c) => c.kind !== 'unchanged');
  const counts = changes.reduce(
    (acc, c) => ((acc[c.kind] = (acc[c.kind] ?? 0) + 1), acc),
    {} as Record<string, number>,
  );
  return {
    changed: changes.length > 0,
    changes,
    summary:
      changes.length === 0
        ? 'Human version is identical to the AI recommendation.'
        : `Human modified ${changes.length} field(s): ` +
          Object.entries(counts).map(([k, v]) => `${v} ${k}`).join(', ') + '.',
  };
}
