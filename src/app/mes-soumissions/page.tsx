import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { AppHeader } from "@/components/app-header";
import { SuccessBanner } from "./success-banner";

export const metadata = {
  title: "Mes soumissions · Ventec",
};

type SoumissionStatus =
  | "brouillon"
  | "soumis"
  | "envoye"
  | "accepte"
  | "refuse";

type SoumissionType = "nouvelle_commande" | "remplacement";
type SoumissionModel = "polymat_g3" | "polymat_xl";

type Soumission = {
  id: string;
  soumission_number: number;
  project_name: string;
  type: SoumissionType;
  status: SoumissionStatus;
  model: SoumissionModel | null;
  created_at: string;
  updated_at: string;
};

const STATUS_LABELS: Record<SoumissionStatus, string> = {
  brouillon: "Brouillon",
  soumis: "Soumis",
  envoye: "Envoyé",
  accepte: "Accepté",
  refuse: "Refusé",
};

const STATUS_CLASSES: Record<SoumissionStatus, string> = {
  brouillon: "bg-[#eef1f5] text-[#5a6278]",
  soumis: "bg-[#e9f4fb] text-[#0f7bb5]",
  envoye: "bg-[#efe9f8] text-[#5b3a9e]",
  accepte: "bg-[#eaf7f0] text-[#22a06b]",
  refuse: "bg-[#fde9e9] text-[#d94c4c]",
};

const STATUS_DOT: Record<SoumissionStatus, string> = {
  brouillon: "bg-[#5a6278]",
  soumis: "bg-[#1b9ae0]",
  envoye: "bg-[#7a52c9]",
  accepte: "bg-[#22a06b]",
  refuse: "bg-[#d94c4c]",
};

function formatRelativeDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffHours < 1) return "À l'instant";
  if (diffHours < 24) return `Il y a ${diffHours} h`;
  if (diffDays === 1) return "Hier";
  if (diffDays < 7) return `Il y a ${diffDays} jours`;
  return d.toLocaleDateString("fr-CA", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatProjectMeta(s: Soumission): string {
  const typeLabel =
    s.type === "nouvelle_commande" ? "Nouvelle commande" : "Remplacement";
  const modelLabel =
    s.model === "polymat_g3"
      ? "Polymat G3"
      : s.model === "polymat_xl"
        ? "Polymat XL"
        : null;
  return [typeLabel, modelLabel].filter(Boolean).join(" · ");
}

export default async function MesSoumissionsPage({
  searchParams,
}: {
  searchParams: Promise<{ created?: string; status?: string }>;
}) {
  const supabase = await createClient();
  const params = await searchParams;

  const { data: soumissions } = await supabase
    .from("soumissions")
    .select(
      "id, soumission_number, project_name, type, status, model, created_at, updated_at",
    )
    .order("created_at", { ascending: false })
    .returns<Soumission[]>();

  const items = soumissions ?? [];

  const createdNumber = params.created;
  const createdStatus: "brouillon" | "soumis" | null =
    params.status === "soumis"
      ? "soumis"
      : params.status === "brouillon"
        ? "brouillon"
        : null;

  return (
    <>
      <AppHeader />

      <main className="max-w-5xl w-full mx-auto px-6 pb-20 pt-8">
        {createdNumber && createdStatus && (
          <SuccessBanner
            soumissionNumber={createdNumber}
            status={createdStatus}
          />
        )}

        <div className="mb-8">
          <h1 className="text-3xl font-extrabold tracking-tight">
            Mes soumissions
          </h1>
          <p className="text-[#5a6278] mt-1">
            Gérez vos soumissions et suivez le statut de chacune.
          </p>
        </div>

        {/* Quick-start cards */}
        <section aria-labelledby="new-soumission-title" className="mb-10">
          <h2
            id="new-soumission-title"
            className="text-xs font-bold text-[#5a6278] uppercase tracking-wider mb-3"
          >
            Créer une nouvelle soumission
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link
              href="/nouvelle-commande"
              className="group bg-gradient-to-br from-white to-[#f8fafc] border-[1.5px] border-[#e3e6ec] rounded-xl p-6 flex gap-5 items-center hover:border-[#F37021] hover:-translate-y-px hover:shadow-[0_4px_16px_rgba(243,112,33,0.08)] transition-all"
            >
              <div className="w-14 h-14 rounded-xl bg-[#F37021]/10 text-[#F37021] flex items-center justify-center text-2xl shrink-0 font-bold">
                ＋
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-[17px]">
                  Nouvelle commande · Polymat G3
                </div>
                <p className="text-xs text-[#5a6278] mt-1 leading-snug">
                  Configurez un nouveau Polymat pour votre bâtiment.
                </p>
              </div>
              <span className="text-[#F37021] text-xl font-bold">›</span>
            </Link>
            <Link
              href="/remplacement"
              className="group bg-gradient-to-br from-white to-[#f8fafc] border-[1.5px] border-[#e3e6ec] rounded-xl p-6 flex gap-5 items-center hover:border-[#F37021] hover:-translate-y-px hover:shadow-[0_4px_16px_rgba(243,112,33,0.08)] transition-all"
            >
              <div className="w-14 h-14 rounded-xl bg-[#F37021]/10 text-[#F37021] flex items-center justify-center text-2xl shrink-0 font-bold">
                ↻
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-[17px]">
                  Remplacement · Polymat existant
                </div>
                <p className="text-xs text-[#5a6278] mt-1 leading-snug">
                  Remplacez les ballons d&apos;une installation existante.
                </p>
              </div>
              <span className="text-[#F37021] text-xl font-bold">›</span>
            </Link>
          </div>
        </section>

        {/* Soumissions list */}
        <section aria-labelledby="soumissions-list-title">
          <h2
            id="soumissions-list-title"
            className="text-xs font-bold text-[#5a6278] uppercase tracking-wider mb-3"
          >
            Historique ({items.length})
          </h2>

          {items.length === 0 ? (
            <div className="rounded-xl border-[1.5px] border-dashed border-[#e3e6ec] bg-white py-16 px-6 text-center">
              <div className="text-4xl mb-3">📋</div>
              <h3 className="text-lg font-bold mb-1">
                Aucune soumission pour le moment
              </h3>
              <p className="text-sm text-[#5a6278] mb-4 max-w-sm mx-auto">
                Créez votre première soumission en utilisant un des boutons
                ci-dessus.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {items.map((s) => (
                <div
                  key={s.id}
                  className={`bg-white border-[1.5px] rounded-xl p-5 grid grid-cols-[auto_1fr_auto_auto] gap-5 items-center hover:border-[#c9d1dc] hover:shadow-[0_2px_12px_rgba(0,0,0,0.04)] transition-all ${
                    s.status === "brouillon"
                      ? "border-dashed border-[#e3e6ec] bg-[#fafbfc]"
                      : "border-[#e3e6ec]"
                  }`}
                >
                  {/* Type icon */}
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl shrink-0 ${
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

                  {/* Info */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2.5 mb-1 flex-wrap">
                      <span className="font-bold text-[#1a1f2e] text-[15px] truncate">
                        {s.project_name}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-[0.3px] ${STATUS_CLASSES[s.status]}`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[s.status]}`}
                        />
                        {STATUS_LABELS[s.status]}
                      </span>
                    </div>
                    <div className="text-xs text-[#5a6278]">
                      {formatProjectMeta(s)}
                    </div>
                  </div>

                  {/* Meta */}
                  <div className="text-right text-xs text-[#5a6278] whitespace-nowrap">
                    <div className="font-semibold text-sm text-[#1a1f2e]">
                      #{s.soumission_number}
                    </div>
                    <div>Modifié {formatRelativeDate(s.updated_at)}</div>
                  </div>

                  {/* Action */}
                  <div>
                    {s.status === "brouillon" ? (
                      <Link
                        href={`/soumissions/${s.id}`}
                        className="inline-flex items-center px-3.5 py-2 rounded-lg bg-[#F37021] hover:bg-[#d85f16] text-white text-xs font-bold"
                      >
                        Reprendre →
                      </Link>
                    ) : (
                      <Link
                        href={`/soumissions/${s.id}`}
                        className="inline-flex items-center px-3.5 py-2 rounded-lg border-[1.5px] border-[#e3e6ec] hover:border-[#5a6278] text-xs font-bold"
                      >
                        Voir
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </>
  );
}
