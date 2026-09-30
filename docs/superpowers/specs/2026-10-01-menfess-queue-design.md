# Spesifikasi Desain: Fitur Antrean Otomatis Menfess (Menfess Queue System)

**Tanggal:** 1 Oktober 2026  
**Status:** Approved by User  
**Penulis:** Antigravity (AI Architect) & Arya Rizky  

---

## 1. Latar Belakang & Masalah
Saat ini, pipeline pengiriman menfess langsung mencoba merender gambar dan mempublikasikannya ke Instagram via Meta Graph API saat tombol "Kirim" diklik. Namun, Instagram memiliki batas kuota publikasi harian (*rolling 24-hour limit*, umumnya 100 post/hari untuk akun kreator/bisnis). 

Ketika kuota tersebut habis, menfess saat ini langsung ditolak dengan status error `429 QUOTA_EXCEEDED`, sehingga pengguna harus menunggu dan mencoba mengirimkan ulang secara manual keesokan harinya.

## 2. Tujuan Sistem
1. **Otomatis Masuk Antrean (Queue):** Jika kuota Instagram habis atau mencapai batas aman (`remaining <= IG_QUOTA_BUFFER`), menfess tidak ditolak, melainkan otomatis disimpan ke antrean database dengan nomor tiket resmi (`NO. [TICKET]`).
2. **Pelepasan Terjadwal & Terkontrol (Pacing):** Worker otomatis yang dipicu Vercel Cron (`0 * * * *`) memeriksa kuota setiap jam dan merilis menfess secara bertahap (2–5 post per putaran dengan jeda 6–8 detik antar-post) untuk menghindari deteksi spam Meta.
3. **Kendali Manual Admin:** Admin dapat memantau antrean dan menekan tombol *"Proses Antrean Sekarang"* di `/status` (dilindungi PIN `2112`) kapan saja.
4. **Transparansi Pengguna:**
   - Pop-up sukses di `/kirim` memberi tahu posisi antrean secara jelas.
   - Papan publik `/antrean` menampilkan daftar nomor tiket yang sedang mengantre (teks disamarkan) dengan **100% mengikuti design system neo-brutalis zine yang sudah ada** (kertas krem `#F8F3E9`, tinta gelap `#1B1710`, font Fraunces/Space Mono/Space Grotesk, bayangan retro).
   - Riwayat lokal di browser pengirim mencatat status "Mengantre".

---

## 3. Arsitektur & Alur Data

### A. Alur Pengiriman (`POST /api/submit`)
1. Validasi teks, honeypot, rate-limit, captcha (jika aktif).
2. Periksa kuota Instagram via `checkLimit()`.
3. **Jika Kuota Masih Tersedia (`remaining > IG_QUOTA_BUFFER`):**
   - Jalankan pipeline langsung seperti saat ini (render -> Cloudinary -> carousel -> publish -> selesai).
4. **Jika Kuota Habis/Kritis (`remaining <= IG_QUOTA_BUFFER`):**
   - Buat nomor tiket unik (`generateTicketCode()`).
   - Simpan entri ke tabel database `MenfessQueue`:
     - `ticketCode`, `content`, `category`, `theme`, `status = PENDING`.
   - Hitung posisi antrean (`count` item `PENDING` yang dibuat sebelumnya + 1).
   - Kembalikan respons JSON:
     ```json
     {
       "ok": true,
       "queued": true,
       "ticketCode": "DCRH",
       "theme": "klasik",
       "queuePosition": 3,
       "message": "Kuota Instagram hari ini penuh. Menfess kamu masuk antrean otomatis #NO. DCRH."
     }
     ```

### B. Alur Worker (`POST/GET /api/cron/process-queue`)
1. **Verifikasi Keamanan:**
   - Periksa header `Authorization: Bearer <CRON_SECRET>` **ATAU** cookie sesi admin valid (`verifyStatusAuthToken`). Jika keduanya tidak ada, tolak `401 Unauthorized`.
2. **Pengecekan Kuota:**
   - Panggil `checkLimit()`.
   - Hitung kuota aman yang tersedia: `availableQuota = quota.remaining - IG_QUOTA_BUFFER`.
   - Jika `availableQuota <= 0`, hentikan eksekusi dengan pesan `"Kuota Instagram masih belum tersedia"`.
3. **Pengambilan Antrean (FIFO):**
   - Tentukan batch size: `batchLimit = Math.min(availableQuota, 3)`.
   - Ambil entri `PENDING` dengan `scheduledFor <= now()`, diurutkan dari `createdAt ASC`.
4. **Pemrosesan per Item:**
   - Ubah status menjadi `PROCESSING`.
   - Render kartu PNG 1080×1080 via Satori + sharp (termasuk font Arab & Twemoji).
   - Unggah sementara ke Cloudinary dan buat Carousel Instagram (Slide 1 + Slide 2 QR).
   - Publish ke Instagram dan dapatkan `permalink` serta `mediaId`.
   - Bersihkan gambar di Cloudinary.
   - Update database: `status = PUBLISHED`, `permalink`, `mediaId`, `publishedAt = now()`.
   - **Terapkan jeda (sleep) 6–8 detik** sebelum beralih ke item berikutnya.
5. **Penanganan Kegagalan (Retry Policy):**
   - Jika terjadi error pada suatu item:
     - `attempts += 1`, `lastError = error.message`.
     - Jika `attempts < 3`: jadwalkan ulang dengan jeda 15 menit (`scheduledFor = now() + 15m`, status kembali ke `PENDING`).
     - Jika `attempts >= 3`: ubah status menjadi `FAILED` (dead-letter) agar antrean berikutnya tidak terhambat.

---

## 4. Skema Database Prisma (`prisma/schema.prisma`)

```prisma
enum QueueStatus {
  PENDING
  PROCESSING
  PUBLISHED
  FAILED
}

model MenfessQueue {
  id           String      @id @default(cuid())
  ticketCode   String      @unique
  content      String      @db.Text
  category     String      @default("random")
  theme        String      @default("klasik")
  status       QueueStatus @default(PENDING)
  attempts     Int         @default(0)
  lastError    String?     @db.Text
  mediaId      String?
  permalink    String?
  createdAt    DateTime    @default(now())
  scheduledFor DateTime    @default(now())
  publishedAt  DateTime?

  @@index([status, scheduledFor, createdAt])
  @@index([ticketCode])
}
```

---

## 5. Konfigurasi Vercel Cron (`vercel.json`)

```json
{
  "crons": [
    {
      "path": "/api/cron/process-queue",
      "schedule": "0 * * * *"
    }
  ]
}
```
* **Environment Variable:** `CRON_SECRET` diatur di pengaturan proyek Vercel.

---

## 6. Integrasi UI/UX (Mengikuti Desain Sistem Neo-Brutalis Zine)

### A. Modal Sukses di `/kirim`
- Ketika respons `queued: true`:
  - Chip status warna kuning: `[⏳ MASUK ANTREAN OTOMATIS]`
  - Judul: `Kuota Hari Ini Penuh · Menfessmu Aman!`
  - Subteks: `Menfess terdaftar dengan tiket NO. [TICKET]. Berada di urutan antrean ke-[N]. Begitu kuota Instagram reset, kartu akan otomatis terbit.`
  - Tombol: `[Lihat Papan Antrean]` (menuju `/antrean`) dan `[Kirim Menfess Lain]`.

### B. Halaman Publik `/antrean`
- Menggunakan palet yang sama persis: `bg-paper` (#F8F3E9), border hitam tebal `border-2 border-ink`, bayangan retro `shadow-[8px_8px_0_0_#1B1710]`, chip aksen kuning `bg-signal` & tomat `bg-tomato`.
- Header: Chip `[ANTREAN PUBLIK]` + Judul `Menfess yang sedang menunggu giliran.`
- Kotak status: Jumlah tiket mengantre, estimasi putaran cron berikutnya, serta daftar nomor tiket anonim dalam antrean:
  - Kartu tiket: `#1 · NO. DCRH · Kategori KULIAH · Tema Klasik · 12 menit lalu`
  - Isi pesan disensor demi menjaga privasi dan kejutan pembaca di Instagram.

### C. Dashboard Admin `/status`
- PIN admin: `2112` (atau dari env `STATUS_PAGE_PIN`).
- Baris ledger baru: **Antrean Menfess (Queue Engine)**:
  - Menampilkan ringkasan status: `Pending`, `Processing`, `Published`, dan `Failed`.
  - Tombol `[⚡ Proses Antrean Sekarang]`: Menembak worker API langsung dari browser admin untuk melakukan manual flush.
  - Tabel inspeksi item `FAILED` (jika ada) dengan tombol `[Coba Lagi]` dan `[Hapus]`.
