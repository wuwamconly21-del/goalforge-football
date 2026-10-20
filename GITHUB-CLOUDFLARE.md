# GoalForge automatic updates

Status: prepared locally. No GitHub repository or Cloudflare deployment has been created by this workflow yet. Netlify remains the live authority.

1. Connect the GitHub plugin in ChatGPT. Repository publishing also needs confirmed write access through the connector/CLI; installing the plugin alone does not guarantee it.
2. Publish the project source to a private repository with default branch `main`. Never include `.migration-private`, provider login files, exports, tokens or `.netlify`.
3. Complete the first data migration and verify Cloudflare before enabling automatic production deployment. The Windows migration launcher is a separate first-migration tool; the GitHub workflow does not perform migration.
4. Configure the repository secret `CLOUDFLARE_API_TOKEN` with permissions to update the existing Worker in the chosen account. Enter it in GitHub's secret settings, never in chat or source files.
5. Set repository variables `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_WORKER_NAME`, and `GOALFORGE_LIVE_URL` to the exact migrated account, Worker and workers.dev URL. Only after successful migration set `CLOUDFLARE_LIVE_READY` to `true`.

The workflow `.github/workflows/cloudflare.yml` tests changes and builds on pull requests and pushes to main. Production deployment happens only on main after successful checks and when the readiness variable is enabled. Deployments use the GitHub `production` environment; any environment approval policy is respected. A failed readiness check prevents deployment. The deployment helper checks that the target already has an initialized GoalForge API and preserves the Durable Object bindings and migration history.

After setup, ordinary changes can be published through authorized repository updates. Users do not need to download a ZIP or run the Windows launcher for each update. Future breaking database changes still need a separate migration plan.

Use this GitHub Actions deployment path OR Cloudflare's native Git build integration for the same production branch. Do not enable both, to avoid duplicate production deployments. This workflow uses GitHub Actions and a scoped Cloudflare deployment secret.
