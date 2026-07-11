## Design: Profile Name Update

### Endpoint contract
- Backend exposes one authenticated endpoint:
  - PATCH /api/profile
- Request body:
  - {
      "name": "Updated Name"
    }
- Successful response:
  - {
      "message": "Profile updated successfully.",
      "user": {
        "id": "...",
        "name": "Updated Name",
        "email": "..."
      }
    }

### Validation
- `name` is required.
- `name` must be a string.
- Leading and trailing whitespace is trimmed before validation.
- Blank or whitespace-only values are rejected.
- Minimum length should be sensible for display names (for example 2 characters).
- Maximum length should be aligned with the existing `users.name` column definition; if the current column is narrower, validation should use that exact limit.
- Validation errors should follow the existing Laravel JSON validation format.

### Authentication and ownership
- The endpoint remains protected by `auth:sanctum`.
- The endpoint always updates the currently authenticated user.
- No user ID is accepted from the request.
- A user cannot update another user's account.
- The endpoint must not allow email or role changes.

### Frontend state flow
- The Settings Profile section loads the current name and email from the existing authenticated user flow.
- The name field becomes editable.
- The email field remains visibly read-only.
- Save is disabled when:
  - the name is unchanged
  - the name is blank
  - a request is already running
- The UI shows loading state, success feedback, and validation/API errors.

### Cached user synchronization
- After a successful update, the locally cached current user information is updated.
- The updated name remains visible after refresh through the existing auth/me flow or equivalent authenticated user refresh mechanism.
- The feature does not introduce a separate localStorage-only setting for profile name.

### Error handling
- Validation errors are surfaced using the existing Laravel JSON validation error format.
- API failures show user-friendly error messaging in the Settings UI.
- No unrelated Settings sections are affected.

### No-migration assumption
- No migration is required if the current `users.name` column already supports the chosen validation length.
- If the column is too narrow, that should be handled as a separate follow-up change.
