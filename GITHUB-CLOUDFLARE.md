# GoalForge: automatic updates and first deployment

Repository: https://github.com/wuwamconly21-del/goalforge-football

Current state: GitHub access is connected and the full source upload is complete. The app, components, lib, netlify, cloudflare, migration and tests folders are present. Source checks, all test suites, production build and Cloudflare compilation passed for commit 107fe845b1f65220b5a74881c4b29fe50e233a49. Production migration has not yet been performed.

## Full migration without a Windows launcher

Use [FULL-MIGRATION.md](FULL-MIGRATION.md) and the separate GoalForge full migration workflow for the initial data-preserving cutover. Provider credentials belong in GitHub Secrets. The normal update workflow below does not perform first migration.

## Source upload (completed)

The GoalForge v1.4 source folders have been uploaded with their original nesting. Routine code changes can now be made through GitHub; the initial folder upload does not need to be repeated.

Do not upload node_modules, .netlify, .wrangler, .migration-private, exports, login files or tokens. The source package already excludes private migration records. Once this initial upload is complete, routine updates can be made through the repository without downloading or uploading a ZIP each time.

The workflow .github/workflows/cloudflare.yml lists missing application files before installing dependencies. It runs tests and build checks once source is complete. A source-structure failure means the upload is incomplete; it is not a Cloudflare login failure.

## Recommended low-maintenance deployment

Cloudflare Workers Builds can connect directly to this repository through the official GitHub integration. A normal push to the configured production branch can then build and deploy automatically. The account owner must approve that provider integration once in Cloudflare. No repeated chat device codes are required for ordinary updates.

Official instructions:
https://developers.cloudflare.com/workers/ci-cd/builds/git-integration/

Before connecting a production auto-deploy branch, complete the first migration and commit the exact verified live Worker configuration. The current wrangler.jsonc intentionally targets the closed migration-worker entry point with MIGRATION_MODE=import; this is not a public viewer application.

## Alternative: GitHub Actions deployment

The included workflow also supports updating an existing, verified live Worker. Use this route instead of native Workers Builds if you want the checks and release managed in GitHub.

Repository secret:
- CLOUDFLARE_API_TOKEN: a scoped deployment credential for the selected account. Enter it in GitHub Secrets, never in chat or source code.

Repository variables:
- CLOUDFLARE_ACCOUNT_ID
- CLOUDFLARE_WORKER_NAME
- GOALFORGE_LIVE_URL
- CLOUDFLARE_LIVE_READY: leave unset until the first migration has completed, then set to true.

Deployment is allowed only from main after passing checks. The deployment helper additionally verifies the target is already an initialized live GoalForge application. The workflow cannot provision a new production instance or migrate Netlify records by itself.

Official instructions:
https://developers.cloudflare.com/workers/ci-cd/external-cicd/github-actions/

Use one production deployment route for this branch; do not enable both native Workers Builds and the Actions deploy job.

## Preserve existing data

First migration requires an authenticated source export, a private import-only target, exact checksum/revision verification, and a controlled switch to one writer. Do not enable Cloudflare production scheduling while Netlify is still allowed to update the same competitions.

The existing D1 binding in wrangler.jsonc is preserved. Adding a D1 binding does not move Netlify records; the prepared backend uses SQLite-backed Durable Objects. Adopting D1 would be a separate implementation and migration task.

Three-role design and monetization recommendations:
- docs/ROLES-AND-PERMISSIONS.md
- docs/PRODUCT-AND-DEPLOYMENT.md
