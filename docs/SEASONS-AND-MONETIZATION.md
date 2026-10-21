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
