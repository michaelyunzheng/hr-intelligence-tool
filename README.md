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

This is a trusted local demo, without authentication, real actor identity, tenancy, HRIS integrations or production security claims. Do not deploy publicly with employee data. JSON persistence supports one Node process on durable local storage, not serverless/distributed hosting. CSV roles currently contain one requirement; imported employee records have no evidence ingestion UI. Scenarios store category-level growth assumptions, not complete allocation plans. Matching covers roles, not projects. AI task impact labels are illustrative and are not validated predictions.

Next: PostgreSQL and migrations; authenticated tenant-scoped APIs and real reviewer identities; versioned ontology/evidence ingestion; HRIS adapter jobs; richer multi-requirement role imports; per-skill scenario controls and capacity-aware optimisation; pagination; extract feature components; calibrated model-backed `InferenceEngine` with evaluation and human governance. Add browser regression/accessibility tests and deployment observability before production use.

Conceptual inspiration: [TechWolf](https://www.techwolf.ai/). Forma uses original branding and UI.

## Verification in this workspace

Five automated tests and ESLint pass. The production build passed with `npm run build -- --webpack`; the page and live workforce API returned HTTP 200, and dashboard/profile rendering was inspected in the browser. Default Turbopack compilation encountered sandbox-specific local worker/FSEvent restrictions, so use the Webpack flag if those restrictions apply to your environment. Full browser automation of every mutation and accessibility auditing remain future work.
