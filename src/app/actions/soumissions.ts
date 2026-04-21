"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type SoumissionFormState = {
  error?: string;
};

const MATERIAUX = new Set(["bois", "acier", "beton"] as const);
const RIDEAU_TYPES = new Set(["simple", "double"] as const);

type Materiau = "bois" | "acier" | "beton";
type RideauType = "simple" | "double";

type OpeningPayload = {
  longueur_po?: number | null;
  materiau_haut?: Materiau | null;
  materiau_bas?: Materiau | null;
  rideau_type?: RideauType | null;
  polymat_unique_hauteur_po?: number | null;
  polymat_haut_hauteur_po?: number | null;
  polymat_bas_hauteur_po?: number | null;
  souffleurs_count?: number | null;
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
    return {
      longueur_po: toInt(op.longueur_po),
      materiau_haut: mh,
      materiau_bas: mb,
      rideau_type: rt,
      polymat_unique_hauteur_po: toInt(op.polymat_unique_hauteur_po),
      polymat_haut_hauteur_po: toInt(op.polymat_haut_hauteur_po),
      polymat_bas_hauteur_po: toInt(op.polymat_bas_hauteur_po),
      souffleurs_count: toInt(op.souffleurs_count),
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
    materiau_haut: op.materiau_haut ?? null,
    materiau_bas: op.materiau_bas ?? null,
    rideau_type: op.rideau_type ?? null,
    polymat_unique_hauteur_po: op.polymat_unique_hauteur_po ?? null,
    polymat_haut_hauteur_po: op.polymat_haut_hauteur_po ?? null,
    polymat_bas_hauteur_po: op.polymat_bas_hauteur_po ?? null,
    souffleurs_count: op.souffleurs_count ?? null,
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
