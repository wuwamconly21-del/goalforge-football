# GoalForge 1.15 — request efficiency

No tournament records, account records, namespaces, storage bindings or migration configuration move. No billing plan changes. Cloudflare request limits still apply.

## Batched chat RPC

Previously the Worker resolved the signed session, checked the room, read ownership/profile/community records and wrote the heartbeat through several separate RPC calls. `/api/community` now calls the existing global Durable Object once. That object's `community` method resolves the same signed session, runs the existing community handler and performs revision/etag CAS locally in the same SQLite records. Tournament validation makes one additional read-only RPC to the room object. Invalid origins, moderation permissions, revoked sessions, chat rate limits, support validation and private profile behavior remain enforced. No room record is modified through this adapter.

The measured unit benchmark uses the same signed guest and handler for both paths: unbatched presence **5 RPC calls**, batched **2 RPC calls** (60% fewer for that operation). This is not a claim of 60% fewer total account requests or a guaranteed bill reduction. The older deployed version also read a legacy profile record unnecessarily for signed guests; the new fast path removes that SQL read while retaining legacy profile behavior for old identities.

## Browser polling

- One timer and at most one in-flight refresh per loop.
- Chat uses each heartbeat response directly, instead of immediately issuing a duplicate GET. One chat refresh every 15 seconds alternates with presence updates no more than once every 30 seconds. It does not double heartbeat storage writes.
- For a foreground spectator with no manual chat actions, the former repeating chat pattern was approximately five HTTP requests per 30 seconds (one presence POST plus four GETs, including the redundant refresh). The new pattern is approximately two per 30 seconds: around 60% fewer browser chat requests. New chat messages may arrive up to 15 seconds later; send and moderation actions still return their response immediately.
- Arena viewers refresh every 6 seconds instead of 4; authenticated admin refresh stays 4 seconds. The animation still draws from the shared client match clock between network updates.
- Lobby refreshes every 30 seconds instead of 15.
- Hidden tabs make no polling requests. Visibility restoration refreshes immediately without overlapping an existing request.
- Network/API failures back off, capped at two minutes. A recognized storage quota response waits five minutes before automatic retry. Viewing a different room or restoring visibility may trigger an immediate retry.

Public arena cache and request-scoped read memoization remain in place. Authentication results are not cached across requests. Scheduler alarms, first-season manual kickoff, result rules and live roster snapshots are unchanged. These changes cannot retroactively restore an already-exhausted free quota. Account analytics after reset are still needed to measure actual savings with real viewers.

## v1.18 — daily free-tier conservation

The free daily allowance itself is not increased. Cloudflare's Workers and Durable Objects limits are separate, and other applications on the account can consume them. The documented reset is 00:00 UTC / 08:00 Malaysia. Traffic spikes, CPU time, SQL rows and background abuse can still exhaust a limit; this update does not promise unlimited viewers or 24-hour availability at arbitrary load.

- Public live-match refresh: 15 seconds (previously six). Organizer live refresh: ten seconds (previously four). Paused matches: viewer thirty / organizer twenty seconds. Idle competitions: viewer sixty / organizer thirty seconds, with faster refresh as a scheduled transition approaches. Local gameplay animation and match clock do not wait for a network frame.
- Lobby and manager background refresh: sixty seconds. Successful actions still refresh immediately. Existing hidden-tab suspension, one in-flight request and quota/error backoff remain.
- Passive chat: thirty seconds; typing in the chat field uses fifteen. Sending a message remains immediate. The response includes presence, messages and supporter counts, without an extra read after each heartbeat. Presence expires after the existing sixty seconds.
- Cloudflare community presence lives in a bounded in-memory map (200 rooms, 500 identities per room) on the existing global Durable Object. Regular presence heartbeats do not create/update a durable chat record. Chat messages, flags and moderation remain persisted through CAS. Counts can temporarily fall after object eviction/hibernation and are restored by actual heartbeats. There are no fake viewers and no timer preventing hibernation. No records are migrated/deleted.
- Durable Object alarms remain the exact match scheduler, including games without spectators. The minute cron scans records only every fifteen minutes as a recovery sweep (96 instead of 1,440 daily sweeps). Reading an unchanged room revision no longer rechecks its alarm metadata repeatedly. First access after object recreation re-arms it; writes and alarms always update scheduling.
- Anonymous public room responses share a four-second edge cache; directory responses share twenty seconds. Authenticated/private responses are not shared. A cache hit refreshes serverNow so cache age does not incorrectly shift the client match clock.
- The sole Worker configuration change is static-asset exclusions in assets.run_worker_first: /assets/*, /audio/* and /favicon.ico. APIs, HTML verification, public newspaper pages and ads.txt still run through the Worker. Worker identity, migrations, bindings, D1, cron configuration and release/migration manifests are unchanged. Direct static asset requests do not invoke application code. See https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/ .

### Reproducible budget, not account telemetry

`tests/traffic-budget.test.mjs` replays 2,880 half-minute heartbeats representing 24 hours through the actual community handler, verifies zero heartbeat persistence writes, durable messages/moderation/ultras, expiry and memory recreation. It also checks near-deadline cadence and ninety-six recovery sweep slots.

| One continuously visible passive live viewer for 24h | Before | After |
| --- | ---: | ---: |
| Arena HTTP requests | 14,400 | 5,760 |
| Community HTTP requests | 5,760 | 2,880 |
| Combined recurring HTTP | 20,160 | 8,640 |

This model is a 57.1% reduction in those recurring HTTP requests, excluding initial loads, messages, clicks, other tabs and retries. It is not a measured reduction of the whole Cloudflare account. Ten such continuously visible viewers alone would use approximately 86,400 Worker API requests before other activity; that is an illustration, not a safe capacity guarantee. Durable Object RPC counts additionally depend on shared edge-cache hits, authentication, tournament count and geographic cache locations. The dashboard remains authoritative for actual usage.
