# AI Usage

## Tools used

- Claude Code (VS Code extension), the agent working directly in the repo and terminal.

## How I used AI

- **Exploration and triage**: had the agent read the whole (small) codebase and produce a
  ranked list of issues by scaling, latency, and security impact before writing any code.
  I reviewed and approved that plan, and set the constraints: additive-only schema changes,
  no design changes, no dependency upgrades beyond what a task needs.
- **Implementation**: one commit per task. The agent drafted the code; I reviewed each diff
  before committing.
- **Verification**: asked for evidence, not assertions. Old vs new `GET /requests` output was
  diffed byte for byte. Timings and SQL statement counts were measured. Validation and CORS
  were exercised with `curl`. Migrations were run against both the seeded DB (row counts
  unchanged) and a throwaway empty DB (what CI sees).
- **Docs**: drafted `DECISIONS.md` from the plan and the measured results, then edited.

## What I changed or rejected

- **Wrong CI root cause, caught by testing.** The first hypothesis was that the committed
  lockfile was out of sync with the `overrides` in `package.json`. Running `npm ci` with
  npm 10 (CI's version) showed it installs fine. The real failure was the Migrate step
  pointing at a non-existent `cami_app` database. I rejected regenerating the lockfile
  because it was unnecessary churn.
- **Scope control**: I chose opt-in API paging instead of changing the default list
  contract. While reviewing, I asked for the raw list SQL to move out of the service. The
  agent's first version over-built it (interfaces, tokens and adapters for both requests
  and history, plus one file per DTO), which brought the PR to 37 files. I had it trimmed
  to one concrete repository class, a single DTO file and a single migration, keeping only
  the separation that was needed. I also started UI pagination, then had it
  reverted mid-change once I checked it against the brief: it wasn't asked for, and the
  original UI deliberately shows the newest 25. I removed the confidence score the agent
  had added to the History page for the same reason.
- No AI co-author trailers on commits; this file is the disclosure.

## Trade-offs

- Speed vs review depth: the agent produced code faster than I could review it line by
  line, so I kept commits small and task-scoped to keep each diff reviewable.
- I left the UI behaviour (optimistic status, invalidation) verified by reasoning, types,
  and a production build, not by an automated browser test. A Playwright check would be
  the next step.

## Team workflow (optional stretch)

- **Plan before code** for anything non-trivial: an AI-produced plan with ranked issues and
  explicit constraints, reviewed by a human before edits begin.
- **Evidence over claims**: PRs that change behaviour include how it was verified (a test,
  a diff, a measurement). "The AI said it works" is not evidence.
- **Small, reviewable commits**; the author owns every line regardless of who typed it.
- **Guardrails in config, not memory**: allow-list the commands agents may run, keep secrets
  out of the repo and out of prompts, and block AI tools from production credentials.
- **Disclose, don't attribute**: record meaningful AI use in the PR, as here, so reviewers
  know where to look harder.
