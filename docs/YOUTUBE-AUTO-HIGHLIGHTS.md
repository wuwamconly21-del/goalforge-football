# GoalForge → @NelyxGaming

Target channel: `UCLyksjgSV9Tn2ICCfoX6Cbg`. This is a separate unattended uploader, not the Metricool connection used inside ChatGPT. Its Google token must authorize this exact channel. Nothing can upload until those credentials exist.

## What runs automatically

- GitHub Actions checks the public production directory every 15 minutes (at minutes 7, 22, 37 and 52), or on a manual run. GitHub may delay scheduled runs; it is not instant delivery or a continuously running service.
- Every confirmed, completed fixture in visible tournaments and their retained season archives enters a durable queue. Existing completed matches are included on first activation. Unfinished fixtures, demos, removed tournaments and invented future events are excluded.
- One landscape 1280×720, 30 fps video per fixture includes **every moment returned by the game's highlight system**: goals, saves, VAR disallowed goals, red cards, shootout kicks and missed penalties. No daily content cap and no “best goals only” filter. Each has opening/results, both starting lineups, team names/logos when supported, score and a full-time card.
- Replays use the existing seeded simulator, motion interpolation, field/stadium drawing and weather physics. This is an export renderer, not a recording of the full live broadcast UI. It does not change the result. Uploaded MP4s use original synthesized crowd/kick/goal effects, not the game's uploaded music of unknown redistribution rights.
- A version announcement is queued once the live `/api/health` version matches the repository version. A successful main-branch Cloudflare deployment also triggers a scan, so releases do not need to wait for the next 15-minute scan. Put specific release notes in `automation/youtube/release.json`; otherwise the announcement only says the version is live. It never invents feature changes.
- Public publishing is configured because the user explicitly requested automatic uploads. The videos are labelled simulated football, not real match footage. Set `YOUTUBE_VISIBILITY: private` in the workflow for a private-only rollout. Actual returned visibility is recorded; API/provider restrictions can override publication.
- A run works for up to 30 minutes, then leaves the remaining queue for the next run. Individual failures back off up to 24 hours. A failed room fetch does not erase other queued matches. Permanent authorization/quota failures need correction, not endless rapid retries.

## One-time authorization

The Metricool connection does **not** export its access token into this GitHub workflow. Do not copy browser cookies or send secrets in chat.

1. In Google Cloud, enable **YouTube Data API v3**. Configure Google Auth Platform for your own app and create an OAuth client of type **Desktop app**. Download its client JSON privately. If your consent app is in Testing, add your Google account as a test user; testing refresh tokens may expire and require reauthorization. Complete Google's applicable publishing/verification requirements for lasting use.
2. On your own computer install Node.js 24 and GitHub CLI, then `gh auth login` for this repository. Clone/pull the source.
3. In the repository folder run (replace the JSON filename with its actual local path):

   ```sh
   node automation/youtube/authorize.mjs /path/to/client_secret.json --initial-setup
   ```

4. Open the printed Google link on that same computer and select **NelyxGaming**. The helper uses a loopback callback, PKCE and state, verifies the channel through YouTube, and sends credentials directly to GitHub Secrets using the already signed-in GitHub CLI. It never prints the credentials. After success it starts the workflow automatically.
5. Keep the private `.migration-private/youtube-state-key` backup. It is excluded from git. When Google authorization must be renewed, rerun **without** `--initial-setup`. Never replace the existing ledger key while uploads have receipts.

Required repository Secrets: `YOUTUBE_CLIENT_ID`, `YOUTUBE_CLIENT_SECRET`, `YOUTUBE_REFRESH_TOKEN`, `HIGHLIGHTS_STATE_KEY`. GitHub supplies its own `GITHUB_TOKEN`. No Google API key alone can upload as the channel. No credentials belong in Cloudflare, frontend JS or checked-in files.

## Reliability and receipts

The dedicated `goalforge-broadcast-state` branch contains an AES-256-GCM encrypted, gzip-compressed queue/receipt ledger. OAuth tokens are never stored there. The independent random encryption key stays in GitHub Secrets. Resumable session URLs are encrypted because they are sensitive. One workflow concurrency group serializes runs; conditional GitHub file updates reject lost writes.

Each fixture has a stable ID from tournament, season, fixture index, participants and seed. A unique marker is embedded in its description. The uploader persists the resumable session **before sending video bytes**. After interruption it queries that session and resumes at the acknowledged byte offset. Re-rendered bytes must match the original SHA-256 and size. A successful receipt is saved before the job is finished. Encrypted snapshots are removed from completed jobs to keep the ledger smaller.

There is no honest “no matter what” guarantee across independent services. If an upload session expires after an ambiguous response, the uploader searches up to 1,000 channel uploads for the unique marker. If it cannot establish whether the video exists, it keeps the job in `needs-review` and retries reconciliation daily instead of blindly publishing a duplicate. Do not delete the ledger or manufacture success receipts. Different FFmpeg/native library versions can change bytes for an interrupted session; resolve that job rather than append mismatching bytes.

Check **Actions → GoalForge automatic YouTube highlights**. The job summary links to acknowledged YouTube videos and shows pending counts. Missing credentials produce an explicit failed setup step, never a fake success. A successful API receipt means uploaded, not proof YouTube has completed processing or granted monetization. Respect YouTube quotas, channel limits and GitHub Actions storage/minutes. The workflow does not purchase a plan or guarantee free unlimited rendering.

Coverage depends on the source retaining the fixture until a successful scan. Current public directory exposes at most 40 visible competitions. Removed tournaments and archives deleted before discovery cannot be recovered. Future engine upgrades should retain legacy seeded-event behavior. Large queues over 20 MB encrypted are held for maintenance, not silently truncated. GitHub can disable inactive repository schedules; monitor Actions.

To stop new uploads, disable this workflow in Actions. Existing YouTube videos are unaffected. To revoke access, revoke the Google app grant and remove its repository secrets. To rotate a ledger key, decrypt and re-encrypt the existing ledger in a private maintenance session first.

## Developer checks

```sh
npm ci
npm ci --prefix automation/youtube --ignore-scripts
npm test --prefix automation/youtube
```

The export smoke test needs FFmpeg/ffprobe. Tests mock Google/GitHub; they never publish or spend money. Real unattended authorization/upload must be validated after credentials are installed.

References: [Google OAuth desktop flow](https://developers.google.com/identity/protocols/oauth2/native-app), [resumable uploads](https://developers.google.com/youtube/data/guides/using_resumable_upload_protocol), [video insertion](https://developers.google.com/youtube/data/reference/rest/v3/videos/insert).
