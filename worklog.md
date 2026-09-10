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
