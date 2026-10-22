# Club journey and Stripe preparation — v1.19

## Delivery status

Stripe replaces ToyyibPay in the production payment path. Existing ToyyibPay environment values are ignored, and its old callback returns 410. Historical adapter code remains only for regression testing and is not imported by the Worker. No claim about misconduct by a payment provider is made.

No merchant credentials were connected and no real or Stripe-hosted test transaction was made in this release. Provider behavior is mocked in payment tests; actual Cloudflare workerd/SQLite exercises the disabled shop and authenticated quest persistence. Checkout remains disabled by default. A full Stripe test checkout/webhook round-trip is still required before accepting money.

## Purchases and automatic fulfillment

- Gem bundles remain fixed MYR offers: 100 / RM5, 250 / RM10, 600 / RM20.
- A customer may instead choose an exact stadium cosmetic: Aurora, Royal or Crimson / RM5; Halo / RM7.50. The checkout product is fixed before payment. No paid random pack or purchasable scout ticket is implemented.
- Confirmed Gem purchases credit the manager's account wallet. Confirmed cosmetic purchases add the chosen item to that same account inventory. The manager can equip owned cosmetics across their own clubs through the existing stadium editor.
- Prices and product quantities come from the server catalogue, ignoring client-supplied amounts. Orders, fulfillment status, wallet credits and item unlocks are server-owned.
- Preview, Stripe test (sandbox namespace) and live wallets are separate. Prior preview balances remain intact, and cannot equip premium items in real tournaments. Test credits do not become live credits when changing mode.
- Orders are reserved before calling Stripe. Checkout Session creation uses a stable Idempotency-Key. A lost response can be recovered with the same operation UUID for up to 23 hours; retrying cannot change its product or amount. The shop exposes Recover checkout for these orders. Older uncertain orders require reconciliation rather than creating another session with a pruned key.
- Hosted Checkout uses card and FPX, subject to the merchant account's actual eligibility. Returned checkout URLs must use HTTPS checkout.stripe.com. No card details are handled by GoalForge.
- `POST /api/premium/webhook` verifies HMAC-SHA256 over the unchanged raw payload and checks the signature timestamp within five minutes, including event test/live mode. The relevant events are checkout.session.completed and checkout.session.async_payment_succeeded.
- The server independently retrieves the Checkout Session and checks payment_status=paid, session mode, test/live flag, exact MYR amount, currency, client reference and internal metadata. Returning to the success URL alone never credits anything. Unpaid/pending/underpaid or mismatched sessions receive no item or credit.
- Credit or item delivery, order status and ledger entry are one atomic CAS update. Concurrent or repeated callbacks grant an order once. Other accounts cannot inspect/reconcile another manager's order. The buyer can manually check pending payments without continuous background polling.

Automatic provider refunds, dispute handling and wallet reversals are not implemented. Before enabling real payments, establish a support/refund/reconciliation process, publish the required customer-facing terms and complete merchant review for the actual products. Do not enable live checkout merely to try it.

## Merchant setup still needed

In the existing Cloudflare Worker's Settings → Variables and Secrets, use encrypted Secrets so the deployment workflow preserves them. Do not paste secret values into chat or commit them to GitHub.

| Secret | Stripe test setup |
| --- | --- |
| STRIPE_MODE | test |
| STRIPE_LIVE_ENABLED | false |
| STRIPE_SECRET_KEY | merchant sk_test_… key |
| STRIPE_WEBHOOK_SECRET | whsec_… for this test endpoint |
| STRIPE_PUBLIC_ORIGIN | https://goalforge-football1.wuwamconly21.workers.dev |

Configure Stripe's test webhook endpoint as `https://goalforge-football1.wuwamconly21.workers.dev/api/premium/webhook` with the two Checkout events above. After account setup, test paid, cancelled, delayed and failed payments, exact cosmetic fulfillment, repeated callbacks and recovery from lost responses. A healthy database is required. Do not share credentials between test/live modes. Live activation separately requires STRIPE_MODE=live, STRIPE_LIVE_ENABLED=true and live merchant/webhook keys after launch requirements are satisfied. This release configures none of these values.

Official references: https://docs.stripe.com/checkout/fulfillment , https://docs.stripe.com/webhooks , https://docs.stripe.com/api/idempotent_requests . These describe the integration protocol, not approval of this particular business.

## Daily and weekly club journey

Managers with their own club get a daily clubhouse above club development. Public viewers keep their existing viewing role. No login requirement is added for spectators.

- Daily check-in grants 50,000 virtual GF once. Every seventh consecutive day grants an extra 500,000 GF and one scout ticket. Missing days resets the displayed streak, without removing earned currency or tickets.
- Daily quests: complete one player training action, save a changed formation/playstyle, and finish a shooting-practice session. Each pays 100,000 GF when claimed. Claim all three for one scout ticket.
- Weekly quests: five actual training actions, practice on three distinct days, and three actual player discoveries. Each pays 250,000 GF; claiming all three adds two tickets. Replaying an already-fulfilled scout operation does not increment discovery progress.
- Daily reset is **00:00 Malaysia time**; weekly reset is Monday at 00:00 Malaysia time. This is separate from Cloudflare's quota reset and the older free scouting-pack UTC reset at 08:00 MYT. The UI shows explicit reset timestamps. Read requests do not write a reset; the next real action rolls the record forward.
- Practice is a three-shot timing activity that can be replayed locally. The goal zone is visible; scores are for fun and have no tournament/OVR effect. The server only awards capped quest progress, requiring a server-issued session token lasting at least eight seconds and no more than thirty minutes. Client scores are never used to calculate rewards. Starting practice is blocked while the club plays. Further local practice carries no extra reward or background API polling.
- One earned scout ticket recruits one specifically selected visible free-agent market player without spending GF. It does not open a random pack or buy another club's listing. Capacity, transfer window and active-match locks still apply. Ticket deduction, player acquisition and stock removal occur in the same room CAS write; a stale/concurrent revision cannot spend or recruit twice.
- Club progress follows the existing independent club-entry model and imports preserve it. These are virtual club rewards; no cash-out or premium-currency conversion is provided.

## Validation

`tests/stripe.test.mjs` validates fixed prices, signed/replayed/tampered callbacks, mode and ownership isolation, independent provider verification, once-only concurrent credits, cosmetic delivery and network recovery. `tests/club-quests.test.mjs` covers Malaysia resets, weekly boundaries, claims, streaks, timing/session restrictions, score-independent progress and ticket selection/budget guards. Five-language rendering tests cover the clubhouse and Stripe-only shop labels. Cloudflare runtime tests check authenticated check-in persistence and duplicate claims. Existing migration, scheduler, legacy match, quota-efficiency and presentation suites remain required.
