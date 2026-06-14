# Upload Limit Fix - NimbusDrive V2

## Penyebab upload 6MB gagal

Kasus upload yang gagal pada ukuran menengah/besar (mis. JPG ~6MB) umumnya bukan dari Laravel validator, tetapi dari limit PHP / server:

- `upload_max_filesize`
- `post_max_size`
- `memory_limit`

## Cara cek limit (command manual)

> Jalankan dari folder backend.

```bat
cd E:\project\vscode\CLOUD_SERVER_V2\backend
php -i | findstr /i "upload_max_filesize post_max_size memory_limit"
```

Cek file php.ini yang dipakai:

```bat
php --ini
```

## Nilai php.ini yang disarankan

- `upload_max_filesize = 500M`
- `post_max_size = 520M`
- `memory_limit = 1024M`
- `max_execution_time = 300`
- `max_input_time = 300`

## Setelah edit php.ini

1. Matikan lalu jalankan ulang Laravel server.
2. Perintah:

```bat
php artisan serve --host=0.0.0.0 --port=8000
```

## Catatan

Kalau error tetap terjadi setelah limit PHP diperbesar, kemungkinan konfigurasi web server (Nginx/Apache) juga perlu dinaikkan.
