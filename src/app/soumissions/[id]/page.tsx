import Link from "next/link";
import { notFound } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { createClient } from "@/lib/supabase/server";
import { updateNouvelleCommande } from "@/app/actions/soumissions";
import { NouvelleCommandeForm } from "@/app/nouvelle-commande/nouvelle-commande-form";
import type { OpeningDraft } from "@/app/nouvelle-commande/nouvelle-commande-form";
import { SoumissionReadonly } from "./readonly-view";

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

export type OuvertureRow = {
  id: string;
  order_index: number;
  longueur_po: number | null;
  materiau_haut: "bois" | "acier" | "beton" | null;
  materiau_bas: "bois" | "acier" | "beton" | null;
  rideau_type: "simple" | "double" | null;
  rideau_grandeur: "standard" | "hors_standard" | null;
  polymat_unique_hauteur_po: number | null;
  polymat_haut_hauteur_po: number | null;
  polymat_bas_hauteur_po: number | null;
  souffleurs_count: number | null;
  souffleurs_aux_deux_extremites: boolean;
};

function toDraft(op: OuvertureRow): OpeningDraft {
  return {
    longueur_po: op.longueur_po !== null ? String(op.longueur_po) : "",
    materiau_haut: (op.materiau_haut ?? "bois") as OpeningDraft["materiau_haut"],
    materiau_bas: (op.materiau_bas ?? "acier") as OpeningDraft["materiau_bas"],
    rideau_type: (op.rideau_type ?? "simple") as OpeningDraft["rideau_type"],
    rideau_grandeur: (op.rideau_grandeur ??
      "") as OpeningDraft["rideau_grandeur"],
    polymat_unique_hauteur_po:
      op.polymat_unique_hauteur_po !== null
        ? String(op.polymat_unique_hauteur_po)
        : "",
    polymat_haut_hauteur_po:
      op.polymat_haut_hauteur_po !== null
        ? String(op.polymat_haut_hauteur_po)
        : "",
    polymat_bas_hauteur_po:
      op.polymat_bas_hauteur_po !== null
        ? String(op.polymat_bas_hauteur_po)
        : "",
    souffleurs_count:
      op.souffleurs_count !== null ? String(op.souffleurs_count) : "",
    souffleurs_aux_deux_extremites: op.souffleurs_aux_deux_extremites === true,
  };
}

export default async function SoumissionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: soumission } = await supabase
    .from("soumissions")
    .select(
      "id, soumission_number, project_name, type, status, model, note_client, created_at, updated_at, submitted_at",
    )
    .eq("id", id)
    .maybeSingle<SoumissionRow>();

  if (!soumission) {
    notFound();
  }

  const { data: ouverturesData } = await supabase
    .from("ouvertures")
    .select(
      "id, order_index, longueur_po, materiau_haut, materiau_bas, rideau_type, rideau_grandeur, polymat_unique_hauteur_po, polymat_haut_hauteur_po, polymat_bas_hauteur_po, souffleurs_count, souffleurs_aux_deux_extremites",
    )
    .eq("soumission_id", id)
    .order("order_index");

  const ouvertures = (ouverturesData ?? []) as OuvertureRow[];

  const isDraftEditable =
    soumission.status === "brouillon" && soumission.type === "nouvelle_commande";

  return (
    <>
      <AppHeader />

      <div className="bg-white border-b border-[#e3e6ec]">
        <div className="max-w-6xl mx-auto px-6 py-5">
          <div className="text-xs text-[#5a6278] mb-1">
            <Link href="/mes-soumissions" className="hover:underline">
              Mes soumissions
            </Link>{" "}
            › {soumission.project_name}
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-extrabold tracking-tight">
              {isDraftEditable ? "Modifier le brouillon" : soumission.project_name}
            </h1>
            <span className="font-mono text-[#5a6278] text-lg">
              #{soumission.soumission_number}
            </span>
          </div>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-6 py-8 pb-20">
        {isDraftEditable ? (
          <NouvelleCommandeForm
            action={updateNouvelleCommande.bind(null, soumission.id)}
            initialProjectName={soumission.project_name}
            initialOpenings={ouvertures.map(toDraft)}
            cancelHref="/mes-soumissions"
          />
        ) : (
          <SoumissionReadonly soumission={soumission} ouvertures={ouvertures} />
        )}
      </main>
    </>
  );
}
