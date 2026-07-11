# Design: Enforce local upload storage quota

## Overview
Add a small backend guard in the local file upload flow so an upload is rejected before any disk write when the authenticated user would exceed the existing 100 GB quota.

## Quota source
- Reuse the existing per-user storage reporting logic based on:
  - `File::where('user_id', $user->id)->sum('size')`
- Keep the quota hardcoded at:
  - `100 * 1024 * 1024 * 1024` bytes

## Upload flow change
Before writing the uploaded file to disk, calculate:
- current used bytes for the authenticated user
- plus the incoming uploaded file size

If the total exceeds the 100 GB limit, reject the request before `Storage::putFileAs` or any equivalent disk write.

## Validation response
Use a consistent validation-style JSON response:
- HTTP `422` preferred
- body:

```json
{
  "message": "Storage quota exceeded.",
  "errors": {
    "file": [
      "Storage quota exceeded."
    ]
  }
}
```

## Preserved behavior
- Existing 1 GB per-file validation remains unchanged.
- Existing folder ownership validation remains unchanged.
- No route changes.
- No migration.

## Known limitations
- Concurrent uploads can still race because this first patch does not add reservation or locking.
- Orphan-file cleanup is out of scope for this patch unless existing code can be safely wrapped without a broad refactor.
