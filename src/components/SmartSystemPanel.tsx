'use client';

/**
 * SmartSystemPanel — feature-flagged, read/review-focused surface for the
 * MSS-inspired Smart System module. Rendered only when
 * ENABLE_MSS_SMART_SYSTEM_MODULE is enabled (the parent guards visibility).
 *
 * Uses existing UI conventions (glass-panel, hud-text, CSS vars, lucide icons,
 * framer-motion). It does NOT alter or replace any existing GUI. Six views:
 * Data Feed Status, Ontology Objects, AI Recommendations, COA Comparison,
 * Human Review Queue, Audit Log. All model output is advisory; the only
 * mutating action is recording a human review decision.
 */

import { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Activity, Database, Zap, Layers, Newspaper, Play, X, ChevronDown, ChevronUp } from 'lucide-react';

type TabKey = 'feeds' | 'ontology' | 'recs' | 'coa' | 'review' | 'audit';

const TABS: { key: TabKey; label: string; icon: typeof Shield }[] = [
  { key: 'feeds', label: 'FEEDS', icon: Activity },
  { key: 'ontology', label: 'ONTOLOGY', icon: Database },
  { key: 'recs', label: 'AI RECS', icon: Zap },
  { key: 'coa', label: 'COA', icon: Layers },
  { key: 'review', label: 'REVIEW', icon: Shield },
  { key: 'audit', label: 'AUDIT', icon: Newspaper },
];

const ENDPOINT: Record<TabKey, string> = {
  feeds: '/api/smart-system/status',
  ontology: '/api/smart-system/ontology?limit=40',
  recs: '/api/smart-system/recommendations',
  coa: '/api/smart-system/coa',
  review: '/api/smart-system/review',
  audit: '/api/smart-system/audit?limit=40',
};

function Pill({ children, tone = 'muted' }: { children: React.ReactNode; tone?: 'muted' | 'green' | 'gold' | 'red' | 'cyan' }) {
  const map: Record<string, string> = {
    muted: 'text-[var(--text-muted)] border-[var(--border-primary)]',
    green: 'text-[var(--alert-green)] border-[var(--alert-green)]/40',
    gold: 'text-[var(--gold-primary)] border-[var(--gold-primary)]/40',
    red: 'text-[#FF4081] border-[#FF4081]/40',
    cyan: 'text-[var(--cyan-primary)] border-[var(--cyan-primary)]/40',
  };
  return <span className={`px-1.5 py-[1px] rounded border text-[8px] font-mono tracking-wider ${map[tone]}`}>{children}</span>;
}

export default function SmartSystemPanel() {
  const [expanded, setExpanded] = useState(true);
  const [tab, setTab] = useState<TabKey>('feeds');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (t: TabKey) => {
    setLoading(true); setError(null);
    try {
      const res = await fetch(ENDPOINT[t], { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'load failed');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(tab); }, [tab, load]);

  const runFusion = useCallback(async () => {
    setRunning(true); setError(null);
    const doRun = (key?: string | null) =>
      fetch('/api/smart-system/run', {
        method: 'POST',
        headers: key ? { 'x-smart-system-key': key } : undefined,
      });
    try {
      const stored = typeof window !== 'undefined' ? localStorage.getItem('smart-system-run-key') : null;
      let res = await doRun(stored);
      // Guarded endpoint: prompt the operator for the run key, then retry.
      if (res.status === 401 && typeof window !== 'undefined') {
        const entered = window.prompt('Operator run key required (SMART_SYSTEM_RUN_KEY):');
        if (!entered) { setError('Run is guarded — operator key required.'); return; }
        localStorage.setItem('smart-system-run-key', entered);
        res = await doRun(entered);
      }
      if (!res.ok) throw new Error(res.status === 401 ? 'invalid run key' : `HTTP ${res.status}`);
      await load(tab);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'fusion run failed');
    } finally {
      setRunning(false);
    }
  }, [tab, load]);

  const decide = useCallback(async (reviewId: string, decision: string) => {
    try {
      const res = await fetch('/api/smart-system/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewId, decision, decidedBy: 'operator' }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await load('review');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'decision failed');
    }
  }, [load]);

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
      className="glass-panel p-3 pointer-events-auto flex flex-col max-h-[80vh] thirdeye-glow"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <button onClick={() => setExpanded(e => !e)} className="flex items-center gap-2">
          <Shield className="w-3.5 h-3.5 text-[var(--gold-primary)]" />
          <span className="hud-text text-[12px] text-[var(--text-primary)]">SMART SYSTEM</span>
          <Pill tone="cyan">DECISION-SUPPORT</Pill>
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={runFusion}
            disabled={running}
            title="Ingest live feeds + run advisory models"
            className="flex items-center gap-1 px-2 py-1 rounded border border-[var(--gold-primary)]/40 text-[var(--gold-primary)] text-[9px] font-mono tracking-wider hover:bg-[var(--gold-primary)]/10 transition-colors disabled:opacity-50"
          >
            <Play className="w-3 h-3" /> {running ? 'RUNNING…' : 'RUN FUSION'}
          </button>
          {expanded ? <ChevronUp className="w-3.5 h-3.5 text-[var(--text-muted)]" /> : <ChevronDown className="w-3.5 h-3.5 text-[var(--text-muted)]" />}
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="flex flex-col min-h-0">
            {/* Human-in-the-loop notice */}
            <div className="mb-2 px-2 py-1.5 rounded border border-[var(--cyan-primary)]/30 bg-[var(--cyan-primary)]/5 text-[8px] font-mono text-[var(--text-muted)] leading-relaxed">
              AI outputs are <span className="text-[var(--cyan-primary)]">recommendations</span>, not decisions. All actions require human confirmation. Simulation-safe.
            </div>

            {/* Tabs */}
            <div className="flex gap-0.5 mb-2 overflow-x-auto styled-scrollbar">
              {TABS.map(t => {
                const Icon = t.icon;
                return (
                  <button key={t.key} onClick={() => setTab(t.key)}
                    className={`flex items-center gap-1 px-2 py-1.5 rounded text-[8px] font-mono tracking-wider whitespace-nowrap transition-all ${tab === t.key ? 'bg-[var(--hover-accent)] text-[var(--gold-primary)] border border-[var(--border-primary)]' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)] border border-transparent'}`}>
                    <Icon className="w-3 h-3" /> {t.label}
                  </button>
                );
              })}
            </div>

            {/* Body */}
            <div className="overflow-y-auto styled-scrollbar min-h-[120px] max-h-[52vh] pr-1">
              {loading && <div className="text-center py-6 text-[9px] font-mono text-[var(--text-muted)] tracking-widest">LOADING…</div>}
              {error && <div className="px-2 py-1.5 rounded border border-[#FF4081]/40 bg-[#FF4081]/10 text-[#FF4081] text-[9px] font-mono">{error}</div>}
              {!loading && !error && data && (
                <>
                  {tab === 'feeds' && <FeedsView data={data} />}
                  {tab === 'ontology' && <OntologyView data={data} />}
                  {tab === 'recs' && <RecsView data={data} />}
                  {tab === 'coa' && <CoaView data={data} />}
                  {tab === 'review' && <ReviewView data={data} onDecide={decide} />}
                  {tab === 'audit' && <AuditView data={data} />}
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Views ───────────────────────────────────────────────────────────────────

function Row({ label, value, tone }: { label: string; value: React.ReactNode; tone?: 'green' | 'gold' | 'red' | 'cyan' }) {
  const color = tone ? { green: 'var(--alert-green)', gold: 'var(--gold-primary)', red: '#FF4081', cyan: 'var(--cyan-primary)' }[tone] : 'var(--text-primary)';
  return (
    <div className="flex items-center justify-between py-1 px-1.5 rounded hover:bg-[var(--hover-accent)]">
      <span className="text-[9px] font-mono text-[var(--text-secondary)] tracking-wide truncate mr-2">{label}</span>
      <span className="text-[10px] font-mono font-bold tabular-nums" style={{ color }}>{value}</span>
    </div>
  );
}

function FeedsView({ data }: { data: any }) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-1">
        <Pill tone={data.persistence === 'kv' ? 'green' : 'muted'}>
          {data.persistence === 'kv' ? 'PERSISTENT (KV)' : 'IN-MEMORY'}
        </Pill>
        {data.runRequiresKey && <Pill tone="gold">RUN: KEY REQUIRED</Pill>}
      </div>
      <div className="grid grid-cols-3 gap-1">
        <div className="glass-panel-sm p-1.5 text-center"><div className="hud-label text-[6px]">ENTITIES</div><div className="hud-value text-[11px]">{data.ontologyTotal ?? 0}</div></div>
        <div className="glass-panel-sm p-1.5 text-center"><div className="hud-label text-[6px]">QUEUE</div><div className="hud-value text-[11px] text-[var(--gold-primary)]">{data.reviewQueue ?? 0}</div></div>
        <div className="glass-panel-sm p-1.5 text-center"><div className="hud-label text-[6px]">AUDIT</div><div className="hud-value text-[11px] text-[var(--cyan-primary)]">{data.auditEntries ?? 0}</div></div>
      </div>
      <div className="space-y-0.5">
        {(data.feeds || []).map((f: any) => (
          <Row key={f.adapterId} label={`${f.adapterId} (${f.route})`} value={`${f.status} · ${f.recordsLastPoll}`}
            tone={f.status === 'online' ? 'green' : f.status === 'degraded' ? 'red' : undefined} />
        ))}
        {(!data.feeds || data.feeds.length === 0) && <div className="text-[9px] font-mono text-[var(--text-muted)] py-2 text-center">No feeds. Press RUN FUSION.</div>}
      </div>
    </div>
  );
}

function OntologyView({ data }: { data: any }) {
  const counts: Record<string, number> = data.counts || {};
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1">
        {Object.entries(counts).map(([k, v]) => <Pill key={k} tone="gold">{k}: {v}</Pill>)}
        {Object.keys(counts).length === 0 && <span className="text-[9px] font-mono text-[var(--text-muted)]">No entities yet — RUN FUSION to ingest live feeds.</span>}
      </div>
      <div className="space-y-0.5">
        {(data.entities || []).slice(0, 40).map((e: any) => (
          <Row key={e.id} label={`${e.kind} · ${e.source}`} value={e.confidence != null ? e.confidence.toFixed(2) : '—'} />
        ))}
      </div>
    </div>
  );
}

function RecsView({ data }: { data: any }) {
  return (
    <div className="space-y-1.5">
      {(data.items || []).map((r: any) => (
        <div key={r.reviewId} className="p-2 rounded border border-[var(--border-primary)] bg-black/20">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[9px] font-mono font-bold text-[var(--gold-primary)]">{r.task}</span>
            <div className="flex gap-1">
              <Pill tone="cyan">{(r.confidence * 100).toFixed(0)}%</Pill>
              <Pill tone={r.status === 'approved' ? 'green' : r.status === 'rejected' ? 'red' : 'muted'}>{r.status}</Pill>
            </div>
          </div>
          <div className="text-[8px] font-mono text-[var(--text-secondary)] leading-relaxed">{r.explanation}</div>
          <div className="text-[7px] font-mono text-[var(--text-muted)] mt-1 italic">⚠ {r.uncertaintyNotes}</div>
          <div className="text-[7px] font-mono text-[var(--text-muted)] mt-0.5">review level: {r.reviewLevel} · {r.model}</div>
        </div>
      ))}
      {(!data.items || data.items.length === 0) && <div className="text-[9px] font-mono text-[var(--text-muted)] py-2 text-center">No recommendations. RUN FUSION.</div>}
    </div>
  );
}

function CoaView({ data }: { data: any }) {
  return (
    <div className="space-y-1.5">
      <div className="text-[8px] font-mono text-[var(--text-muted)]">{data.explanation}</div>
      {(data.comparison || []).map((c: any) => (
        <div key={c.id} className="p-2 rounded border border-[var(--border-primary)] bg-black/20">
          <div className="flex items-center justify-between mb-0.5">
            <span className="text-[9px] font-mono font-bold text-[var(--text-primary)]">#{c.rank} {c.name}</span>
            <Pill tone={c.riskScore >= 0.5 ? 'red' : 'green'}>risk {c.riskScore.toFixed(2)}</Pill>
          </div>
          <div className="text-[8px] font-mono text-[var(--text-secondary)]">{c.summary}</div>
          <div className="text-[7px] font-mono text-[var(--text-muted)] mt-1">~{c.estimatedDurationMin}min · {c.resourceFootprint}</div>
        </div>
      ))}
    </div>
  );
}

const DECISIONS: { key: string; label: string; tone: string }[] = [
  { key: 'approve', label: 'APPROVE', tone: 'var(--alert-green)' },
  { key: 'reject', label: 'REJECT', tone: '#FF4081' },
  { key: 'request_changes', label: 'CHANGES', tone: 'var(--gold-primary)' },
  { key: 'needs_more_info', label: 'MORE INFO', tone: 'var(--cyan-primary)' },
];

function ReviewView({ data, onDecide }: { data: any; onDecide: (id: string, decision: string) => void }) {
  return (
    <div className="space-y-1.5">
      {(data.items || []).map((r: any) => (
        <div key={r.reviewId} className="p-2 rounded border border-[var(--border-primary)] bg-black/20">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[9px] font-mono font-bold text-[var(--gold-primary)]">{r.task}</span>
            <Pill tone="cyan">{r.reviewLevel}</Pill>
          </div>
          <div className="text-[8px] font-mono text-[var(--text-secondary)] mb-1.5 leading-relaxed">{r.explanation}</div>
          <div className="flex flex-wrap gap-1">
            {DECISIONS.map(d => (
              <button key={d.key} onClick={() => onDecide(r.reviewId, d.key)}
                className="px-1.5 py-1 rounded border text-[7px] font-mono tracking-wider hover:bg-white/5 transition-colors"
                style={{ color: d.tone, borderColor: `${d.tone}55` }}>
                {d.label}
              </button>
            ))}
          </div>
        </div>
      ))}
      {(!data.items || data.items.length === 0) && <div className="text-[9px] font-mono text-[var(--text-muted)] py-2 text-center">Review queue empty. RUN FUSION to generate recommendations.</div>}
    </div>
  );
}

function AuditView({ data }: { data: any }) {
  return (
    <div className="space-y-0.5">
      {(data.entries || []).map((e: any) => (
        <div key={e.id} className="flex items-start gap-2 py-1 px-1.5 rounded hover:bg-[var(--hover-accent)]">
          <span className="text-[7px] font-mono text-[var(--text-muted)] tabular-nums mt-[1px]">{(e.at || '').slice(11, 19)}</span>
          <div className="flex-1 min-w-0">
            <div className="text-[8px] font-mono text-[var(--text-secondary)] truncate">{e.summary}</div>
            <div className="text-[7px] font-mono text-[var(--text-muted)]">{e.type} · {e.actor}</div>
          </div>
        </div>
      ))}
      {(!data.entries || data.entries.length === 0) && <div className="text-[9px] font-mono text-[var(--text-muted)] py-2 text-center">No audit entries yet.</div>}
    </div>
  );
}
