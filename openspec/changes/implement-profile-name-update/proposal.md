## Proposal: Profile Name Update

### Problem
Authenticated users cannot update their displayed profile name from the Settings page. The current Profile section is read-only and does not allow a user to correct or change their visible name.

### User value
Users can keep their display name current and accurate without needing a manual workaround or support intervention.

### Narrow scope
This change is limited to allowing an authenticated user to update only their profile display name from the Settings page.

### Explicit out-of-scope items
- Password change
- Avatar upload
- Email update
- Notifications, security, storage, language, and other preferences
- Any separate localStorage-only profile setting
- Bulk/profile imports or admin profile management

### Risks
- Validation must reject blank or whitespace-only input cleanly.
- Frontend state must stay in sync with the authenticated user data after a successful update.
- The feature must avoid introducing unrelated settings or auth behavior changes.
