# Menfess Queue System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Menambahkan sistem antrean otomatis (queue) saat kuota harian Instagram habis/kritis, diproses berkala oleh Vercel Cron secara bertahap (pacing), dilengkapi kendali manual admin di `/status`, serta papan pemantau publik di `/antrean` dengan 100% mengikuti design system yang ada.

**Architecture:** Hybrid Database Queue di Neon PostgreSQL (`MenfessQueue`) yang diproses oleh serverless background worker (`/api/cron/process-queue`) yang dipicu Vercel Cron harian/per jam dengan perlindungan `CRON_SECRET` atau tombol admin di `/status`. Pengirim mendapatkan tiket antrean resmi secara instan tanpa menunggu proses render.

**Tech Stack:** Next.js 16 (App Router, Turbopack, Serverless Node runtime), Prisma 6 + Neon Postgres, Vercel Cron, Satori + sharp, Cloudinary SDK, Instagram Graph API, Tailwind CSS v4.

---

### Task 1: Prisma Schema & Database Model

**Files:**
- Modify: `prisma/schema.prisma`
- Test: `scratch/test-db-queue.mjs`

- [ ] **Step 1: Tambahkan enum `QueueStatus` dan model `MenfessQueue` di `prisma/schema.prisma`**

```prisma
enum QueueStatus {
  PENDING
  PROCESSING
  PUBLISHED
  FAILED
}

/// Antrean posting otomatis menfess ketika kuota Instagram harian habis.
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

- [ ] **Step 2: Jalankan `prisma db push` dan generate Prisma Client**

Run: `pnpm run db:push && pnpm run db:generate`
Expected: Database schema updated and Prisma client generated successfully.

- [ ] **Step 3: Buat script uji koneksi & kueri model `MenfessQueue` di `scratch/test-db-queue.mjs`**

```javascript
import { db } from "../src/lib/db.ts";

async function test() {
  const count = await db.menfessQueue.count();
  console.log("MenfessQueue table connected! Current rows:", count);
}
test().catch(console.error);
```
Run: `pnpm dlx tsx scratch/test-db-queue.mjs`
Expected: Output `MenfessQueue table connected! Current rows: 0`.

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat(db): add MenfessQueue model and QueueStatus enum"
```

---

### Task 2: Service Layer Antrean (`src/lib/queue.ts`)

**Files:**
- Create: `src/lib/queue.ts`
- Test: `scratch/test-queue-service.mjs`

- [ ] **Step 1: Tulis service fungsi antrean di `src/lib/queue.ts`**
Menyediakan operasi:
- `enqueueMenfess(payload)`: menyimpan ke DB dan mengembalikan `queuePosition`.
- `getPendingQueueBatch(limit)`: mengambil item PENDING terlama yang sudah siap diproses.
- `markQueueProcessing(id)`: update status ke PROCESSING.
- `markQueuePublished(id, permalink, mediaId)`: update status ke PUBLISHED.
- `markQueueFailed(id, errorMessage, maxAttempts)`: update retry atau ubah status ke FAILED jika `>= 3`.
- `getQueueStats()`: ringkasan jumlah status untuk admin.
- `getPublicQueue()`: daftar item antrean publik (teks disamarkan).

- [ ] **Step 2: Jalankan unit test service antrean**

Run: `pnpm dlx tsx scratch/test-queue-service.mjs`
Expected: Inserter, fetcher, dan status transition berjalan 100% lulus.

- [ ] **Step 3: Commit**

```bash
git add src/lib/queue.ts
git commit -m "feat(queue): implement queue service layer with retry and pacing logic"
```

---

### Task 3: Integrasi Submission API (`src/app/api/submit/route.ts`)

**Files:**
- Modify: `src/types/menfess.ts`
- Modify: `src/app/api/submit/route.ts`

- [ ] **Step 1: Perbarui tipe `SubmitResponse` di `src/types/menfess.ts`**
Tambahkan field opsional:
```typescript
export interface SubmitResponse {
  ok: boolean;
  code?: SubmitErrorCode;
  message?: string;
  permalink?: string;
  ticketCode?: string;
  theme?: PostTheme;
  queued?: boolean;
  queuePosition?: number;
  retryAfter?: number;
  dryRun?: boolean;
}
```

- [ ] **Step 2: Modifikasi pengecekan kuota di `src/app/api/submit/route.ts`**
Ganti respon error 429 saat `quota.remaining <= IG_QUOTA_BUFFER` menjadi auto-enqueue:
```typescript
if (quota.remaining <= IG_QUOTA_BUFFER) {
  const ticketCode = generateTicketCode();
  const queueResult = await enqueueMenfess({
    ticketCode,
    content,
    category,
    theme,
  });

  return NextResponse.json<SubmitResponse>({
    ok: true,
    queued: true,
    ticketCode,
    theme,
    queuePosition: queueResult.queuePosition,
    message: `Kuota harian Instagram penuh (${quota.used}/${quota.total}). Menfess kamu aman di antrean ke-${queueResult.queuePosition} (NO. ${ticketCode}) dan otomatis diposting saat kuota reset.`,
  });
}
```

- [ ] **Step 3: Jalankan typecheck**

Run: `pnpm exec tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add src/types/menfess.ts src/app/api/submit/route.ts
git commit -m "feat(submit): automatically enqueue menfess when Instagram quota is full"
```

---

### Task 4: Worker API Endpoint (`src/app/api/cron/process-queue/route.ts`) & `vercel.json`

**Files:**
- Create: `src/app/api/cron/process-queue/route.ts`
- Modify/Create: `vercel.json`

- [ ] **Step 1: Implementasikan endpoint worker di `src/app/api/cron/process-queue/route.ts`**
- Autentikasi: `Authorization: Bearer <CRON_SECRET>` atau cookie admin `verifyStatusAuthToken`.
- Eksekusi:
  1. Cek `checkLimit()`. Jika kuota <= buffer, log & return `"Kuota belum cukup"`.
  2. Ambil maksimal 3 item terlama.
  3. Loop item:
     - Render kartu PNG via `renderMenfessCard`.
     - Upload Cloudinary.
     - Buat container Instagram & publish.
     - Simpan `permalink` & `mediaId`.
     - Jeda (sleep) 6 detik antar item.
  4. Kembalikan ringkasan JSON `{ processed: number, success: number, failed: number }`.

- [ ] **Step 2: Tambahkan konfigurasi Vercel Cron di `vercel.json`**

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

- [ ] **Step 3: Uji eksekusi worker secara lokal dengan secret header**

Run: `pnpm dlx tsx scratch/test-worker.mjs`
Expected: Worker merespons 200 OK dan memproses antrean dengan aman.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/cron/process-queue/route.ts vercel.json
git commit -m "feat(cron): create process-queue worker and configure vercel cron"
```

---

### Task 5: Halaman Papan Antrean Publik (`/antrean`) & API Status

**Files:**
- Create: `src/app/api/queue/status/route.ts`
- Create: `src/app/antrean/page.tsx`
- Modify: `src/components/layout/Navbar.tsx` & `src/components/layout/Footer.tsx`

- [ ] **Step 1: Buat API publik ringan `/api/queue/status`**
Mengembalikan data real-time: `pendingCount`, `estimatedNextRun`, dan daftar tiket mengantre (`ticketCode`, `theme`, `category`, `createdAt`, `position`).

- [ ] **Step 2: Buat halaman `/antrean`**
- Wajib menggunakan design system neo-brutalis zine yang sama persis:
  - `bg-paper` (#F8F3E9), `text-ink` (#1B1710), `border-2 border-ink`, bayangan retro `shadow-[8px_8px_0_0_#1B1710]`.
  - Font `Fraunces` untuk heading, `Space Mono` untuk badge/tiket, `Space Grotesk` untuk deskripsi.
  - Kartu antrean: nomor urut, tiket `NO. [TICKET]`, kategori, tema, waktu tunggu.
  - Teks isi menfess disensor (`••••••••••`) untuk privasi dan kejutan pembaca.

- [ ] **Step 3: Tambahkan navigasi `/antrean` di Navbar dan Footer**

- [ ] **Step 4: Jalankan typecheck & build test**

Run: `pnpm exec tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/queue/status/route.ts src/app/antrean/page.tsx src/components/layout/Navbar.tsx src/components/layout/Footer.tsx
git commit -m "feat(antrean): add public queue board page and navigation links"
```

---

### Task 6: Integrasi UI Form (`MenfessForm.tsx`) & Riwayat Pengiriman (`SubmissionHistory.tsx`)

**Files:**
- Modify: `src/components/menfess/MenfessForm.tsx`
- Modify: `src/components/menfess/SubmissionHistory.tsx`

- [ ] **Step 1: Update pop-up modal sukses di `MenfessForm.tsx`**
- Jika respon submit berisi `queued: true`:
  - Tampilkan badge kuning: `⏳ MASUK ANTREAN OTOMATIS`.
  - Tampilkan nomor tiket resmi dan posisi antrean.
  - Tampilkan tombol tautan langsung ke `/antrean`.
  - Simpan riwayat pengiriman lokal dengan status `queued`.

- [ ] **Step 2: Update item card di `SubmissionHistory.tsx`**
- Jika status `queued`: tampilkan badge `⏳ Mengantre` dan link `Cek Papan Antrean`.

- [ ] **Step 3: Commit**

```bash
git add src/components/menfess/MenfessForm.tsx src/components/menfess/SubmissionHistory.tsx
git commit -m "feat(ui): display queue status in submission modal and local history"
```

---

### Task 7: Integrasi Kontrol Admin & Manual Flush di `/status`

**Files:**
- Create: `src/components/status/QueueFlushBtn.tsx`
- Modify: `src/app/status/page.tsx`

- [ ] **Step 1: Buat komponen tombol interaktif `QueueFlushBtn.tsx`**
- Tombol `[⚡ Proses Antrean Sekarang]`.
- Memanggil `POST /api/cron/process-queue` menggunakan fetch browser (cookie sesi PIN admin otomatis terkirim).
- Menampilkan feedback loading & notifikasi hasil flush (jumlah berhasil/gagal).

- [ ] **Step 2: Tambahkan bagian Antrean Menfess di `src/app/status/page.tsx`**
- Tambahkan LedgerRow untuk:
  - Jumlah tiket `PENDING` (menunggu).
  - Jumlah tiket `PUBLISHED` (sukses dirilis worker).
  - Jumlah tiket `FAILED` (gagal setelah 3x retry) dengan rincian pesan error.
  - Pasang komponen `QueueFlushBtn`.

- [ ] **Step 3: Commit**

```bash
git add src/components/status/QueueFlushBtn.tsx src/app/status/page.tsx
git commit -m "feat(status): add queue monitoring ledger and manual flush control in admin dashboard"
```

---

### Task 8: Verifikasi Komprehensif & Build Akhir

- [ ] **Step 1: Jalankan typecheck global**

Run: `pnpm exec tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 2: Jalankan production build Next.js (Turbopack)**

Run: `pnpm run build`
Expected: Build sukses, semua rute baru (`/antrean`, `/api/cron/process-queue`, `/api/queue/status`) terkompilasi.

- [ ] **Step 3: Push ke GitHub `origin main`**

Run: `git push origin main`
Expected: Pushed to GitHub and deployed to Vercel.
