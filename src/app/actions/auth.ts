"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type AuthState = {
  error?: string;
  pendingConfirmation?: boolean;
};

export async function login(
  _prev: AuthState | undefined,
  formData: FormData,
): Promise<AuthState> {
  const email = formData.get("email");
  const password = formData.get("password");

  if (typeof email !== "string" || typeof password !== "string") {
    return { error: "Courriel et mot de passe requis." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: "Courriel ou mot de passe invalide." };
  }

  revalidatePath("/", "layout");
  redirect("/mes-devis");
}

export async function signup(
  _prev: AuthState | undefined,
  formData: FormData,
): Promise<AuthState> {
  const firstName = formData.get("first_name");
  const lastName = formData.get("last_name");
  const company = formData.get("company");
  const phone = formData.get("phone");
  const language = formData.get("language");
  const email = formData.get("email");
  const password = formData.get("password");
  const terms = formData.get("terms");

  if (
    typeof email !== "string" ||
    typeof password !== "string" ||
    typeof firstName !== "string" ||
    typeof lastName !== "string" ||
    !firstName.trim() ||
    !lastName.trim()
  ) {
    return { error: "Tous les champs requis doivent être remplis." };
  }

  if (password.length < 8) {
    return { error: "Le mot de passe doit contenir au moins 8 caractères." };
  }

  if (terms !== "on") {
    return { error: "Vous devez accepter les conditions d'utilisation." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        company: typeof company === "string" ? company.trim() : null,
        phone: typeof phone === "string" ? phone.trim() : null,
        language: language === "en" ? "en" : "fr",
      },
    },
  });

  if (error) {
    if (error.message.toLowerCase().includes("already registered")) {
      return { error: "Ce courriel est déjà utilisé." };
    }
    return { error: "Impossible de créer le compte. Réessayez." };
  }

  // If email confirmation is disabled in Supabase, a session is created right away.
  if (data.session) {
    revalidatePath("/", "layout");
    redirect("/mes-devis");
  }

  // Otherwise, user needs to confirm via email.
  return { pendingConfirmation: true };
}

export async function signout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
