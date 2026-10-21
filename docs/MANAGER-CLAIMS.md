# Manager claims for existing teams — v1.13

Managers create or sign in to their normal manager account, open a competition in the Manager portal, and choose **Claim an existing team**. The form asks for an unclaimed team, Diplomacia IGN, a profile screenshot and an optional note. PNG, JPEG and WebP uploads up to 4 MB are resized locally to a readable proof image before submission.

The claim is pending until an admin reviews it in **Teams → Review manager claims**. Admins open the private screenshot, compare the profile and IGN, acknowledge that review, and approve or reject the claim. Rejection requires a reason shown in the applicant’s history. This is a human review, not an automated Diplomacia account verification or an integration with that game.

Approval links the authenticated claimant account to that team. Each manager may control only one team per competition, and an already owned team cannot be claimed. Approval preserves roster, tactics, funds, fixtures, live snapshots and results. Normal roster, tactics and transfer locks still apply during matches. Existing managers keep their access; creating a completely new team retains the established own-team registration flow.

Unclaimed teams continue in the existing football AI simulation using their current squads and tactics. Submitting a claim never pauses the season or changes the game engine. An approved manager manages the team’s roster, tactics and market activity rather than manually controlling the footballers.

A manager may have one pending claim per competition and may withdraw it. Competing requests for one team can be reviewed, but approving one supersedes the other pending requests for that team. All decisions use revision-checked atomic writes so two admins cannot assign the same team twice. A team deletion or a fresh season that clears its entries expires pending requests for those entries. Kept teams retain their managers between seasons.

Screenshots live in private records separate from the competition’s polled state. `/api/manager-proof` requires an authenticated admin or the exact applicant account, verifies the room and claim link, and returns an image with no-store caching. Public competition responses exclude claim records, IGN, notes and proof. Managers receive only their own claim history. Managers and viewers cannot review requests. The displayed verified label records an admin approval.

Submissions require a valid image signature, a 2–60-character IGN and a server-authenticated manager identity. There is a one-pending-claim rule, a five-attempt limit per manager per season, a 64-pending-claim room limit and a request rate limit. Failed concurrent writes erase their unlinked proof image payload. Claim evidence is not published as a stadium banner or shared with another service.

Validation covers account/role isolation, private screenshot reads, duplicate and competing claims, live-match continuity, ownership and budget preservation, rejection notes, withdrawal and retries, fresh-season expiry, image validation, atomic failures, all five UI languages, and real Cloudflare workerd/SQLite session and proof routes.
