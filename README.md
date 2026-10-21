# GoalForge — Football Universe

> Full data migration completed on 21 October 2026 (Malaysia). All record checksums, revisions and inventories were verified; the Cloudflare application and Netlify redirect checks passed. [Successful migration run](https://github.com/wuwamconly21-del/goalforge-football/actions/runs/39525146781).

See [three-role access design](docs/ROLES-AND-PERMISSIONS.md) and [product, monetization and deployment status](docs/PRODUCT-AND-DEPLOYMENT.md). GitHub Actions verifies source structure, tests and builds before deployment. Passing these checks does not mean the features are already deployed live.

Original 2D football tournament simulator, with a public match broadcast and private organizer controls. Built for Netlify using React, Vite, a Netlify Function and Netlify Blobs. This is a separate project from the hockey simulator.

Live: https://goalforge-football1.wuwamconly21.workers.dev

The former Netlify public URL redirects here. Its original records are retained and its write guard stays locked.

For the requested full migration preserving existing data, use [the GitHub migration workflow](FULL-MIGRATION.md). For future automatic updates, use the GitHub/Cloudflare integration described in `GITHUB-CLOUDFLARE.md`. Initial migration is complete; use the normal update route for future deployments. Do not rerun first-migration tools against the live instance.

## Version 1.5 — admin invitations and playoff rules

- Admin sign-in: https://goalforge-football1.wuwamconly21.workers.dev/?admin=1. The owner opens Admin access, creates a private one-use 24-hour invitation and copies it to the intended person. Each invitee chooses their own credentials. Do not share the owner's credentials or use the public sign-in link as a substitute for an invitation.
- The owner can explicitly allow a co-admin to create invitations. This permission is off by default and is not inherited by invited admins. Co-admins can only cancel their own invitations and cannot remove admins or grant invitation permission. Disabling permission or revoking the issuer invalidates their pending invitations. Existing eight-admin capacity remains enforced on the server.
- The Match rules tab and competition creation offer extra time then penalties, or straight to penalties after a tied 90 minutes. Settings freeze at kickoff; league/group fixtures can still draw. Penalties use a seeded first-kick toss, early termination, equal-turn sudden death, equal eligible player counts and no repeated kicker until every eligible player has kicked. Shoot-out goals remain separate from match scores and league goal difference.
- New broadcasts have a per-kick score tracker below the pitch so it does not cover the action on phones. Actual goalkeeper saves and wide misses use different ball paths. New match events distinguish fouls, direct free kicks, penalties, throw-ins and goal kicks; wide shots count as attempts.
- Automatic changes respect five substitutions across three in-play opportunities, available bench players and sent-off/injured player eligibility. Second-yellow dismissals remain enforced. This is a simplified football model: full collision physics, all restart infringements, disciplinary events during a shoot-out and minimum-player abandonment adjudication are not implemented.
- Engine 4 is assigned at new kickoffs. Existing engines, active broadcasts and completed results retain their original event generation. Regression checks compared 400 legacy fixtures; 1,300 new playoff simulations, admin delegation, server enforcement, UI markup and five-language coverage are tested.
- The verified live-release manifest enables GitHub Actions updates after checks. Keep native Cloudflare production builds disconnected. Deployment checks the initialized target, current main branch, new version and frontend assets; it does not import or reset records.

Reference rules: [IFAB Law 10](https://www.theifab.com/laws/latest/determining-the-outcome-of-a-match/), [Law 3](https://www.theifab.com/laws/latest/the-players/) and [Law 14](https://www.theifab.com/laws/latest/the-penalty-kick/). This simulator is not certified or affiliated with IFAB.

## Version 1.4 — broadcast motion

- Five-part seeded build-ups, short timed passes, first-touch control, defensive challenges and counterattack runs. Player movement uses bounded speed and monotone interpolation. Running legs, ball spin, shot trails, ball height and keeper reactions make movement easier to follow.
- VAR replays the exact broadcast shot, then displays only the matching simulation verdict. A missing verdict stays pending; reviewed shots are rendered once. It is an illustrative simulator replay, not real video or geometric offside adjudication.
- Club entrance with uploaded crests, team names, formations and venue; sequential XI reveals retain custom names and crests. Crest uploads preserve other edits made while the image loads; invalid images fall back to club initials.
- Seeded wind speed in the weather presentation, rain/snow particles, weather/surface badge and an orange ball in snow. Existing weather effects on simulated accuracy and injury risk remain in place.
- Animation adapts to canvas size and respects reduced-motion preferences. A 60 FPS drawing target is used on normal devices; actual frame rate depends on the device. No full browser visual/performance verification was possible in the current environment.
- `npm run test:presentation` checks 120 seeded games, continuity at every ball keyframe, player motion, VAR verdict matching, unchanged results and all five language dictionaries. GitHub Actions runs it before deployment.

The complete v1.4 application is now deployed on Cloudflare with its existing Netlify records. Admin and manager accounts are preserved; users sign in again on the new hostname. Viewers can open the public URL without an account.

## Bahasa Melayu

1. Gunakan pautan pengaktifan peribadi yang diberi untuk menetapkan username dan kata laluan admin anda sendiri. Penonton tidak perlu mendaftar.
2. Pilih kejohanan domestik, piala kelab antarabangsa, kejohanan negara atau kejohanan sendiri.
3. Pilih pasukan contoh atau pendaftaran manager dengan kuota 2–16. Manager hanya boleh urus pasukan sendiri. Pilih format liga, kalah mati atau kumpulan + kalah mati. Piala memerlukan 2, 4, 8 atau 16 pasukan; kumpulan memerlukan 8 atau 16.
4. Sebelum sepak mula, sunting pasukan, logo, 11 pemain utama dan 7 simpanan. Liga boleh ditambah sehingga 16 pasukan walaupun sudah bermula; keputusan sedia ada dikekalkan.
5. Tekan Sepak mula sekali. Pembukaan, kesebelasan, rehat, kecederaan dan VAR berjalan dan bersambung secara automatik sehingga tamat. Keputusan perlawanan manual disahkan admin; keputusan perlawanan berjadual disimpan automatik selepas tamat. Tiada kejohanan atau musim baharu dimulakan secara automatik.
6. Kongsi pautan penonton. Penonton boleh menonton, melihat statistik dan chat tanpa login. Hanya admin boleh mengawal permainan, mengurus penaja atau menerbitkan artikel.
7. Tab Akhbar boleh menjana laporan perlawanan yang sudah tamat dalam lima bahasa, menyimpan draf pada peranti, menyalin artikel dan menerbitkan artikel kepada penonton.

## Features

- English, Bahasa Melayu, Bahasa Indonesia, Español and Français, remembered independently on each device.
- Malaysia, England, Spain and Indonesia domestic templates; Continental Champions Cup; World Nations Championship; custom competition. Sample clubs and players are fictional and editable. These are original templates, not live licensed squads or current official league formats.
- League fixtures with single or home-and-away schedules, group standings, automatic knockout bracket progression, extra time and penalty shootouts. Maximum 32 teams, with byes and balanced groups for uneven entry counts.
- Open mode: equal initial chances independent of player ratings. Tactics + ratings mode adds ratings, formation and play style influences while retaining upsets. Seeded simulation keeps every viewer on the same result.
- Continuous 1× simulated playback: 90 match minutes take about 3 real minutes plus opening, breaks and events. This is an accelerated match clock, not a 90-minute real-time or 3D game.
- Manager registration can start with no sample teams. The admin opens entries, sets capacity up to 32 teams (new registrations can close from 16), closes entries and generates a valid schedule. Each manager owns at most one team per competition and must enter the 11 starting players. Squad changes lock after the season starts; tactics can be changed between a team’s matches.
- Five formations: 4-3-3, 4-4-2, 3-5-2, 4-2-3-1 and 5-3-2. Aggressive, balanced and defensive styles affect attack, midfield control and card risk in Tactics + ratings mode, which is the default. Open mode deliberately ignores tactical advantages for equal initial chances. Match rosters are snapshotted at kickoff so future tactical changes never rewrite past scores.
- Admin can add teams; remove teams before the season starts; plan kickoff times in Malaysia time (UTC+8); reorder unplayed fixtures; and start the next season. An admin starts each new season’s first opening. Optional MYT countdowns never start it automatically; subsequent scheduled matches can start with the entrance and lineup sequence. Cup fixtures regenerate only at valid team counts.
- Smooth 22-player canvas animation, proper football pitch, referee, opening XI, half-time, full-time and event transitions. Yellow cards, second-yellow dismissals, straight reds, injuries with available bench replacements, corners, offsides and goal reviews.
- Simplified football model for entertainment. Match outcomes and referee events are simulated; the animation illustrates those events. No ball collision physics or exhaustive law enforcement (for example, minimum-player abandonment or every restart law).
- Three roles: admin controls competitions; managers sign in and control their own registered team; viewers watch and chat without an account. Admin and manager accounts use chosen usernames/passwords. Secure HttpOnly cookies, salted PBKDF2 hash, login rate limit, revision checks, origin checks, session revocation on password change.
- Guest viewer sessions, rolling 60-second viewer presence, public chat, organizer delete/mute/close-chat controls.
- Sponsor applications with admin-only contact details, stadium naming rights, pitch boards, match partners, image banners with HTTPS click-through links.
- Newspaper drafts are local to the device; published articles persist in the shared competition. Automatic reports use recorded simulation events, with no external AI service required.
- Prior seasons archived when the organizer starts the next season. No external messaging or social posting is performed.

## Local development

Requires Node.js 22.13+.

```sh
npm install
npm test
npm run build
```

`npm run dev` previews the frontend; use the official Netlify CLI's `netlify dev` for the full `/api/*` backend and Blobs integration. The included test suite uses a disposable in-memory store and never creates public competitions.

## Original Netlify deployment reference

Deploy this directory as a new Netlify project. `netlify.toml` supplies the publish directory, Function bundle and API rewrites. The Function uses the `goalforge-football` Blobs store in this project. The original hockey project is not required.

For first-time admin activation:

1. Generate a cryptographically random 32-byte key and its SHA-256 hash locally.
2. Set `ARENA_ORGANIZER_SETUP_HASH` to the hash in the Netlify project's runtime/function environment; redeploy.
3. Privately open `https://YOUR-PROJECT.netlify.app/?setup=YOUR-KEY` and choose your own admin username and password (12+ characters).
4. Do not share that activation URL. It can only configure an admin once. Share the public `/?room=...` link with viewers.

The setup key is never embedded in the frontend. Passwords, activation keys and Netlify tokens are not included in this source package. Netlify CLI linking state and dependency folders are also excluded.

## Tests

`npm test` checks 2–16 team round-robin coverage, home/away symmetry, groups and cup progression, 1,500 open-mode simulations, red-card and injury availability, penalty shootout winners, smooth motion, a complete world tournament, preservation when adding teams, secure admin setup, guest chat, access control, sponsor-contact privacy, newspaper publishing, banners, manager ownership, registration quotas, scheduling, admin-only season restart and tactical effects. An isolated browser fixture in tests/ui-fixture.tsx uses in-memory data only and is never part of the production bundle.

## License / naming

GoalForge uses original code, graphics, sample club names and fictional players for this project. No affiliation with FIFA, EA Sports or official leagues is implied.

## Version 1.1 — automatic matches, weather and sound

The schedule editor now offers **Start automatically** (on by default for new schedules). A scheduled time means the player entrance starts then; the ball kicks off after the 16-second entrance, lineup and countdown. A server-side Netlify Scheduled Function runs every minute, and live viewers also process due schedules on their regular polls. The official match clock is anchored to the scheduled time, so viewers join the correct phase even if a background invocation arrives later. Netlify does not guarantee sub-second cron delivery; live pages poll every 2.5 seconds.

The single broadcast pitch plays one match at a time. Overlaps queue in scheduled order. Scheduled matches retain their full-time screen for eight seconds, save the result and advance the bracket automatically. A manually completed match also releases the queue if another automatic match is due. An admin pause blocks automatic progression. A new season is **never** created automatically. The scheduler uses revision/ETag comparisons to prevent duplicate starts when multiple viewers and the scheduled function run together.

Previously saved schedules without an `autoStart` flag remain manual. To enable one, edit it, choose a future time and save with automatic start enabled. This avoids unexpectedly starting old, overdue fixtures after an upgrade. Unscheduled matches remain manual.

Weather is simulated, not a real-world forecast. Admins choose automatic/sunny/rain/snow in Stadium & sponsors, or override an individual fixture in the schedule editor. Weather is frozen at kickoff with the team snapshot. Rain and snow lower shooting accuracy and increase injury risk equally for both teams; heat slightly reduces second-half shooting accuracy. Old completed matches retain their original simulation conditions. The pitch shows sun lighting, rain or snow particles and an orange ball in snow. Generated newspaper reports include the match weather.

**Enable stadium sound** once per page to authorize browser audio. Original procedural Web Audio effects include crowd ambience, kicks, goal celebrations, referee whistles and rain ambience. Volume and mute controls apply only to the current viewer. Audio quiets when the tab is hidden. No microphone, third-party audio assets or external sound service is used.

All interface copy, weather/scheduling controls, template titles, table headings, role help, sound controls and report bylines are covered by the five-language dictionary. Editable team/player names and published article content remain exactly as their authors entered them. The test suite checks all 291 translation entries and every literal translation key used by the UI, plus scheduling races, queueing, worker catch-up, paused matches, legacy dates and weather effects.


## 1.2 — Broadcast studio and transfer market

- Sequential formation-and-roster lineup reveals; timed broadcast wipes; redesigned interval/full-time panels. VAR has incident, position-analysis and final-decision stages, with an explicitly simulated reconstruction. No manual decisions are required.
- Live action strip follows the exact animation plan (carrier, pass flight and shot), including substituted players. Actual events produce compact announcements.
- Managers receive 30,000,000 virtual GF per club, can sign 12 seasonal scouted players, list bench/reserve players for other managers, cancel listings and swap reserve players into the XI. Squad limit: 11 starters, 7 match bench and 7 extra reserves. Transfers never use real currency.
- Both clubs' balances and the player move commit in one revision-checked competition write. No duplicate sale, client-controlled price, negative balance or editing another manager's club. Match participants cannot trade or change lineup during their match.
- Listing or trading locks manual roster creation for the affected clubs, including later seasons, to preserve the economy. Clubs can still adjust tactics and starting XI between matches. Budgets persist; unbought scout stock refreshes only when admin starts the next season.
- Admin: Stadium & partners → Transfer market opens/closes the window. Closed windows permit cancellation and lineup swaps. Transfers affect future frozen kickoff squads; old results and archives remain fixed.
- New kickoffs use engine 3 to avoid offside goal reviews on penalties; old active/completed fixtures retain their original engine.
- See `CLOUDFLARE-MIGRATION.md` for an architecture and cutover plan. The verified Cloudflare cutover is complete; see FULL-MIGRATION.md for evidence and recovery notes.


### Multiple administrators

The original password administrator remains the protected owner. After signing in, use **Admin access** in the header to create a private one-use invitation (valid for 24 hours). The invited person chooses their own username and password. Up to eight active/reserved admin places are supported. Only the owner may revoke admin access or delegate invitation permission. Co-admins may create invitations only when explicitly permitted by the owner. Invited admins can manage all competitions, including teams, schedules, sponsorship and new seasons. Revocation invalidates the invited admin's sessions immediately; an admin can change their own password without altering another account. No real invitations are sent automatically.


## 1.3 — Cloudflare migration implementation

Workers API and SQLite-backed Durable Objects are in `cloudflare/`. Alarms start due fixtures without viewers; a Cron sweep provides recovery. The import-only deployment starts closed, verifies exact record checksums and refuses conflicting overwrites. The live entry point has no import route. Accounts, extra admins, transfers and historical results keep their existing data format.

Run `npm run test:cloudflare` and `npm run cloudflare:check`. Account authorization and a verified private export/import are required before production cutover. The committed `wrangler.jsonc` now targets the verified live Worker. The private import entry point is no longer deployed. See `CLOUDFLARE-MIGRATION.md`. Use `migration/package-source.py` to create source packages; never include `.migration-private`, `.wrangler`, provider credentials, exports or runtime databases.


## Version 1.12 — manual season opening

Creating a competition or preparing the next season now waits for **Start season & opening** from an admin. Set the public countdown in Season Control or the season opening panel, using Malaysia time (UTC+8). At zero the season waits for the admin; it never starts itself. Registration must be closed before opening. Automatic progression and result confirmation still work for later matches after the manual opening. See [the season guide](docs/SEASONS-AND-MONETIZATION.md) for details.
