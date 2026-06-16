# OpenSpec Design — implement-dashboard-shared-links-count

## Target UI
- Hanya mengganti angka widget **Shared Links Count** di `frontend/src/app/pages/Dashboard.tsx`.
- Widget lain dan desain besar Dashboard **tidak diubah** pada change ini.

## Data source
- Backend endpoint: **`GET /api/share-links`**
- Frontend service: `frontend/src/services/shareService.ts`
  - Method: `getShareLinks()`

## Response shape (yang diasumsikan dari service)
Karena audit ini menuntut implementasi kecil dan anti-hallucination, design hanya mengunci kebutuhan:
- Response dari `getShareLinks()` harus dapat dihitung count-nya.

Dua kemungkinan bentuk yang harus ditangani saat wiring:
1) `ShareLink[]` (langsung array)
2) Wrapped: `{ data: ShareLink[] }`

## UI behavior spesifik
### Loading
- Saat request berlangsung:
  - angka count ditampilkan sebagai spinner/skeleton kecil
  - **tidak** menampilkan dummy `"243"`

### Error
- Jika request gagal:
  - angka count menampilkan `"—"` atau teks fallback aman
  - error tidak menyebabkan page crash

### Empty state
- Jika user memiliki 0 share links:
  - angka count menampilkan `0`

## Computation logic
- count dihitung dari panjang array share links:
  - `count = shares.length` jika response array
  - `count = shares.data.length` jika response wrapped

## Non-goals (hard stop)
- Tidak menambahkan endpoint backend baru.
- Tidak mengubah `ShareController`.
- Tidak mengerjakan Storage Breakdown, Server Status, Sync Status, Active Devices, Recent Activity.


