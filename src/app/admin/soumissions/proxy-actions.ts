"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { onSoumissionSubmitted } from "@/lib/soumissions/on-submitted";
import {
  parsePayload,
  parseRemplacementPayload,
  remplacementOuvertureRow,
  validateForSubmission,
  validateRemplacementForSubmission,
  type SoumissionFormState,
} from "@/lib/soumissions/payload";
import { uploadInstallationFiles } from "@/lib/soumissions/upload";

async function assertAdminAndTarget(
  formData: FormData,
): Promise<
  | { error: string }
  | {
      ok: true;
      supabase: Awaited<ReturnType<typeof createClient>>;
      targetUserId: string;
      targetEmail: string;
    }
> {
  const targetUserId = formData.get("target_user_id");
  if (typeof targetUserId !== "string" || !targetUserId) {
    return { error: "Client cible requis." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Vous devez être connecté." };

  const { data: caller } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (caller?.role !== "admin") return { error: "Accès refusé." };

  // Look up the client's email via service role (auth.users isn't
  // accessible to the regular client).
  const admin = createAdminClient();
  const { data: target, error: tErr } = await admin.auth.admin.getUserById(
    targetUserId,
  );
  if (tErr || !target.user?.email) {
    return { error: "Client introuvable." };
  }

  return {
    ok: true,
    supabase,
    targetUserId,
    targetEmail: target.user.email,
  };
}

export async function createNouvelleCommandeAsAdmin(
  _prev: SoumissionFormState | undefined,
  formData: FormData,
): Promise<SoumissionFormState> {
  const auth = await assertAdminAndTarget(formData);
  if ("error" in auth) return auth;

  const payload = parsePayload(formData.get("payload"));
  if (!payload) {
    return { error: "Formulaire invalide. Le nom du projet est requis." };
  }

  const action = formData.get("action");
  const isSubmit = action === "submit";

  if (isSubmit) {
    const v = validateForSubmission(payload);
    if (!v.ok) return { error: v.error };
  }

  const { data: soumission, error: sErr } = await auth.supabase
    .from("soumissions")
    .insert({
      user_id: auth.targetUserId,
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
    const { error: oErr } = await auth.supabase
      .from("ouvertures")
      .insert(ouverturesRows);
    if (oErr) {
      await auth.supabase
        .from("soumissions")
        .delete()
        .eq("id", soumission.id);
      return {
        error: "Impossible de sauvegarder les ouvertures. Réessayez.",
      };
    }
  }

  if (isSubmit) {
    await onSoumissionSubmitted(
      auth.supabase,
      soumission.id,
      auth.targetUserId,
      auth.targetEmail,
    );
  }

  revalidatePath("/admin/soumissions");
  redirect(
    `/admin/soumissions?created=${soumission.soumission_number}&status=${isSubmit ? "soumis" : "brouillon"}`,
  );
}

export async function createRemplacementAsAdmin(
  _prev: SoumissionFormState | undefined,
  formData: FormData,
): Promise<SoumissionFormState> {
  const auth = await assertAdminAndTarget(formData);
  if ("error" in auth) return auth;

  const payload = parseRemplacementPayload(formData.get("payload"));
  if (!payload) {
    return { error: "Formulaire invalide. Le nom du projet est requis." };
  }

  const action = formData.get("action");
  const isSubmit = action === "submit";

  if (isSubmit) {
    const v = validateRemplacementForSubmission(payload);
    if (!v.ok) return { error: v.error };
  }

  const { data: soumission, error: sErr } = await auth.supabase
    .from("soumissions")
    .insert({
      user_id: auth.targetUserId,
      project_name: payload.project_name,
      type: "remplacement",
      model: null,
      manufacturier_origine: payload.manufacturier_origine,
      status: isSubmit ? "soumis" : "brouillon",
      submitted_at: isSubmit ? new Date().toISOString() : null,
    })
    .select("id, soumission_number")
    .single();

  if (sErr || !soumission) {
    return { error: "Impossible de créer la soumission. Réessayez." };
  }

  const rows = payload.openings.map((op, idx) =>
    remplacementOuvertureRow(soumission.id, op, idx),
  );

  if (rows.length > 0) {
    const { error: oErr } = await auth.supabase
      .from("ouvertures")
      .insert(rows);
    if (oErr) {
      await auth.supabase
        .from("soumissions")
        .delete()
        .eq("id", soumission.id);
      return { error: "Impossible de sauvegarder les ouvertures. Réessayez." };
    }
  }

  await uploadInstallationFiles(auth.supabase, soumission.id, formData);

  if (isSubmit) {
    await onSoumissionSubmitted(
      auth.supabase,
      soumission.id,
      auth.targetUserId,
      auth.targetEmail,
    );
  }

  revalidatePath("/admin/soumissions");
  redirect(
    `/admin/soumissions?created=${soumission.soumission_number}&status=${isSubmit ? "soumis" : "brouillon"}`,
  );
}
