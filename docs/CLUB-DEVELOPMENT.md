# GoalForge 1.14 — clubs, atmosphere and shorter breaks

Inter-match sponsor breaks default to 20 seconds; admin choices are 15, 20, 25 or 30 seconds. Legacy 188-second settings normalize to 20 seconds for future matches. Already-running match timelines are frozen. Opening ceremonies remain independently configurable. Manual admin opening of each season remains required.

## Reuse a squad across competitions

Open the **destination** tournament. Admins use Teams → Bring an existing squad here and select one or many source clubs. Managers use their Manager page in the destination to import their own existing club, without re-entering players or logos. A manager may own only one club in each competition. Manager registration must be open. Admins can add entries to unstarted cups or ongoing leagues; completed seasons require a new season. Every destination respects capacity (up to 32) and duplicate checks.

The source entry and match history remain unchanged. The destination receives independent team/player IDs and a club-origin identifier to reject duplicate imports. Logos, ownership/verification, roster, budget, development, condition, facilities and home stadium are retained. Progress and spending after import are independent per competition. Source market roster locks carry over. Claim screenshots and pending claims are not copied. Whole-batch validation happens before a single destination-record CAS; concurrent writes cannot overwrite each other.

## Club centre and player passport

Managers use Club development below their own squad; admins open it on a club in Teams. Training costs 50,000 virtual GF per session. Starting budget remains the existing 30 million GF. Five drill types train shooting, passing, tackling, pace or goalkeeping. Position checks, attribute cap 99, low-fitness restrictions, per-player cooldown (10 minutes at level one, six at level five) and match locks are enforced on the server. Three same-focus sessions unlock a trait, at most two per player. Each third session adds one overall rating. Training reduces condition by 2 and stamina by 8. Facilities cost `(new level) × 250,000 GF`, up to level five; levels four/five gain one additional attribute point per drill.

Player passports use a shaped shield, five-axis attribute radar, condition/stamina meters and distinct talent badges. Traits: Box Phantom (finishing), Tempo Architect (control), Iron Bastion (defence), Endless Engine (reduced match stamina consumption), Last Guardian (starting goalkeeper defence). Bonuses are small and affect **rating mode**; open mode remains neutral to skill advantages. No special animation guarantees a goal.

Future kickoffs use immutable engine-5 roster/readiness snapshots. Existing engine-4 and legacy results are unchanged. Match fatigue is applied once when confirming a result, using actual starting/substitute/injury/red-card minutes (90 or 120 minutes). Rest recovers 8 stamina and 2 condition points per real minute, capped at 100, to suit the simulator's compressed match duration. Injury condition is capped at 35 when results are confirmed. Unused players do not receive match wear. Manual roster editing cannot inject or erase server-owned training, finances or stadium settings.

A club's free stadium editor accepts a 2–70 character name and capacity 500–100,000. The home club's venue appears on the pitch, broadcast and player entrance; tournament sponsor naming rights remain effective. The venue is frozen in live roster snapshots.

## Live ultras and celebrations

Viewers use Join the stadium ultras in chat. A signed guest session is sufficient; login is unnecessary. Choose a registered team and stripes, checkered or diagonal flags. Each guest has one support choice per room, updates are rate-limited, counts only include presence within 60 seconds, and public output contains aggregate counts, never supporter identities. Flags carry club colors/logo and animate with CSS. Support does not change match odds. This is session-based counting, not anti-bot identity verification.

Goal ribbons, confetti and silhouette celebrations appear only after an actual goal event, including an allowed VAR verdict. Disallowed or future goals never trigger them. Special traits select archer, conductor, fortress or knee-slide poses; other goals use a soaring salute. The timeline continues and normal centre kickoff still occurs. Reduced-motion preferences disable flag/pose movement and confetti. Stadium decoration remains cached; polling does not restart canvas animation.

## Cloudflare request pressure

A real production outage reported “Exceeded allowed volume of requests in Durable Objects free tier.” Public arena polls now request an explicitly public projection and share a two-second edge cache that ignores cookies and never contains admin data. Each server request memoizes repeated reads, invalidating on writes/CAS failures. Arena polling is four seconds, lobby fifteen; chat ten seconds and presence thirty. Hidden tabs suspend those polls. These changes reduce load but do not remove Cloudflare limits.

The static app and demo remain available if optional monetization configuration cannot be loaded. Quota errors become a distinct 503/storageQuota message. Existing verified update-only deployment may continue during this exact known quota error only if `/api/health` confirms a live GoalForge version and all migration/readiness/target/storage binding guards remain valid. Unknown errors still block deployment. Logs distinguish frontend/version/audio verification from unavailable live storage; no migration, data reset or billing change occurs.
