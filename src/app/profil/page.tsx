import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppHeader } from "@/components/app-header";
import { ProfilForm, type ProfilData } from "./profil-form";

export const metadata = {
  title: "Mon profil · Ventec",
};

export default async function ProfilPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "first_name, last_name, company, phone, language, billing_address",
    )
    .eq("id", user.id)
    .maybeSingle();

  const data: ProfilData = {
    email: user.email ?? "",
    first_name: profile?.first_name ?? "",
    last_name: profile?.last_name ?? "",
    company: profile?.company ?? null,
    phone: profile?.phone ?? null,
    language: profile?.language ?? "fr",
    billing_address: profile?.billing_address ?? null,
  };

  return (
    <>
      <AppHeader />
      <main className="max-w-2xl w-full mx-auto px-6 pb-20 pt-8">
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold tracking-tight">Mon profil</h1>
          <p className="text-[#5a6278] mt-1">
            Mettez à jour vos informations personnelles et votre mot de passe.
          </p>
        </div>
        <ProfilForm data={data} />
      </main>
    </>
  );
}
