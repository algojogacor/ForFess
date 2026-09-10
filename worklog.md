# Worklog — Fess UNAIR

Platform menfess anonim untuk civitas akademika Universitas Airlangga.
Post anonim → generate gambar (Satori 1080×1080) → upload Cloudinary → post Instagram Graph API → delete gambar.

---

Task ID: 1
Agent: main (Z.ai Code)
Task: Setup environment & dependencies

Work Log:
- Install deps: satori@0.33.4, cloudinary@2.11.0, @fontsource/space-grotesk@5.3.0, @fontsource/space-mono@5.3.0 (sharp sudah ada di scaffold)
- Buat .env.local berisi kredensial IG + Cloudinary + Turnstile dari user, plus flag tambahan: NEXT_PUBLIC_SITE_URL, IG_API_VERSION=v22.0, MENFESS_DRY_RUN=true (agar QA lokal tidak posting ke IG asli)
- Buat scripts/generate-fonts.mjs → generate src/lib/fonts.generated.ts (WOFF base64 untuk Satori: Space Grotesk 400/500/700 + Space Mono 400)
- Copy woff2 Space Grotesk/Mono ke src/assets/fonts/ untuk next/font/local (UI, offline-safe)
- Identitas visual yang dipilih: "buletin kampus / zine editorial" — kertas krem (#F7F2E8), tinta hampir hitam (#161310), kuning signal (#FFC800) sebagai nod ke identitas kuning UNAIR, aksen merah tomat (#E4572E). Motif brand: tanda bintang "*" (anonimitas — "kamu, yang nggak disebut namanya"). Tipografi: Space Grotesk (display+body) + Space Mono (label/ticker).

Stage Summary:
- Fondasi environment selesai; font Satori & UI siap dipakai
- Keputusan penting: MENFESS_DRY_RUN=true di .env.local (pipeline berhenti setelah generate gambar, tanpa upload Cloudinary / posting IG) — WAJIB diganti false di produksi

---

Task ID: 2
Agent: main (Z.ai Code)
Task: Foundation — constants, types, config terpusat

Work Log:
- src/constants/index.ts: MAX_CHARS=500, MIN_CHARS=2, IG_HANDLE, SITE_URL/SITE_HOST, IG_API_VERSION (env override, default v22.0), IG_GRAPH_URL, TURNSTILE_VERIFY_URL, CLOUDINARY_FOLDER, RATE_LIMIT (cooldown 20s, max 3/15 menit, window 15 menit), IG_QUOTA_BUFFER=1, IMAGE_FONT_TIERS
- src/types/menfess.ts: SubmitErrorCode (9 kode spesifik), SubmitResponse, CheckLimitResponse, InstagramQuota, TurnstileResult, CloudinaryUploadResult — kontrak API jelas antara client & server
- src/lib/config.ts: akses env terpusat + requireEnv() yang melempar MissingEnvError menyebut nama var yang hilang; helper isDryRun(), isTurnstileWidgetEnabled()

Stage Summary:
- Semua "magic value" terpusat di constants; env tervalidasi saat startup

---

Task ID: 3
Agent: main (Z.ai Code)
Task: Lib services — turnstile, cloudinary, instagram, generate-image, rate-limit, post-template

Work Log:
- src/lib/turnstile.ts: POST ke siteverify (timeout 10s); fail-open HANYA saat network error ke Cloudflare (rate limiter tetap jalan), fail-closed saat token ditolak eksplisit
- src/lib/cloudinary.ts: upload buffer PNG (data URI, folder fess-unair, tag temp) → { publicId, url }; deleteImage(publicId) diam-diam (cleanup tidak boleh menggagalkan submission)
- src/lib/instagram.ts: checkLimit (content_publishing_limit), createMediaContainer, publishMedia, getPermalink (best effort); graphFetch membungkus error Meta jadi InstagramError { fbCode, fbSubcode, fbType }
- src/lib/post-template.ts: SINGLE SOURCE OF TRUTH template kartu 1080×1080 (object node Satori) — dipakai Satori di server DAN PostPreview React di client via buildTemplateNode(text, fonts); font-size dinamis per tier panjang teks (84px→33px)
- src/lib/generate-image.ts: satori → SVG → sharp → PNG; font WOFF base64 dari fonts.generated.ts (tanpa dependency filesystem/CDN — aman lokal & Vercel)
- src/lib/rate-limit.ts: sliding window in-memory per IP + cooldown; getClientIp dari x-forwarded-for/x-real-ip
- FIX BUILD: serverExternalPackages: ["satori", "sharp", "cloudinary"] di next.config.ts — satori gagal load harfbuzzjs/hb.wasm saat dibundle Turbopack

Stage Summary:
- Pipeline lengkap & modular; setiap failure mode punya kode error spesifik
- Template kartu terverifikasi visual untuk teks 21 char (84px) dan 522 char (33px) — keduanya terbaca jelas

---

Task ID: 4
Agent: main (Z.ai Code)
Task: Komponen — UI primitives, layout, menfess form

Work Log:
- src/components/ui/button-variants.ts: cva variants dipisah dari Button ("use client") supaya bisa dipanggil di Server Components — FIX runtime "Attempted to call buttonVariants() from the server"
- src/components/ui/Button.tsx: button brand gaya sticker-zine (border tinta + hard shadow, hover lift, active press)
- src/components/ui/Alert.tsx: success/error/warning/info dengan ikon lucide, role=alert untuk error
- src/components/layout/Navbar.tsx: sticky, backdrop-blur, logo bintang kuning, link mono uppercase dengan active state kuning, menu mobile (fix lint: tanpa setState dalam effect, close via onClick)
- src/components/layout/Footer.tsx: mt-auto (sticky footer pattern), disclaimer bukan akun resmi, safe-area-inset-bottom
- src/components/menfess/: CharCounter (progress bar + warna bertahap), PostPreview (render node template ke React, skala via ResizeObserver — preview = hasil IG), TurnstileWidget (script explicit render; site key "placeholder_development" → mode dev token placeholder, tanpa bypass server), MenfessForm (state idle/submitting/success/error, honeypot, countdown rate limit, panel sukses dengan permalink, preview sticky kolom kanan), QuotaStatus (live fetch /api/check-limit untuk strip status kurir di landing)

Stage Summary:
- Semua komponen satu tanggung jawab; preview client identik dengan output server

---

Task ID: 5
Agent: main (Z.ai Code)
Task: Halaman & tema visual

Work Log:
- globals.css: palet brand (paper/ink/signal/tomato) masuk @theme + :root shadcn vars; utilitas bg-dotgrid, bg-tape, text-outline, marker-highlight; keyframes marquee/rise/pop; scrollbar tinta tipis; selection kuning
- layout.tsx: next/font/local (Space Grotesk 400/500/700 + Space Mono 400/700 dari src/assets/fonts), metadata lengkap (metadataBase, OG id_ID, twitter), Navbar+main flex-1+Footer
- app/icon.svg: kotak kuning rounded + bintang tinta
- page.tsx (landing): ticker marquee kuning (pause on hover), hero asimetris 7/5 dengan marker highlight & tumpukan kartu contoh (berlabel "CONTOH KARTU", bukan testimoni palsu), chip status kuota live, 3 langkah offset dengan numeral outline, section aturan kontras tinta, CTA band kuning
- /kirim: header + MenfessForm dua kolom
- /about, /privacy, /terms: copy Indonesia natural, honest, tanpa klaim palsu; disclaimer bukan akun resmi UNAIR; penomoran mono; tanggal update 10 Sep 2026

Stage Summary:
- 5 halaman konsisten dengan navbar/footer; identitas visual orisinal (kertas×tinta×kuning, bukan gradient ungu-biru generik)

---

Task ID: 6
Agent: main (Z.ai Code)
Task: API routes

Work Log:
- POST /api/submit (runtime nodejs, maxDuration 60): parse → honeypot (bot dibuang dengan respons sukses palsu) → validasi konten (trim, normalisasi \r\n, 2..500 char) → rate limit → verifikasi Turnstile → cek kuota IG (fail-open) → renderMenfessCard → dry-run? berhenti : upload Cloudinary → create container → publish → getPermalink → deleteImage; setiap failure punya kode + pesan spesifik Indonesia
- GET /api/check-limit: kembalikan { ok:true, quota } atau { ok:true, quota:null } saat IG gagal (status "tidak diketahui", bukan error)
- Hapus api/route.ts demo scaffold

Stage Summary:
- Kontrak API selesai; pipeline resilient (cleanup Cloudinary best-effort di semua jalur gagal IG)

---

Task ID: 7
Agent: main (Z.ai Code)
Task: QA — lint, dev server, agent-browser end-to-end

Work Log:
- Lint: 0 error 0 warning (setelah 3 fix: setState-in-effect Navbar, unused eslint-disable, buttonVariants server/client split)
- Semua route 200: /, /kirim, /about, /privacy, /terms, /api/check-limit
- Pipeline curl test: validasi teks pendek → 400 VALIDATION_ERROR dengan pesan spesifik; submit valid → { ok:true, dryRun:true } (409ms)
- Visual kartu Satori diverifikasi via scripts/render-preview.ts → /tmp/menfess-preview-{short,long}.png: layout rapi di kedua ekstrem
- Agent-browser: landing desktop (ticker, hero, kartu contoh, semua section render), form flow golden path (isi → preview live update → submit → panel sukses dry-run), rate limit (submit ke-3 → alert merah + countdown 19s, teks terjaga), hamburger menu mobile OK, mobile 390px landing & kirim OK, halaman legal OK
- Console/errors browser: bersih (hanya HMR + devtools info)
- Perbaikan kecil hasil QA: copy placeholder preview dibuat netral (tidak lagi "di sebelah kiri" yang salah konteks di mobile)
- Catatan infra: proses background antar-call tool dimatikan sandbox → buat scripts/dev-server.sh (guard idempotent) untuk menjaga server saat pengujian
- Catatan data: token IG yang diberikan user merespons "An unknown error has occurred" (code 1) dari sandbox → kemungkinan token expired ATAU graph.facebook.com diblokir sandbox. Sistem fail-open sesuai desain: submit tetap jalan, chip status menampilkan "nggak bisa dicek". Perlu dicek ulang di deploy Vercel dengan token fresh.

Stage Summary:
- VERIFIED: seluruh golden path + error states bekerja; hanya tahap upload/posting IG yang tidak bisa diverifikasi dari sandbox (butuh jaringan & token valid, sedang dry-run=true)

---

Task ID: 8
Agent: main (Z.ai Code)
Task: Handover — worklog & cron webDevReview

Work Log:
- Worklog ini ditulis lengkap per task ID
- Cron job dibuat: webDevReview tiap 15 menit (lihat daftar cron)

Stage Summary:
- Project v1.0 COMPLETE & browser-verified
- LANGKAH PRODUKSI (untuk owner): set MENFESS_DRY_RUN=false, isi NEXT_PUBLIC_TURNSTILE_SITE_KEY asli (0x...), pastikan IG_ACCESS_TOKEN fresh & valid, deploy Vercel + env vars sama
- Ide pengembangan berikutnya: arsip menfess + database, moderasi opsional (queue), custom domain, multi-universitas (constants → konfigurasi per-brand)
