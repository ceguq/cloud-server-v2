# Proposal: Enforce share link password protection

## Problem
Share links can be created with an optional password, but the public share metadata and download flow do not appear to enforce that password. This creates a security gap where protected links may expose file metadata or allow download without the correct credential.

## Goals
- Enforce password protection for share links that include a password.
- Store share link passwords as hashed values rather than plain text.
- Keep public access for links without a password working as before.
- Return clear, safe errors for invalid passwords, missing passwords, and expired links.

## Non-goals
- Adding password reset flows for existing share links.
- Supporting multiple passwords or password rotation per share link.
- Changing share link expiration semantics beyond existing behavior.

## Impacted areas
- backend/app/Http/Controllers/ShareController.php
- backend/app/Models/ShareLink.php
- backend/database/migrations/2026_06_09_000000_create_share_links_table.php
- frontend/src/app/pages/PublicSharePage.tsx
- frontend/src/app/pages/Shared.tsx
- frontend/src/services/shareService.ts

## Risks
- Existing share links may already store passwords in an uncertain format.
- Public share UX must be updated carefully so protected links are gated without breaking unprotected links.
- Password handling must avoid exposing hashes or plaintext values in API responses.

## Rollout plan
1. Audit the current public share create/show/download behavior.
2. Patch backend share link creation, metadata, and download validation.
3. Update the public share UI to prompt for a password when required.
4. Verify protected and unprotected share links manually.
