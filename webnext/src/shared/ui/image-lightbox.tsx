"use client";

import Image from "next/image";
import { useEffect } from "react";
import { X } from "lucide-react";

interface ImageLightboxProps {
  src: string;
  alt?: string;
  open: boolean;
  onClose: () => void;
}

/**
 * Full-screen image viewer (Instagram / WhatsApp style).
 * Tap the backdrop, press Escape, or hit the close button to dismiss.
 */
export function ImageLightbox({ src, alt, open, onClose }: ImageLightboxProps) {
  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);

    // Lock background scroll while open
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm"
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full bg-white/15 text-white transition hover:bg-white/25"
      >
        <X className="h-5 w-5" />
      </button>

      <Image
        src={src}
        alt={alt ?? ""}
        onClick={(e) => e.stopPropagation()}
        className="h-[min(85vw,85vh)] w-[min(85vw,85vh)] rounded-full object-cover shadow-2xl ring-4 ring-white/20"
        onError={() => {
          // fall back to the default image by keeping the original src path
        }}
        width={1200}
        height={1200}
        unoptimized
      />
    </div>
  );
}
