# implement-real-devices

## Data model: Device
Target data model minimal untuk tahap 1:

- `id` (PK)
- `user_id` (FK ke user pemilik device)
- `display_name` atau `name`
- `type`/`platform`/`browser` (turunan dari `user_agent` bila tersedia; simpan hasil parsing minimal)
- `ip_address_last` / `ip_address` terakhir (opsional, sensitif)
- `last_seen_at` (timestamp terakhir terdeteksi)
- `trusted` (boolean)
- `created_at`
- `updated_at`

Catatan privasi:
- **Jangan simpan token asli** atau credential.
- Data seperti `ip_address` dan `user_agent` dianggap **sensitif**. Pada tahap 1, simpan seminimal mungkin.
- Bila diperlukan identifier/fingerprint untuk mengasosiasikan device:
  - gunakan **hash/minimal identifier** (contoh: hash dari user_agent + salt server-side + coarse-grain context), bukan menyimpan raw fingerprint/secret.

## Relasi User -> Devices
- Setiap `Device` milik tepat **1 user**.
- Endpoint read-only `GET /api/devices` harus memastikan:
  - hanya mengembalikan device dengan `device.user_id == authenticated_user.id`.

## Endpoint: GET /api/devices
### Auth rule
- Semua akses di bawah `auth:sanctum`.
- Tidak ada admin cross-user access pada tahap 1.

### Response shape JSON (contoh)
```json
{
  "data": [
    {
      "id": "string-or-number",
      "display_name": "MacBook Pro 16\"",
      "type": "laptop",
      "platform": "macOS Sonoma",
      "browser": "Safari",
      "ip_address_last": "203.0.113.10",
      "last_seen_at": "2026-06-15T10:20:30.000Z",
      "trusted": true,
      "created_at": "...",
      "updated_at": "..."
    }
  ],
  "meta": {
    "current_page": 1,
    "last_page": 1,
    "per_page": 20,
    "total": 0
  }
}
```

Field yang ditampilkan di UI tahap 1 sebaiknya dipetakan minimal:
- status online/offline dihitung sebagai turunan UI/backend dari `last_seen_at` (mis. threshold, mis. < 5-10 menit dianggap online). Detail threshold ditetapkan saat implementasi dengan basis kebutuhan.

## Cara pencatatan device
Pada tahap desain (tanpa memutuskan implementasi final), ada dua pendekatan:
1. **Saat login**: create/update record `devices` berdasarkan hasil minimal dari `user_agent` dan/atau identifier hash.
2. **Saat request tertentu**: update `last_seen_at` bila aman dan tidak terlalu berat.

Policy update:
- Frekuensi update `last_seen_at` harus dibatasi (debounce/coarse-grain) agar tidak menambah beban DB.
- Jangan memaksakan penyimpanan data tambahan yang tidak diperlukan.

Detail final bisa diputuskan saat implementasi berdasarkan batasan performa.

## Security / Privacy
Wajib:
- Jangan expose data device milik user lain.
- Endpoint harus ketat pada scope user login.
- Jangan simpan token asli.
- Minimalkan data sensitif:
  - simpan IP & user agent hanya dalam batas yang diperlukan; jika disimpan, idealnya hanya ringkas / terakhir.

Pertimbangan tambahan:
- Audit log: jika nanti diperlukan, catat event device dalam bentuk aksi dan metadata minimal (gunakan `ActivityLog` sebagai referensi desain, bukan bukti sudah ada implementasi).

## Frontend behavior (Devices page)
Perilaku UI yang diinginkan untuk tahap 1:
- **Devices.tsx fetch via `deviceService`** (atau service yang disetujui).
- Loading state:
  - tampilkan spinner/skeleton pada area device list.
- Error state:
  - tampilkan pesan error yang user-safe.
- Empty state:
  - jika response `data` kosong, tampilkan teks jujur: “No devices found” (tanpa dummy).
- Tombol aksi write (Add Device / Force Sync / Trust-Untrust / Remove Device):
  - dinonaktifkan atau disembunyikan.
  - bila disembunyikan, teks header/tooltip bisa dipakai untuk menjelaskan “Feature coming soon”.

## Compatibility
- Jangan mengubah routing `/devices`.
- Jangan mengubah visibility Sidebar pada tahap ini.
- Jangan mengubah Server Monitor.

