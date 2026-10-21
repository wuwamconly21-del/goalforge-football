# Full migration: Netlify → Cloudflare

Status: the GitHub migration workflow is prepared. This document does not certify that production migration has run. The existing Netlify application remains authoritative until the workflow reports **complete**.

Selected target: [https://goalforge-football1.wuwamconly21.workers.dev](https://goalforge-football1.wuwamconly21.workers.dev), Worker **goalforge-football1**. This replaces the earlier goalforge-football Worker as the migration destination. Netlify remains the source until verified cutover; the prior Cloudflare Worker is not deleted or imported into.

## One-time owner setup

No Windows launcher or repeat ZIP upload is required. Add provider credentials directly to GitHub; never paste them into chat, issues, commits or workflow inputs.

Open [repository Actions settings](https://github.com/wuwamconly21-del/goalforge-football/settings/secrets/actions) and add these **repository secrets**:

| Secret | Value |
| --- | --- |
| NETLIFY_AUTH_TOKEN | A personal access token from the Netlify account that can read this site's Blobs and deploy the existing site |
| CLOUDFLARE_API_TOKEN | A deployment token for the account containing the existing goalforge-football1 Worker |

Use Cloudflare's **Edit Cloudflare Workers** token template for the selected account. Ensure it permits deploying this Worker, updating its secrets and accessing its configured Durable Object/D1 bindings. Do not use the Global API Key. The migration does not change subscriptions or buy a plan.

Add these **repository variables** using the Variables tab:

| Variable | Value |
| --- | --- |
| CLOUDFLARE_ACCOUNT_ID | The 32-character account ID from the Cloudflare dashboard |
| CLOUDFLARE_NATIVE_BUILDS_PAUSED | Set to true only after disabling native automatic deployments as described below |

Leave CLOUDFLARE_LIVE_READY unset during first migration.

In Cloudflare: **Workers & Pages → goalforge-football1 → Settings → Builds → Disconnect** temporarily disconnects native builds from GitHub. This leaves the deployed Worker in place. Wait for any existing builds/deployments to finish or cancel them before migration. The pause prevents an older import-mode build from replacing the verified live deployment during cutover. Then set CLOUDFLARE_NATIVE_BUILDS_PAUSED=true.

If Netlify is also connected to this repository, stop its automatic builds during cutover too; an overlapping Netlify deployment can undo the verified redirect.

## Run

Open [GoalForge full migration](https://github.com/wuwamconly21-del/goalforge-football/actions/workflows/full-migration.yml), select **Run workflow**, branch **main**, action **preflight**. This checks both provider credentials, the source admin record and the closed target without freezing Netlify or deploying anything.

Once preflight passes, run the same workflow with **migrate**. The requested full migration is already authorized. Alternatively, the assistant can trigger either phase by committing a fresh migration/request.json containing an action of preflight or migrate plus a unique request identifier. That file contains no credentials.

The workflow runs the application tests and build before migration. It then:

1. Confirms the exact source site and destination Worker, and refuses an already-live or nonempty target.
2. Deploys the private import Worker using a temporary random migration secret and verifies storage.
3. Freezes Netlify writes and waits for in-flight writes to drain.
4. Takes two complete exports and requires identical manifests.
5. Imports all records and checks every checksum, revision, competition registry and global account/session inventory.
6. Records activation intent and commits the live Worker configuration to main before deploying it.
7. Checks the frontend, configured admin account and public competition directory.
8. Deploys a redirect from the old public URL, removes the old scheduled function from that deployment and confirms the redirect.
9. Removes the temporary import secret when possible and reports complete.

Do not cancel a migration after maintenance begins. Follow its phase log if a network interruption occurs.

## Data retained

Teams, players, uploaded logos and banners, managers, additional admins, password hashes, competition settings, sponsors, results, archives and all other Blobs records retain their existing format and revision. No admin reset or empty tournament is created. Original Netlify records are retained as the fallback copy; private exports are never published as Actions artifacts and are deleted from the temporary runner afterward.

Accounts remain intact, but browser cookies are scoped to the original hostname: users sign in again on the new Cloudflare URL. Device-local newspaper drafts and preferences remain on the old origin and cannot be moved by a backend export; copy unpublished drafts before switching. Published newspaper articles are migrated with the competition records.

The user-added D1 binding is retained. This implementation stores application records in SQLite-backed Durable Objects; adding the D1 binding alone does not move data into D1.

## Failure handling

| Last phase | Expected behavior |
| --- | --- |
| starting / preflight-passed / target-ready | Netlify stays writable; check the failed prerequisite |
| Before activation, followed by source-restored | Netlify was reopened; Cloudflare remains closed |
| source-lock-check-required | Source unlock could not be confirmed; inspect the lock before retrying |
| activation-attempted | Keep Netlify locked; inspect the Git commit and Cloudflare deployment before recovery |
| cloudflare-live | Cloudflare is authoritative; finish checking the old URL redirect |
| complete | Cloudflare live checks and the Netlify redirect passed |

A rerun refuses a target containing partial or existing application records. It never wipes a namespace or overwrites conflicting records to make a retry pass. Investigate partial-import failures before a recovery run. Locks carry a run owner so one run cannot unlock another run's maintenance.

## Automatic updates after completion

Choose one production deployment route:

- Reconnect native Cloudflare Workers Builds to main after the live configuration commit is present. Keep CLOUDFLARE_LIVE_READY unset.
- Or keep native builds disconnected and enable the existing Actions deploy job only after supplying its documented live Worker variables and setting CLOUDFLARE_LIVE_READY=true.

Do not enable both production deployment routes. Code updates then come from the repository; no repeat ZIP upload is needed.

Official provider instructions:
- [Cloudflare GitHub Actions](https://developers.cloudflare.com/workers/ci-cd/external-cicd/github-actions/)
- [Cloudflare disconnecting builds](https://developers.cloudflare.com/workers/ci-cd/builds/#disconnecting-builds)
- [Netlify personal access tokens](https://docs.netlify.com/api-and-cli-guides/api-guides/get-started-with-api/)
- [Netlify Blobs](https://docs.netlify.com/build/data-and-storage/netlify-blobs/)
