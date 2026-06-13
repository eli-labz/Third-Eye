# Smart System Module (MSS-inspired data fusion)

A modular, **feature-flagged**, **human-in-the-loop** data-fusion capability layered
conservatively onto Third Eye. It is **off by default** and **invisible** unless
explicitly enabled. Nothing in it performs autonomous, kinetic, or real-world
operational tasking — every output is a **decision-support recommendation** that
requires human confirmation, and all model work is simulation-safe.

## Enable / disable

```env
ENABLE_MSS_SMART_SYSTEM_MODULE=true
```

- **Off (default):** the GUI, routes, styling and workflows are exactly as before.
  The `/api/smart-system/*` routes return `404`; no nav item appears.
- **On:** a code-split "Smart System" panel appears in the right-hand tool strip,
  and the API routes activate.

The flag is read via `process.env.ENABLE_MSS_SMART_SYSTEM_MODULE` and surfaced to
the client bundle under the same name via `next.config.ts` (`env`), so one flag
controls both server and client.

### Securing the `/run` endpoint

`POST /api/smart-system/run` is heavy (it ingests thousands of live entities and
fans out to the internal feeds). On a public deployment, guard it:

```env
SMART_SYSTEM_RUN_KEY=<random-secret>   # openssl rand -hex 32
```

When set, callers must supply the key via the `x-smart-system-key` header (or
`?key=`); the panel's **RUN FUSION** button prompts the operator for it once and
remembers it in `localStorage`. When unset, `/run` is open (fine for local/dev).
The key is **server-only** (never inlined into the client bundle). All read
endpoints stay open (they only expose already-reviewed, simulation-safe data).

### Persistence (surviving serverless requests)

By default the Smart System keeps its state **in-memory**, which on Vercel is
per-isolate — a `RUN FUSION` and a later tab read may hit different isolates. To
make state survive across requests, point it at a KV store (Vercel KV / Upstash):

```env
KV_REST_API_URL=...      # auto-injected when you add Vercel KV to the project
KV_REST_API_TOKEN=...
```

Each request then hydrates from a shared, bounded snapshot (newest entities +
full review queue + audit) and persists after mutations. With no KV configured,
behavior is unchanged (in-memory singleton). The status endpoint reports the
active mode via `"persistence": "kv" | "null"`.

**Provisioning on Vercel:** Project → **Storage** → create a **KV** store → it
auto-injects `KV_REST_API_*` → redeploy. No code change needed.

## Architecture (five layers)

All code lives under [`src/smart_system/`](../src/smart_system) and keeps its own
isolated in-memory store — it never touches existing app state or the database.

| Layer | Folder | What it does |
|-------|--------|--------------|
| **A. Ingestion** | `ingestion/` | Adapters pull the platform's **real** live feeds (`/api/flights`, `/api/maritime`, `/api/satellites`, `/api/earthquakes`, `/api/gdelt`, `/api/news`) and emit normalized `RawRecord`s. `fetchJson` is injected (real HTTP in prod, test double in tests). **No mock/fabricated data.** |
| **B. Ontology** | `ontology/` | Canonical entities (`Detection`, `SatelliteImage`, `AreaOfInterest`, `DroneAsset`, `Unit`, `Task`, `CourseOfAction`, `IntelligenceReport`, `OperationalEvent`, `HumanReviewDecision`) with id / source / timestamp / confidence / provenance / classification / audit trail + validators + repository. |
| **C. Models** | `models/` | Advisory models: object-detection summary, track anomaly detection, report summarization, COA generation, risk scoring. Every output is a `ModelOutput` with model name+version, input refs, confidence, explanation, uncertainty notes, recommended review level, and `advisoryOnly: true`. |
| **D. Operational apps** | `apps/` | Read/analysis surfaces: imagery exploitation, asset/force visibility, COA comparison, operational timeline. Planning/analysis artifacts only — no kinetic workflows. |
| **E. Human review** | `review/` | Recommendations enter a **pending** queue; a human can approve / reject / request changes / needs-more-info. Every decision is audit-logged, persisted as a `HumanReviewDecision` entity, and both AI and human-modified versions are preserved with side-by-side comparison. |

Composition root: [`src/smart_system/system.ts`](../src/smart_system/system.ts)
(`createSmartSystem()` for DI/tests, `getSmartSystem()` singleton for routes).

### Entities without a real feed

`SatelliteImage`, `DroneAsset`, blue-force `Unit`, and `AreaOfInterest` have **no**
live platform feed today. Their types and adapter interfaces are retained so a real
source can be wired later, but they are **populated with nothing** — no fabricated
data.

## API (all `404` when the flag is off)

| Method | Route | Purpose |
|--------|-------|---------|
| `POST` | `/api/smart-system/run` | Ingest live feeds + run advisory models → enqueue recommendations |
| `GET` | `/api/smart-system/status` | Feed status, ontology counts, models, queue/audit sizes |
| `GET` | `/api/smart-system/ontology?kind=&limit=` | Canonical ontology objects |
| `GET` | `/api/smart-system/recommendations` | AI recommendations + review status |
| `GET` | `/api/smart-system/coa` | Generated, ranked decision-support COAs |
| `GET` / `POST` | `/api/smart-system/review` | Pending queue / record a human decision |
| `GET` | `/api/smart-system/audit` | Append-only audit log |

## GUI

A single feature-flagged tool-strip button opens `SmartSystemPanel`
([`src/components/SmartSystemPanel.tsx`](../src/components/SmartSystemPanel.tsx))
with six read/review views: **Data Feed Status, Ontology Objects, AI
Recommendations, COA Comparison, Human Review Queue, Audit Log**. It uses existing
UI conventions (`glass-panel`, `hud-text`, CSS vars, framer-motion, lucide). The
default landing page and existing navigation are unchanged when the flag is off.

## Tests

```bash
npm test     # vitest run
```

Covers the feature flag, ontology validation/repository, ingestion (with an
injected fetch double), each model, the human-review loop, and an end-to-end
integration: **ingestion → ontology → model recommendation → human review →
audit**.

## Safety properties

- Model outputs are advisory (`advisoryOnly: true`) and always routed to a human
  queue; they are never executed.
- COAs are non-kinetic (observation / ISR / logistics) and `decisionSupportOnly: true`.
- No autonomous weapons, targeting, live drone control, or real-world tasking.
- Adapters make no new external calls — they reuse the platform's own routes.
- All decisions are audit-logged and reversible; the module is isolated and can be
  disabled at any time with zero impact on the rest of the app.
