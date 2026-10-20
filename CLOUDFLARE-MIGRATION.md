# GoalForge → Cloudflare

Updated 20 October 2026. The Cloudflare implementation and migration tools are built and tested locally. Production remains on Netlify until account authorization, remote import verification and cutover are completed.

## Implemented first migration

The first migration uses Workers Static Assets plus SQLite-backed Durable Objects. Each competition has its own object; account/session/banner/chat records share a separate global object. This preserves the existing record format and moves both sides of a player transfer in one atomic SQLite transaction. Stored JSON is split into small Unicode-safe chunks, so large frozen rosters do not hit SQLite's per-value size limit. Revisions and unique etags prevent stale writes. Existing inline images remain intact during this first migration, avoiding image or historical-match changes during cutover. D1 and R2 can be introduced later if scale justifies normalizing the data and assets.

`cloudflare/worker.ts` implements the live API, alarm scheduling and Cron recovery sweep. `cloudflare/migration-worker.ts` is an import-only temporary entry point. It requires an ephemeral bearer secret, exposes no normal app API and disables match alarms. It refuses to overwrite differing records and verifies SHA-256 checksums and revision numbers. The temporary entry point is replaced by the live entry point at launch, and its secret is removed. No permanent export or import endpoint is added to the public application.

`netlify/migration-lock.mjs` and the Netlify store write guard pause the source only during final cutover. A private control record is set through authenticated Netlify access; no public endpoint can set it. Drain in-flight requests, then take and verify a final export before enabling the Cloudflare authority. Do not freeze the source until the Cloudflare target is authorized and ready.

The initial Wrangler configuration intentionally uses import mode. It must remain closed until the real records have been imported. The source ZIP excludes all private export records, migration secrets, provider credentials and local runtime state.

### Validation

- `npm test`: football, roles, passwords, guest access, managers, transfers, budgets, translations, schedules and extra administrators.
- `npm run test:cloudflare`: atomic SQLite storage, rollback, stale-write rejection, Unicode chunking over 2 MB, actual workerd/SQLite/RPC login and transfer flows, and a real Durable Object alarm that starts a scheduled match without a viewer request.
- `node tests/cloudflare-import.test.mjs PATH_TO_PRIVATE_RECORDS`: local import rehearsal against an actual private export; every record checksum and revision must match. It also exercises a large Unicode record, retry safety and conflict rejection.
- `npm run cloudflare:check`: Wrangler deployment validation without publishing.

Private tools: `migration/export-netlify.mjs`, `migration/import-cloudflare.mjs` and `migration/netlify-lock.mjs`. Credentials are read from the environment; do not put them in source or the source ZIP. Use `migration/package-source.py` to package only the allowlisted public project files.

## Optional future architecture

Use **Workers Static Assets** for the React build and **Workers** for the existing `/api/*` routes. Use a **SQLite-backed Durable Object per competition** for the authoritative match clock, transfers and tournament revisions, with alarms for the next scheduled opening. Store accounts and hashed sessions in **D1**, and team logos/banner images in **R2**. Public image URLs should be immutable or versioned. A future WebSocket broadcast can use Durable Objects to replace polling, but polling can remain for the first migration.

The important requirement is one authoritative, atomic write for both clubs in a transfer. A plain cached KV read/write is not a replacement for the current compare-and-swap store. Keep a club-to-club transfer inside its competition's authority; do not debit and credit two independent objects.

## What can be reused

The Vite output in `netlify-dist`, UI components, procedural sound, match engine, weather, market rules and translation dictionaries are provider independent. The existing handlers use standard `Request`, `Response`, Web Crypto and an `ArenaStore` interface. Keep the same paths for `arena`, `account`, `manager`, `community` and `banner`.

Replace `netlify/store.mjs` with a Cloudflare storage adapter that preserves create-if-absent and revision-checked updates. Replace the Netlify function dispatcher and scheduled function with a Worker fetch handler and Durable Object alarm. Read the setup hash from a Worker secret binding instead of `process.env`. API responses and sessions must remain uncached, with HttpOnly, Secure and SameSite cookies. Never expose the setup hash, password hashes, private sponsor contacts or session records through a public export route.

## Data transfer and cutover

1. Back up every record from the `goalforge-football` store, including competition catalog, manager accounts, admin configuration, sponsor/banner records, password hashes and revision numbers. The source ZIP does **not** contain these private live records.
2. Build and test the adapter in a separate Cloudflare preview. Import a private copy of the data. Keep revision guards and all ownership checks. Move inline image data to R2 and replace references in current teams and frozen match rosters without changing ratings or match seeds. Large competition snapshots must be chunked or normalized to respect the destination storage limits.
3. Check login, guest viewing/chat, manager ownership, duplicate purchases, balances, lineup changes, fixture queue, halftime/VAR/full-time, newspaper and admin-only new seasons against the imported data. Use the existing test suite as the behavioral contract, then add runtime tests for the actual Cloudflare adapter and alarm retries.
4. Choose a short maintenance window with no match in progress. Temporarily freeze Netlify writes and stop its scheduler, take a final export, import it and verify counts/revisions/balances. Only one provider may write or schedule a competition at a time.
5. Switch the public hostname after verification. Cookies do not transfer to a different hostname, so users may need to sign in again. The private setup link must not create a second admin: import the existing admin record, and retain the existing setup state.
6. Keep the Netlify export and prior deployment for recovery. A rollback after new Cloudflare writes requires reconciling those writes first; redirecting to an old snapshot would lose transfers, chat or results.

## Scheduling and reliability

Alarms can be retried, so use the existing fixture-state/revision checks to make repeated execution harmless. Store the next due opening and re-arm the alarm after every schedule change, pause/resume, result confirmation or new fixture round. Preserve the server timestamp as the match-clock source. Late wakeups should catch up from that timestamp and serialize overlapping fixtures, exactly as `lib/scheduler.ts` does now. A Cron Trigger can provide a recovery sweep; neither platform promises exact-to-the-millisecond wakeups.

## References

- [Workers Static Assets](https://developers.cloudflare.com/workers/static-assets/)
- [Durable Objects SQLite storage and alarms](https://developers.cloudflare.com/durable-objects/api/sqlite-storage-api/)
- [D1 prepared statements](https://developers.cloudflare.com/d1/worker-api/prepared-statements/)
- [Workers Cron Triggers](https://developers.cloudflare.com/workers/configuration/cron-triggers/)

Cloudflare is a reasonable fit for this simulator, especially for authoritative room state and a future live broadcast channel. The main migration work is persistence and authentication, rather than the football animation. The local Cloudflare runtime is tested; remote deployment and data cutover must be recorded separately when they succeed.
