"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { RotateCw, ZoomIn, ZoomOut, Check, X, Crop as CropIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type AspectRatio = "4:5" | "1:1";

interface ImageCropperModalProps {
  isOpen: boolean;
  imageSrc: string | null;
  aspectRatio: AspectRatio;
  onAspectRatioChange: (ratio: AspectRatio) => void;
  onClose: () => void;
  onCropComplete: (croppedBlob: Blob, previewUrl: string) => void;
}

/**
 * Modal Interaktif Crop & Rotate bergaya Neo-Brutalist Zine.
 * Menggunakan HTML5 Canvas murni untuk performa 60fps tanpa dependency berat.
 * Ekspor otomatis ke resolusi tajam Instagram: 1080x1350 (4:5) atau 1080x1080 (1:1).
 */
export function ImageCropperModal({
  isOpen,
  imageSrc,
  aspectRatio,
  onAspectRatioChange,
  onClose,
  onCropComplete,
}: ImageCropperModalProps) {
  const [rotation, setRotation] = useState(0); // 0, 90, 180, 270
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  // Reset transform saat ganti gambar
  useEffect(() => {
    if (imageSrc) {
      setRotation(0);
      setZoom(1);
      setOffset({ x: 0, y: 0 });

      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        imageRef.current = img;
        drawCanvas();
      };
      img.src = imageSrc;
    }
  }, [imageSrc]);

  // Gambar ke canvas pratinjau interaktif
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Bersihkan canvas
    ctx.clearRect(0, 0, width, height);

    ctx.save();
    // Geser ke titik tengah canvas
    ctx.translate(width / 2 + offset.x, height / 2 + offset.y);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(zoom, zoom);

    // Hitung dimensi dasar gambar agar fit di canvas
    const isRotated = rotation === 90 || rotation === 270;
    const effectiveImgWidth = isRotated ? img.naturalHeight : img.naturalWidth;
    const effectiveImgHeight = isRotated ? img.naturalWidth : img.naturalHeight;

    const scaleToCover = Math.max(
      width / effectiveImgWidth,
      height / effectiveImgHeight
    );

    const drawW = img.naturalWidth * scaleToCover;
    const drawH = img.naturalHeight * scaleToCover;

    ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
    ctx.restore();
  }, [rotation, zoom, offset]);

  useEffect(() => {
    drawCanvas();
  }, [drawCanvas, aspectRatio]);

  if (!isOpen || !imageSrc) return null;

  // Handler Drag / Pan
  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // Abaikan jika pointer capture gagal dilepas
    }
  };

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  // Ekspor hasil akhir ke resolusi Instagram murni
  const handleApplyCrop = () => {
    const img = imageRef.current;
    if (!img) return;

    const outW = 1080;
    const outH = aspectRatio === "4:5" ? 1350 : 1080;

    const exportCanvas = document.createElement("canvas");
    exportCanvas.width = outW;
    exportCanvas.height = outH;

    const ctx = exportCanvas.getContext("2d");
    if (!ctx) return;

    // Skala kanvas preview (misal 320x400) ke resolusi ekspor (1080x1350)
    const previewW = canvasRef.current?.width || 320;
    const scaleRatio = outW / previewW;

    ctx.save();
    ctx.translate(outW / 2 + offset.x * scaleRatio, outH / 2 + offset.y * scaleRatio);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(zoom * scaleRatio, zoom * scaleRatio);

    const isRotated = rotation === 90 || rotation === 270;
    const effectiveImgWidth = isRotated ? img.naturalHeight : img.naturalWidth;
    const effectiveImgHeight = isRotated ? img.naturalWidth : img.naturalHeight;

    const scaleToCover = Math.max(
      previewW / effectiveImgWidth,
      (canvasRef.current?.height || 400) / effectiveImgHeight
    );

    const drawW = img.naturalWidth * scaleToCover;
    const drawH = img.naturalHeight * scaleToCover;

    ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
    ctx.restore();

    exportCanvas.toBlob(
      (blob) => {
        if (!blob) return;
        const previewUrl = URL.createObjectURL(blob);
        onCropComplete(blob, previewUrl);
        onClose();
      },
      "image/jpeg",
      0.92
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/70 p-4 backdrop-blur-sm">
      <div className="flex w-full max-w-lg flex-col gap-4 rounded-2xl border-2 border-ink bg-paper p-5 shadow-[8px_8px_0_0_#1B1710] dark:border-[#70685b] dark:shadow-[8px_8px_0_0_#000]">
        {/* Header Modal */}
        <div className="flex items-center justify-between border-b-2 border-dashed border-ink/20 pb-3">
          <div className="flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-lg border-2 border-ink bg-signal">
              <CropIcon className="size-4 text-ink-fixed" aria-hidden />
            </span>
            <h3 className="font-serif text-lg font-bold text-ink">
              Sesuaikan &amp; Potong Foto
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-ink-soft transition hover:bg-tomato/10 hover:text-tomato"
            aria-label="Tutup modal"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Pilihan Rasio Carousel */}
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono text-xs font-bold uppercase tracking-wider text-ink-soft">
            Rasio Instagram:
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onAspectRatioChange("4:5")}
              className={cn(
                "rounded-md border-2 border-ink px-2.5 py-1 font-mono text-xs font-bold transition",
                aspectRatio === "4:5"
                  ? "bg-signal text-ink-fixed shadow-[2px_2px_0_0_#1B1710]"
                  : "bg-paper-raised text-ink hover:bg-signal/20"
              )}
            >
              4:5 Portrait
            </button>
            <button
              type="button"
              onClick={() => onAspectRatioChange("1:1")}
              className={cn(
                "rounded-md border-2 border-ink px-2.5 py-1 font-mono text-xs font-bold transition",
                aspectRatio === "1:1"
                  ? "bg-signal text-ink-fixed shadow-[2px_2px_0_0_#1B1710]"
                  : "bg-paper-raised text-ink hover:bg-signal/20"
              )}
            >
              1:1 Kotak
            </button>
          </div>
        </div>

        {/* Area Kotak Pemotong (Crop Container) */}
        <div className="relative flex items-center justify-center overflow-hidden rounded-xl border-2 border-ink bg-dotgrid py-2">
          <div
            className={cn(
              "relative cursor-grab overflow-hidden rounded-lg border-2 border-dashed border-ink shadow-[4px_4px_0_0_var(--hard-soft)] active:cursor-grabbing",
              aspectRatio === "4:5" ? "h-[350px] w-[280px]" : "h-[290px] w-[290px]"
            )}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
          >
            <canvas
              ref={canvasRef}
              width={aspectRatio === "4:5" ? 280 : 290}
              height={aspectRatio === "4:5" ? 350 : 290}
              className="block size-full"
            />
            {/* Grid Panduan Rule of Thirds */}
            <div className="pointer-events-none absolute inset-0 grid grid-cols-3 grid-rows-3 opacity-25">
              <div className="border-r border-b border-white" />
              <div className="border-r border-b border-white" />
              <div className="border-b border-white" />
              <div className="border-r border-b border-white" />
              <div className="border-r border-b border-white" />
              <div className="border-b border-white" />
              <div className="border-r border-white" />
              <div className="border-r border-white" />
              <div />
            </div>
          </div>
        </div>

        {/* Tombol Kontrol: Zoom Slider & Rotasi */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t-2 border-dashed border-ink/15 pt-3">
          <div className="flex items-center gap-2">
            <ZoomOut className="size-4 text-ink-faint" />
            <input
              type="range"
              min={0.8}
              max={3}
              step={0.05}
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              className="h-2 w-28 cursor-pointer accent-tomato"
              aria-label="Tingkat zoom gambar"
            />
            <ZoomIn className="size-4 text-ink-faint" />
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleRotate}
            className="gap-1.5"
          >
            <RotateCw className="size-3.5" />
            Putar 90°
          </Button>
        </div>

        {/* Footer Tombol Aksi */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Batal
          </Button>
          <Button
            type="button"
            variant="ink"
            onClick={handleApplyCrop}
            className="gap-1.5"
          >
            <Check className="size-4" />
            Terapkan Potongan
          </Button>
        </div>
      </div>
    </div>
  );
}
