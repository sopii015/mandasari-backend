# Mandasari Premium - Backend API

RESTful API Backend untuk Toko Kue Mandasari Premium, dibangun menggunakan Node.js, Express, dan MySQL. 

## Tech Stack & Dependencies
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MySQL (menggunakan `mysql2/promise` pool)
- **Autentikasi**: JSON Web Token (JWT)
- **Keamanan**: Password Hashing menggunakan `bcryptjs`
- **CORS**: Diaktifkan untuk integrasi lintas asal (cross-origin) ke GitHub Pages

## Live API URL
Backend ini dideploy secara live di Railway:
👉 **[https://backend-production-83a1.up.railway.app](https://backend-production-83a1.up.railway.app)**

## Struktur Endpoint API

### 1. Autentikasi (`/api/auth`)
- `POST /register` - Pendaftaran akun customer baru (hashing password otomatis).
- `POST /login` - Masuk akun, mengembalikan data user dasar dan JWT Token (tanpa password).

### 2. Produk (`/api/products`)
- `GET /` - Mengambil daftar produk (mendukung query parameter `search` & `category`).
- `GET /:id` - Mengambil detail satu produk.
- `POST /` - Tambah produk baru (Admin Only).
- `PUT /:id` - Edit data produk (Admin Only).
- `DELETE /:id` - Hapus produk dari katalog (Admin Only).

### 3. Keranjang Belanja (`/api/cart`)
- `GET /` - Mengambil isi keranjang belanja user aktif.
- `POST /` - Tambah/update jumlah produk di keranjang (otomatis validasi stok).
- `DELETE /:productId` - Hapus produk tertentu dari keranjang.

### 4. Wishlist (`/api/wishlist`)
- `GET /` - Mengambil daftar wishlist produk favorit user.
- `POST /` - Toggle (tambah/hapus) produk dari wishlist favorit.

### 5. Pesanan & Checkout (`/api/orders`)
- `POST /checkout` - Membuat pesanan baru, mengurangi stok kue, mengosongkan keranjang, dan men-generate link WhatsApp ringkasan belanja untuk dikirim ke owner.
- `GET /` - Riwayat transaksi (Customer melihat pesanan sendiri, Admin melihat semua pesanan masuk).
- `PUT /:id/status` - Mengubah status pengiriman pesanan (`Processing`, `Shipped`, `Delivered`) (Admin Only).
- `POST /:id/items/:productId/rate` - Menyimpan ulasan rating bintang pada pesanan selesai (otomatis menghitung ulang rata-rata rating di tabel produk).

## Konfigurasi File SQL & Pengujian
- **Skema Database**: Berkas [database.sql](database.sql) (lokal) dan [database_railway.sql](database_railway.sql) (Railway) siap di-import untuk membuat skema tabel & seed data produk default.
- **Postman Collection**: Berkas [postman_collection.json](postman_collection.json) berisi seluruh request API lengkap dengan pre-request scripts token bearer untuk pengujian.
