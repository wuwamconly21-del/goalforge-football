# Scouting and club economy — v1.16

Managers open **Market → Scout lounge** for player discovery. Existing direct signings, listings, sales and lineup controls remain available. Public team galleries show collectible player cards; Club Wire shows actual recruitment, releases and match rewards, without invented online counts.

## Virtual gameplay currency

GF is an in-game club budget. There is no real-money GF purchase, paid random pack, cash withdrawal, payment checkout or automatic Ko-fi entitlement in this release. Card studio purchases also use virtual GF. The existing Ko-fi support link and administrator sponsor banners remain separate.

Each club entry can claim one free daily pack. Standard packs cost 500,000 GF; focused-position packs cost 750,000 GF. All packs have the same rarity distribution:

| Rarity | Base probability | Initial overall rating |
| --- | --- | --- |
| Academy | 65% | 70–76 |
| Rare | 25% | 77–82 |
| Elite | 9% | 83–88 |
| Icon | 1% | 89–92 |

After nine consecutive draws without Elite or Icon, the next draw has 90% Elite / 10% Icon odds. Either rarity resets that counter. The free daily draw counts toward the guarantee. Current probabilities and rating ranges are displayed before opening. Server cryptographic randomness chooses results; client-supplied price, rating, rarity and seed do not control them.

There are at most ten draws per club entry per UTC day (reset at 08:00 MYT), a five-second draw cooldown and seven reserve slots. Recruitment/release/cosmetic actions obey the transfer window and lock while that club plays. A manager can act only on their own team. Requests use existing authenticated revision/CAS writes. A draw UUID is recorded with the result in the same write; replays among the last twenty receipts do not charge again. A stored last result lets the UI recover a successful draw after refresh; the reveal animation does not reroll the player.

Players have fictional procedural portraits, role archetypes, condition, stamina, attribute bonuses and unlocked traits. Academy players start without an unlocked trait; higher rarities receive their role trait and an Icon can receive a second trait. These feed the existing bounded development system in future engine-5 rating-mode snapshots. Open mode remains neutral. Card rarity and reveal effects do not guarantee goals or wins. Older players without scouting provenance receive a visual rarity based on OVR; their stats and history are unchanged.

Managers can release an unlisted reserve for 100,000 virtual GF, with confirmation. This permanently removes that player from that club entry. Fixed card frames cost 150,000 / 250,000 / 400,000 GF, are charged once and can be equipped again free. Frames have no stat or odds effect.

## Match progression and preservation

Fixtures first kicked off in this release carry `economyVersion: 1`. Confirmation grants each participating club 250,000 GF for a win, 200,000 for a draw or 150,000 for a loss, plus 3 / 2 / 1 club XP. Every ten XP advances the displayed club level. A per-fixture marker prevents duplicate rewards. Existing live/completed fixtures and legacy snapshots receive no retroactive rewards or event changes. Shoot-out winners use the same final winner calculation as the result.

Cross-tournament imports preserve player provenance, training, club XP, pity progress and owned cosmetics. The destination is an independent entry: player IDs are regenerated, operation receipts/last reveal are cleared and its daily allowance starts fresh. Source history is unchanged.

## Real-money monetization direction

Suitable separate products to design next include fixed cosmetic bundles (known frame/kit/celebration), a supporter pass with clearly listed non-competitive benefits, and fixed-duration sponsor inventory. Provider checkout, confirmed payment webhooks, fulfillment/refunds and product terms must be implemented before promising paid entitlements. None is enabled by the virtual card studio. Do not market GF scouting as a paid cash product.

## Validation

`tests/scouting.test.mjs` exercises server prices, ignored client overrides, ownership, CAS races, idempotency, free claims, pity, capacity/cooldowns, traits, release, frames and once-only rewards. `tests/scouting-ui.test.mjs` checks five-language presentation, odds, virtual-currency wording, safe names, manager locks and retained market tabs. Cloudflare runtime tests exercise authenticated draw/replay persistence; import tests cover preserved progress and cleared operation IDs. Existing legacy event checks, rules, access, migration and presentation suites remain required.
