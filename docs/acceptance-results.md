# LendLoop Acceptance Results

Date: 2026-11-22

## Executed locally

- `npm test`: passed, 3 test files and 15 tests.
- `npm run lint`: passed with no findings.
- `npx tsc --noEmit`: passed.
- `npm run build`: passed; all application routes generated.
- `docker compose config --quiet`: passed.
- Docker Compose started n8n and reported healthy.
- Both n8n workflow JSON exports were imported successfully.
- Both workflow exports were activated in a disposable local n8n owner.
- Borrow notification workflow live HMAC cases:
  - Valid signature: execution `15` was webhook mode, followed by successful mock delivery execution `16`.
  - Repeated event ID: execution `17` failed with the workflow duplicate-rejection branch; execution `18` recorded the error workflow success.
  - Invalid signature: execution `19` failed in the webhook branch; execution `20` recorded the error workflow success.
  - Stale timestamp: execution `21` failed in the webhook branch; execution `22` recorded the error workflow success.
- Reminder workflow live executions:
  - Before environment-access configuration, execution `25` failed with `Overdue endpoint failed: access to env vars denied`.
  - Docker Compose was corrected with `N8N_BLOCK_ENV_ACCESS_IN_NODE=false`.
  - After recreation, disposable scheduled executions `29` and `30` succeeded and contained mock writeback evidence for the loan and attempt ID.

## Not executed with external services

The environment did not contain Clerk publishable/secret credentials, a Convex deployment URL/deployment secret, or a live Convex test deployment. Therefore:

- Live Clerk sign-in and JWT issuance were not executed.
- Clerk-to-Convex `ctx.auth.getUserIdentity()` behavior was not executed against Convex.
- Live server-authorized listing, borrowing, overlap, and admin mutations were not executed.
- Live Convex HTTP overdue and reminder writeback endpoints were not executed.
- Live notification dispatch from a Convex action was not executed.

These remain explicit external-credential limitations, not passing acceptance results.
