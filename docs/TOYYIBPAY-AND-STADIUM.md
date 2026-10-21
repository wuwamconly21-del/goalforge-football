# Stadium workshop and ToyyibPay preparation — v1.17

## Available features

Managers open Club development → Stadium workshop. Administrators can use the same GF stadium tools from team development. Name/capacity editing remains separate and preserves the chosen design.

- Free seat-colour and default stadium design; static SVG preview for theme, roof, pitch mowing, lights and tifo.
- GF catalogue: checker pitch 200,000; canopy 250,000; golden lights 150,000; chevron tifo 100,000. Unlock once and reuse free.
- The first stadium discovery each UTC day is free, then 200,000 GF. Five-second cooldown, maximum five discoveries per day, equal probability for each remaining unowned GF item. No duplicates; premium items are excluded. Odds are displayed before opening. Discovery stops when all four items are owned.
- Authenticated room revisions make each GF unlock/discovery atomic. The server owns costs, available items, ownership and randomness; a stale revision never charges.
- Stadium designs appear in public team galleries and the actual home pitch at future kickoffs. Frozen live match rosters keep their original venue. The renderer caches decorations rather than drawing a new stadium every frame. Designs have no effect on results, weather or player stats.

## Forge Gems

Gems are a separate manager-account currency, not the virtual club GF budget. They unlock fixed Aurora/Royal/Crimson themes (100 Gems each) and the Halo roof (150). No premium player packs, premium random draws, conversion to GF, performance boosts, transfers or cash-out are implemented.

Draft top-up catalogue: 100 Gems / RM5, 250 / RM10, 600 / RM20. These are preparation prices, not an activated live offer. They can be changed in the server catalogue before launch. The code does not guarantee payment-provider eligibility or fee levels.

Without merchant configuration, checkout is disabled. Each manager can claim 300 **preview** Gems once to try fixed purchases. These are isolated from real balances and cannot equip premium cosmetics in actual tournaments. Premium choices in the editor remain preview-only until the live account owns them. Sandbox and live balances are also isolated. A failed API read never fabricates a balance.

Wallets are private global records keyed to the authenticated manager, so purchases are not tied to one tournament. No payer names, emails, phones, provider responses or secret keys are returned in the wallet view. Transaction and cosmetic ledgers are server-owned. Public match state contains applied stadium appearance, not wallet balances or orders.

## Merchant configuration — still required

No ToyyibPay account, bill, purchase or real charge was created for this release. Gateway behavior is tested with mocked provider responses; the preview wallet and stadium APIs are additionally exercised in actual local Cloudflare workerd/SQLite. A real provider sandbox round-trip remains a launch requirement.

1. Register a ToyyibPay **sandbox** merchant through the provider and create a category. Complete account/financial identity steps yourself. Never paste your secret key into chat or commit it to GitHub.
2. In the existing production Worker's Settings → Variables and Secrets, add the following as **encrypted Secrets**. Using Secrets also preserves them across the existing Wrangler deployment workflow. Keep the Worker name/bindings/migration manifest unchanged.

| Secret | Sandbox value |
| --- | --- |
| `TOYYIBPAY_MODE` | `sandbox` |
| `TOYYIBPAY_SECRET_KEY` | Provider sandbox secret |
| `TOYYIBPAY_CATEGORY_CODE` | Sandbox category code |
| `TOYYIBPAY_PUBLIC_ORIGIN` | `https://goalforge-football1.wuwamconly21.workers.dev` |
| `TOYYIBPAY_LIVE_ENABLED` | `false` |

3. Verify storage is healthy first. Sign in as a manager, select a club, open the workshop and create a sandbox bill. The displayed payment link must use `dev.toyyibpay.com`. Use the provider's bank simulator, return to the manager page and reopen the workshop. Check that the order credits once, including repeated callbacks and manual payment checks. Test failed/pending payments too. Sandbox inventory must not equip premium items in live tournaments.
4. Before considering real payments, finish merchant approval, confirm the provider accepts the intended fixed cosmetic currency products, publish support/privacy/refund terms and confirm handling of refunds/disputes. Provider refunds and wallet reversal are **not automated** in this version. Do not enable a paid launch before an operational refund/reconciliation procedure is established. No subscription renewal is implemented.
5. Live mode requires separate live credentials/category, `TOYYIBPAY_MODE=live` and the explicit `TOYYIBPAY_LIVE_ENABLED=true`. This deployment sets none of them. Enabling real payments requires the owner's deliberate setup after successful sandbox validation. Changing mode never converts preview/test balances into real Gems. Keep sandbox mode or disabled mode during development.

## Payment verification

The server fixes bundle amount in MYR cents and creates the provider bill. The unique order is reserved atomically before the network request. Repeating its UUID never creates another bill. Ambiguous provider failures stay visible as “awaiting reconciliation”; no blind network retry creates duplicate bills. New bills are rate-limited to one per 30 seconds and ten per day per manager; the retained order limit is 500, after which support/archival work is required rather than deleting credit evidence.

The hosted bill uses FPX and fixed pricing, with merchant-paid fees under the provider's documented default. Returned API bodies are inspected even for HTTP 200 failures. A return URL is navigation only and cannot grant currency.

`POST /api/premium/callback` validates the provider-specified MD5 callback hash, mode, known order, bill code and exact amount. Before crediting, it independently requests `getBillTransactions` with the merchant key and verifies successful status, external order reference and amount. Credit, order status and ledger entry are one CAS write in the same wallet record. Concurrent/replayed callbacks cannot credit twice. Pending or insufficient payments receive no Gems. Signed callback retries can reconcile after transient storage failure; the owner can request manual rechecking through the shop. No automatic polling adds idle requests.

Official reference used: https://toyyibpay.com/apireference/ (sandbox hosts, fixed-cent bills, callback hash and transaction verification). The callback signature follows that protocol; MD5 is not used for passwords. Core tests compare MD5 vectors with Node's implementation, verify rejection cases, concurrent credit/spend, isolated wallets, failed bill creation and stadium validation. Existing role, legacy fixture, migration and performance suites remain required.
