# AGENTS.md — Athens/SAP-Python Implementation Guardrails

## Purpose
This file defines implementation guardrails for AI agents (Amazon Q/Codex) working on this repository.

## Non-negotiables
- No architectural rewrite.
- Keep existing folder structure, API conventions, auth flow, and UI patterns.
- Business rules must be enforced server-side (DRF permissions/policies), not only by hiding UI.
- Avoid breaking production flows. Add migrations + backfills safely.

## Workflow-driven access gating (high level)
Users may be blocked from portal access depending on lifecycle stage:
- Must reset password
- Must complete profile & submit
- Pending approval
- Approved but induction pending
- Full access

Agent must implement:
- Central access-state calculation (backend)
- A single access-state endpoint used by frontend route/menu guards

## Testing expectations
- Add backend tests for:
  - scope enforcement (project/company)
  - role enforcement (project admin cannot create admins)
  - lifecycle gating across endpoints
- Keep tests fast and deterministic.

## Implementation style
- Prefer small, focused commits:
  1) backend models/permissions/endpoint + tests
  2) frontend route guard/menu gating + UI updates

## Command checklist
- Backend:
  - python manage.py test
  - python manage.py makemigrations && migrate (verify)
- Frontend:
  - npm test (if present)
  - npm run build