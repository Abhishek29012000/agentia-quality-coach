# Agentia Quality Coach

Agentia™ CLI plugin that adds **story-aware guidance** and **local quality gates** for Salesforce **Apex**, **Flow**, and **LWC CSS/HTML** before commit, promote, or deploy.

## Commands

```bash
# Read Copado user story → suggest solution steps
agentia quality story-plan
agentia quality story-plan --demo

# Scan repo for Apex / Flow / LWC quality issues
agentia quality check
agentia quality check --path ./force-app
agentia quality check --path ./agentia-quality-coach/fixtures
agentia quality check --json
```

## Install (local hackathon setup)

```bash
npm install -g @copado/agentia-cli@beta
cd agentia-quality-coach
npm install
npm run build
agentia plugins link .
```

## What it checks

| Area | Examples |
| --- | --- |
| LWC HTML | Inline `style=` attributes |
| LWC CSS | Missing `@media`, hardcoded `px`, `!important`, hex colors |
| Apex | Missing sharing, SOQL-in-loop, `System.debug`, empty catch, secrets |
| Flow | DML-in-loop pattern, hardcoded Ids, missing fault paths |

## Suggested Copado flow

1. `agentia quality story-plan` — plan from User Story (Project / Sprint / Epic / Story)
2. Implement Apex / Flow / LWC
3. `agentia quality check` — fail on errors before promote/deploy

## Fixtures

`fixtures/` contains intentionally bad Apex, Flow, and LWC samples for demos.
