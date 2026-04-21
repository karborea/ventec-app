"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type SoumissionFormState = {
  error?: string;
};

const MATERIAUX = new Set(["bois", "acier", "beton"]);
const RIDEAU_TYPES = new Set(["simple", "double"]);

function parseInt32(raw: FormDataEntryValue | null): number | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (trimmed === "") return null;
  const n = Number.parseInt(trimmed, 10);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export async function createNouvelleCommande(
  _prev: SoumissionFormState | undefined,
  formData: FormData,
): Promise<SoumissionFormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Vous devez être connecté." };
  }

  const projectName = formData.get("project_name");
  if (typeof projectName !== "string" || projectName.trim() === "") {
    return { error: "Le nom du projet est requis." };
  }

  const materiauHaut = formData.get("materiau_haut");
  const materiauBas = formData.get("materiau_bas");
  const rideauType = formData.get("rideau_type");

  if (
    typeof materiauHaut !== "string" ||
    !MATERIAUX.has(materiauHaut) ||
    typeof materiauBas !== "string" ||
    !MATERIAUX.has(materiauBas) ||
    typeof rideauType !== "string" ||
    !RIDEAU_TYPES.has(rideauType)
  ) {
    return { error: "Sélectionnez les matériaux et le type de rideau." };
  }

  const longueurPo = parseInt32(formData.get("longueur_po"));
  const souffleursCount = parseInt32(formData.get("souffleurs_count"));

  let polymatUnique: number | null = null;
  let polymatHaut: number | null = null;
  let polymatBas: number | null = null;

  if (rideauType === "simple") {
    polymatUnique = parseInt32(formData.get("polymat_unique_hauteur_po"));
  } else {
    polymatHaut = parseInt32(formData.get("polymat_haut_hauteur_po"));
    polymatBas = parseInt32(formData.get("polymat_bas_hauteur_po"));
  }

  const action = formData.get("action"); // "draft" | "submit"
  const isSubmit = action === "submit";

  // 1. Create soumission (header)
  const { data: soumission, error: sErr } = await supabase
    .from("soumissions")
    .insert({
      user_id: user.id,
      project_name: projectName.trim(),
      type: "nouvelle_commande",
      model: "polymat_g3",
      status: isSubmit ? "soumis" : "brouillon",
      submitted_at: isSubmit ? new Date().toISOString() : null,
    })
    .select("id")
    .single();

  if (sErr || !soumission) {
    return { error: "Impossible de créer la soumission. Réessayez." };
  }

  // 2. Create ouverture (child)
  const { error: oErr } = await supabase.from("ouvertures").insert({
    soumission_id: soumission.id,
    order_index: 1,
    longueur_po: longueurPo,
    materiau_haut: materiauHaut as "bois" | "acier" | "beton",
    materiau_bas: materiauBas as "bois" | "acier" | "beton",
    rideau_type: rideauType as "simple" | "double",
    polymat_unique_hauteur_po: polymatUnique,
    polymat_haut_hauteur_po: polymatHaut,
    polymat_bas_hauteur_po: polymatBas,
    souffleurs_count: souffleursCount,
  });

  if (oErr) {
    // Roll back the soumission if the ouverture failed
    await supabase.from("soumissions").delete().eq("id", soumission.id);
    return { error: "Impossible de sauvegarder l'ouverture. Réessayez." };
  }

  revalidatePath("/mes-soumissions");
  redirect("/mes-soumissions");
}
