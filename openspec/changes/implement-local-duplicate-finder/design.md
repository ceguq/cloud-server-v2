# Design: Local Duplicate Finder (read-only)

## Target Area
Kemungkinan implementasi nanti (sesuai arsitektur yang ada saat ini):
- Backend
  - `backend/routes/api.php`
  - `backend/app/Http/Controllers/FileController.php` (endpoint read-only)
  - atau controller baru: `DuplicateFileController.php`
- Frontend
  - `frontend/src/services/fileService.ts` (menambah method) atau service baru: `duplicateFileService.ts`
  - `frontend/src/app/pages/MyFiles.tsx` atau halaman/section kecil bila diperlukan untuk menampilkan UI kandidat duplikat

## Prinsip Utama
- **Read-only** untuk tahap awal: hanya tampilkan kandidat duplikat.
- Tidak menghapus file secara otomatis.
- Tidak mengubah upload flow / drag-and-drop.
- Tidak mengubah GDrive.

## Strategi Deteksi Kandidat Duplikat
### Preferensi: checksum/hash jika tersedia
- Jika pada backend/model sudah ada field **hash/checksum** atau metadata sejenis, maka:
  - Kelompokkan file berdasarkan `checksum` (atau `hash`) untuk kandidat duplikat.

### Fallback (jika hash/checksum belum tersedia)
Karena pada `backend/app/Models/File.php` yang terlihat saat ini belum jelas adanya field checksum/hash, maka strategi fallback yang direncanakan adalah:
- Kelompokkan berdasarkan kombinasi:
  - `size`
  - `original_name`

Catatan penting:
- Strategi ini hanya untuk “deteksi awal” dan menghasilkan false positive.
- Tahap ini **hanya** menampilkan kandidat (read-only) sehingga risiko masih aman.

## Bentuk API/Response yang Disarankan
### Endpoint Read-only
- `GET /api/files/duplicates`
  - (opsional) parameter query untuk pagination/filter di masa depan

### Response bentuk groups
Contoh kontrak response yang disarankan (untuk memudahkan UI):
```json
{
  "data": [
    {
      "duplicate_key": "<key> (mis. checksum atau size+name)",
      "total_size": 123456789,
      "count": 3,
      "files": [
        {
          "id": "<uuid>",
          "original_name": "report.pdf",
          "size": 123456,
          "mime_type": "application/pdf",
          "folder_id": "<uuid or null>",
          "folder_name": "<string or null>"
        }
      ]
    }
  ]
}
```

Keterangan:
- `files[]` adalah anggota group kandidat duplikat.
- `duplicate_key` membantu UI/diagnostik dan konsistensi grouping.
- `total_size` dan `count` membantu menampilkan ringkasan.

## UI/UX Read-only
### Konsep Tampilan
- Pada halaman **My Files**, tampilkan daftar **group kandidat duplikat**.
- Untuk tiap group:
  - tampilkan `duplicate_key` (atau label lebih ramah manusia)
  - tampilkan ringkasan: `count` dan `total_size`
  - tampilkan list file yang termasuk kandidat

### Perilaku
- Tidak ada tombol/aksi delete dari fitur ini pada tahap awal.
- Tidak ada auto-select file.
- Jika ingin melihat detail, UI dapat menyediakan link untuk aksi yang sudah ada (mis. preview/download/open), tetapi tidak mengubah scope duplicate finder.

## Future Improvement (dicatat, bukan untuk tahap awal)
- Penambahan field `hash/checksum` dan migrasi database untuk deteksi yang lebih akurat.
- Eskalasi strategi deteksi ke level byte-by-byte (jika diperlukan), tetap dalam mode read-only.
- Pagination, incremental scan, caching hasil duplicate detection.

