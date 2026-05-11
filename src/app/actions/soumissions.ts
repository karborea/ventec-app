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

/** When an admin updates a soumission they don't own (proxy edit), look
 *  up the owner's email so the post-submit pipeline emails the client. */
async function resolveOwnerEmail(
  callerId: string,
  callerEmail: string | undefined,
  ownerId: string,
): Promise<string> {
  if (callerId === ownerId) return callerEmail ?? "";
  try {
    const admin = createAdminClient();
    const { data } = await admin.auth.admin.getUserById(ownerId);
    return data.user?.email ?? "";
  } catch {
    return "";
  }
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

  if (isSubmit && user.email) {
    await onSoumissionSubmitted(supabase, soumission.id, user.id, user.email);
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

  const { data: existing } = await supabase
    .from("soumissions")
    .select("id, user_id, status, soumission_number")
    .eq("id", soumissionId)
    .maybeSingle();

  if (!existing) {
    return { error: "Soumission introuvable." };
  }
  if (existing.user_id !== user.id) {
    // Allow admins to proxy-edit any draft.
    const { data: caller } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    if (caller?.role !== "admin") {
      return { error: "Soumission introuvable." };
    }
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

  if (isSubmit) {
    const ownerEmail = await resolveOwnerEmail(
      user.id,
      user.email,
      existing.user_id,
    );
    if (ownerEmail) {
      await onSoumissionSubmitted(
        supabase,
        soumissionId,
        existing.user_id,
        ownerEmail,
      );
    }
  }

  revalidatePath("/mes-soumissions");
  revalidatePath(`/soumissions/${soumissionId}`);
  const status = isSubmit ? "soumis" : "brouillon";
  redirect(
    `/mes-soumissions?created=${existing.soumission_number}&status=${status}`,
  );
}

export async function createRemplacement(
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

  const payload = parseRemplacementPayload(formData.get("payload"));
  if (!payload) {
    return { error: "Formulaire invalide. Le nom du projet est requis." };
  }

  const action = formData.get("action");
  const isSubmit = action === "submit";

  if (isSubmit) {
    const v = validateRemplacementForSubmission(payload);
    if (!v.ok) {
      return { error: v.error };
    }
  }

  const { data: soumission, error: sErr } = await supabase
    .from("soumissions")
    .insert({
      user_id: user.id,
      project_name: payload.project_name,
      type: "remplacement",
      model: null,
      manufacturier_origine: payload.manufacturier_origine,
      manufacturier_autre_nom: payload.manufacturier_autre_nom,
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
    const { error: oErr } = await supabase.from("ouvertures").insert(rows);
    if (oErr) {
      await supabase.from("soumissions").delete().eq("id", soumission.id);
      return { error: "Impossible de sauvegarder les ouvertures. Réessayez." };
    }
  }

  await uploadInstallationFiles(supabase, soumission.id, formData);

  if (isSubmit && user.email) {
    await onSoumissionSubmitted(supabase, soumission.id, user.id, user.email);
  }

  revalidatePath("/mes-soumissions");
  const status = isSubmit ? "soumis" : "brouillon";
  redirect(
    `/mes-soumissions?created=${soumission.soumission_number}&status=${status}`,
  );
}

export async function updateRemplacement(
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

  const payload = parseRemplacementPayload(formData.get("payload"));
  if (!payload) {
    return { error: "Formulaire invalide. Le nom du projet est requis." };
  }

  const { data: existing } = await supabase
    .from("soumissions")
    .select("id, user_id, status, soumission_number")
    .eq("id", soumissionId)
    .maybeSingle();

  if (!existing) {
    return { error: "Soumission introuvable." };
  }
  if (existing.user_id !== user.id) {
    // Allow admins to proxy-edit any draft.
    const { data: caller } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    if (caller?.role !== "admin") {
      return { error: "Soumission introuvable." };
    }
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
    const v = validateRemplacementForSubmission(payload);
    if (!v.ok) {
      return { error: v.error };
    }
  }

  const { error: updErr } = await supabase
    .from("soumissions")
    .update({
      project_name: payload.project_name,
      manufacturier_origine: payload.manufacturier_origine,
      manufacturier_autre_nom: payload.manufacturier_autre_nom,
      status: isSubmit ? "soumis" : "brouillon",
      submitted_at: isSubmit ? new Date().toISOString() : null,
    })
    .eq("id", soumissionId);

  if (updErr) {
    return { error: "Impossible de mettre à jour la soumission." };
  }

  const { error: delErr } = await supabase
    .from("ouvertures")
    .delete()
    .eq("soumission_id", soumissionId);

  if (delErr) {
    return { error: "Impossible de mettre à jour les ouvertures." };
  }

  const rows = payload.openings.map((op, idx) =>
    remplacementOuvertureRow(soumissionId, op, idx),
  );

  if (rows.length > 0) {
    const { error: insErr } = await supabase.from("ouvertures").insert(rows);
    if (insErr) {
      return { error: "Impossible de sauvegarder les ouvertures." };
    }
  }

  await uploadInstallationFiles(supabase, soumissionId, formData);

  if (isSubmit) {
    const ownerEmail = await resolveOwnerEmail(
      user.id,
      user.email,
      existing.user_id,
    );
    if (ownerEmail) {
      await onSoumissionSubmitted(
        supabase,
        soumissionId,
        existing.user_id,
        ownerEmail,
      );
    }
  }

  revalidatePath("/mes-soumissions");
  revalidatePath(`/soumissions/${soumissionId}`);
  const status = isSubmit ? "soumis" : "brouillon";
  redirect(
    `/mes-soumissions?created=${existing.soumission_number}&status=${status}`,
  );
}
