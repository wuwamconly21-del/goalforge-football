# GoalForge 1.9 — manual seasons and monetization

Admins can open **Season control** in a tournament header. Choose a higher season number (for example, 1 → 2 or 2 → 5). No automatic season transition exists.

- **Renumber unplayed season** preserves squad/fixture seeds, removes old schedule dates, and creates no imaginary archive/trophy for skipped seasons.
- **Archive and prepare new season** requires the tournament name and a reason for an unfinished season. Played results remain in history. An interrupted live match is recorded as interrupted, without confirming its outcome. Only a completed season retains a champion.
- Optionally set the first opening in Malaysia time, number of days and interval. That date starts the opening ceremony, then lineups and kick-off. Unchecked scheduling leaves every new fixture manual. Registration must be closed before scheduling.
- Existing weather, football rules, broadcast timings and manager ownership remain in place. New matches snapshot their own rules at kick-off.

## Google AdSense preparation

Only the primary owner sees **Monetization** and can change site-wide ad settings. Other admins still manage tournaments and sponsor placements. Settings use optimistic concurrency and validate IDs and HTTPS privacy URLs; no arbitrary HTML or script can be pasted.

1. Create/sign into your own AdSense account at https://adsense.google.com/start/ and add the production site. Account/payment/identity information stays with Google.
2. Save the real `ca-pub-…` publisher ID in GoalForge. This publishes a verification meta tag in the server-returned HTML and a root `/ads.txt` entry even while ads are disabled. Ask Google to verify and review the site.
3. Publish original newspaper articles and an accurate privacy policy covering the actual site's data use. The app does not generate a legal policy or guarantee eligibility. A custom domain can be connected if needed; this release does not buy or change domains.
4. After Google marks the site **Ready**, create a responsive **Display** ad unit. Save its numeric slot ID and your HTTPS privacy policy URL. Confirm Ready and enable article ads. Leave **Auto ads OFF** in AdSense so Google does not introduce unwanted overlays or placements.

Newspaper entries have permanent public links at `/news/?room=…&article=…`. These pages render article text on the server for readers/crawlers. Articles shorter than 300 characters do not request ads; this technical guard is not a guarantee of Google's content-quality approval.

Initial ad delivery is restricted by Cloudflare's trusted country value to **Malaysia**. Other/unknown countries get no ad script. Eligible visitors can read freely and explicitly allow or decline Google ads. The ad script loads once after Allow; no consent choice is persisted. “Continue without ads” reloads the article without ad code and stops further page requests, but does not delete cookies Google already set. Google's linked privacy information explains its data use. This simple opt-in is not represented as a certified CMP. International ad delivery is disabled until a suitable consent setup is implemented, including a Google-certified CMP for EEA/UK/Switzerland where required.

Ad code runs only in the separate article document, never inside the simulator, chat, ceremony, or sponsor-break screen. There is one display slot and no timed refresh, click incentives, fabricated views, or earnings estimator. Articles remain readable without ads. Removed tournaments' articles return 404.

Stadium naming rights and uploaded sponsor banners continue to work for direct sponsorship deals. No payment processor or automatic billing is included; arrange sponsor payments separately. Google account approval, serving/fill, revenue, payout thresholds and review timelines are controlled by Google.

Official implementation references:
- https://support.google.com/adsense/answer/7584263
- https://support.google.com/adsense/answer/12171612
- https://support.google.com/adsense/answer/2768340
- https://support.google.com/adsense/answer/9183363
- https://support.google.com/adsense/answer/7670013

Tests cover role boundaries, revision conflicts, atomic season validation, incomplete archives, fresh opening timings, manual/new scheduling, ad ID validation, ownership meta tags/ads.txt, escaped editorial HTML, no ad requests before consent, decline/withdrawal, and trusted geography. Cloudflare runtime tests execute real workerd/SQLite/HTMLRewriter. No production seasons or ad accounts are changed by these tests.

## v1.11: season form, automatic matches, and 32 teams

New manager registrations default to a 32-team capacity and a 16-team minimum. Admins can close registration with any count from 16 through 32; filling every place is optional. Existing small sample events keep their entry rules. Admins can increase an older registration’s capacity in its registration panel. Single elimination uses real play-in games and explicit byes. Groups distribute teams evenly into groups of three or four and qualify two from each group. Double elimination preserves the two-loss rule for every eliminated qualifier, with a final reset if needed. A bye never produces a fake fixture or score.

Automatic progression is on for new competitions. When registration is closed, an unscheduled opening starts after a shared 16-second deadline; full-time results confirm after 16 seconds. The opening, lineups and sponsor break still run before gameplay. Explicit future schedules retain their dates. Admins can act early, pause a running match, or disable automatic progression. The server persists deadlines and Cloudflare Durable Object alarms run without viewers. Legacy competitions adopt this setting when an authenticated admin opens that room, rather than advancing old rooms merely because a viewer visits. A new season always requires an admin action.

Season Control displays field errors beside Apply and uses an explicit acknowledgment checkbox. The tournament name is supplied from the selected competition after acknowledgment. A hidden old capacity cannot reject a closed-registration season. Opening the editor temporarily holds automatic progression for up to five minutes so a result confirmation does not invalidate the form revision. Closing releases that editor’s hold. A completed pending match is confirmed before archiving, preserving its result. Changes use authenticated, revision-checked atomic updates.

Validation covers every team count from 16 to 32 in single and double elimination and group qualification, manager quota boundaries, exact 16-second deadlines, concurrent viewers, all five languages, and real Cloudflare workerd/SQLite alarms without viewer requests.

## v1.12: admin opening and public season countdown

Every newly created season, including a new competition’s first season, waits for an authenticated admin to click **Start season & opening**. Applying a season change prepares the season; it does not release its first kickoff. An optional opening date can be entered in Season Control, including while fresh registration is open. Admins can also set, change or clear that date from the season opening panel before the season starts. All date inputs use Malaysia (UTC+8); storage uses UTC ISO timestamps.

The public panel counts down in days, hours, minutes and seconds. A selected time is the earliest permitted manual opening. At zero it displays **Waiting for the admin to start the season**; it never starts a match. An admin can clear or change the date to open sooner. Registration must be closed and valid fixtures must exist before starting. Viewers and managers have no opening controls. Countdown edits, start actions and season changes retain admin authorization and revision checks. Concurrent starts open only one ceremony.

The persistent season-opening latch blocks the 16-second fallback, explicit automatic schedules, cron processing and Durable Object alarms until an admin starts the season. Changing automatic progression cannot remove this latch. Once the admin starts the opening, its ceremony and lineups run as usual, and later matches retain their configured progression, result confirmation, pauses and sponsor breaks. Every subsequent season gets a fresh latch. Existing seasons already in progress retain their match state.

Tests cover expired and unset dates, date changes and clearing, invalid dates, registration, permissions, scheduled first matches, viewer polling, cron, actual Cloudflare alarms, concurrent admin starts, later-match automation and five-language countdown rendering.

### Previously prepared seasons (v1.13.1)

A season numbered 2 or higher that was prepared before the opening latch existed also waits for an admin, provided no match is live and no fixture has been played. Existing scheduled dates and fallback timers cannot start that pending season. The first admin start records its opening. Live or already played legacy seasons retain their progression. This also covers registration that was already open before the update.
