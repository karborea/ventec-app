"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export type AdminClientLite = {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  company: string | null;
};

function clientLabel(c: AdminClientLite): string {
  const name = `${c.first_name ?? ""} ${c.last_name ?? ""}`.trim();
  if (c.company && name) return `${c.company} — ${name}`;
  if (c.company) return c.company;
  return name || c.email;
}

export function ClientPicker({ clients }: { clients: AdminClientLite[] }) {
  const router = useRouter();
  const [clientId, setClientId] = useState("");
  const [type, setType] = useState<"nouvelle_commande" | "remplacement">(
    "nouvelle_commande",
  );

  if (clients.length === 0) {
    return (
      <div className="rounded-xl border-[1.5px] border-dashed border-[#e3e6ec] bg-white py-16 px-6 text-center">
        <h3 className="text-lg font-bold mb-1">Aucun client</h3>
        <p className="text-sm text-[#5a6278]">
          Ajoutez d&apos;abord un client depuis l&apos;onglet Utilisateurs.
        </p>
      </div>
    );
  }

  const onContinue = () => {
    if (!clientId) return;
    const path =
      type === "nouvelle_commande"
        ? "/admin/soumissions/nouvelle-commande"
        : "/admin/soumissions/remplacement";
    router.push(`${path}?client=${clientId}`);
  };

  return (
    <div className="bg-white border-[1.5px] border-[#e3e6ec] rounded-2xl p-6 space-y-5">
      <div>
        <label className="block text-xs font-semibold text-[#5a6278] mb-1">
          Client
        </label>
        <select
          value={clientId}
          onChange={(e) => setClientId(e.target.value)}
          className="w-full border-[1.5px] border-[#e3e6ec] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#F37021] bg-white"
        >
          <option value="">— Sélectionnez un client —</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {clientLabel(c)} ({c.email})
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-semibold text-[#5a6278] mb-2">
          Type de soumission
        </label>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setType("nouvelle_commande")}
            className={`text-left border-[1.5px] rounded-xl p-4 transition-all ${
              type === "nouvelle_commande"
                ? "border-[#F37021] bg-[#F37021]/5"
                : "border-[#e3e6ec] hover:border-[#c9d1dc]"
            }`}
          >
            <div className="text-2xl mb-1">＋</div>
            <div className="font-bold text-sm">Nouvelle commande</div>
            <div className="text-xs text-[#5a6278] mt-0.5">
              Polymat G3 neuf
            </div>
          </button>
          <button
            type="button"
            onClick={() => setType("remplacement")}
            className={`text-left border-[1.5px] rounded-xl p-4 transition-all ${
              type === "remplacement"
                ? "border-[#F37021] bg-[#F37021]/5"
                : "border-[#e3e6ec] hover:border-[#c9d1dc]"
            }`}
          >
            <div className="text-2xl mb-1">↻</div>
            <div className="font-bold text-sm">Remplacement</div>
            <div className="text-xs text-[#5a6278] mt-0.5">
              Polymat existant
            </div>
          </button>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={onContinue}
          disabled={!clientId}
          className="px-4 py-2 rounded-lg bg-[#F37021] hover:bg-[#d85f16] disabled:opacity-50 text-white text-sm font-bold"
        >
          Continuer →
        </button>
      </div>
    </div>
  );
}
