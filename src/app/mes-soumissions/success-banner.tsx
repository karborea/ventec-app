"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  soumissionNumber: string;
  status: "brouillon" | "soumis";
};

export function SuccessBanner({ soumissionNumber, status }: Props) {
  const router = useRouter();
  const [visible, setVisible] = useState(true);

  // Auto-dismiss after 6 seconds
  useEffect(() => {
    const t = setTimeout(() => setVisible(false), 6000);
    return () => clearTimeout(t);
  }, []);

  // Remove the query params from the URL once seen so refresh won't re-trigger
  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.delete("created");
    url.searchParams.delete("status");
    router.replace(url.pathname + (url.search ? url.search : ""), {
      scroll: false,
    });
  }, [router]);

  if (!visible) return null;

  const headline =
    status === "soumis"
      ? "Soumission envoyée à Ventec"
      : "Brouillon enregistré";
  const copy =
    status === "soumis"
      ? `Ventec a reçu votre demande #${soumissionNumber}. Vous recevrez le devis PDF par courriel une fois révisé.`
      : `Brouillon #${soumissionNumber} sauvegardé. Vous pouvez revenir le modifier depuis cette page en tout temps.`;

  return (
    <div
      role="status"
      className="mb-6 rounded-xl border border-[rgba(34,160,107,0.35)] bg-[#eaf7f0] px-5 py-4 flex items-start gap-3"
    >
      <div className="w-8 h-8 rounded-full bg-[#22a06b] text-white flex items-center justify-center font-bold shrink-0">
        ✓
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-bold text-[#22a06b]">{headline}</div>
        <p className="text-sm text-[#1a1f2e] mt-0.5">{copy}</p>
      </div>
      <button
        type="button"
        onClick={() => setVisible(false)}
        className="text-[#5a6278] hover:text-[#1a1f2e] text-xl leading-none px-1"
        aria-label="Fermer"
      >
        ×
      </button>
    </div>
  );
}
