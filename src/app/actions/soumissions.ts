"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type SoumissionFormState = {
  error?: string;
};

const MATERIAUX = new Set(["bois", "acier", "beton"] as const);
const RIDEAU_TYPES = new Set(["simple", "double"] as const);
const RIDEAU_GRANDEURS = new Set(["standard", "hors_standard"] as const);

type Materiau = "bois" | "acier" | "beton";
type RideauType = "simple" | "double";
type RideauGrandeur = "standard" | "hors_standard";

type OpeningPayload = {
  longueur_po?: number | null;
  longueur_totale_po?: number | null;
  materiau_haut?: Materiau | null;
  materiau_bas?: Materiau | null;
  rideau_type?: RideauType | null;
  rideau_grandeur?: RideauGrandeur | null;
  polymat_unique_hauteur_po?: number | null;
  polymat_haut_hauteur_po?: number | null;
  polymat_bas_hauteur_po?: number | null;
  souffleurs_count?: number | null;
  souffleurs_aux_deux_extremites?: boolean;
};

type FormPayload = {
  project_name: string;
  openings: OpeningPayload[];
};

function toInt(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number.parseInt(String(v), 10);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function parsePayload(raw: unknown): FormPayload | null {
  if (typeof raw !== "string" || !raw) return null;
  let obj: unknown;
  try {
    obj = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!obj || typeof obj !== "object") return null;
  const p = obj as Record<string, unknown>;
  const projectName =
    typeof p.project_name === "string" ? p.project_name.trim() : "";
  if (!projectName) return null;

  const openingsRaw = Array.isArray(p.openings) ? p.openings : [];
  const openings: OpeningPayload[] = openingsRaw.map((o) => {
    const op = (o ?? {}) as Record<string, unknown>;
    const mh =
      typeof op.materiau_haut === "string" &&
      MATERIAUX.has(op.materiau_haut as Materiau)
        ? (op.materiau_haut as Materiau)
        : null;
    const mb =
      typeof op.materiau_bas === "string" &&
      MATERIAUX.has(op.materiau_bas as Materiau)
        ? (op.materiau_bas as Materiau)
        : null;
    const rt =
      typeof op.rideau_type === "string" &&
      RIDEAU_TYPES.has(op.rideau_type as RideauType)
        ? (op.rideau_type as RideauType)
        : null;
    const rg =
      typeof op.rideau_grandeur === "string" &&
      RIDEAU_GRANDEURS.has(op.rideau_grandeur as RideauGrandeur)
        ? (op.rideau_grandeur as RideauGrandeur)
        : null;
    const cleanedGrandeur = rt === "double" ? rg : null;
    return {
      longueur_po: toInt(op.longueur_po),
      // Only used when double + standard; zero out otherwise to avoid stale data
      longueur_totale_po:
        rt === "double" && cleanedGrandeur === "standard"
          ? toInt(op.longueur_totale_po)
          : null,
      materiau_haut: mh,
      materiau_bas: mb,
      rideau_type: rt,
      rideau_grandeur: cleanedGrandeur,
      polymat_unique_hauteur_po: toInt(op.polymat_unique_hauteur_po),
      polymat_haut_hauteur_po: toInt(op.polymat_haut_hauteur_po),
      polymat_bas_hauteur_po: toInt(op.polymat_bas_hauteur_po),
      souffleurs_count: toInt(op.souffleurs_count),
      souffleurs_aux_deux_extremites:
        op.souffleurs_aux_deux_extremites === true,
    };
  });

  return { project_name: projectName, openings };
}

function validateForSubmission(
  payload: FormPayload,
): { ok: true } | { ok: false; error: string } {
  if (payload.openings.length === 0) {
    return { ok: false, error: "Au moins une ouverture est requise." };
  }
  for (const [i, op] of payload.openings.entries()) {
    const n = i + 1;
    if (!op.materiau_haut || !op.materiau_bas || !op.rideau_type) {
      return {
        ok: false,
        error: `Ouverture ${n} : sélectionnez les matériaux et le type de rideau.`,
      };
    }
    if (!op.longueur_po) {
      return { ok: false, error: `Ouverture ${n} : la longueur est requise.` };
    }
    if (op.rideau_type === "simple") {
      if (!op.polymat_unique_hauteur_po) {
        return {
          ok: false,
          error: `Ouverture ${n} : la hauteur est requise.`,
        };
      }
    } else {
      if (!op.polymat_haut_hauteur_po || !op.polymat_bas_hauteur_po) {
        return {
          ok: false,
          error: `Ouverture ${n} : les hauteurs du haut et du bas sont requises.`,
        };
      }
      if (!op.rideau_grandeur) {
        return {
          ok: false,
          error: `Ouverture ${n} : sélectionnez la grandeur du rideau double (standard ou hors-standard).`,
        };
      }
      if (op.rideau_grandeur === "standard" && !op.longueur_totale_po) {
        return {
          ok: false,
          error: `Ouverture ${n} : la longueur de l'ouverture totale est requise pour un rideau double standard.`,
        };
      }
    }
  }
  return { ok: true };
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

  const payload = parsePayload(formData.get("payload"));
  if (!payload) {
    return { error: "Formulaire invalide. Le nom du projet est requis." };
  }

  const action = formData.get("action");
  const isSubmit = action === "submit";

  if (isSubmit) {
    const v = validateForSubmission(payload);
    if (!v.ok) {
      return { error: v.error };
    }
  }

  // 1. Create soumission (header)
  const { data: soumission, error: sErr } = await supabase
    .from("soumissions")
    .insert({
      user_id: user.id,
      project_name: payload.project_name,
      type: "nouvelle_commande",
      model: "polymat_g3",
      status: isSubmit ? "soumis" : "brouillon",
      submitted_at: isSubmit ? new Date().toISOString() : null,
    })
    .select("id, soumission_number")
    .single();

  if (sErr || !soumission) {
    return { error: "Impossible de créer la soumission. Réessayez." };
  }

  // 2. Create ouvertures (children)
  const ouverturesRows = payload.openings.map((op, idx) => ({
    soumission_id: soumission.id,
    order_index: idx + 1,
    longueur_po: op.longueur_po ?? null,
    longueur_totale_po: op.longueur_totale_po ?? null,
    materiau_haut: op.materiau_haut ?? null,
    materiau_bas: op.materiau_bas ?? null,
    rideau_type: op.rideau_type ?? null,
    rideau_grandeur: op.rideau_grandeur ?? null,
    polymat_unique_hauteur_po: op.polymat_unique_hauteur_po ?? null,
    polymat_haut_hauteur_po: op.polymat_haut_hauteur_po ?? null,
    polymat_bas_hauteur_po: op.polymat_bas_hauteur_po ?? null,
    souffleurs_count: op.souffleurs_count ?? null,
    souffleurs_aux_deux_extremites: op.souffleurs_aux_deux_extremites ?? false,
  }));

  if (ouverturesRows.length > 0) {
    const { error: oErr } = await supabase
      .from("ouvertures")
      .insert(ouverturesRows);

    if (oErr) {
      await supabase.from("soumissions").delete().eq("id", soumission.id);
      return {
        error: "Impossible de sauvegarder les ouvertures. Réessayez.",
      };
    }
  }

  revalidatePath("/mes-soumissions");
  const status = isSubmit ? "soumis" : "brouillon";
  redirect(
    `/mes-soumissions?created=${soumission.soumission_number}&status=${status}`,
  );
}

export async function updateNouvelleCommande(
  soumissionId: string,
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

  const payload = parsePayload(formData.get("payload"));
  if (!payload) {
    return { error: "Formulaire invalide. Le nom du projet est requis." };
  }

  // Verify ownership + draft status
  const { data: existing } = await supabase
    .from("soumissions")
    .select("id, user_id, status, soumission_number")
    .eq("id", soumissionId)
    .maybeSingle();

  if (!existing || existing.user_id !== user.id) {
    return { error: "Soumission introuvable." };
  }
  if (existing.status !== "brouillon") {
    return {
      error:
        "Cette soumission n'est plus modifiable (déjà envoyée à Ventec).",
    };
  }

  const action = formData.get("action");
  const isSubmit = action === "submit";

  if (isSubmit) {
    const v = validateForSubmission(payload);
    if (!v.ok) {
      return { error: v.error };
    }
  }

  // 1. Update soumission header
  const { error: updErr } = await supabase
    .from("soumissions")
    .update({
      project_name: payload.project_name,
      status: isSubmit ? "soumis" : "brouillon",
      submitted_at: isSubmit ? new Date().toISOString() : null,
    })
    .eq("id", soumissionId);

  if (updErr) {
    return { error: "Impossible de mettre à jour la soumission." };
  }

  // 2. Replace ouvertures : delete all + re-insert
  //    (simpler than diffing; safe because RLS restricts to owner)
  const { error: delErr } = await supabase
    .from("ouvertures")
    .delete()
    .eq("soumission_id", soumissionId);

  if (delErr) {
    return { error: "Impossible de mettre à jour les ouvertures." };
  }

  const ouverturesRows = payload.openings.map((op, idx) => ({
    soumission_id: soumissionId,
    order_index: idx + 1,
    longueur_po: op.longueur_po ?? null,
    longueur_totale_po: op.longueur_totale_po ?? null,
    materiau_haut: op.materiau_haut ?? null,
    materiau_bas: op.materiau_bas ?? null,
    rideau_type: op.rideau_type ?? null,
    rideau_grandeur: op.rideau_grandeur ?? null,
    polymat_unique_hauteur_po: op.polymat_unique_hauteur_po ?? null,
    polymat_haut_hauteur_po: op.polymat_haut_hauteur_po ?? null,
    polymat_bas_hauteur_po: op.polymat_bas_hauteur_po ?? null,
    souffleurs_count: op.souffleurs_count ?? null,
    souffleurs_aux_deux_extremites: op.souffleurs_aux_deux_extremites ?? false,
  }));

  if (ouverturesRows.length > 0) {
    const { error: insErr } = await supabase
      .from("ouvertures")
      .insert(ouverturesRows);
    if (insErr) {
      return { error: "Impossible de sauvegarder les ouvertures." };
    }
  }

  revalidatePath("/mes-soumissions");
  revalidatePath(`/soumissions/${soumissionId}`);
  const status = isSubmit ? "soumis" : "brouillon";
  redirect(
    `/mes-soumissions?created=${existing.soumission_number}&status=${status}`,
  );
}
