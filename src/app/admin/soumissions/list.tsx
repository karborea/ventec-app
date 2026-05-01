"use client";

import { useActionState, useEffect, useState } from "react";
import { deleteSoumission, type DeleteSoumissionState } from "../actions";

export type AdminSoumission = {
  id: string;
  soumission_number: number;
  project_name: string;
  type: "nouvelle_commande" | "remplacement";
  status: "brouillon" | "soumis" | "envoye" | "accepte" | "refuse";
  model: "polymat_g3" | "polymat_xl" | null;
  user_id: string;
  user_email: string;
  user_first_name: string | null;
  user_last_name: string | null;
  user_company: string | null;
  created_at: string;
  updated_at: string;
};

const STATUS_LABELS: Record<AdminSoumission["status"], string> = {
  brouillon: "Brouillon",
  soumis: "Soumis",
  envoye: "Envoyé",
  accepte: "Accepté",
  refuse: "Refusé",
};

const STATUS_CLASSES: Record<AdminSoumission["status"], string> = {
  brouillon: "bg-[#eef1f5] text-[#5a6278]",
  soumis: "bg-[#e9f4fb] text-[#0f7bb5]",
  envoye: "bg-[#efe9f8] text-[#5b3a9e]",
  accepte: "bg-[#eaf7f0] text-[#22a06b]",
  refuse: "bg-[#fde9e9] text-[#d94c4c]",
};

function clientLabel(s: AdminSoumission): string {
  if (s.user_company) return s.user_company;
  const name = `${s.user_first_name ?? ""} ${s.user_last_name ?? ""}`.trim();
  return name || s.user_email;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-CA", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function AdminSoumissionsList({
  items,
}: {
  items: AdminSoumission[];
}) {
  const [confirming, setConfirming] = useState<AdminSoumission | null>(null);

  if (items.length === 0) {
    return (
      <div className="rounded-xl border-[1.5px] border-dashed border-[#e3e6ec] bg-white py-16 px-6 text-center">
        <h3 className="text-lg font-bold mb-1">Aucune soumission</h3>
        <p className="text-sm text-[#5a6278]">
          Les soumissions des clients apparaîtront ici.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-2.5">
        {items.map((s) => (
          <div
            key={s.id}
            className="bg-white border-[1.5px] border-[#e3e6ec] rounded-xl p-4 grid grid-cols-[auto_1fr_auto_auto_auto] gap-4 items-center"
          >
            <div
              className={`w-11 h-11 rounded-xl flex items-center justify-center text-lg shrink-0 ${
                s.type === "nouvelle_commande"
                  ? "bg-[#F37021]/10 text-[#F37021]"
                  : "bg-[#1b9ae0]/10 text-[#1b9ae0]"
              }`}
              aria-label={
                s.type === "nouvelle_commande"
                  ? "Nouvelle commande"
                  : "Remplacement"
              }
            >
              {s.type === "nouvelle_commande" ? "＋" : "↻"}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                <span className="font-bold text-[#1a1f2e] text-[15px] truncate">
                  {s.project_name}
                </span>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-[0.3px] ${STATUS_CLASSES[s.status]}`}
                >
                  {STATUS_LABELS[s.status]}
                </span>
              </div>
              <div className="text-xs text-[#5a6278] truncate">
                {clientLabel(s)} · {s.user_email}
              </div>
            </div>

            <div className="text-right text-xs text-[#5a6278] whitespace-nowrap">
              <div className="font-semibold text-sm text-[#1a1f2e]">
                #{s.soumission_number}
              </div>
              <div>{formatDate(s.created_at)}</div>
            </div>

            <a
              href={`/soumissions/${s.id}`}
              className="px-3 py-2 rounded-lg border-[1.5px] border-[#e3e6ec] hover:border-[#5a6278] text-xs font-bold"
            >
              Voir
            </a>

            <button
              type="button"
              onClick={() => setConfirming(s)}
              aria-label="Supprimer"
              className="w-9 h-9 flex items-center justify-center rounded-lg text-[#5a6278] hover:bg-[#fef5f5] hover:text-[#d94c4c]"
            >
              <TrashIcon />
            </button>
          </div>
        ))}
      </div>

      {confirming && (
        <ConfirmDeleteDialog
          key={confirming.id}
          soumission={confirming}
          onClose={() => setConfirming(null)}
        />
      )}
    </>
  );
}

function ConfirmDeleteDialog({
  soumission,
  onClose,
}: {
  soumission: AdminSoumission;
  onClose: () => void;
}) {
  const [state, formAction, pending] = useActionState<
    DeleteSoumissionState | undefined,
    FormData
  >(deleteSoumission, undefined);

  useEffect(() => {
    if (state?.ok) onClose();
  }, [state, onClose]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-xl w-full max-w-md"
      >
        <form action={formAction} className="p-6">
          <input type="hidden" name="id" value={soumission.id} />
          <h3 className="text-lg font-extrabold tracking-tight mb-2">
            Supprimer cette soumission ?
          </h3>
          <p className="text-sm text-[#5a6278] mb-1">
            <span className="font-semibold text-[#1a1f2e]">
              {soumission.project_name}
            </span>{" "}
            (#{soumission.soumission_number})
          </p>
          <p className="text-xs text-[#5a6278] mb-4">
            Client : {clientLabel(soumission)}
          </p>
          <p className="text-sm text-[#d94c4c]">
            Cette action supprime également toutes les ouvertures et fichiers
            associés. Elle est irréversible.
          </p>

          {state?.error && (
            <div className="mt-4 rounded-lg border border-[#fde9e9] bg-[#fef5f5] px-3 py-2 text-xs text-[#d94c4c]">
              {state.error}
            </div>
          )}

          <div className="flex justify-end gap-2 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm font-semibold text-[#5a6278] hover:text-[#1a1f2e]"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={pending}
              className="px-4 py-2 rounded-lg bg-[#d94c4c] hover:bg-[#bd3a3a] disabled:opacity-60 text-white text-sm font-bold"
            >
              {pending ? "Suppression…" : "Supprimer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function TrashIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 6h18" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </svg>
  );
}
