# GoalForge 1.10 — support, replays and season administration

## Optional Ko-fi support

The header, home page and match page link to the owner's supplied public URL, `https://ko-fi.com/nelyxentertainment`. Links open a separate tab with `noopener noreferrer`. No Ko-fi embed, payment details, credentials, automatic charge, banner entitlement, or paid match advantage is introduced. Ko-fi handles checkout; supporters are reminded to review currency and final amount. This update does not change the Ko-fi account's prices or connect its payment processor.

## Automatic highlights

The match page collects goals, saves, confirmed/disallowed VAR outcomes, red cards and penalties after their event time. The Highlights tab covers the currently live fixture and completed fixtures, with an explicit match selector. Future fixtures/events are excluded.

A moment opens a lightweight SVG reconstruction using the same deterministic motion plan and frozen match rosters. Replays cover up to four simulation seconds before and 3.5 after the incident, bounded by what the viewer has already seen. Replay rate can be 0.65× or 1×, with pause/restart and an optional chronological reel of available moments. This is a simulation replay, not an exported video file. No match controls or server mutations run during replay. The live match continues independently.

The replay renderer updates SVG positions through its own animation loop instead of making the entire app render each frame. Paused replay draws once, hidden documents do not advance replay, unmount cancels the loop, and reduced-motion preference uses a still incident view. Main pitch renderer remains unchanged. Interface transitions use opacity/transform and respect reduced motion.

## Archived champions

Season control may record a champion as part of archiving a season. The chosen team must have participated in that season and the admin must enter a reason. The archive and trophy room show **Recorded by admin**. This action does not fabricate, replace, or mark fixture scores as completed.

The Archive tab allows authenticated admins to correct a historical champion, record no champion, or restore the original result. The first manual change preserves the original champion separately. Subsequent manual corrections retain that baseline. Every change requires a note and records the prior/new winner and time. Restoring the original winner also records a note. Revision checks protect concurrent writes. Viewers and managers have no correction controls or API authorization.

## Registration when changing season

Admins choose one of these modes in Season control:

- Keep squads with registration closed and prepare fixtures.
- Keep squads and open extra places up to the configured limit.
- Archive the current season and start fresh registration with an empty team list.

Fresh registration preserves old squads in their season archive and clears old market listings/state for the new empty roster. Managers can register new teams again; one-team-per-manager ownership and quotas still apply. Carrying squads preserves manager ownership and funds; roster transfer locks reset for the new season. Registration blocks kickoff/scheduling until the admin closes entries and generates fixtures. Only the admin advances seasons.

All additions support English, Bahasa Melayu, Bahasa Indonesia, Spanish and French. Tests cover 100 highlight simulations and 4,908 selected moment checks, no future-event leaks or state mutation, champion changes/restoration without score changes, admin isolation, fresh/carry registration, ownership/limits, safe support links, translated UI, the existing renderer, football rules, audio, migration guards and real Cloudflare runtime behavior.
