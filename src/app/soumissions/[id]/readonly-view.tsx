import { longueurTotale } from "@/lib/soumissions/rules";
import type { OuvertureRow } from "./page";

type SoumissionRow = {
  id: string;
  soumission_number: number;
  project_name: string;
  type: "nouvelle_commande" | "remplacement";
  status: "brouillon" | "soumis" | "envoye" | "accepte" | "refuse";
  model: "polymat_g3" | "polymat_xl" | null;
  note_client: string | null;
  created_at: string;
  updated_at: string;
  submitted_at: string | null;
};

const STATUS_LABELS: Record<SoumissionRow["status"], string> = {
  brouillon: "Brouillon",
  soumis: "Soumis",
  envoye: "Envoyé",
  accepte: "Accepté",
  refuse: "Refusé",
};

const STATUS_CLASSES: Record<SoumissionRow["status"], string> = {
  brouillon: "bg-[#eef1f5] text-[#5a6278]",
  soumis: "bg-[#e9f4fb] text-[#0f7bb5]",
  envoye: "bg-[#efe9f8] text-[#5b3a9e]",
  accepte: "bg-[#eaf7f0] text-[#22a06b]",
  refuse: "bg-[#fde9e9] text-[#d94c4c]",
};

const MATERIAU_LABELS: Record<string, string> = {
  bois: "Bois",
  acier: "Acier",
  beton: "Béton",
};

const RIDEAU_LABELS: Record<string, string> = {
  simple: "Simple",
  double: "Double",
};

const GRANDEUR_LABELS: Record<string, string> = {
  standard: "Standard",
  hors_standard: "Hors-standard",
};

const MODEL_LABELS: Record<string, string> = {
  polymat_g3: "Polymat G3",
  polymat_xl: "Polymat XL",
};

const TYPE_LABELS: Record<string, string> = {
  nouvelle_commande: "Nouvelle commande",
  remplacement: "Remplacement",
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("fr-CA", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function SoumissionReadonly({
  soumission,
  ouvertures,
}: {
  soumission: SoumissionRow;
  ouvertures: OuvertureRow[];
}) {
  return (
    <div className="space-y-5">
      {/* Header card */}
      <div className="bg-white border border-[#e3e6ec] rounded-xl p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap mb-5">
          <div>
            <h2 className="text-lg font-bold">Récapitulatif</h2>
            <p className="text-sm text-[#5a6278]">
              Données soumises, non modifiables.
            </p>
          </div>
          <span
            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-[0.3px] ${STATUS_CLASSES[soumission.status]}`}
          >
            {STATUS_LABELS[soumission.status]}
          </span>
        </div>

        <dl className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[14px]">
          <Field label="Nom du projet" value={soumission.project_name} />
          <Field label="Numéro" value={`#${soumission.soumission_number}`} />
          <Field
            label="Type"
            value={TYPE_LABELS[soumission.type] ?? soumission.type}
          />
          {soumission.model && (
            <Field label="Modèle" value={MODEL_LABELS[soumission.model]} />
          )}
          <Field label="Créé le" value={formatDate(soumission.created_at)} />
          {soumission.submitted_at && (
            <Field
              label="Soumis le"
              value={formatDate(soumission.submitted_at)}
            />
          )}
        </dl>

        {soumission.note_client && (
          <div className="mt-5 rounded-lg bg-[#f0f7fb] border border-[#d5e7f2] px-4 py-3 text-[13px]">
            <div className="text-[#5a6278] text-xs font-bold uppercase tracking-[0.5px] mb-1">
              Message du client
            </div>
            <p className="text-[#1a1f2e] italic">
              « {soumission.note_client} »
            </p>
          </div>
        )}
      </div>

      {/* Ouvertures */}
      {ouvertures.length === 0 ? (
        <div className="bg-white border border-[#e3e6ec] rounded-xl p-6 text-sm text-[#5a6278]">
          Aucune ouverture saisie pour cette soumission.
        </div>
      ) : (
        ouvertures.map((op) => (
          <div
            key={op.id}
            className="bg-white border border-[#e3e6ec] rounded-xl overflow-hidden"
          >
            <div className="px-6 py-3 bg-[#fafbfc] border-b border-[#e3e6ec] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="bg-[#1b9ae0] text-white text-[11px] font-bold px-2.5 py-0.5 rounded uppercase tracking-[0.5px]">
                  Ouverture {op.order_index}
                </span>
                {ouvertures.length > 1 && (
                  <span className="text-sm text-[#5a6278]">
                    de {ouvertures.length}
                  </span>
                )}
              </div>
            </div>

            <dl className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4 text-[14px]">
              <Field
                label="Longueur de l'ouverture"
                value={
                  op.longueur_po !== null ? `${op.longueur_po} po` : "—"
                }
              />
              <Field
                label="Longueur totale (+ kit 48 po)"
                value={
                  op.longueur_po !== null
                    ? `${longueurTotale(op.longueur_po)} po`
                    : "—"
                }
              />
              <Field
                label="Matériau du haut"
                value={
                  op.materiau_haut ? MATERIAU_LABELS[op.materiau_haut] : "—"
                }
              />
              <Field
                label="Matériau du bas"
                value={
                  op.materiau_bas ? MATERIAU_LABELS[op.materiau_bas] : "—"
                }
              />
              <Field
                label="Type de rideau"
                value={
                  op.rideau_type ? RIDEAU_LABELS[op.rideau_type] : "—"
                }
              />
              {op.rideau_type === "double" && (
                <Field
                  label="Grandeur du rideau"
                  value={
                    op.rideau_grandeur
                      ? GRANDEUR_LABELS[op.rideau_grandeur]
                      : "—"
                  }
                />
              )}
              {op.rideau_type === "double" &&
                op.rideau_grandeur === "standard" && (
                  <Field
                    label="Longueur de l'ouverture totale"
                    value={
                      op.longueur_totale_po !== null
                        ? `${op.longueur_totale_po} po`
                        : "—"
                    }
                  />
                )}
              {op.rideau_type === "simple" ? (
                <Field
                  label="Hauteur du polymat"
                  value={
                    op.polymat_unique_hauteur_po !== null
                      ? `${op.polymat_unique_hauteur_po} po`
                      : "—"
                  }
                />
              ) : op.rideau_type === "double" ? (
                <>
                  <Field
                    label="Hauteur polymat du haut"
                    value={
                      op.polymat_haut_hauteur_po !== null
                        ? `${op.polymat_haut_hauteur_po} po`
                        : "—"
                    }
                  />
                  <Field
                    label="Hauteur polymat du bas"
                    value={
                      op.polymat_bas_hauteur_po !== null
                        ? `${op.polymat_bas_hauteur_po} po`
                        : "—"
                    }
                  />
                </>
              ) : null}
              <Field
                label="Nombre de souffleurs"
                value={
                  op.souffleurs_count !== null
                    ? String(op.souffleurs_count)
                    : "—"
                }
              />
              <Field
                label="Souffleries aux deux extrémités"
                value={op.souffleurs_aux_deux_extremites ? "Oui" : "Non"}
              />
            </dl>
          </div>
        ))
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-dashed border-[#e3e6ec] pb-2 flex justify-between gap-3 last:border-b-0">
      <dt className="text-[#5a6278]">{label}</dt>
      <dd className="font-semibold text-right">{value}</dd>
    </div>
  );
}
