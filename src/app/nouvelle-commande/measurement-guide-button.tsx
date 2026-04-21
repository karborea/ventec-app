"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

/**
 * "Guide de mesures" trigger — opens a modal with the Ventec
 * measurement reference diagram. Used to help the client understand
 * where to measure longueur / hauteur / ensemble de bout / etc.
 */
export function MeasurementGuideButton({
  label = "Guide de mesures",
  compact = false,
}: {
  label?: string;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);

  // ESC closes the modal
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // Lock body scroll while open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Ouvrir : ${label}`}
        className={
          compact
            ? "inline-flex items-center justify-center w-5 h-5 rounded-full border border-[#c9d1dc] text-[#5a6278] hover:border-[#1b9ae0] hover:text-[#1b9ae0] text-[11px] font-bold leading-none"
            : "inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-[#e3e6ec] bg-white hover:border-[#1b9ae0] hover:text-[#1b9ae0] text-[12px] font-semibold text-[#5a6278]"
        }
      >
        <span aria-hidden>?</span>
        {!compact && <span>{label}</span>}
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Guide de mesures Ventec"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0f1828]/60 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-3 border-b border-[#e3e6ec] flex items-center justify-between gap-3">
              <div>
                <h2 className="font-bold text-[15px]">
                  Guide officiel de mesures Ventec
                </h2>
                <p className="text-xs text-[#5a6278]">
                  Où mesurer sur votre ouverture existante.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="w-9 h-9 rounded-lg border border-[#e3e6ec] hover:border-[#5a6278] text-[#5a6278] hover:text-[#1a1f2e] text-xl leading-none flex items-center justify-center"
                aria-label="Fermer"
              >
                ×
              </button>
            </div>
            <div className="p-5 overflow-auto bg-[#fafbfc]">
              <Image
                src="/img/guide-mesures.png"
                alt="Diagramme des mesures d'une ouverture Ventec"
                width={1200}
                height={800}
                className="w-full h-auto rounded-lg border border-[#e3e6ec] bg-white"
                priority
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
