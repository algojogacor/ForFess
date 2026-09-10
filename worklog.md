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

---

Task ID: 9
Agent: main (Z.ai Code)
Task: QA round + fitur baru — mode gelap, draf otomatis, share/salin, pencarian arsip

Work Log:
- ASSESSMENT: proyek stabil (v1.0 + fitur arsip dari cron reviewer sebelumnya yang belum tercatat di worklog: /arsip, ArchiveGrid, api/arsip, listRecentMedia, not-found, error.tsx, sitemap.ts, text-sizing.ts). QA agent-browser: landing, /kirim (golden path dry-run OK), /arsip (empty state degrade OK), semua route 200. Fix 1 lint warning (unused eslint-disable di ArchiveGrid).
- MODE GELAP (fitur terbesar ronde ini):
  - globals.css ditulis ulang: semua warna brand jadi CSS variable (—paper, —ink, —signal, dst.) yang direferensi @theme inline → blok .dark cukup menukar nilai. Tema gelap "tinta malam": kertas #14110d, kartu #201a14, teks krem #efe8da, kuning signal TETAP #ffc800.
  - Token baru: --ink-fixed (tinta selalu gelap, dipakai di atas permukaan kuning), --inverse/--inverse-fg (footer & section aturan: tinta di terang, lebih gelap dari latar di gelap — tidak menyilaukan), --hard-strong/--hard-soft (bayangan sticker via var → menggantikan semua rgba(22,19,16,…) hardcoded), --focus-ring.
  - Utilitas dapat varian gelap: .bg-dotgrid, .text-outline, .marker-highlight (teks dipaksa tinta gelap di atas marker kuning), scrollbar, ::selection, kbd-chip (baru), color-scheme.
  - A11y: ring fokus global 3px (ink di terang, kuning di gelap), prefers-reduced-motion mematikan marquee/pop/rise.
  - ThemeProvider (next-themes, attribute=class, defaultTheme=system) dibungkus di layout; viewport themeColor dua media query.
  - ThemeToggle di navbar (desktop + mobile, ikon Sun/Moon transisi rotasi, hydration-safe via useSyncExternalStore bukan setState-in-effect).
  - Perbaikan kontras hasil QA visual: heading CTA band + ticker (bg kuning) pakai text-ink-fixed; asterisk ticker #c23f1b fixed; chip nav aktif text-ink-fixed; Alert success/error varian dark; TurnstileWidget ikut tema (theme param + re-render saat ganti tema) + varian dark untuk box scriptFailed.
- FORM /kirim:
  - Draf auto-save ke localStorage (key fess-unair:menfess-draft:v1, debounce 400ms) + banner pulihkan/hapus saat kembali dengan form kosong; draf dihapus saat submit sukses. Label "Draf auto-tersimpan" di bar bawah textarea.
  - Shortcut Ctrl/⌘+Enter kirim (requestSubmit) + hint kbd-chip.
  - Panel sukses: tombol "Bagikan kabar ini" (Web Share API, fallback salin) + "Salin tautan" (clipboard, feedback jadi "Tersalin"). Klaim di error.tsx soal teks tersisa kini benar-benar akurat lintas sesi.
- ARSIP: pencarian klien-samping (filter caption case-insensitive di post termuat) + empty state "nggak ada yang cocok" + tombol bersihkan; hover shadow via var.
- LINT FIX (Next 16 rule react-hooks/set-state-in-effect): Navbar mounted pattern → useSyncExternalStore; baca localStorage draf → setTimeout(0). SATU BUG SELAMA PENGERJAAN: useState terlanjur dihapus dari import Navbar → runtime error "useState is not defined", langsung diperbaiki & diverifikasi.
- QA agent-browser lengkap: dark landing (hero/ticker/aturan/CTA/footer), light landing utuh, dark kirim + banner draf + pulihkan + submit sukses + salin tautan ("Tersalin"), dark arsip & about, mobile 390px dark OK, toggle bolak-balik light↔dark tersimpan, semua route 200 (404 page benar), lint 0/0. Sisa dev.log hanya error IG token lama (known issue, fail-open).

Stage Summary:
- VERIFIED: mode gelap penuh (brand zine terjaga: kuning signal selalu berpasangan tinta gelap), draf otomatis, shortcut, share/salin, pencarian arsip — semua lolos QA di kedua tema + mobile.
- Keputusan penting: kartu IG (PostPreview/Satori) SENGAJA tetap terang di tema gelap = identik dengan hasil postingan asli.
- Risiko/known issue (tetap): token IG "unknown error" dari sandbox (expired atau graph.facebook.com diblokir) → chip kuota & arsip degrade gracefully; verifikasi ulang di Vercel dengan token fresh. Draf menfess tersimpan plaintext di localStorage (hanya teks anonim, tanpa identitas — risiko rendah, disebut di banner).
- Ide ronde berikutnya: tombol "bagikan" per-kartu arsip, toast global (sonner) untuk feedback salin, riwayat kiriman lokal ("Kiriman kamu"), lint defaultTheme=system vs light di landing, verifikasi Turnstile asli + MENFESS_DRY_RUN=false saat produksi.

---

Task ID: 10
Agent: main (Z.ai Code)
Task: QA round + fitur baru — toast global, "Kiriman kamu", arsip upgrade, FAQ, manifest & OG image

Work Log:
- ASSESSMENT: proyek stabil saat mulai (lint 0/0, semua route 200, error lama Navbar sudah hilang dari dev.log). QA agent-browser awal: landing/kirim/arsip aman → lanjut fitur, bukan bugfix besar.
- TOAST GLOBAL (sonner): sonner.tsx distyling ulang gaya sticker-zine (kartu kertas, border tinta, hard shadow 5px, font brand; var --normal-* dari CSS vars → ikut tema otomatis). <Toaster position="bottom-center" offset={20}/> di layout.tsx. Dipakai untuk: fallback share (info), clipboard gagal (error), hapus riwayat (sukses).
- "KIRIMAN KAMU" (fitur utama ronde ini): riwayat kiriman sukses di localStorage (key fess-unair:submissions:v1, maks 10) — lib baru src/lib/submission-history.ts (list/save/clear + event). Komponen SubmissionHistory di /kirim di bawah form: chip status (Tayang / Uji coba dry-run), waktu relatif (date-fns id), cuplikan teks, link post, tombol hapus + toast, catatan privasi. MenfessForm memanggil saveSubmission saat ok:true lalu dispatch event SUBMISSION_SAVED_EVENT agar panel langsung muncul tanpa reload.
  - BUG DITEMUKAN & DIPERBAIKI saat QA: panel lama hanya membaca localStorage di mount → setelah submit, panel tidak muncul sampai reload. Fix via CustomEvent; terverifikasi langsung muncul ("Kiriman kamu 2").
- ARSIP UPGRADE: MAX_ITEMS 12→24; per-kartu tombol "Bagikan" (Web Share API → fallback clipboard + toast sukses; clipboard diblokir → toast error spesifik, tidak lagi diam); waktu relatif ("12 menit yang lalu") dengan tanggal eksak sebagai title; pagination "Muat lebih banyak" 9/klik (pencarian tetap menyaring SEMUA post yang dimuat, bukan hanya halaman terlihat); input cari dapat focus ring brand; badge "BUKA IG" muncul saat hover gambar.
- FAQ di landing: section baru #faq sebelum CTA — 6 pertanyaan nyata (anonimitas, kecepatan tayang, batas kirim, penyimpanan data, gagal kirim, bukan akun resmi) + JSON-LD FAQPage untuk rich results Google. Accordion shadcn distyling ulang: kartu border tinta, nomor mono tomat, shadow menguat saat terbuka.
- PWA & OG: manifest.ts (nama, warna brand krem/kuning, icon /icon.svg — icon dikopi dari app ke public). opengraph-image.tsx baru: OG 1200×630 via next/og ImageResponse dengan font Space Grotesk/Mono yang sama dengan generator kartu (fonts.generated.ts, decode base64) — hasil PNG diverifikasi visual (bingkai tinta, heading marker kuning, kartu contoh miring, chip @fess_unair). Twitter card naik ke summary_large_image.
- DETAIL STYLING: scroll-smooth di html (dengan override prefers-reduced-motion yang sudah ada), fokus ring kuning di input cari arsip, hover badge kartu, toast konsisten dua tema.
- QA agent-browser lengkap: landing light+dark (desktop & 390px), FAQ buka-tutup di kedua tema + mobile, golden path submit (dry-run OK), riwayat muncul live + persist + hapus + toast, salin tautan ("Tautan tersalin"), arsip dengan 1 POST ASLI dari IG (token kini jalan untuk /media!), cari match & empty state, share button + error toast di headless (clipboard diblokir), 404, manifest, sitemap. Lint akhir 0 error 0 warning. Semua route 200.
- DIAGNOSIS BARU soal token IG: /media BERHASIL diakses dari sandbox (arsip menampilkan post asli) tapi content_publishing_limit tetap balas "An unknown error has occurred" (code 1, OAuthException) — terkonfirmasi via curl langsung ke graph.facebook.com. Artinya: BUKAN sandbox yang memblokir; token ini kemungkinan besar tidak punya permission instagram_business_content_publishing, atau akun belum professional. Fail-open bekerja sesuai desain (submit tetap jalan, chip "nggak bisa dicek").

Stage Summary:
- VERIFIED: toast global, riwayat "Kiriman kamu" (dengan bug live-update terfix), arsip baru (share/relative time/pagination/search), FAQ + JSON-LD, manifest PWA, OG image brand — semua lolos QA light/dark desktop & mobile.
- Pipeline /media terbukti end-to-end hidup dari sandbox: arsip menampilkan postingan IG asli (post uji "Tes sistem kedua"). Yang belum terverifikasi: posting otomatis baru (dry-run masih true) & content_publishing_limit (butuh token dengan permission content publishing).
- Risiko/known issue: content_publishing_limit gagal dengan code 1 dari Meta meski token valid untuk /media → minta owner regenerate token dengan scope instagram_business_content_publishing. MENFESS_DRY_RUN masih true (disengaja untuk QA).
- Ide ronde berikutnya: halaman arsip pakai pagination server-side (after-cursor Graph API) bila post >24; statistik nyata (jumlah post) di landing jika kuota aman; preview kartu juga di riwayat kiriman; i18n struktur konstanta per-universitas (multi-brand).

---

Task ID: 11
Agent: main (Z.ai Code)
Task: QA round + fitur baru — halaman kartu /fess/[id], statistik live, RSS feed, mini-preview riwayat

Work Log:
- ASSESSMENT: proyek stabil saat mulai (lint 0/0, semua route 200, error tunggal di dev.log hanya content_publishing_limit yang fail-open). QA agent-browser awal: landing/arsip/kirim aman → lanjut fitur baru.
- HALAMAN KARTU /fess/[id] (fitur utama ronde ini — "permalink lokal" per menfess):
  - src/app/fess/[id]/page.tsx: server component, fetch satu media via getMediaCached; render PostPreview (template identik dgn kartu IG) + panel metadata (tanggal WIB, @fess_unair, badge Anonim, blockquote teks lengkap) + CTA tulis menfess. Post tidak ada / API gagal → notFound() (404 terverifikasi /fess/bogus12345).
  - generateMetadata: judul = kutipan menfess (potong di batas kata), robots noindex utk kartu tanpa teks, canonical.
  - opengraph-image.tsx per kartu: OG 1200×630 dgn teks menfess asli (font Space Grotesk/Mono sama dgn generator kartu), tier font berdasar panjang teks; fallback OG brand kuning "* Fess UNAIR" jika post hilang/API gagal — tidak pernah 500.
  - Komponen MenfessActions (client): "Bagikan kartu" (Web Share API → fallback clipboard + toast info) & "Salin tautan" — URL lokal /fess/[id], bukan IG.
  - lib/media-lookup.ts: cache in-memory lookup per-ID (positif 10 mnt, negatif 60 dtk anti brute-force ID, max 100 entri) — dipakai page + OG route sekaligus (1 panggilan Graph per kunjungan).
- INSTAGRAM LIB: getMediaById (validasi format ID regex utk keamanan path) + getTotalMediaCount (field media_count — TERBUKTI JALAN dgn token sekarang, beda dgn content_publishing_limit!).
- lib/caption.ts (baru): extractMenfessText dgn 2 marker boilerplate (format sekarang "Kirim menfess kamu juga lewat…" + format lama "— terkirim anonim melalui…") + bersihkan baris hashtag ekor; excerptOfText potong di batas kata. ArchiveGrid & SubmissionHistory kini pakai util bersama (hapus duplikasi).
- STATISTIK LIVE LANDING: api/stats/route.ts (media_count, cache 5 mnt, fail-open posts:null) + komponen LiveStats — strip "Sudah N menfess tayang · Lihat arsip →" di bawah chip kuota; disembunyikan jika angka tak bisa dicek (jujur, bukan angka karangan). Terverifikasi tampil dgn angka nyata (1).
- RSS FEED /feed.xml: RSS 2.0, 20 post terakhir, link ke halaman kartu lokal, fail-open = channel kosong valid (bukan 500); link di footer + autodiscovery <link rel="alternate" type="application/rss+xml"> via metadata alternates.types. Terverifikasi valid & berisi post asli.
- ARSIP: kartu kini link INTERNAL ke /fess/[id] (badge hover "Lihat kartu" + link "Halaman kartu"; "Buka di IG" tetap ada sbg link eksternal; focus-visible inset ring + focus-within shadow utk keyboard). Tombol Bagikan kini membagikan URL lokal (OG image ikut tampil di chat).
- RIWAYAT KIRIMAN: mini-preview kartu (w-16) per baris — pratinjau stempel persis kartu IG.
- BUG DITEMUKAN & DIPERBAIKI:
  1. Mini preview SubmissionHistory melebar full-row (PostPreview root w-full menang atas w-16 yang dilewatkan via className → teks per baris rusak). Fix: bungkus dgn div w-16 fixed (PostPreview w-full dalam wrapper).
  2. Boilerplate format lama ikut tampil di halaman kartu/OG/feed (marker baru belum ada). Fix: lib/caption.ts multi-marker + strip hashtag ekor.
  3. Turbopack module graph stale utk route opengraph-image (caption.ts sudah berubah tapi OG masih render kode lama; page & feed sudah benar). Fix: restart dev server (scripts/dev-server.sh idempotent). Dicatat: kalau edit lib yang dipakai metadata route, cek juga OG-nya.
- QA agent-browser lengkap: detail page light (kartu+metadata+aksi+CTA), dark (kartu sengaja tetap terang = identik IG; panel metadata kontras OK), mobile 390px (semua stack rapi), arsip → klik kartu → URL /fess/[id] benar, tombol "Salin tautan" → jadi "TERSALIN", submit dry-run → panel sukses + "Kiriman kamu" mini-preview muncul, feed.xml valid, /api/stats posts:1, OG image visual OK, semua route 200, lint akhir 0/0.
- Detail styling: badge hover arsip kini inline-flex + ikon mata, focus ring inset pada link kartu, blockquote kuning di detail, CTA dashed panel, footer +RSS.

Stage Summary:
- VERIFIED: halaman kartu /fess/[id] end-to-end (data nyata dari IG), OG image per kartu, statistik live nyata (media_count), RSS, mini-preview riwayat — semua lolos QA light/dark desktop & mobile.
- Keputusan penting: share arsip kini membagikan URL situs lokal (bukan IG) supaya OG image kartu ikut tampil; kartu tanpa teks → noindex.
- Risiko/known issue (tetap): content_publishing_limit gagal code 1 (token tanpa permission publishing) — verifikasi ulang di Vercel dgn token fresh; MENFESS_DRY_RUN masih true (disengaja). media_count & /media TERBUKTI jalan dgn token sekarang.
- Ide ronde berikutnya: pagination server-side arsip (after-cursor Graph) bila post >24; halaman "acah"/random kartu; multi-brand constants; cache-header/ISR utk /fess/[id]; regenerasi token IG + DRY_RUN=false saat produksi.

---

Task ID: 12
Agent: main (Z.ai Code)
Task: QA round + fitur baru — halaman /acak (kocok kartu), like counts end-to-end, cache bersama, polish zine

Work Log:
- ASSESSMENT: proyek stabil saat mulai (lint 0/0, semua route 200, console bersih, hanya content_publishing_limit fail-open yang known). QA agent-browser awal: landing/kirim/arsip aman → lanjut fitur baru.
- MEDIA POOL BERSAMA (refactor arsitektur): lib baru src/lib/media-pool.ts — SATU cache in-memory daftar 50 post terakhir (TTL 5 menit + anti thundering-herd via inflight guard + stale fallback) yang melayani /api/arsip, /api/acak, /api/stats, dan /feed.xml sekaligus. Dulu tiap route punya cache sendiri (boros kuota Graph); kini 1x fetch per 5 menit. getArsipItems / pickRandomMedia(excludeId) / getRecentLikesTotal. feed.xml refactor ke pool.
- HALAMAN /ACAK "KOCOK KARTU" (fitur utama ronde ini):
  - API GET /api/acak: pilih 1 post acak dari pool, param ?exclude=<id> biar kartu yang sama nggak muncul 2x berturut-turut (kalau masih ada kandidat lain), Cache-Control no-store (hasilnya memang harus beda tiap request), fail-open 200 {item:null, reason}.
  - Halaman /acak (server, metadata noindex): heading "Kocok. Baca. Kaget." + RandomFess client component.
  - RandomFess: deck 3 kartu (2 kartu "gacoan" di belakang ikut miring saat spinning), kartu utama = gambar asli IG (fallback PostPreview kalau mediaUrl kosong), label "ACAK" nempel di tepi atas kartu (posisi -top-3 — BUG DITEMUKAN: awalnya top-4 di dalam kartu, menutupi header brand kartu IG), baris meta (♥ suka + waktu relatif + Halaman kartu + Bagikan + link IG), tombol KOCOK signal besar dengan spinner, shortcut keyboard K (diabaikan kalau lagi ngetik di input/modifier), jeda minimal 500ms biar animasi kocok terasa, guard spinningRef anti double-request, state degrade: empty ("kirim yang pertama, yuk") vs unavailable ("arsip lagi nggak bisa dijangkau") + alert + retry.
  - Entrypoints: navbar (desktop+mobile) link "Acak", tombol "Kartu acak" di bar kontrol arsip, link "Kartu acak" di footer. /acak sengaja noindex (kartu individual tetap terindeks via /fess/[id]).
- LIKE COUNTS END-TO-END (data nyata dari IG, honest — undefined = tampil sebagai tidak ada, bukan nol karangan):
  - instagram.ts: fields += like_count, normalisasi toLikeCount (negatif/aneh → undefined); listRecentMedia & getMediaById sama-sama mengembalikan likeCount.
  - ArchiveGrid: chip ♥ tomat (tabular-nums, title tooltip) di baris meta kartu; SORT TOGGLE baru "Terbaru | Paling disukai" (segmented mono, aria-pressed, hanya muncul kalau minimal 1 item punya data suka; sort via useMemo, tie-break terbaru); responsif: search full-width di mobile, toggle di baris sendiri.
  - /fess/[id]: "♥ n suka" di panel metadata (bold tomat).
  - /api/stats: + likes (jumlah suka pool via getRecentLikesTotal — undefined kalau 1 pun item tak punya data); LiveStats: "♥ n suka di post terbaru" dipisah divider tipis, hidden kalau tak tersedia.
- MENFESSACTIONS: tombol ketiga "Salin teks" (ikon Quote) — salin teks menfess ke clipboard, feedback "TEKS TERSALIN" + error toast spesifik kalau clipboard diblokir (semua path punya pesan, tidak ada yang diam).
- CACHE HEADERS CDN: /api/arsip & /api/stats → public, s-maxage=180, stale-while-revalidate=600 (respons sukses/cache-lama); no-store saat data kosong; /api/acak no-store; /feed.xml sudah ada dari ronde lalu.
- STYLING DETAILS (mandat polish):
  - Grain overlay zine: .grain-overlay fixed inset-0 z-90 pointer-events-none, SVG feTurbulence desaturasi tile 160px, opacity 0.05 terang / 0.07 gelap, hidden kalau prefers-reduced-motion — dipasang di layout (setelah Footer, sebelum Toaster).
  - Scroll reveal: util .reveal/.is-visible (opacity+translateY, delay via --reveal-delay, force-visible di reduced-motion) + komponen Reveal (client) dengan pola aman: SSR/no-JS/reduced-motion → langsung terlihat; elemen di bawah viewport disembunyikan HANYA setelah mount (rAF, hindari set-state-in-effect lint) lalu dimunculkan sekali via IntersectionObserver; elemen yang sudah kelihatan tidak pernah berkedip; className wrapper tetap digabung (cn). Dipasang di 3 section landing (cara-kerja, aturan, FAQ).
  - Logo navbar: bintang hover rotate 120° (simetri tiga batang — "mendarat" ke bentuk sama), 500ms ease-out.
  - Keyframe .animate-shuffle (jitter rotasi/translate 0.5s) untuk kartu saat dikocok; didaftarkan sebagai --animate-shuffle di @theme.
- BUG QA & FIX: (1) badge ACAK menutupi header kartu → dipindah ke tepi atas kartu; overflow-hidden article melar -> badge jadi sibling di container deck. (2) ArchiveGrid search input gepeng di 390px → flex-col mobile / sm:flex-row. (3) [Catatan proses, bukan bug app] klik native agent-browser pada tombol submit di tepi bawah viewport mobile tidak mendarat — klik via eval JS membuktikan pipeline submit normal (POST 200 + panel sukses + riwayat).
- QA agent-browser lengkap: /acak light+dark desktop & 390px (deck, badge, meta, KOCOK, hint kbd, shortcut K jalan), sort toggle klik → "PALING DISUKAI" aktif, chip ♥ muncul di kartu arsip & /fess/[id] & LiveStats landing, Salin teks → "TEKS TERSALIN", golden path /kirim mobile dark (submit → panel sukses + Kiriman kamu muncul), grain + reveal tidak mengganggu keterbacaan, semua section landing terlihat setelah scroll (tidak ada kontene stuck-hidden), headers cache terverifikasi via curl, semua route 200 + 404 benar, lint akhir 0 error 0 warning. dev.log bersih (hanya known issue kuota IG).

Stage Summary:
- VERIFIED: halaman /acak end-to-end (data IG nyata), like counts di 4 permukaan (arsip/sort/kartu/landing), cache pool bersama menghemat kuota Graph, CDN cache headers, grain zine + scroll reveal + micro-interactions — semua lolos QA light/dark desktop & mobile.
- Keputusan penting: /acak noindex & no-store; sort "paling disukai" hanya muncul saat data suka ada (jujur, bukan fitur mati); likes undefined tidak pernah ditampilkan sebagai 0 karangan (kecuali IG benar-benar melapor 0).
- Risiko/known issue (tetap): content_publishing_limit gagal code 1 (token tanpa permission publishing) — verifikasi ulang di Vercel dengan token fresh; MENFESS_DRY_RUN masih true (disengaja untuk QA). Reveal bergantung JS — tanpa JS konten langsung tampil normal (by design).
- Ide ronde berikutnya: pagination server-side arsip (after-cursor Graph) bila post >24; simpan riwayat kiriman ke database (Prisma) untuk statistik agregat; share card sebagai gambar (canvas → PNG); multi-brand constants; regenerasi token IG + DRY_RUN=false saat produksi.

---

Task ID: 13
Agent: main (Z.ai Code)
Task: QA round + fitur baru — reaksi pembaca (Prisma/SQLite), unduh gambar kartu, tips panel, polish

Work Log:
- ASSESSMENT: proyek stabil saat mulai (lint 0/0, 14 route 200, console bersih, dev.log hanya known issue content_publishing_limit yang fail-open). QA agent-browser awal: landing/kirim/arsip/detail aman → lanjut fitur baru.
- REAKSI PEMBACA (fitur utama ronde ini — interaksi nyata pembaca situs, data disimpan sendiri):
  - prisma/schema.prisma: model FessReaction (mediaId + kind + createdAt, index [mediaId, kind] & [createdAt]) — menggantikan scaffold User/Post yang tak terpakai. Prinsip privasi: TIDAK ada identitas yang disimpan; IP hanya untuk rate-limit in-memory, tak pernah masuk DB. db:push sukses.
  - lib/reaksi.ts: getReactionCounts (GROUP BY bulk), getReactionCountsForOne, saveReaction dgn $transaction (delete baris lama via replaceRowId yang dicocokkan JUGA mediaId — mustahil hapus reaksi kartu lain). Semua fail-soft: DB gagal → {} / null, UI tetap jalan.
  - API /api/reaksi: GET bulk (maks 50 id, validasi regex ID media IG angka 5–25 digit, cache public s-maxage=15 + stale-while-revalidate=60); POST { mediaId, kind, replaceRowId? } → simpan + balikin counts & rowId tiket. Error semuanya SPESIFIK: 400 body bukan JSON / ID invalid / kind tak dikenal, 429 rate-limit dgn "Coba lagi dalam N detik" + header Retry-After, 503 DB tak terjangkau. Rate limiter refactor jadi factory createLimiter — submit & reaksi punya peta/window terpisah (reaksi: cooldown 2 dtk, maks 30/10 mnt).
  - Komponen ReactionBar (client) di /fess/[id]: 4 reaksi (🫶 Relate, 😂 Lucu, 🥲 Ikut sedih, 🔥 Semangat) — pill zine hard-border, selected = bg signal + ink-fixed, hover -translate-y-0.5 + shadow, angka count animasi pop (key=n), optimistic update + snapshot rollback, localStorage simpan {kind, rowId} per kartu (kunci fess:reaksi:<id>) sehingga pilihan tetap ter-highlight setelah reload. Ganti reaksi = POST dgn replaceRowId → hitungan tetap jujur (bisa diganti, nggak bisa dicabut — dijelaskan di hint). Semua path gagal (429/503/network/HTTP lain) punya toast spesifik; hitungan tak termuat tetap bisa bereaksi (angka menyusul, dijelaskan).
  - Terverifikasi end-to-end via browser: klik relate → total 2 + relate 1; ganti ke semangat → relate kembali 0 (baris kehapus di DB), semangat 1, total tetap 2; reload → state selected persist; server counts = {lucu:1, semangat:1(+sedih dari uji rate-limit)}.
  - Uji rate limit via curl: 35 POST beruntun → 200 lalu 429 stabil dgn pesan spesifik.
- ARSIP + REAKSI: ArchiveGrid tarik hitungan reaksi bulk (satu fetch /api/reaksi utk semua id yang dimuat, gagal = diam tanpa chip — reaksi itu bonus); chip reaksi di meta kartu (emoji dominan + total, tooltip "n reaksi pembaca di situs ini (terbanyak: X)"), style pill signal-soft halus; SORT KETIGA "Paling direaksi" — hanya muncul kalau minimal 1 kartu punya reaksi (pola jujur yang sama dgn "Paling disukai"), tie-break terbaru. Terverifikasi: toggle aktif kuning, chip 😂 2 tampil.
- UNDUH GAMBAR (MenfessActions): tombol keempat "Unduh gambar" — fetch /fess/[id]/opengraph-image (mesin generator yang sama dgn kartu IG) → blob → a[download]; state "Menyiapkan…" + spinner, disabled cursor-wait, toast sukses "Gambar kartu terunduh", error 404 vs lain dibedakan spesifik. Terverifikasi: fetch OG = 200 image/png 54KB, klik → toast sukses.
- /KIRIM TIPS PANEL: kolom pratinjau yang tadi kosong di bawah placeholder kini diisi panel "Biar kartunya enak dibaca" — 3 tips bernomor (tulis kayak ngobrol / satu cerita per menfess / jangan sebut nama orang), dashed border + bg signal-soft, sticky-safe di desktop, stack di mobile.
- PRIVASI: halaman /privacy ditambah penjelasan reaksi pembaca (data yang disimpan: ID kartu + jenis + waktu; pilihan sendiri diingat di localStorage perangkat) + update section retensi.
- QA agent-browser lengkap: /fess/[id] light+dark desktop & 390px (bar reaksi, selected state, pill, kontras OK), arsip mobile (3 toggle urutan muat satu baris, chip reaksi), kirim (tips panel), unduh gambar OK, landing LiveStats tetap jalan, footer sticky OK, console fresh-session bersih, semua route 200 + 404 benar, cache header /api/reaksi benar, lint akhir 0 error 0 warning. dev.log bersih (hanya known issue kuota IG + log 404 yang memang by-design).
- [Catatan proses] Ada output tool yang menampilkan "grid-cols-inmax(...)" — ternyata artefak render terminal yang menelan "[m"; hexdump membuktikan source benar (grid-cols-[minmax(0,1fr)_1.6fr]). Layout dua kolom terverifikasi visual.

Stage Summary:
- VERIFIED: reaksi pembaca end-to-end (Prisma/SQLite nyata, optimistic UI, switch reaksi jujur, rate-limit spesifik), unduh gambar kartu, sort "Paling direaksi", chip reaksi arsip, tips panel, privasi terbarui — semua lolos QA light/dark desktop & mobile.
- Keputusan penting: reaksi = satu per perangkat per kartu, bisa diganti via tiket rowId (cuid, disimpan localStorage), nggak bisa dicabut — demi hitungan yang jujur; DB gagal tidak pernah merusak halaman (fail-soft semua jalur).
- Risiko/known issue (tetap): content_publishing_limit gagal code 1 (token tanpa permission publishing) — verifikasi ulang di Vercel dgn token fresh; MENFESS_DRY_RUN masih true (disengaja utk QA). Prisma log:['query'] masih aktif di dev — wajar, tapi di produksi sebaiknya dilepas.
- Ide ronde berikutnya: tampilkan reaksi di /acak (mini bar atau chip), statistik total reaksi di LiveStats landing, admin/maintenance endpoint pembersihan reaksi post tua, pagination server-side arsip (after-cursor) bila post >24, regenerasi token IG + DRY_RUN=false saat produksi.

---

Task ID: 14
Agent: main (Z.ai Code)
Task: QA round + fitur baru — kategori menfess end-to-end, reaksi di /acak, statistik reaksi pembaca di landing

Work Log:
- ASSESSMENT: proyek stabil saat mulai (lint 0/0, semua route 200, dev.log hanya known issue content_publishing_limit yang fail-open). QA agent-browser awal: landing/arsip/acak/detail aman light+dark → lanjut fitur baru, bukan bugfix.
- KATEGORI MENFESS (fitur utama ronde ini — label opsional yang menyeberangi seluruh pipeline):
  - constants: MENFESS_CATEGORIES (bebas✳/curhat🌧/pengakuan🤫/lucu😂/semangat🔥/tanya🤔) + DEFAULT_CATEGORY="bebas" + findCategory(). "bebas" TIDAK menulis apa pun ke caption → post lama otomatis dianggap bebas, nol migrasi.
  - caption.ts: baris marker `kategori: <id>` di boilerplate caption; extractCategoryFromCaption() + extractMenfessText kini menghapus baris kategori dari isi. Regex global dipakai bersama → lastIndex di-reset sebelum & sesudah exec (anti state leak antar panggilan).
  - post-template.ts: categoryStamp() — stempel mono tomato (#E4572E baru di TEMPLATE_PALETTE), border 3px, rotate -2°, di samping aksen kuning (satu baris flex). buildTemplateNode(text, fonts, categoryId?) — preview client & render server identik.
  - generate-image.ts: renderMenfessCard(text, category?). Diverifikasi visual via render PNG: kartu pendek "PENGAKUAN" & kartu 522 char "CURHAT" — stamp rapi, layout tak bergeser.
  - API /api/submit: validasi category (tidak dikenal → diam-diam default, bukan menolak), diteruskan ke render + caption builder (categoryLine hanya jika bukan bebas). Log submit kini mencantumkan category.
  - Form: komponen baru CategoryPicker (fieldset + radio asli sr-only + label chip — keyboard & SR jalan tanpa trik; chip terpilih kuning + hard shadow; hint dinamis per kategori). Draf di-upgrade ke v2 (JSON {content, category}) dengan fallback baca v1 teks polos; submit sukses menghapus kedua key.
  - SubmissionHistory: chip kategori tomat per baris + mini preview ikut merender stamp (PostPreview category prop).
  - Arsip: filter chip kategori (SEMUA + kategori yang BENAR-BENAR ada di post dimuat, dengan count — tidak ada chip mati), aktif = tomato; digabung dgn pencarian dalam satu useMemo; empty state kini menangani filter-tanpa-hasil + tombol "Bersihkan filter kategori"; badge kategori kecil di meta tiap kartu.
  - /fess/[id]: stamp kategori miring di panel metadata + PostPreview pakai category (kartu di halaman = kartu di IG). opengraph-image per kartu: stamp kategori di header (fallback OG brand tetap aman).
  - Landing: kartu contoh kini pakai stamp ("SEMANGAT" & "CURHAT" — SAMPLE_B text diperbarui biar cocok), ticker + item "KATEGORI OPSIONAL", FAQ baru "Kategori menfess itu apa? Wajib?" (JSON-LD ikut ke-pick otomatis).
  - Privasi: section data menjelaskan kategori ikut publik di kartu & caption.
- REAKSI DI /ACAK: ReactionBar dapat prop variant "full"|"compact" — compact = pill emoji+count saja (tanpa label), hint satu baris, dipasang di bawah baris meta kartu acak dengan key=item.id (state reset per kartu). Kunci localStorage sama dgn /fess/[id] → pilihan tersinkar antar halaman. Terverifikasi: klik relate di /acak → total nambah, aria-pressed true, tiket rowId tersimpan, /fess/[id] ikut menunjukkan terpilih.
- STATISTIK REAKSI PEMBACA (landing): reaksi.ts getTotalReactionCount() (COUNT semua, fail-soft null); /api/stats menambah field readerReactions (dicache 5 menit sama dgn posts/likes — kegagalan DB independen dari IG); LiveStats dirender ulang: strip tampil jika minimal satu angka ada (posts ATAU reactions), segmen "☺ n reaksi pembaca" dgn title tooltip. Terverifikasi nyata: "SUDAH 1 MENFESS TAYANG | ♥0 SUKA | 3 REAKSI PEMBACA".
- QA agent-browser menyeluruh: /kirim picker default Bebas → pilih Curhat → preview stamp CURHAT muncul live → draf v2 {content,category} tersimpan → submit dry-run sukses → panel "Kiriman kamu" menampilkan chip 🌧Curhat + mini kartu dgn stamp. /arsip: filter chip diuji dgn fetch stub (caption diberi marker kategori: lucu) → chip "😂Lucu 1" aktif tomato, kartu terfilter 1, kombinasi cari+filter → empty state + tombol bersihkan (fetch asli dipulihkan setelahnya — data asli belum punya kategori → chip disembunyikan, perilaku jujur benar). /acak light+dark desktop & 390px: 4 pill muat satu baris, reaksi tersimpan. Landing dark: strip stats & stamp terbaca. Mobile 390px /kirim: chip wrap 2 baris rapi. Console bersih, semua route 200 + OG routes 200. Invalid category "hackerman" via curl → ok (fallback default). Lint akhir 0 error 0 warning.
- [Catatan proses] Satu eval gagal karena Identifier redeclared (variabel sebelumnya masih hidup di context eval) — bukan bug app; dibungkus IIFE. a11y-tree snapshot kadang menyatukan teks span bersebelahan (heading hero) — hexdump source membuktikan spasi benar.

Stage Summary:
- VERIFIED end-to-end: kategori menfess (form → preview → API → caption marker → kartu IG → arsip filter → halaman kartu → OG image), reaksi compact di /acak (state tersinkar dgn /fess/[id]), statistik reaksi pembaca di landing — semua lolos QA light/dark desktop & mobile.
- Keputusan penting: "bebas" tidak menulis marker (post lama = bebas tanpa migrasi); kategori tak dikenal → default diam-diam (tidak menolak kiriman); chip filter hanya untuk kategori yang ada isinya; strip landing tampil kalau minimal satu angka tersedia.
- Risiko/known issue (tetap): content_publishing_limit gagal code 1 (token tanpa permission publishing) — verifikasi ulang di Vercel dgn token fresh; MENFESS_DRY_RUN masih true (disengaja utk QA) — filter arsip baru akan kelihatan datanya setelah ada post asli berkategori.
- Ide ronde berikutnya: pagination server-side arsip (after-cursor Graph) bila post >24; kategori di RSS/JSON-LD per item; share gambar kartu langsung dari arsip (canvas→PNG); admin cleanup endpoint reaksi post tua; regenerasi token IG + DRY_RUN=false saat produksi.

---

Task ID: 15
Agent: main (Z.ai Code)
Task: QA round + fitur baru — Koleksi "Tersimpan" (bookmark perangkat), kartu bersama, polish RSS/styling

Work Log:
- ASSESSMENT: proyek stabil saat mulai (lint 0/0, 14 route 200, console fresh-session bersih, dev.log hanya known issue content_publishing_limit fail-open + DRY_RUN). Keputusan: lanjut FITUR BARU dari backlog, bukan bugfix.
- KOLEKSI TERSIMPAN (fitur utama ronde ini — bookmark menfess favorit, 100% localStorage, tanpa server/akun):
  - lib/koleksi.ts: simpan SNAPSHOT data publik kartu (bukan cuma ID — URL CDN IG cepat expired & arsip cuma ~50 post, kartu lama harus tetap bisa dibuka). Maks 100 kartu FIFO. API: listKoleksi/koleksiIds/isSaved/saveFess/unsaveFess/toggleFess/clearKoleksi + hook useKoleksi (useSyncExternalStore — sinkron antar komponen & antar-tab via event custom + event storage; cache referensi stabil, invalidasi manual di handler storage). Semua fail-soft.
  - [BUG ditemukan & diperbaiki saat QA] lupa import useSyncExternalStore → Runtime ReferenceError merash halaman arsip (dev server sempat mati, restart via scripts/dev-server.sh). Fix: import React + rapikan deklarasi konstanta di atas hook.
  - SaveButton (variant "overlay" ikon pojok kartu / "row" tombol berlabel): satu sumber state via useKoleksi → semua tombol di semua halaman selalu sinkar. aria-pressed, toast spesifik simpan/hapus. Detail UX: overlay tersembunyi sampai hover DI PERANGKAT HOVER SAJA — custom variant `no-hover` (@custom-variant @media not (hover: hover) di globals.css) bikin tombol selalu tampak di layar sentuh (variant arbitrary [@media(hover:hover)]: terbukti tidak digenerate Tailwind 4 — dicek via document.styleSheets, solusi @custom-variant terverifikasi bekerja via matchMedia).
  - MenfessCard: kartu arsip diekstrak jadi komponen bersama (arsip + koleksi). Perbaikan internal: CardImage dgn fallback jujur — kalau <img> CDN IG gagal (onError) → render ulang kartu via PostPreview dari caption (mesin yang sama dgn kartu aslinya), state failedKey derived dari id+URL (tanpa setState-in-effect, lint rule react-hooks/set-state-in-effect lolos bersih).
  - /tersimpan (BARU): halaman koleksi — header zine, skeleton saat hydration (mencegah flash empty-state), search dalam snapshot, "Hapus semua" konfirmasi dua langkah (auto-revert 3 detik), chip reaksi live via bulk /api/reaksi, empty state ilustratif bintang + CTA arsip/acak. robots noindex (data personal per perangkat) & sengaja TIDAK masuk sitemap (terverifikasi).
  - Entry point: Navbar link TERSIMPAN + badge count live (desktop & mobile menu), toolbar arsip tombol Tersimpan + badge.
  - Wire: arsip (overlay), /acak (row di baris meta), /fess/[id] (row di baris aksi — snapshot dikirim dari server component, serializable).
- STYLING DETAIL (wajib ronde ini): ScrollTopButton melayang zine (hard shadow, muncul setelah 480px scroll, di atas footer) di /arsip & /tersimpan; badge count kuning di navbar/toolbar; empty-state koleksi berilustrasi; toolbar arsip kini 3 tombol (Tersimpan/Acak/Muat ulang) yang wrap rapi di 390px.
- RSS (feed.xml): item berkategori kini berjudul prefix "[Label]" + elemen <category>; post tanpa kategori tetap polos (terverifikasi XML valid).
- PRIVASI + LANDING: privacy section "Koleksi tersimpan" (data publik kartu, di perangkat, bisa dihapus); FAQ baru "Bisa nyimpen menfess favorit?" (JSON-LD ikut otomatis).
- QA agent-browser menyeluruh (fresh session): simpan dari arsip → badge navbar+toolbar instan + toast; unsave dari /tersimpan → kartu hilang, badge turun, /arsip sinkar; simpan dari /fess/[id] → reload → state persist (localStorage snapshot terverifikasi); /acak row tersinkar; fallback render dgn snapshot mediaUrl rusak → PostPreview + stamp kategori "CURHAT" tampil; search koleksi (cocok 1, kosong → tombol bersihkan); hapus semua dua langkah → localStorage null + empty state; mobile 390px (overlay tombol tampak tanpa hover, toolbar wrap 2 baris rapi); dark mode /tersimpan OK; 13 route dicek: semua 200 + 404 benar; console fresh-session 0 error di semua halaman (error "Ecmascript file had an error" sebelumnya = buffer console sesi lama sebelum fix import — hilang setelah browser direstart); dev.log hanya log normal; lint akhir 0 error 0 warning.

Stage Summary:
- VERIFIED end-to-end: koleksi tersimpan (simpan/hapus/persist/sinkar antar halaman & tab, fallback kartu expired, search, clear-all, mobile + dark), ScrollTopButton, RSS kategori.
- Keputusan penting: koleksi = snapshot localStorage (tahan URL IG expired & horizon arsip 50 post), noindex + tanpa sitemap; tombol overlay selalu tampak di perangkat sentuh via @custom-variant no-hover.
- Risiko/known issue (tetap): content_publishing_limit gagal code 1 (token tanpa permission publishing) — fail-open by design, verifikasi ulang di Vercel dgn token fresh; MENFESS_DRY_RUN masih true (disengaja utk QA); Prisma log:['query'] masih aktif di dev; bunx tsc --noEmit mencakup folder examples/skills milik scaffold (error pre-existing, bukan kode app).
- Ide ronde berikutnya: pagination server-side arsip (after-cursor Graph) bila post >24; badge "Tersimpan" count di halaman arsip kartu (chip kecil di meta); share koleksi sebagai daftar teks; admin cleanup endpoint reaksi post tua (butuh desain secret header); regenerasi token IG + DRY_RUN=false saat produksi.

---

Task ID: 16
Agent: main (Z.ai Code)
Task: QA round + fitur baru — ekspor koleksi jadi teks, rekomendasi "Kartu lainnya" di /fess/[id], endpoint admin pembersihan reaksi, zine-tilt grid

Work Log:
- ASSESSMENT: proyek stabil saat mulai (lint 0/0, 14 route 200, console fresh-session bersih di semua halaman, dev.log hanya known issue content_publishing_limit fail-open). Keputusan: lanjut FITUR BARU dari backlog, bukan bugfix.
- EKSPOR KOLEKSI (fitur utama — backlog "share koleksi sebagai daftar teks"):
  - lib/koleksi.ts: buildKoleksiText(list, siteHost) — nomor urut + kutipan (excerptFromCaption: marker kategori & boilerplate ikut dibuang) + tautan lokal /fess/<id> per kartu, footer privasi; koleksi kosong → string kosong. Diverifikasi via skrip bun: caption penuh boilerplate diekstrak jadi kutipan bersih.
  - Komponen KoleksiExport di toolbar /tersimpan: HP → share sheet (Web Share API) dengan title "Koleksi Fess UNAIR (n kartu)"; desktop → clipboard. AbortError (user batal) dibiarkan diam; share gagal → fallback clipboard + toast info berbeda; clipboard gagal → toast error spesifik. State tombol: Ekspor daftar → Menyiapkan… → Siap dibagikan (2 dtk).
  - [BUG ditemukan & diperbaiki saat QA] ikon "ListDown" tidak ada di lucide-react → error kompilasi 500 (tertangkap curl pertama). Diganti ListOrdered; verifikasi ulang lolos.
  - Terverifikasi di browser headless: klik → path clipboard (navigator.share tidak ada) → toast error SPESIFIK "Browser memblokir akses clipboard atau share…" karena headless memblokir clipboard — perilaku feedback lengkap terbukti; format teks diverifikasi via fungsi murni.
- KARTU LAINNYA (rekomendasi di /fess/[id]):
  - Komponen client FessRecommendations: fetch /api/arsip sekali, buang kartu aktif, Fisher–Yates (acak jujur, bukan sort(Math.random()) yang bias) ambil 3 kartu → grid MenfessCard. Fail-soft total: fetch gagal → section menghilang; arsip kosong → tdk dirender; loading → 3 SkeletonCard di tempatnya (tidak ada layout lompat).
  - Dipasang di halaman /fess/[id] antara artikel dan CTA: kicker stempel dadu miring "KARTU LAINNYA", heading "Mumpung lagi di sini…", link "Lihat semua arsip →", separator dashed. Terverifikasi: 2 kartu kandidat muncul (arsip 3 post − kartu aktif), screenshot desktop rapi.
- ENDPOINT ADMIN PEMBERSIHAN REAKSI (backlog "admin cleanup endpoint"):
  - POST /api/admin/reaksi-cleanup — header x-admin-secret dibandingkan env MENFESS_ADMIN_SECRET (crypto.timingSafeEqual, fail-CLOSED: env tak terpasang → 401, bukan fail-open, karena destruktif). Parameter opsional {"olderThanDays": 1–3650} default 90 → deleteMany createdAt < cutoff pada FessReaction (reaksi kartu lama yang sudah keluar horizon arsip). Response sukses: deleted count + cutoffIso + note manusiawi.
  - Semua jalur error SPESIFIK & diverifikasi curl: 401 tanpa/salah secret, 400 body bukan JSON, 400 olderThanDays tidak valid, 200 deleted:0 "database sudah bersih", GET → 405. MENFESS_ADMIN_SECRET baru di-generate (openssl rand -hex) dan ditambahkan ke .env.local; instruksi pemakaian ada di header file route.
- STYLING DETAIL (mandat polish):
  - .zine-tilt (globals.css): kartu grid dimiringkan bergantian ±0.35deg (properti CSS `rotate` — independen dari transform, komposisi aman dgn hover:-translate-y-1 kartu), lurus kembali saat hover/focus-within (transition-all kartu menganimasikannya). Dipasang di 3 grid: arsip, koleksi, rekomendasi.
  - Terverifikasi computed style (0.35deg / -0.35deg), tanpa horizontal overflow (scrollWidth 390 = clientWidth 390 di mobile), hover lurus, dark mode terbaca.
- QA agent-browser menyeluruh: /fess/[id] rekomendasi (desktop screenshot), /arsip 390px light+dark (toolbar wrap 2 baris rapi, tilt halus, ScrollTopButton muncul), /tersimpan 390px dark (tombol Ekspor daftar + Hapus semua muat sebaris), overflow check 390px bersih, semua route 200 + 404 benar + admin GET 405, console bersih, lint akhir 0 error 0 warning.
- [Catatan proses] Turbopack menyajikan CSS globals.css STALE setelah edit (chunk name sama, konten lama; restart server pun belum cukup) — fix: hapus folder .next/dev lalu restart dev server; zine-tilt terverifikasi muncul di chunk terlayani. Kalau edit globals.css tidak ter-apply di dev, hapus .next/dev.

Stage Summary:
- VERIFIED end-to-end: ekspor koleksi (semua jalur feedback spesifik, format teks bersih), rekomendasi kartu acak di halaman kartu (fail-soft, acak jujur), endpoint admin pembersihan reaksi (auth timing-safe, fail-closed, semua error spesifik), zine-tilt di 3 grid (light/dark/mobile tanpa overflow).
- Keputusan penting: endpoint admin FAIL-CLOSED (kebalikan fail-open kuota IG — destruktif harus aman); rekomendasi = bonus yang menghilang saat data tidak ada; ekspor pakai excerpt mesin caption yang sama biar konsisten dengan semua permukaan.
- Risiko/known issue (tetap): content_publishing_limit gagal code 1 (token tanpa permission publishing) — verifikasi ulang di Vercel dgn token fresh; MENFESS_DRY_RUN masih true (disengaja utk QA); Prisma log:['query'] masih aktif di dev; jangan lupa pasang MENFESS_ADMIN_SECRET di Vercel kalau mau endpoint cleanup aktif di produksi.
- Ide ronde berikutnya: pagination server-side arsip (after-cursor Graph) bila post >24; cron pembersihan reaksi otomatis (panggil endpoint admin dari cron Vercel); share gambar koleksi sebagai collage; reaksi di RSS; regenerasi token IG + DRY_RUN=false saat produksi.
