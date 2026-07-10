# Secure public-share download password handling — Design Notes

## Frontend design

### Protected shares
- Use `POST /api/share/{token}/download` for password-protected downloads.
- Send `password` in the POST body.
- Avoid password in URL/query string entirely.
- Preserve browser download filename by using the browser's native download handling when possible.

### Design alternatives

#### 1. Hidden HTML form submission
- Submit a hidden `<form method="POST" action="/api/share/{token}/download">` with a hidden password field.
- Pros: preserves native browser download filename/content-disposition.
- Cons: difficult to surface JSON error responses without a full page navigation.

#### 2. Frontend POST request with blob handling (recommended)
- Send `POST /api/share/{token}/download` using `axios` or `fetch`.
- Set `responseType: 'blob'`.
- Parse `Content-Disposition` for filename.
- Create an object URL and trigger download via temporary anchor.
- Remove the anchor and call `URL.revokeObjectURL()` after use.
- Map error responses to the existing UI error state.
- Block duplicate clicks while downloading.

### Recommended frontend method
- Use a blob-based POST design.
- This provides the best error-handling UX for protected downloads while avoiding password-in-URL risk.
- It keeps the download filename and content-disposition semantics.

## Backend design

### Route compatibility
- Preserve `GET /api/share/{token}` unchanged.
- Preserve `GET /api/share/{token}/download` for unprotected shares.
- Add `POST /api/share/{token}/download` for protected downloads.

### POST endpoint contract
- Public, unauthenticated.
- Request body contains `password` when required.
- Return binary file response on success.
- Return JSON errors for `403`, `404`, `410`, and optional `422`.
- Preserve the existing error shape where practical.

### Validation and behavior
- Reuse existing share token authorization logic.
- Preserve missing-share, trashed-file, expired-share handling.
- Preserve password validation and download count increment.
- Preserve the original filename in Content-Disposition.
- Do not add database migrations or temporary persistence.

## Security
- Do not log password values.
- Do not expose password in request URL or referrers.
- Do not use localStorage/sessionStorage for password.
- Use POST body only for protected share download password.
