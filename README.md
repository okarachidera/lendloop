# LendLoop

LendLoop is a neighborhood tool-lending application built with Next.js, Convex, Clerk, Tailwind CSS, and n8n.

## Features

- Public tool discovery shows only tool name, category, condition, and availability.
- Clerk authentication with server-verified Convex identities.
- Users create, edit, and delete their own listings.
- Date-range borrowing requests, incoming/outgoing views, approvals, declines, and returns.
- Admin-only loan visibility and trusted-lender controls.
- HMAC-signed n8n notifications and daily overdue-reminder workflows.
- Idempotent notification events and reminder delivery records.

## Technology stack

- Next.js 16 App Router and TypeScript strict mode
- Tailwind CSS
- Clerk
- Convex queries, mutations, actions, transactions, and HTTP actions
- n8n with Docker Compose
- Vitest

## Architecture

Browser interactions call Convex mutations through the Clerk-authenticated Convex client. Convex derives identity and role from the authenticated subject and never trusts a client-supplied user or role.

Loan requests use `pending -> approved | declined -> returned` semantics. Cancellation is reserved for future borrower flows. Convex mutation transactions perform overlap checks and state updates together, preventing concurrent approvals from creating overlapping loans.

Important collections:

- `users`: Clerk subject, server-controlled role, and trusted-lender flag.
- `tools`: owner reference, category, condition, public-safe fields, availability, timestamps.
- `loanRequests`: tool, borrower, lender, UTC date-only range, status, timestamps.
- `notificationEvents`: stable event ID, recipient, minimal payload, delivery state, attempt count.
- `reminderDeliveries`: loan plus UTC date period to ensure one reminder record per day.
- `automationActivity`: workflow/audit activity.
- `idempotencyKeys`: reserved stable-operation key registry.

Date ranges use inclusive UTC `YYYY-MM-DD` values. Start must be today or later and end must be after start.

## Local setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create a Clerk application and enable a JWT template named `convex`.
3. Initialize Convex:

   ```bash
   npx convex dev
   ```

   Copy the deployment URL into `NEXT_PUBLIC_CONVEX_URL`.
4. Copy `.env.example` to `.env.local` and populate Clerk values.
5. Set Convex environment secrets:

   ```bash
   npx convex env set N8N_SHARED_SECRET '<long-random-secret>'
   npx convex env set N8N_WEBHOOK_SECRET '<same-secret-as-n8n>'
   npx convex env set N8N_BORROW_WEBHOOK_URL 'http://localhost:5678/webhook/lendloop-borrow-events'
   ```

6. Start the app:

   ```bash
   npm run dev
   ```

## Convex / Clerk setup

In Clerk, create a JWT template named `convex` with a claim containing the Clerk subject in the standard Convex-compatible format. Configure the Convex provider in the Clerk dashboard using the Clerk issuer domain and JWT template. Convex mutations call `ctx.auth.getUserIdentity()` and reject unauthenticated or uninitialized users.

The first signed-in request creates a `users` row with role `user`. Admin role changes must be performed in Convex with a trusted server process or a reviewed migration; no browser mutation accepts a role.

## n8n setup

Start n8n:

```bash
export N8N_SHARED_SECRET='...'
export N8N_WEBHOOK_SECRET='...'
export CONVEX_HTTP_BASE_URL='http://host.docker.internal:3211'
docker compose up -d
```

Open `http://localhost:5678`, import both JSON files from `n8n/workflows/`, and set environment credentials:

- `N8N_WEBHOOK_SECRET`: HMAC signing/verification secret.
- `LENDLOOP_N8N_SECRET`: bearer token for Convex HTTP endpoints.
- `CONVEX_HTTP_BASE_URL`: deployed or local Convex HTTP URL.

For the borrow webhook, enable n8n's raw request body option. This is required because verification signs over the exact canonical JSON bytes. The node uses `x-lendloop-timestamp`, `x-lendloop-event-id`, and `sha256=...` signature headers, rejects timestamps outside five minutes, and uses timing-safe HMAC comparison.

The daily workflow calls `/n8n/overdue`, creates `period = YYYY-MM-DD` delivery records, sends mock notifications, and posts outcomes to `/n8n/reminder-delivery`. Re-running the workflow does not create duplicate reminder records for the same loan/day.

## Testing

```bash
npm test
npm run lint
npm run build
```

Tests cover date ranges, overlap detection, stale webhook timestamps, and canonical payloads. External Clerk/Convex/n8n credential flows require a local deployment and cannot be exercised from the repository without configured services.

## Security and privacy

- Authorization is enforced in every Convex mutation/query.
- Public tool queries return name, category, condition, ID, and availability only.
- Public tool detail deliberately omits owner identity and private loan data.
- Admin queries require the server-controlled `admin` role.
- Listing deletion is blocked while an approved loan is active.
- Convex HTTP automation endpoints require an independently configured bearer secret.
- Reminder status can only be changed by the protected HTTP endpoint.
- No real notification provider or credentials are required; mock delivery writes activity to n8n logs.

## Idempotency and failures

Notification events have stable unique IDs and one delivery state. Retry dispatch is bounded and failed events remain visible. Reminder deliveries use a `(loanId, period)` index. At-least-once external delivery may produce duplicate downstream messages if an external provider retries; LendLoop is not claimable as exactly-once.

## Production-readiness note

- Use structured monitoring for mutation errors, notification failures, reminder failures, and n8n execution errors.
- Add audit logging before administrator-sensitive migrations or privileged role changes.
- Rotate Clerk, Convex, webhook, and n8n secrets with overlapping validation periods.
- Add public and authenticated rate limits at the edge and inside sensitive mutations.
- n8n and the HTTP endpoints should use HTTPS and provider delivery guarantees, with at-least-once deduplication at the consumer.
- Define retention for delivered events and rotate old reminders; back up Convex and n8n volumes.
- Back up Convex, n8n database/credentials, and configuration; rehearse restore procedures.
- Production deployment should keep n8n credentials in n8n's encrypted credential store and never export secrets.

See `docs/production-readiness.md` for the full short operational checklist.

## Known limitations

- External Clerk, Convex, and n8n credentials are not configured in this workspace.
- Admin assignment is intentionally not exposed to users.
- Notifications are mock/log-only without an email or SMS provider.
- Full Convex integration tests require a deployed test instance.
- The n8n workflow JSON is an importable baseline and should be activated after credentials and raw-body settings are verified.
