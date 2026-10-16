# Decisions

## Prioritisation

I ranked issues by impact on scaling, then latency, then security, then structure, and fixed
them in that order (one commit each):

| # | Issue | Why it ranked here |
|---|-------|--------------------|
| 1 | CI red (Migrate step targets a `cami_app` DB that the CI Postgres service never creates) | Blocks every merge; one-line fix |
| 2 | `GET /requests` N+1: 1 + N queries (~1,200 with seed data), every note body loaded to compute a count and a preview | Grows linearly with rows; ~1.5s at seed size |
| 3 | TypeORM `logging: ['query']` on by default | Logged every statement **with parameters** (customer message text) — a data-in-logs leak and a hot-path cost |
| 4 | Stale table after status/classify | Users see the wrong state; easy to fix correctly |
| 5 | No input validation, errors returned as `200 {error}`, `status` accepted any string into the DB, malformed UUIDs surfaced as Postgres 500s, CORS reflected any origin | Integrity and security; the classify refactor touches the same code |
| 6 | Business rules and `any` in the classify controller | Structure; done together with #5 |
| 7 | Classification history + provider seam | Feature slice, built on the cleaned-up layering |

### CI root cause

`npm ci`, typecheck, tests, and build all pass on a clean install with both npm 10 (CI's
Node 20) and npm 11. The failing step is **Migrate**: it overrides `DATABASE_URL` to
`.../cami_app`, but the service container only creates `cami`. Locally the override never
applies, which is why it "works on my machine". I removed the override so the step uses the
job-level URL.

I also suspected the lockfile, because the committed `package-lock.json` has no `overrides`
block while `package.json` declares one. Testing ruled it out: `npm ci` with npm 10 accepts
it as is. I left the lockfile alone apart from the new validation dependencies, rather than
regenerating it and pulling in unreviewed upgrades.

## Assumptions

- The list is read far more than it is written, and its consumers want the newest requests.
- Callers that use `GET /requests` without parameters may depend on getting the full array,
  so paging is opt-in (`?limit=&offset=`, `limit` ≤ 200). The web app asks for the 25 rows
  it already rendered.
- No authentication or authorisation is in scope for this exercise; see "More time".
- Dev database credentials in `docker-compose.yml` and the code fallbacks are local-only
  defaults, not secrets. Nothing sensitive is committed.

## Trade-offs

- **List query is raw SQL with two `LATERAL` joins** (count + latest note) rather than
  QueryBuilder. It is one statement, easy to `EXPLAIN` (~8ms for 1.2k requests / 4.8k notes),
  and returns exactly what the endpoint needs. The response is byte-identical to the old
  implementation; I diffed old against new on the seeded DB. Measured end to end: ~1.5s → ~30ms.
- **Additive indexes only**: `request_notes(request_id, created_at DESC)` for the latest-note
  lookup and `customer_requests(created_at DESC)` for ordering. No existing column or table
  is altered, and every DDL statement uses `IF NOT EXISTS`.
- **API contract tightening**: invalid input now returns `400` (and unknown ids `404`)
  instead of `200 { error }`. This is a behaviour change for any client that checked for an
  `error` key, but the old behaviour hid failures from `res.ok` checks, including our own web
  client. Valid responses keep their old shapes.
- **Validation via class-validator DTOs + a global `ValidationPipe`** (`whitelist`,
  `transform`). This is idiomatic NestJS, at the cost of two small dependencies.
- **UI freshness**: status changes update the cache optimistically (with rollback), then
  invalidate. Classify invalidates both the requests and history queries. I kept the
  existing `staleTime`; disabling caching would hide the bug rather than fix it.
- **CORS**: allow-list from `CORS_ORIGIN` (comma-separated, default `http://localhost:3000`).

## Classification history scope

Implemented:

- `ClassificationProvider` interface (`name`, async `classify`) bound through the
  `CLASSIFICATION_PROVIDER` token. `KeywordClassifier` (`keyword-v1`) is the default.
  Swapping providers is a one-line `useClass` change in `RequestsModule`.
- `ClassificationService` owns the confidence rules (short-message softening, unknown
  threshold). They apply to *any* provider's output and are unit-tested as a pure function.
  `RequestsService.applyClassification` owns updating the request (category, confidence,
  open → in_progress).
- `classification_history` table: message snapshot, category, confidence, provider, optional
  `request_id` (`ON DELETE SET NULL`, so history survives request deletion), and an index on
  `(category, created_at DESC)`.
- `GET /requests/history?category=&requestId=&limit=` returns `{ items }`, newest first,
  validated, default 50, max 200.
- `/history` page: a category filter and a table matching the requests table's styling
  (time, message, category, provider). Confidence is stored but not shown.
- No UI pagination on either page. The requests table keeps its original behaviour of
  showing the newest 25, and history shows the newest 50. The API accepts optional
  `limit`/`offset` if paging is added later.

Deliberate choices and gaps:

- **The message is snapshotted** because classify can run without a stored request, and
  history should show what was actually classified. This duplicates customer text, so it
  would need a retention policy (e.g. a TTL job) before production.
- **Not transactional**: the request update happens first, then the history insert. An
  unknown `requestId` therefore 404s without writing history. If the insert fails after the
  update, the request stays classified with no history row. Wrapping both in one transaction
  needs a unit-of-work seam spanning both repositories; I left that out.
- Classify still trusts the `message` from the client body even when a `requestId` is
  given, as before. A cleaner contract would classify the stored request's message server
  side; I didn't change it so the endpoint's semantics stay the same.
- No pagination cursor on history; `limit` is enough for this slice.

## Stretch (if any)

### Persistence boundary

I separated persistence only where it earns its place. `requests.repository.ts` is one
concrete `RequestsRepository` class (`listWithNoteSummary`, `findById`, `create`, `save`).
It holds the raw aggregate list SQL and its row mapper, which previously sat inside
`RequestsService`. The service now has only business rules and no TypeORM import, and its
unit tests pass a plain fake object.

What I deliberately didn't build:

- **No interface + injection token**: there is one implementation, and a concrete class
  can be faked in tests just as easily. An interface is a cheap change if a second store
  appears.
- **No history repository**: classification history is one `save` and one `find`.
  `ClassificationService` uses TypeORM's `Repository<ClassificationRecord>` directly, the
  standard NestJS pattern this codebase already used. A wrapper would be pure indirection.
- **No separate domain models**: services still use the entity classes as data types.

The same review-size reasoning applies elsewhere. DTOs live in one `requests.dto.ts`, and
the schema change is a single migration (indexes plus the history table).

### Migration vs deploy ordering

- Every migration here is **additive** (new table, new indexes, `IF NOT EXISTS`), so the
  order is: **run migrations → deploy the app**. The old app version ignores the new table
  and indexes, so there is no window where running code breaks.
- Rollback is the reverse: **roll back the app first**, then (optionally) the migration.
  Leaving an unused table in place is harmless and avoids losing history rows.
- On a large production table, the indexes should be `CREATE INDEX CONCURRENTLY` in a
  migration that runs outside a transaction, to avoid locking writes. At seed scale a
  normal build is fine.
- Destructive changes (renames, drops, NOT NULL backfills) would need expand → migrate data
  → contract across several deploys. Nothing here requires that.

### Failure modes for a future LLM provider

- **Latency and timeouts**: wrap the call with a timeout and fall back to `keyword-v1`.
  Record which provider actually answered; the `provider` column exists for this.
- **Malformed or out-of-vocabulary output**: validate the model's response against
  `CLASSIFICATION_CATEGORIES` and a `[0,1]` confidence before trusting it. Treat failures
  as `unknown` or fall back.
- **Prompt injection**: customer text is untrusted input. Never let it change the
  instructions or tools, and constrain the output to a schema.
- **PII egress and retention**: messages leave our boundary. This needs a vendor DPA, a
  redaction step, and limits on what is logged.
- **Cost and rate limits**: cache by message hash, add a per-tenant rate limit, and expose
  a circuit breaker.
- **Non-determinism**: the same message can classify differently over time. History plus
  the provider/version name makes drift auditable. Pin the model version in `name`
  (e.g. `llm-<model>-v1`).
- **Calibration**: LLM "confidence" is not comparable to keyword confidence. Re-tune
  `UNKNOWN_THRESHOLD` per provider rather than sharing one constant.

## What you would do with more time

- AuthN/Z on all endpoints (currently anyone who can reach the API can edit requests).
- Rate limiting and a request body size limit tuned per route.
- An integration test suite against a real Postgres (CI already has one) covering the list
  query, the history filters, and validation responses.
- Cursor pagination for both lists, plus total counts if the UI needs them.
- Transactional classify (request update + history insert) via a repository/unit-of-work seam.
- Address `npm audit` findings: `next` has a critical advisory fixed in a later 16.x patch.
  I kept dependency upgrades out of this change so they can be reviewed separately.
- Remove `notes` from `getById` for write paths that don't need them.
