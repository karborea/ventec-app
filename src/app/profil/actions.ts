"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ProfilState = { error?: string; ok?: boolean };

export async function updateOwnProfile(
  _prev: ProfilState | undefined,
  formData: FormData,
): Promise<ProfilState> {
  const firstName = formData.get("first_name");
  const lastName = formData.get("last_name");
  const company = formData.get("company");
  const phone = formData.get("phone");
  const language = formData.get("language");
  const newPassword = formData.get("new_password");

  if (typeof firstName !== "string" || typeof lastName !== "string") {
    return { error: "Champs invalides." };
  }
  if (!firstName.trim() || !lastName.trim()) {
    return { error: "Le prénom et le nom sont requis." };
  }
  if (
    typeof newPassword === "string" &&
    newPassword.length > 0 &&
    newPassword.length < 8
  ) {
    return { error: "Le mot de passe doit contenir au moins 8 caractères." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié." };

  const street = formData.get("addr_street");
  const city = formData.get("addr_city");
  const province = formData.get("addr_province");
  const postalCode = formData.get("addr_postal_code");
  const country = formData.get("addr_country");

  const addrParts = {
    street: typeof street === "string" ? street.trim() : "",
    city: typeof city === "string" ? city.trim() : "",
    province: typeof province === "string" ? province.trim() : "",
    postal_code: typeof postalCode === "string" ? postalCode.trim() : "",
    country: typeof country === "string" ? country.trim() : "",
  };
  const billingAddress = Object.values(addrParts).some((v) => v)
    ? addrParts
    : null;

  const { data, error } = await supabase
    .from("profiles")
    .update({
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      company: typeof company === "string" ? company.trim() || null : null,
      phone: typeof phone === "string" ? phone.trim() || null : null,
      language: language === "en" ? "en" : "fr",
      billing_address: billingAddress,
    })
    .eq("id", user.id)
    .select("id");

  if (error) return { error: error.message };
  if (!data || data.length === 0) {
    return { error: "Mise à jour impossible." };
  }

  if (typeof newPassword === "string" && newPassword.length > 0) {
    const { error: pwErr } = await supabase.auth.updateUser({
      password: newPassword,
    });
    if (pwErr) return { error: `Mot de passe : ${pwErr.message}` };
  }

  revalidatePath("/profil");
  return { ok: true };
}
