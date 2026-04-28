import Link from "next/link";
import { notFound } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { createClient } from "@/lib/supabase/server";
import {
  updateNouvelleCommande,
  updateRemplacement,
} from "@/app/actions/soumissions";
import { NouvelleCommandeForm } from "@/app/nouvelle-commande/nouvelle-commande-form";
import type { OpeningDraft } from "@/app/nouvelle-commande/nouvelle-commande-form";
import { RemplacementForm } from "@/app/remplacement/remplacement-form";
import type { RemplacementOpeningDraft } from "@/app/remplacement/remplacement-form";
import { SoumissionReadonly } from "./readonly-view";

type SoumissionRow = {
  id: string;
  soumission_number: number;
  project_name: string;
  type: "nouvelle_commande" | "remplacement";
  status: "brouillon" | "soumis" | "envoye" | "accepte" | "refuse";
  model: "polymat_g3" | "polymat_xl" | null;
  manufacturier_origine: "ventec" | "autre" | null;
  note_client: string | null;
  created_at: string;
  updated_at: string;
  submitted_at: string | null;
};

export type OuvertureRow = {
  id: string;
  order_index: number;
  longueur_po: number | null;
  longueur_totale_po: number | null;
  materiau_haut: "bois" | "acier" | "beton" | null;
  materiau_bas: "bois" | "acier" | "beton" | null;
  rideau_type: "simple" | "double" | null;
  rideau_grandeur: "standard" | "hors_standard" | null;
  polymat_unique_hauteur_po: number | null;
  polymat_haut_hauteur_po: number | null;
  polymat_bas_hauteur_po: number | null;
  souffleurs_count: number | null;
  souffleurs_aux_deux_extremites: boolean;
  // Remplacement fields
  systeme: "simple" | "double" | null;
  rideau_a_remplacer: "haut" | "bas" | "les_deux" | null;
  hauteur_support_simple_po: number | null;
  hauteur_support_haut_po: number | null;
  hauteur_support_bas_po: number | null;
  modele_polymat:
    | "xl_a"
    | "xl_b"
    | "xl_c"
    | "xl_d"
    | "g3_e"
    | "g3_f"
    | "autre"
    | null;
  nb_cellules_simple: number | null;
  nb_cellules_haut: number | null;
  nb_cellules_bas: number | null;
  souffleurs_count_haut: number | null;
  souffleurs_count_bas: number | null;
};

function toNouvelleDraft(op: OuvertureRow): OpeningDraft {
  // Split saved total (po) back into pieds + pouces résiduels for the form.
  const totalPo = op.longueur_po;
  const piPart = totalPo !== null ? Math.floor(totalPo / 12) : null;
  const poPart = totalPo !== null ? totalPo - (piPart ?? 0) * 12 : null;
  return {
    longueur_pi: piPart !== null ? String(piPart) : "",
    longueur_po: poPart !== null && poPart > 0 ? String(poPart) : "",
    longueur_totale_po:
      op.longueur_totale_po !== null ? String(op.longueur_totale_po) : "",
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

function toRemplacementDraft(op: OuvertureRow): RemplacementOpeningDraft {
  return {
    systeme: (op.systeme ?? "simple") as RemplacementOpeningDraft["systeme"],
    rideau_a_remplacer: (op.rideau_a_remplacer ??
      "") as RemplacementOpeningDraft["rideau_a_remplacer"],
    hauteur_support_simple_po:
      op.hauteur_support_simple_po !== null
        ? String(op.hauteur_support_simple_po)
        : "",
    hauteur_support_haut_po:
      op.hauteur_support_haut_po !== null
        ? String(op.hauteur_support_haut_po)
        : "",
    hauteur_support_bas_po:
      op.hauteur_support_bas_po !== null
        ? String(op.hauteur_support_bas_po)
        : "",
    modele_polymat: (op.modele_polymat ??
      "") as RemplacementOpeningDraft["modele_polymat"],
    // Saisi en pieds + pouces : reconvertir le total stocké (po) en pi + po.
    longueur_pi:
      op.longueur_po !== null ? String(Math.floor(op.longueur_po / 12)) : "",
    longueur_po:
      op.longueur_po !== null
        ? (() => {
            const reste = op.longueur_po - Math.floor(op.longueur_po / 12) * 12;
            return reste > 0 ? String(reste) : "";
          })()
        : "",
    nb_cellules_simple:
      op.nb_cellules_simple !== null ? String(op.nb_cellules_simple) : "",
    nb_cellules_haut:
      op.nb_cellules_haut !== null ? String(op.nb_cellules_haut) : "",
    nb_cellules_bas:
      op.nb_cellules_bas !== null ? String(op.nb_cellules_bas) : "",
    souffleurs_count:
      op.souffleurs_count !== null ? String(op.souffleurs_count) : "",
    souffleurs_count_haut:
      op.souffleurs_count_haut !== null
        ? String(op.souffleurs_count_haut)
        : "",
    souffleurs_count_bas:
      op.souffleurs_count_bas !== null ? String(op.souffleurs_count_bas) : "",
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
      "id, soumission_number, project_name, type, status, model, manufacturier_origine, note_client, created_at, updated_at, submitted_at",
    )
    .eq("id", id)
    .maybeSingle<SoumissionRow>();

  if (!soumission) {
    notFound();
  }

  const { data: ouverturesData } = await supabase
    .from("ouvertures")
    .select(
      "id, order_index, longueur_po, longueur_totale_po, materiau_haut, materiau_bas, rideau_type, rideau_grandeur, polymat_unique_hauteur_po, polymat_haut_hauteur_po, polymat_bas_hauteur_po, souffleurs_count, souffleurs_count_haut, souffleurs_count_bas, souffleurs_aux_deux_extremites, systeme, rideau_a_remplacer, hauteur_support_simple_po, hauteur_support_haut_po, hauteur_support_bas_po, modele_polymat, nb_cellules_simple, nb_cellules_haut, nb_cellules_bas",
    )
    .eq("soumission_id", id)
    .order("order_index");

  const ouvertures = (ouverturesData ?? []) as OuvertureRow[];

  // Fichiers d'installation (remplacement) — générer des signed URLs pour
  // afficher les previews dans la vue readonly (bucket privé).
  const { data: filesData } = await supabase
    .from("soumission_files")
    .select("id, file_path, file_name, mime_type, size_bytes")
    .eq("soumission_id", id)
    .order("created_at");

  const installationFiles: {
    id: string;
    file_name: string;
    mime_type: string | null;
    size_bytes: number | null;
    url: string;
  }[] = [];
  for (const f of filesData ?? []) {
    const { data: signed } = await supabase.storage
      .from("soumission-files")
      .createSignedUrl(f.file_path, 60 * 60); // 1 h
    if (signed?.signedUrl) {
      installationFiles.push({
        id: f.id,
        file_name: f.file_name,
        mime_type: f.mime_type,
        size_bytes: f.size_bytes,
        url: signed.signedUrl,
      });
    }
  }

  const isDraftEditable = soumission.status === "brouillon";

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

      <main className="w-full max-w-6xl mx-auto px-6 py-8 pb-20">
        {isDraftEditable && soumission.type === "nouvelle_commande" ? (
          <NouvelleCommandeForm
            action={updateNouvelleCommande.bind(null, soumission.id)}
            initialProjectName={soumission.project_name}
            initialOpenings={ouvertures.map(toNouvelleDraft)}
            cancelHref="/mes-soumissions"
          />
        ) : isDraftEditable && soumission.type === "remplacement" ? (
          <RemplacementForm
            action={updateRemplacement.bind(null, soumission.id)}
            initialProjectName={soumission.project_name}
            initialManufacturier={soumission.manufacturier_origine ?? "ventec"}
            initialOpenings={ouvertures.map(toRemplacementDraft)}
            cancelHref="/mes-soumissions"
          />
        ) : (
          <SoumissionReadonly
            soumission={soumission}
            ouvertures={ouvertures}
            installationFiles={installationFiles}
          />
        )}
      </main>
    </>
  );
}
