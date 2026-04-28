"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";

const ACCEPTED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/avif",
];
const ACCEPTED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".gif", ".avif"];
const MAX_FILES = 5;
const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

type Props = {
  /** Nom de l'input (FormData key). */
  name: string;
  /** Texte d'instruction affiché. */
  hint?: string;
};

export function FileDropzone({
  name,
  hint = "Glissez vos photos ici ou cliquez pour choisir.",
}: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const id = useId();

  // Synchronise l'état React avec le vrai input file (FormData submission).
  useEffect(() => {
    if (!inputRef.current) return;
    const dt = new DataTransfer();
    files.forEach((f) => dt.items.add(f));
    inputRef.current.files = dt.files;
  }, [files]);

  // Object URLs pour les previews. Révoquer à chaque changement.
  const previews = useMemo(
    () => files.map((f) => ({ url: URL.createObjectURL(f), file: f })),
    [files],
  );
  useEffect(() => {
    return () => {
      previews.forEach((p) => URL.revokeObjectURL(p.url));
    };
  }, [previews]);

  function validateAndAdd(incoming: FileList | File[]) {
    const arr = Array.from(incoming);
    const errors: string[] = [];
    const accepted: File[] = [];
    for (const f of arr) {
      if (!ACCEPTED_TYPES.includes(f.type)) {
        errors.push(`${f.name} : format non supporté`);
        continue;
      }
      if (f.size > MAX_SIZE_BYTES) {
        errors.push(`${f.name} : > 10 MB`);
        continue;
      }
      accepted.push(f);
    }
    setFiles((prev) => {
      const combined = [...prev, ...accepted];
      if (combined.length > MAX_FILES) {
        errors.push(`Maximum ${MAX_FILES} fichiers.`);
        return combined.slice(0, MAX_FILES);
      }
      return combined;
    });
    setError(errors.length > 0 ? errors.join(" · ") : null);
  }

  function removeAt(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setError(null);
  }

  return (
    <div>
      <label
        htmlFor={id}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          if (e.dataTransfer.files.length > 0) {
            validateAndAdd(e.dataTransfer.files);
          }
        }}
        className={`block cursor-pointer rounded-xl border-2 border-dashed p-6 text-center transition-all ${
          isDragging
            ? "border-[#1b9ae0] bg-[#1b9ae0]/[0.06]"
            : "border-[#c9d1dc] bg-[#fafbfc] hover:border-[#1b9ae0] hover:bg-white"
        }`}
      >
        <div className="text-[#5a6278] text-sm">{hint}</div>
        <div className="mt-1 text-xs text-[#5a6278]">
          JPG, PNG, GIF, AVIF · max {MAX_FILES} fichiers · 10 MB chacun
        </div>
        <input
          ref={inputRef}
          id={id}
          name={name}
          type="file"
          accept={ACCEPTED_EXTENSIONS.join(",")}
          multiple
          className="sr-only"
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              validateAndAdd(e.target.files);
            }
          }}
        />
      </label>

      {error && (
        <div className="mt-2 rounded-lg border border-[#f4cccc] bg-[#fde9e9] px-3 py-2 text-[12px] text-[#a83030]">
          {error}
        </div>
      )}

      {previews.length > 0 && (
        <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
          {previews.map((p, i) => (
            <div
              key={p.url}
              className="relative aspect-square rounded-lg overflow-hidden border border-[#e3e6ec] bg-white"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.url}
                alt={p.file.name}
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={() => removeAt(i)}
                className="absolute top-1 right-1 w-6 h-6 rounded-full bg-white/90 hover:bg-white text-[#5a6278] hover:text-[#a83030] text-sm font-bold flex items-center justify-center shadow"
                aria-label={`Retirer ${p.file.name}`}
              >
                ✕
              </button>
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-1.5 py-1 text-[10px] text-white truncate">
                {p.file.name}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
