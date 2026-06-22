# OpenSpec Design: fix-gdrive-trash-dropdown-actions

## Source target implementasi
- `frontend/src/app/pages/GDrive.tsx`

## Mode yang dipakai
- `driveListMode === "trash"`

## Perilaku yang diharapkan

### Saat `driveListMode === "trash"`
- Tampilkan **Restore** jika handler `handleRestoreFile` sudah tersedia.
- Tampilkan **Delete Permanently / Hapus permanen** *hanya jika* handler existing tersebut memang sudah ada.
- **Jangan tampilkan**:
  - Preview
  - Open
  - Details
  - Download
  - Copy link
  - Move to trash / Trash (action yang memindahkan ke trash lagi)

### Saat `driveListMode !== "trash"` (mode Files)
- Action normal tetap seperti sekarang.

## Prinsip perubahan
- Jangan ubah handler lama kecuali perlu untuk conditional rendering.
- Jangan ubah dropdown positioning, click-outside, Escape close.
- Jangan ubah layout row/header/actions column.

