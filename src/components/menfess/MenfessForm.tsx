"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import {
  Loader2,
  SendHorizonal,
  RotateCcw,
  ExternalLink,
  PartyPopper,
  Hourglass,
  Eye,
  History,
  Trash2,
  Share2,
  Link2,
  Check,
  Copy,
  Image as ImageIcon,
  Film,
  Crop as CropIcon,
  Plus,
  Sparkles,
  Layers,
} from "lucide-react";
import Link from "next/link";
import {
  MAX_CHARS,
  MIN_CHARS,
  IG_PROFILE_URL,
  IG_HANDLE,
  DEFAULT_CATEGORY,
} from "@/constants";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import { Alert } from "@/components/ui/alert";
import { CharCounter } from "@/components/menfess/CharCounter";
import { TurnstileWidget } from "@/components/menfess/TurnstileWidget";
import { isTurnstileWidgetEnabled } from "@/lib/config";
import { PostPreview } from "@/components/menfess/PostPreview";
import { CoverPreview } from "@/components/menfess/CoverPreview";
import { CategoryPicker } from "@/components/menfess/CategoryPicker";
import { ThemePicker } from "@/components/menfess/ThemePicker";
import {
  ImageCropperModal,
  type AspectRatio,
} from "@/components/menfess/ImageCropperModal";
import type { CoverStyle } from "@/lib/cover-template";
import { saveSubmission } from "@/lib/submission-history";
import { isPostTheme, type PostTheme } from "@/lib/post-template";
import type { SubmitResponse, UploadedMediaItem } from "@/types/menfess";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type FormStatus = "idle" | "submitting" | "success" | "error";

interface SuccessInfo {
  permalink?: string;
  dryRun?: boolean;
  ticketCode?: string;
  theme?: PostTheme;
  queued?: boolean;
  queuePosition?: number;
}

interface LocalMediaItem {
  id: string;
  file: File | Blob;
  previewUrl: string;
  type: "image" | "video";
  name: string;
}

interface DraftPayload {
  content: string;
  category: string;
  theme?: PostTheme;
  coverTitle?: string;
  coverStyle?: CoverStyle;
  aspectRatio?: AspectRatio;
}

const DRAFT_KEY = "fess-unerr:menfess-draft:v4";
const DRAFT_KEY_LEGACY = "fess-unerr:menfess-draft:v3";

/**
 * Unggah file langsung dari browser klien ke Cloudinary menggunakan
 * signed signature dari /api/upload/sign. Bypasses limit 4.5MB Vercel.
 */
async function uploadToCloudinaryDirect(
  file: File | Blob,
  resourceType: "image" | "video"
): Promise<UploadedMediaItem> {
  const signRes = await fetch("/api/upload/sign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ resourceType }),
  });
  const signData = await signRes.json();
  if (!signData.ok) {
    throw new Error(signData.error || "Gagal otentikasi unggahan media.");
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("api_key", signData.apiKey);
  formData.append("timestamp", String(signData.timestamp));
  formData.append("signature", signData.signature);
  formData.append("folder", signData.folder);
  formData.append("tags", signData.tags);

  const uploadRes = await fetch(
    `https://api.cloudinary.com/v1_1/${signData.cloudName}/${resourceType}/upload`,
    {
      method: "POST",
      body: formData,
    }
  );

  const uploadJson = await uploadRes.json();
  if (!uploadJson.secure_url) {
    throw new Error(
      uploadJson.error?.message || "Gagal mengunggah file ke penyimpanan awan."
    );
  }

  return {
    publicId: uploadJson.public_id,
    url: uploadJson.secure_url,
    type: resourceType,
  };
}

export function MenfessForm() {
  const [content, setContent] = useState("");
  const [category, setCategory] = useState<string>(DEFAULT_CATEGORY);
  const [theme, setTheme] = useState<PostTheme>("klasik");
  const [status, setStatus] = useState<FormStatus>("idle");
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState<SuccessInfo | null>(null);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [restorableDraft, setRestorableDraft] = useState<DraftPayload | null>(null);
  const [shareState, setShareState] = useState<"idle" | "copied" | "shared">("idle");
  const [ticketCopied, setTicketCopied] = useState(false);

  // ---- State Media (Foto & Video) ----
  const [mediaItems, setMediaItems] = useState<LocalMediaItem[]>([]);
  const [coverTitle, setCoverTitle] = useState("");
  const [coverStyle, setCoverStyle] = useState<CoverStyle>("brutalist");
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("4:5");

  // State Modal Crop
  const [cropperOpen, setCropperOpen] = useState(false);
  const [cropTargetIndex, setCropTargetIndex] = useState<number | null>(null);
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);

  const honeypotRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const draftLoadedRef = useRef(false);

  const fileInputId = useId();
  const coverTitleInputId = useId();
  const menfessContentInputId = useId();

  const turnstileEnabled = isTurnstileWidgetEnabled();
  const submitting = status === "submitting";
  const hasMedia = mediaItems.length > 0;
  const trimmedLength = content.trim().length;

  const canSubmit =
    !submitting &&
    (!turnstileEnabled || captchaToken !== null) &&
    (hasMedia
      ? coverTitle.trim().length >= 2 && mediaItems.length <= 6
      : trimmedLength >= MIN_CHARS && trimmedLength <= MAX_CHARS);

  // Hitung mundur rate limit
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  // Baca draf saat mount
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const saved =
          window.localStorage.getItem(DRAFT_KEY) ??
          window.localStorage.getItem(DRAFT_KEY_LEGACY);
        if (saved) {
          const parsed = JSON.parse(saved) as Partial<DraftPayload>;
          if (parsed.content || parsed.coverTitle) {
            setRestorableDraft({
              content: parsed.content || "",
              category:
                typeof parsed.category === "string"
                  ? parsed.category
                  : DEFAULT_CATEGORY,
              theme: isPostTheme(parsed.theme) ? parsed.theme : "klasik",
              coverTitle: parsed.coverTitle || "",
              coverStyle: parsed.coverStyle || "brutalist",
              aspectRatio: parsed.aspectRatio || "4:5",
            });
            draftLoadedRef.current = true;
            return;
          }
        }
      } catch {
        /* abaikan */
      }
      draftLoadedRef.current = true;
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  // Simpan draf otomatis (debounce 400ms)
  useEffect(() => {
    if (!draftLoadedRef.current) return;
    const timer = setTimeout(() => {
      try {
        if (content.trim().length > 0 || coverTitle.trim().length > 0) {
          const payload: DraftPayload = {
            content,
            category,
            theme,
            coverTitle,
            coverStyle,
            aspectRatio,
          };
          window.localStorage.setItem(DRAFT_KEY, JSON.stringify(payload));
        } else {
          window.localStorage.removeItem(DRAFT_KEY);
        }
      } catch {
        /* abaikan */
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [content, category, theme, coverTitle, coverStyle, aspectRatio]);

  const restoreDraft = () => {
    if (restorableDraft) {
      setContent(restorableDraft.content.slice(0, MAX_CHARS));
      setCategory(restorableDraft.category);
      if (restorableDraft.theme && isPostTheme(restorableDraft.theme)) {
        setTheme(restorableDraft.theme);
      }
      if (restorableDraft.coverTitle) setCoverTitle(restorableDraft.coverTitle);
      if (restorableDraft.coverStyle) setCoverStyle(restorableDraft.coverStyle);
      if (restorableDraft.aspectRatio) setAspectRatio(restorableDraft.aspectRatio);
    }
    setRestorableDraft(null);
  };

  const discardDraft = () => {
    try {
      window.localStorage.removeItem(DRAFT_KEY);
      window.localStorage.removeItem(DRAFT_KEY_LEGACY);
    } catch {
      /* abaikan */
    }
    setRestorableDraft(null);
  };

  // Handler memilih file foto/video
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    if (mediaItems.length + files.length > 6) {
      toast.error("Maksimal 6 foto/video dalam satu menfess.");
      return;
    }

    const newItems: LocalMediaItem[] = [];
    for (const f of files) {
      const isVideo = f.type.startsWith("video/");
      const isImage = f.type.startsWith("image/");

      if (!isImage && !isVideo) {
        toast.error(`Format file "${f.name}" tidak didukung.`);
        continue;
      }

      if (isVideo && f.size > 50 * 1024 * 1024) {
        toast.error(`Video "${f.name}" terlalu besar (maksimal 50MB).`);
        continue;
      }

      if (isImage && f.size > 15 * 1024 * 1024) {
        toast.error(`Foto "${f.name}" terlalu besar (maksimal 15MB).`);
        continue;
      }

      newItems.push({
        id: Math.random().toString(36).substring(2, 9),
        file: f,
        previewUrl: URL.createObjectURL(f),
        type: isVideo ? "video" : "image",
        name: f.name,
      });
    }

    setMediaItems((prev) => [...prev, ...newItems]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeMediaItem = (id: string) => {
    setMediaItems((prev) => prev.filter((item) => item.id !== id));
  };

  const openCropModal = (index: number) => {
    const item = mediaItems[index];
    if (!item || item.type !== "image") return;
    setCropTargetIndex(index);
    setCropImageSrc(item.previewUrl);
    setCropperOpen(true);
  };

  const handleCropComplete = (croppedBlob: Blob, previewUrl: string) => {
    if (cropTargetIndex === null) return;
    setMediaItems((prev) => {
      const copy = [...prev];
      copy[cropTargetIndex] = {
        ...copy[cropTargetIndex],
        file: croppedBlob,
        previewUrl,
      };
      return copy;
    });
  };

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (!canSubmit) return;

      setStatus("submitting");
      setErrorMessage(null);
      setUploadProgress(null);

      try {
        let uploadedItems: UploadedMediaItem[] = [];

        // 1. Jika ada media, unggah langsung ke Cloudinary dari browser
        if (hasMedia) {
          for (let i = 0; i < mediaItems.length; i++) {
            const item = mediaItems[i];
            setUploadProgress(
              `Mengunggah ${item.type === "video" ? "video" : "foto"} (${i + 1}/${mediaItems.length})…`
            );
            const uploaded = await uploadToCloudinaryDirect(item.file, item.type);
            uploadedItems.push(uploaded);
          }
        }

        setUploadProgress("Mempersiapkan kartu carousel…");

        // 2. Kirim payload JSON ke server /api/submit
        const res = await fetch("/api/submit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content,
            coverTitle: hasMedia ? coverTitle : undefined,
            coverStyle: hasMedia ? coverStyle : undefined,
            aspectRatio: hasMedia ? aspectRatio : undefined,
            mediaItems: hasMedia ? uploadedItems : undefined,
            category,
            theme,
            turnstileToken: captchaToken ?? "turnstile-disabled",
            website: honeypotRef.current?.value ?? "",
          }),
        });

        const data = (await res.json().catch(() => null)) as SubmitResponse | null;

        if (!data) {
          setErrorMessage(
            "Server tidak memberikan jawaban yang jelas. Tunggu sebentar lalu coba kirim lagi."
          );
          setStatus("error");
          return;
        }

        if (data.ok) {
          try {
            window.localStorage.removeItem(DRAFT_KEY);
            window.localStorage.removeItem(DRAFT_KEY_LEGACY);
          } catch {
            /* abaikan */
          }

          saveSubmission({
            text: hasMedia ? coverTitle : content,
            category,
            ticketCode: data.ticketCode,
            theme,
            permalink: data.permalink,
            dryRun: Boolean(data.dryRun),
            queued: Boolean(data.queued),
            queuePosition: data.queuePosition,
          });

          setSuccess({
            permalink: data.permalink,
            dryRun: data.dryRun,
            ticketCode: data.ticketCode,
            theme,
            queued: data.queued,
            queuePosition: data.queuePosition,
          });
          setStatus("success");
          return;
        }

        setErrorMessage(data.message);
        if (data.code === "RATE_LIMITED" && data.retryAfter) {
          setCountdown(Math.min(data.retryAfter, 600));
        }
        setStatus("error");
      } catch (err) {
        console.error("[MenfessForm] Submit error:", err);
        setErrorMessage(
          err instanceof Error
            ? err.message
            : "Koneksi ke server bermasalah. Cek internet kamu, lalu coba kirim lagi."
        );
        setStatus("error");
      } finally {
        setUploadProgress(null);
      }
    },
    [
      canSubmit,
      hasMedia,
      mediaItems,
      coverTitle,
      coverStyle,
      aspectRatio,
      content,
      category,
      theme,
      captchaToken,
    ]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      if (canSubmit) {
        formRef.current?.requestSubmit();
      }
    }
  };

  const resetForm = () => {
    setContent("");
    setCoverTitle("");
    setMediaItems([]);
    setCategory(DEFAULT_CATEGORY);
    setTheme("klasik");
    setStatus("idle");
    setErrorMessage(null);
    setSuccess(null);
    setCaptchaToken(turnstileEnabled ? null : "turnstile-disabled");
    setShareState("idle");
    setTicketCopied(false);
  };

  const handleCopyLink = async () => {
    const url = success?.permalink ?? IG_PROFILE_URL;
    try {
      await navigator.clipboard.writeText(url);
      setShareState("copied");
      toast.success("Tautan disalin ke papan klip!");
      setTimeout(() => setShareState("idle"), 2500);
    } catch {
      toast.error("Gagal menyalin tautan secara otomatis.");
    }
  };

  const handleCopyTicket = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setTicketCopied(true);
      toast.success(`Nomor tiket ${code} berhasil disalin!`);
      setTimeout(() => setTicketCopied(false), 2500);
    } catch {
      toast.error("Gagal menyalin nomor tiket.");
    }
  };

  const handleShare = async () => {
    const url = success?.permalink ?? IG_PROFILE_URL;
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({
          title: "Fess UNERR",
          text: `Menfessku sudah tayang di ${IG_HANDLE} (Tiket: NO.${success?.ticketCode ?? ""}) ✳️`,
          url,
        });
        setShareState("shared");
      } catch {
        /* abaikan */
      }
    } else {
      await handleCopyLink();
      toast.info("Browser kamu tidak mendukung dialog share bawaan", {
        description: "Tautannya sudah disalin ke clipboard.",
      });
    }
  };

  // ---- PANEL SUKSES ----
  if (status === "success" && success) {
    if (success.queued) {
      return (
        <div className="animate-pop rounded-2xl border-2 border-ink bg-paper-raised p-6 sm:p-10">
          <div className="flex flex-col items-center gap-5 text-center">
            <span className="grid size-16 place-items-center rounded-2xl border-2 border-ink bg-signal">
              <Hourglass className="size-8 text-ink-fixed" aria-hidden />
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border-2 border-ink bg-signal px-4 py-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-ink-fixed shadow-[2px_2px_0_0_#1B1710] dark:border-[#70685b] dark:shadow-[2px_2px_0_0_#000]">
              ⏳ MASUK ANTREAN OTOMATIS
            </span>
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Kuota Hari Ini Penuh · Menfessmu Aman!
            </h2>
            <p className="max-w-md text-[15px] leading-relaxed text-ink-soft">
              Menfess kamu sudah terdaftar dengan tiket resmi. Begitu kuota
              posting Instagram reset, kartu akan otomatis diterbitkan.
            </p>

            {success.ticketCode ? (
              <div className="flex flex-col items-center gap-2 rounded-xl border-2 border-ink bg-paper px-6 py-4 shadow-[3px_3px_0_0_var(--hard-soft)]">
                <span className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-ink-faint">
                  Nomor Tiket Antrean
                </span>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-2xl font-extrabold tracking-widest text-ink">
                    NO. {success.ticketCode}
                  </span>
                  <button
                    type="button"
                    onClick={() => void handleCopyTicket(success.ticketCode!)}
                    title="Salin nomor tiket"
                    className="inline-flex items-center gap-1.5 rounded-lg border-2 border-ink bg-paper-raised px-2.5 py-1 font-mono text-[12px] font-bold uppercase tracking-wide transition-colors hover:bg-signal"
                  >
                    {ticketCopied ? (
                      <>
                        <Check className="size-3.5 text-tomato-deep" aria-hidden />
                        Tersalin
                      </>
                    ) : (
                      <>
                        <Copy className="size-3.5" aria-hidden />
                        Salin
                      </>
                    )}
                  </button>
                </div>
                {success.queuePosition != null && (
                  <p className="font-mono text-sm font-bold text-ink">
                    Posisi antrean:{" "}
                    <span className="text-tomato-deep">
                      ke-{success.queuePosition}
                    </span>
                  </p>
                )}
              </div>
            ) : null}

            <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/antrean"
                className={cn(buttonVariants({ variant: "ink", size: "lg" }))}
              >
                Lihat Papan Antrean
                <ExternalLink className="size-4" aria-hidden />
              </Link>
              <Button variant="outline" size="lg" onClick={resetForm}>
                <RotateCcw className="size-4" aria-hidden />
                Kirim Menfess Lain
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="animate-pop rounded-2xl border-2 border-ink bg-paper-raised p-6 sm:p-10">
        <div className="flex flex-col items-center gap-5 text-center">
          <span className="grid size-16 place-items-center rounded-2xl border-2 border-ink bg-signal">
            <PartyPopper className="size-8 text-ink-fixed" aria-hidden />
          </span>
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Terkirim! Menfess kamu meluncur ke {IG_HANDLE}
          </h2>
          <p className="max-w-md text-[15px] leading-relaxed text-ink-soft">
            Teks dan media kamu sudah diproses rapi dan diposting. Cek feed
            Instagram untuk melihatnya tayang.
          </p>

          {success.ticketCode ? (
            <div className="flex flex-col items-center gap-2 rounded-xl border-2 border-ink bg-paper px-6 py-4 shadow-[3px_3px_0_0_var(--hard-soft)]">
              <span className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-ink-faint">
                Nomor Tiket Menfess
              </span>
              <div className="flex items-center gap-3">
                <span className="font-mono text-2xl font-extrabold tracking-widest text-ink">
                  NO. {success.ticketCode}
                </span>
                <button
                  type="button"
                  onClick={() => void handleCopyTicket(success.ticketCode!)}
                  title="Salin nomor tiket"
                  className="inline-flex items-center gap-1.5 rounded-lg border-2 border-ink bg-paper-raised px-2.5 py-1 font-mono text-[12px] font-bold uppercase tracking-wide transition-colors hover:bg-signal"
                >
                  {ticketCopied ? (
                    <>
                      <Check className="size-3.5 text-tomato-deep" aria-hidden />
                      Tersalin
                    </>
                  ) : (
                    <>
                      <Copy className="size-3.5" aria-hidden />
                      Salin
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : null}

          <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
            {success.permalink ? (
              <a
                href={success.permalink}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(buttonVariants({ variant: "ink", size: "lg" }))}
              >
                Lihat post kamu
                <ExternalLink className="size-4" aria-hidden />
              </a>
            ) : (
              <a
                href={IG_PROFILE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(buttonVariants({ variant: "ink", size: "lg" }))}
              >
                Buka {IG_HANDLE}
                <ExternalLink className="size-4" aria-hidden />
              </a>
            )}
            <Button variant="outline" size="lg" onClick={resetForm}>
              <RotateCcw className="size-4" aria-hidden />
              Tulis lagi
            </Button>
          </div>

          <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => void handleShare()}
              className="inline-flex items-center gap-2 rounded-lg border-2 border-ink bg-paper-raised px-3.5 py-2 text-[13px] font-semibold transition-colors hover:bg-signal-soft"
            >
              {shareState === "shared" ? (
                <>
                  <Check className="size-4 text-tomato-deep" aria-hidden />
                  Tautan terbagikan
                </>
              ) : (
                <>
                  <Share2 className="size-4" aria-hidden />
                  Bagikan kabar ini
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => void handleCopyLink()}
              className="inline-flex items-center gap-2 rounded-lg border-2 border-ink bg-paper-raised px-3.5 py-2 text-[13px] font-semibold transition-colors hover:bg-signal-soft"
            >
              {shareState === "copied" ? (
                <>
                  <Check className="size-4 text-tomato-deep" aria-hidden />
                  Tautan tersalin
                </>
              ) : (
                <>
                  <Link2 className="size-4" aria-hidden />
                  Salin tautan
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ---- FORM UTAMA ----
  return (
    <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,400px)] xl:grid-cols-[minmax(0,1fr)_minmax(0,440px)]">
      <form
        ref={formRef}
        onSubmit={handleSubmit}
        className="flex flex-col gap-5"
        noValidate
      >
        <input
          ref={honeypotRef}
          type="text"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          className="pointer-events-none absolute -left-[9999px] size-0 opacity-0"
        />

        {errorMessage ? (
          <Alert variant="error" title="Menfess gagal terkirim">
            <p>{errorMessage}</p>
            {countdown > 0 ? (
              <p className="mt-1 font-mono text-[13px]">
                Boleh coba lagi dalam{" "}
                <span className="font-bold tabular-nums">{countdown}s</span>.
              </p>
            ) : null}
          </Alert>
        ) : null}

        {/* Banner Draf */}
        {restorableDraft && status === "idle" && trimmedLength === 0 && (
          <div className="flex flex-col gap-3 rounded-xl border-2 border-dashed border-signal-deep bg-signal-soft/50 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-2.5">
              <History className="mt-0.5 size-4 shrink-0 text-signal-deep" aria-hidden />
              <p className="text-[13px] leading-relaxed text-ink-soft">
                Ada draf yang belum terkirim dari sesi sebelumnya. Tersimpan di
                perangkatmu.
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={restoreDraft}
                className="rounded-lg border-2 border-ink bg-paper-raised px-3 py-1.5 font-mono text-[12px] font-bold uppercase tracking-wide transition-colors hover:bg-signal"
              >
                Pulihkan
              </button>
              <button
                type="button"
                onClick={discardDraft}
                className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 font-mono text-[12px] font-bold uppercase tracking-wide text-ink-faint transition-colors hover:text-tomato-deep"
              >
                <Trash2 className="size-3.5" aria-hidden />
                Hapus
              </button>
            </div>
          </div>
        )}

        {/* ================= AREA LAMPIRAN MEDIA (FOTO / VIDEO) ================= */}
        <div className="rounded-2xl border-2 border-ink bg-paper-raised p-5 shadow-[6px_6px_0_0_var(--hard-soft)]">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-dashed border-ink/15 pb-4">
            <div className="flex items-center gap-2">
              <span className="grid size-7 place-items-center rounded-lg border-2 border-ink bg-signal">
                <ImageIcon className="size-3.5 text-ink-fixed" aria-hidden />
              </span>
              <span className="font-serif text-base font-bold text-ink">
                Lampirkan Foto atau Video
              </span>
              <span className="rounded-full border border-ink/20 bg-paper px-2 py-0.5 font-mono text-[11px] font-bold text-ink-faint">
                {mediaItems.length}/6
              </span>
            </div>

            <input
              id={fileInputId}
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              multiple
              accept="image/*,video/*"
              className="hidden"
            />

            {mediaItems.length < 6 && (
              <label
                htmlFor={fileInputId}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border-2 border-ink bg-paper px-3 py-1.5 font-mono text-[12px] font-bold uppercase tracking-wider text-ink shadow-[2px_2px_0_0_#1B1710] transition hover:bg-signal dark:border-[#70685b] dark:shadow-[2px_2px_0_0_#000]"
              >
                <Plus className="size-3.5" />
                Tambah Media
              </label>
            )}
          </div>

          {hasMedia ? (
            <div className="mt-4 flex flex-col gap-4">
              {/* Grid Thumbnail Media */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {mediaItems.map((item, idx) => (
                  <div
                    key={item.id}
                    className="group relative flex aspect-square flex-col justify-between overflow-hidden rounded-xl border-2 border-ink bg-black shadow-[3px_3px_0_0_var(--hard-soft)]"
                  >
                    {item.type === "video" ? (
                      <div className="relative flex size-full items-center justify-center bg-ink">
                        <Film className="size-8 text-white/70" />
                        <span className="absolute bottom-2 left-2 rounded bg-black/80 px-1.5 py-0.5 font-mono text-[9px] font-bold text-white">
                          VIDEO
                        </span>
                      </div>
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.previewUrl}
                        alt={`Media #${idx + 1}`}
                        className="size-full object-cover"
                      />
                    )}

                    {/* Badge nomor slide */}
                    <span className="absolute top-2 left-2 rounded-md border border-ink bg-paper px-1.5 py-0.5 font-mono text-[10px] font-bold text-ink shadow-[1px_1px_0_0_#1B1710]">
                      #{idx + 1}
                    </span>

                    {/* Aksi Crop & Hapus */}
                    <div className="absolute inset-0 flex items-center justify-center gap-2 bg-ink/60 opacity-0 backdrop-blur-[2px] transition-opacity group-hover:opacity-100">
                      {item.type === "image" && (
                        <button
                          type="button"
                          onClick={() => openCropModal(idx)}
                          className="grid size-8 place-items-center rounded-lg border border-ink bg-paper text-ink transition hover:bg-signal"
                          title="Potong & Sesuaikan"
                        >
                          <CropIcon className="size-4" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => removeMediaItem(item.id)}
                        className="grid size-8 place-items-center rounded-lg border border-ink bg-tomato text-paper transition hover:bg-tomato-deep"
                        title="Hapus media"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pilihan Rasio Carousel */}
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-ink/20 bg-paper p-3">
                <span className="font-mono text-xs font-bold uppercase tracking-wider text-ink-soft">
                  Rasio Postingan:
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setAspectRatio("4:5")}
                    className={cn(
                      "rounded-lg border-2 border-ink px-3 py-1 font-mono text-xs font-bold transition",
                      aspectRatio === "4:5"
                        ? "bg-signal text-ink-fixed shadow-[2px_2px_0_0_#1B1710]"
                        : "bg-paper-raised text-ink hover:bg-signal/20"
                    )}
                  >
                    4:5 Portrait
                  </button>
                  <button
                    type="button"
                    onClick={() => setAspectRatio("1:1")}
                    className={cn(
                      "rounded-lg border-2 border-ink px-3 py-1 font-mono text-xs font-bold transition",
                      aspectRatio === "1:1"
                        ? "bg-signal text-ink-fixed shadow-[2px_2px_0_0_#1B1710]"
                        : "bg-paper-raised text-ink hover:bg-signal/20"
                    )}
                  >
                    1:1 Kotak
                  </button>
                </div>
              </div>

              {/* Input Judul Cover */}
              <div className="flex flex-col gap-2">
                <label
                  htmlFor={coverTitleInputId}
                  className="font-mono text-xs font-bold uppercase tracking-wider text-ink"
                >
                  Judul Cover Slide 1 <span className="text-tomato-deep">*wajib</span>
                </label>
                <input
                  id={coverTitleInputId}
                  type="text"
                  value={coverTitle}
                  onChange={(e) => setCoverTitle(e.target.value.slice(0, 120))}
                  placeholder="Misal: REKTOR PANGGIL MAHASISWA JAM 3 PAGI"
                  className="w-full rounded-xl border-2 border-ink bg-paper px-4 py-2.5 font-serif text-lg font-bold text-ink outline-none placeholder:font-sans placeholder:text-sm placeholder:font-normal placeholder:text-ink-faint focus:border-tomato focus:shadow-[3px_3px_0_0_#1B1710]"
                />
              </div>

              {/* Pilihan Gaya Cover */}
              <div className="flex flex-col gap-2">
                <span className="font-mono text-xs font-bold uppercase tracking-wider text-ink">
                  Pilihan Gaya Tampilan Cover:
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setCoverStyle("brutalist")}
                    className={cn(
                      "flex flex-col items-start gap-1 rounded-xl border-2 border-ink p-3 text-left transition",
                      coverStyle === "brutalist"
                        ? "bg-signal/20 shadow-[3px_3px_0_0_#1B1710]"
                        : "bg-paper hover:bg-signal/10"
                    )}
                  >
                    <span className="flex items-center gap-1.5 font-serif text-sm font-bold text-ink">
                      <Layers className="size-4" />
                      Gaya A: Brutalist Frame
                    </span>
                    <span className="text-[11px] text-ink-soft">
                      Frame tebal retro dengan banner kotak judul di bawah.
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCoverStyle("glass")}
                    className={cn(
                      "flex flex-col items-start gap-1 rounded-xl border-2 border-ink p-3 text-left transition",
                      coverStyle === "glass"
                        ? "bg-signal/20 shadow-[3px_3px_0_0_#1B1710]"
                        : "bg-paper hover:bg-signal/10"
                    )}
                  >
                    <span className="flex items-center gap-1.5 font-serif text-sm font-bold text-ink">
                      <Sparkles className="size-4" />
                      Gaya B: Glass Blur
                    </span>
                    <span className="text-[11px] text-ink-soft">
                      Foto penuh (full bleed) dengan efek kaca blur gelap di bawah.
                    </span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <p className="mt-3 text-xs leading-relaxed text-ink-faint">
              Kamu bisa mengunggah hingga 6 foto atau video. Setiap foto bisa
              di-crop &amp; putar agar pas di feed Instagram.
            </p>
          )}
        </div>

        {/* ================= AREA ISI CERITA / MENFESS ================= */}
        <div className="rounded-2xl border-2 border-ink bg-paper-raised shadow-[6px_6px_0_0_var(--hard-soft)]">
          <div className="border-b-2 border-dashed border-ink/15 px-5 py-3">
            <label
              htmlFor={menfessContentInputId}
              className="font-mono text-xs font-bold uppercase tracking-wider text-ink"
            >
              {hasMedia
                ? "Isi Cerita Lengkap (Opsional — akan jadi slide terpisah)"
                : "Tulis Menfess Kamu"}
            </label>
          </div>
          <textarea
            id={menfessContentInputId}
            value={content}
            onChange={(e) => setContent(e.target.value.slice(0, MAX_CHARS))}
            onKeyDown={handleKeyDown}
            placeholder={
              hasMedia
                ? "Tulis cerita tambahan atau keterangan lengkap jika ingin ada slide teks terpisah (opsional)..."
                : "Tulis di sini. Curhat, kabar, pengakuan, atau sekadar bilang semangat — namamu nggak akan ikut ke mana-mana."
            }
            rows={hasMedia ? 5 : 8}
            disabled={submitting}
            className="w-full resize-y border-0 bg-transparent px-5 py-4 text-[17px] leading-relaxed outline-none placeholder:text-ink-faint/80 focus-visible:ring-0 disabled:opacity-60"
          />
          <div className="flex items-center justify-between gap-3 border-t-2 border-dashed border-ink/15 px-4 py-3">
            <p className="font-mono text-[12px] uppercase tracking-wider text-ink-faint">
              Tanpa nama · Tanpa login · Draf auto-tersimpan
            </p>
            <CharCounter value={content} />
          </div>
        </div>

        {/* Pilihan Kategori */}
        <CategoryPicker
          value={category}
          onChange={setCategory}
          disabled={submitting}
        />

        {/* Pilihan Tema Warna Kartu (Hanya jika ada kartu teks) */}
        {(!hasMedia || content.trim().length > 0) && (
          <ThemePicker
            value={theme}
            onChange={setTheme}
            disabled={submitting}
          />
        )}

        <TurnstileWidget onToken={setCaptchaToken} disabled={submitting} />

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Button
            type="submit"
            size="lg"
            disabled={!canSubmit || countdown > 0}
            className="sm:flex-1"
          >
            {submitting ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden />
                {uploadProgress || `Mengirim ke ${IG_HANDLE}…`}
              </>
            ) : (
              <>
                <SendHorizonal className="size-4" aria-hidden />
                {hasMedia ? "Kirim Menfess Bergambar" : "Kirim Menfess"}
              </>
            )}
          </Button>
          <p className="text-[13px] leading-snug text-ink-faint sm:max-w-[230px]">
            Sekali kirim, langsung tayang. Cek kembali sebelum tekan.
          </p>
        </div>
      </form>

      {/* ==== Kolom Pratinjau (Sticky di Desktop) ==== */}
      <aside className="flex flex-col gap-3 lg:sticky lg:top-24">
        <p className="flex items-center gap-2 font-mono text-[12px] uppercase tracking-[0.2em] text-ink-faint">
          <Eye className="size-4" aria-hidden />
          {hasMedia
            ? "Pratinjau Cover Slide 1"
            : "Pratinjau Kartu yang akan diposting"}
        </p>

        {hasMedia ? (
          <CoverPreview
            title={coverTitle}
            imageSrc={mediaItems[0]?.previewUrl || null}
            style={coverStyle}
            aspectRatio={aspectRatio}
            category={category}
          />
        ) : trimmedLength > 0 ? (
          <PostPreview
            text={content}
            category={category}
            theme={theme}
            className="animate-pop rounded-2xl border-2 border-ink shadow-[6px_6px_0_0_var(--hard-soft)]"
          />
        ) : (
          <div
            aria-hidden
            className="grid aspect-square w-full place-items-center rounded-2xl border-2 border-dashed border-ink/25 bg-paper-raised/60 p-8 text-center"
          >
            <p className="text-[15px] leading-relaxed text-ink-faint">
              Kartu pratinjau akan muncul di sini begitu kamu mulai menulis atau
              melampirkan foto.
            </p>
          </div>
        )}
      </aside>

      {/* Modal Pemotong Foto Interaktif */}
      <ImageCropperModal
        isOpen={cropperOpen}
        imageSrc={cropImageSrc}
        aspectRatio={aspectRatio}
        onAspectRatioChange={setAspectRatio}
        onClose={() => {
          setCropperOpen(false);
          setCropTargetIndex(null);
          setCropImageSrc(null);
        }}
        onCropComplete={handleCropComplete}
      />
    </div>
  );
}
