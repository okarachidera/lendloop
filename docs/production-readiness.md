# Production-readiness checklist

## Monitoring and observability

Instrument Convex mutation failures, notification dispatch retries, n8n execution failures, and HTTP 401/400 responses. Send aggregated alerts to on-call tooling rather than exposing operational data to users.

## Audit and role management

Log administrator role changes, listing removals, trusted-lender updates, loan approvals, and reminder status writes. Store role changes outside client APIs and review privileged migrations.

## Secrets

Keep Clerk, Convex, n8n, and webhook secrets in managed secret storage. Rotate independently, use separate development and production values, and revoke old credentials after overlap.

## Rate limiting

Apply rate limits to sign-up-adjacent mutations, listing creation, request creation, approvals, automation endpoints, and public discovery.

## Delivery guarantees

External notification delivery is at-least-once from a retrying system. Use stable event IDs and delivery state for deduplication; do not claim exactly-once delivery.

## Retention and privacy

Retain only recipient and loan identifiers needed for notifications. Purge delivered events and stale reminder records on a documented schedule. Support listing and account deletion according to the active-loan integrity policy.

## Backup and recovery

Back up Convex data according to the provider's production backup controls and n8n's database/credential volume. Test restore procedures and document recovery objectives.

## Deployment security

Serve HTTPS, restrict Convex HTTP automation endpoints to trusted origins or network controls where possible, pin n8n images, update dependencies, and disable public exposure of n8n editor/credentials in production.
