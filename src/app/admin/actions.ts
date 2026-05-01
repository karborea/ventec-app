"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type UpdateUserState = { error?: string; ok?: boolean };

export type CreateUserState = {
  error?: string;
  ok?: boolean;
  email?: string;
  password?: string;
};

export type DeleteSoumissionState = { error?: string; ok?: boolean };

export type DeleteUserState = { error?: string; ok?: boolean };

async function assertAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié." } as const;
  const { data: caller } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (caller?.role !== "admin") return { error: "Accès refusé." } as const;
  return { ok: true, supabase } as const;
}

function readAddress(formData: FormData) {
  const parts = {
    street: (formData.get("addr_street") as string | null)?.trim() ?? "",
    city: (formData.get("addr_city") as string | null)?.trim() ?? "",
    province: (formData.get("addr_province") as string | null)?.trim() ?? "",
    postal_code:
      (formData.get("addr_postal_code") as string | null)?.trim() ?? "",
    country: (formData.get("addr_country") as string | null)?.trim() ?? "",
  };
  return Object.values(parts).some((v) => v) ? parts : null;
}

export async function updateUserProfile(
  _prev: UpdateUserState | undefined,
  formData: FormData,
): Promise<UpdateUserState> {
  const userId = formData.get("user_id");
  const firstName = formData.get("first_name");
  const lastName = formData.get("last_name");
  const company = formData.get("company");
  const phone = formData.get("phone");
  const language = formData.get("language");
  const role = formData.get("role");
  const newPassword = formData.get("new_password");

  if (typeof userId !== "string" || !userId) {
    return { error: "Utilisateur invalide." };
  }
  if (typeof firstName !== "string" || typeof lastName !== "string") {
    return { error: "Champs invalides." };
  }
  if (role !== "client" && role !== "admin") {
    return { error: "Rôle invalide." };
  }
  if (
    typeof newPassword === "string" &&
    newPassword.length > 0 &&
    newPassword.length < 8
  ) {
    return { error: "Le mot de passe doit contenir au moins 8 caractères." };
  }

  const auth = await assertAdmin();
  if (auth.error) return auth;

  const billingAddress = readAddress(formData);

  const { data, error } = await auth.supabase
    .from("profiles")
    .update({
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      company: typeof company === "string" ? company.trim() || null : null,
      phone: typeof phone === "string" ? phone.trim() || null : null,
      language: language === "en" ? "en" : "fr",
      role,
      billing_address: billingAddress,
    })
    .eq("id", userId)
    .select("id");

  if (error) return { error: error.message };
  if (!data || data.length === 0) {
    return { error: "Aucune ligne modifiée — accès refusé par RLS." };
  }

  if (typeof newPassword === "string" && newPassword.length > 0) {
    const admin = createAdminClient();
    const { error: pwErr } = await admin.auth.admin.updateUserById(userId, {
      password: newPassword,
    });
    if (pwErr) return { error: `Mot de passe : ${pwErr.message}` };
  }

  revalidatePath("/admin");
  return { ok: true };
}

export async function createUserAccount(
  _prev: CreateUserState | undefined,
  formData: FormData,
): Promise<CreateUserState> {
  const email = formData.get("email");
  const password = formData.get("password");
  const firstName = formData.get("first_name");
  const lastName = formData.get("last_name");
  const company = formData.get("company");
  const phone = formData.get("phone");
  const language = formData.get("language");
  const role = formData.get("role");

  if (
    typeof email !== "string" ||
    typeof password !== "string" ||
    typeof firstName !== "string" ||
    typeof lastName !== "string"
  ) {
    return { error: "Champs invalides." };
  }
  if (!email.trim() || !email.includes("@")) {
    return { error: "Courriel invalide." };
  }
  if (password.length < 8) {
    return { error: "Le mot de passe doit contenir au moins 8 caractères." };
  }
  if (!firstName.trim() && !lastName.trim()) {
    return { error: "Au moins un prénom ou un nom est requis." };
  }
  if (role !== "client" && role !== "admin") {
    return { error: "Rôle invalide." };
  }

  const auth = await assertAdmin();
  if (auth.error) return auth;

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email: email.trim(),
    password,
    email_confirm: true,
    user_metadata: {
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      company: typeof company === "string" ? company.trim() || null : null,
      phone: typeof phone === "string" ? phone.trim() || null : null,
      language: language === "en" ? "en" : "fr",
    },
  });

  if (error || !data.user) {
    if (error?.message.toLowerCase().includes("already")) {
      return { error: "Ce courriel est déjà utilisé." };
    }
    return { error: error?.message ?? "Création impossible." };
  }

  // The handle_new_user trigger creates the profile with role='client'.
  // Layer on the role (if admin) and billing_address. Service role
  // bypasses the role-guard trigger (auth.uid() is null).
  const billingAddress = readAddress(formData);
  const profileUpdate: { role?: "admin"; billing_address?: typeof billingAddress } = {};
  if (role === "admin") profileUpdate.role = "admin";
  if (billingAddress) profileUpdate.billing_address = billingAddress;
  if (Object.keys(profileUpdate).length > 0) {
    await admin
      .from("profiles")
      .update(profileUpdate)
      .eq("id", data.user.id);
  }

  revalidatePath("/admin");
  return { ok: true, email: email.trim(), password };
}

export async function deleteUserAccount(
  _prev: DeleteUserState | undefined,
  formData: FormData,
): Promise<DeleteUserState> {
  const userId = formData.get("user_id");
  if (typeof userId !== "string" || !userId) {
    return { error: "Utilisateur invalide." };
  }

  const auth = await assertAdmin();
  if (auth.error) return auth;

  const {
    data: { user: caller },
  } = await auth.supabase.auth.getUser();
  if (caller?.id === userId) {
    return { error: "Vous ne pouvez pas supprimer votre propre compte." };
  }

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) return { error: error.message };

  revalidatePath("/admin/utilisateurs");
  revalidatePath("/admin");
  return { ok: true };
}

export async function deleteSoumission(
  _prev: DeleteSoumissionState | undefined,
  formData: FormData,
): Promise<DeleteSoumissionState> {
  const id = formData.get("id");
  if (typeof id !== "string" || !id) {
    return { error: "Soumission invalide." };
  }

  const auth = await assertAdmin();
  if (auth.error) return auth;

  const { error, count } = await auth.supabase
    .from("soumissions")
    .delete({ count: "exact" })
    .eq("id", id);

  if (error) return { error: error.message };
  if (!count) {
    return { error: "Aucune soumission supprimée — accès refusé par RLS." };
  }

  revalidatePath("/admin/soumissions");
  revalidatePath("/admin");
  return { ok: true };
}
