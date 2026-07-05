# Design: Enforce share link password protection

## Current behavior summary from the audit
- The backend share creation flow accepts an optional password field, but the current implementation appears to store it directly on the share link record.
- The public share metadata endpoint does not appear to require a password before returning file details.
- The public share download endpoint does not appear to validate a password before allowing download.
- The ShareLink model exposes a password field and the migration stores it as a nullable string.
- The public share page currently loads share metadata and triggers download without a password prompt.

## Target behavior
- Share link creation may accept an optional password.
- Passwords must be stored hashed, not as plaintext.
- Public share metadata should clearly indicate whether a password is required.
- Password-protected links must not allow metadata access or download without a valid password.
- Incorrect passwords must return a safe validation error.
- Expired links must remain blocked.

## Backend plan
- Review and patch ShareController create/show/download behavior so password enforcement is consistent.
- Use Hash::make when a password is provided during share creation.
- Use Hash::check when validating a password for public metadata or download requests.
- Avoid exposing password hashes or plaintext values in API responses.
- Keep links without a password working as before.

## Frontend plan
- PublicSharePage should show a password input when the share requires a password.
- The download flow should include the password only when required.
- The UI should show a friendly error message for incorrect passwords.
- Shared page management should not display password values or hashes.

## Compatibility notes
- Existing share links without passwords should continue to work.
- Existing password-protected links may require review if their stored password format is uncertain.
