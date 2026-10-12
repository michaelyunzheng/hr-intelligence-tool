# Forma — HR Intelligence Platform

A locally runnable enterprise workforce intelligence MVP built with Next.js App Router, TypeScript, Tailwind CSS, Lucide and Recharts. All 36 employees, 6 roles, 12 skills and workplace evidence records are synthetic.

## Run

Use Node.js 22+ and npm, with the same CPU architecture used when installing dependencies.

```sh
npm install
npm run dev
# Open http://localhost:3000
npm test
npm run lint
npm run build
npm start
```

## Demonstrate the workflow

1. Explore the overview; filter by department, role and skill category.
2. Open **Skills intelligence → Alex Morgan** and inspect the service intelligence pilot evidence.
3. Select **Run skills inference**. Applied AI and governance evidence becomes visible as inferred skills.
4. Verify, reject or change proficiency (changing proficiency verifies it). Select Employee or Manager to record the demo reviewer. Decisions and timestamps appear in validation history and survive subsequent inference runs.
5. Open **Talent mobility**, select Alex and AI Solutions Lead. Review the weighted match, missing proficiency and specific learning assignments. Toggle verified-only supply to see the distinction.
6. Open **Workforce planning**, increase Data & AI demand and save assumptions. Skill validation immediately changes supply and gaps. Saved scenarios reopen against current data; global filters remain active.
7. Explore **Job architecture** and **Work intelligence** for task shares, capability requirements and illustrative AI augmentation/automation opportunities.
8. Use **Data & sources** to download a sample CSV, validate it, then import it. Each import is all-or-nothing and adds records without overwriting existing IDs.

## Architecture

`HR / work records → CSV validation & normalisation → rules inference → shared ontology → matching / gap analysis → development & planning suggestions`

- `lib/model.ts`: typed employees, departments (normalised string labels), roles, families, levels, tasks, requirements, evidence, skill decisions and scenarios.
- `lib/seed.ts`: deterministic synthetic organisation and fictional evidence.
- `lib/import.ts`: Papa Parse ingestion plus Zod field and reference validation. Maximum 500 rows / 200 KB. Import skills before roles, roles before employees.
- `lib/intelligence.ts`: pure inference adapter, weighted role matching, coverage and capability supply/demand calculations; no external model or API dependency.
- `lib/actions.ts`: validated commands, human decision audit records and optimistic revision checks.
- `lib/store.ts`: single-process serialised writes with atomic file replacement. Data is written to ignored `data/workforce.json` on the first mutation. Set `HR_DATA_FILE` to choose another path. Stop the server and remove that file to reset the demo.
- `app/api/workforce/route.ts`: Node API for reading and mutating workforce state, with validation errors and stale-write protection.
- `components/workspace.tsx`: responsive product workspace; one returned state drives every calculation and chart. Semantic native form controls keep inputs keyboard accessible.
- `tests/workflow.test.ts`: critical domain workflow, human decision preservation, confidence decay, import atomicity, revision conflicts and scenario calculations.

### Explainability

Evidence keyword matching uses whole-word, case-insensitive matches. Each matching project contributes 0.50, training 0.30 and job history 0.35; evidence older than 365 days receives 65% weight. Proficiency is `ceil(score × 4)` clamped to 1–5. Confidence is `0.35 + score × 0.45`, capped at 0.95. Scores are demonstrative heuristics, not calibrated probabilities. Verified/rejected human decisions are never overwritten by inference. Initial seed skills are curated synthetic profiles, not a claim that the inference rules generated every seed value.

Role alignment sums capped proficiency ratios weighted by requirement importance. Core requirements have weight 2; others weight 1. Missing and rejected skills count as zero. Workforce supply counts people at proficiency 3+ per skill; future demand grows current role requirements for the selected category. Totals are **skill-person units**, not headcount, and do not model competing allocations or individual capacity. Suggested actions prioritise developing skills for upskilling; otherwise gaps indicate hiring, and surplus skills outside current role requirements indicate redeployment opportunities. Automation is examined separately at task level.

## Limits and next steps

This is a trusted local demo, without authentication, real actor identity, tenancy, HRIS integrations or production security claims. Do not deploy publicly with employee data. JSON persistence supports one Node process on durable local storage, not serverless/distributed hosting. CSV roles currently contain one requirement; imported employee records accept manually entered synthetic evidence. Scenarios store category-level growth assumptions, not complete allocation plans. Matching covers roles, not projects. AI task impact labels are illustrative and are not validated predictions.

Next: PostgreSQL and migrations; authenticated tenant-scoped APIs and real reviewer identities; versioned ontology/evidence ingestion; HRIS adapter jobs; richer multi-requirement role imports; per-skill scenario controls and capacity-aware optimisation; pagination; extract feature components; calibration and evaluation of model-backed proposals with human governance. Add browser regression/accessibility tests and deployment observability before production use.

Conceptual inspiration: [TechWolf](https://www.techwolf.ai/). Forma uses original branding and UI.

## Verification in this workspace

The original eight domain tests and ESLint passed before the OpenAI extension. The production build passed with `npm run build -- --webpack`; the page and live workforce API returned HTTP 200, and dashboard/profile rendering was inspected in the browser. Default Turbopack compilation encountered sandbox-specific local worker/FSEvent restrictions, so use the Webpack flag if those restrictions apply to your environment. Full browser automation of every mutation and accessibility auditing remain future work.


## Refined decision demo

Start with the four-step story on Overview: **Could our next AI lead already work here?**

1. Open Alex Morgan. Expand **Inference preview** to see two undiscovered skills and the evidence behind the proposals. Run inference and verify Applied AI at its proposed level (2).
2. Compare Alex with AI Solutions Lead. Under Applied AI, choose **Plan development**, assign an owner and deadline, and save the level-4 commitment. The verified alignment projection rises while actual skills remain unchanged.
3. Open Workforce planning. Set Data & AI demand growth. The investment view shows verified supply versus supply if all active commitments succeed: Alex adds one potential Applied AI skill-person unit. Choose another capability to see named early-stage candidates and create commitments for them.
4. Reopen the commitment after refresh. Cancel it to reverse the projection, or add real synthetic completion evidence to the employee profile and validate the resulting proficiency. Verified capability never gets counted twice.
5. In Work intelligence, move the AI task-adoption slider to explore potential routine-work hours that could be reinvested in development. These synthetic estimates never alter staffing or skill supply.

The investment panel always starts from verified supply, independent of the legacy supply-detail toggle. It uses all active plan dates and assumes 100% success; it is not a capacity-constrained forecast. Owner names are demo labels, not authenticated identities. Dates and duplicate commitments are validated server-side. Existing JSON stores work without a reset; development plans are added when first saved.

New feature modules: `components/demo-guide.tsx`, `evidence-workbench.tsx`, `development-panel.tsx`, `investment-panel.tsx`, `work-simulator.tsx`; projection and candidate logic lives in `lib/development.ts`. Employee search now applies only to the skills view, and selected profiles respect department/role filters.

## OpenAI-powered intelligence

Copy `.env.example` to `.env` (or `.env.local`) in the repository root, then configure:

```dotenv
OPENAI_API_KEY=your-secret-key
OPENAI_MODEL=gpt-4.1-mini
```

Restart the Next.js server after changing environment variables. Never prefix the key with `NEXT_PUBLIC_`. No additional package installation is needed for the integration: the server calls the OpenAI Responses API using native fetch. Model selection is configurable; use a Responses model supporting Structured Outputs available to your API project. API billing is separate from ChatGPT subscriptions.

**Intelligence Studio** appears in Skills intelligence, Talent mobility, Work intelligence and Workforce planning. Choose OpenAI to produce contextual reports or Transparent rules preview for an offline demonstration. Requests run only when clicked. A configured key badge indicates configuration presence, not a verified live connection. OpenAI errors are surfaced without silently substituting a fake AI answer.

- **Skills:** interpret workplace evidence beyond keyword matching, review proposed levels and cited records, add a proposal as inferred, then verify/reject in the capability profile. Human decisions are preserved. Regenerate after accepting a proposal to review the updated state.
- **Career:** draft a concrete transition plan from the target role and calculated gaps, including success measures. Use Plan development on gaps to save accountable owners and deadlines.
- **Work:** draft a bounded AI pilot with human review and outcome measures. Use the task adoption simulator to test illustrative capacity assumptions.
- **Planning:** produce an investment brief grounded in the active department/role/category filters and demand assumptions. Use the investment panel to identify developing talent and project the impact of commitments.

Reports retain their source revision, provider, model, timestamps and source labels. Export a Markdown brief for the demo. Reports are snapshots, not live calculations; regenerate when data or assumptions change. Only the latest 40 reports are retained. Plans remain conditional and do not change actual skills or reserve employee capacity.

### API implementation and boundaries

`lib/ai/contracts.ts` defines Zod request/output contracts. `context.ts` builds minimal task-specific context, deterministic fallback reports and reference checks. `provider.ts` calls `POST https://api.openai.com/v1/responses` with strict JSON Schema and `store: false`, a 45-second timeout and capped output. `app/api/intelligence/route.ts` validates origin and revision, limits context size, serialises generation per process, limits OpenAI requests to six per minute, and persists successful reports. `components/intelligence-panel.tsx` provides review, export and history. `accept-proposal` never marks model output verified.

Only selected synthetic employee evidence/skills and role requirements are sent for individual analysis; planning sends aggregate calculations. Source-ID validation prevents nonexistent references, but cannot prove that model prose accurately interprets real evidence. Confidence is uncalibrated. Keep this trusted-local demo on synthetic data: it has no authentication or tenant access control, and the per-process throttle is not a production quota. API storage settings do not replace a review of provider retention policies. Do not expose this key-backed endpoint publicly without authentication, distributed limits and spend monitoring.

Official integration reference: [OpenAI Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs?api-mode=responses).

### Expanded demo sequence

Overview’s guided story → Alex’s evidence → Intelligence Studio skill proposals → human validation → AI Solutions Lead transition brief → saved development commitments → workforce investment projection → exported executive brief. Adding evidence also works for CSV-imported employees. Compare Rules preview with OpenAI to make the difference between deterministic calculations and generated interpretation visible.

### Updated verification

13 automated tests cover development projections, evidence ingestion, rule fallbacks in all four modes, proposal provenance, stale-report rejection, grounding checks, scoped planning context, and mocked Responses success/refusal/incomplete/error handling. Live model output requires your API key and has not been validated against the OpenAI service in this workspace.
