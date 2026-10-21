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
