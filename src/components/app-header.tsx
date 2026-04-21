import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { signout } from "@/app/actions/auth";

export async function AppHeader() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Fetch profile for display name / initials
  const { data: profile } = user
    ? await supabase
        .from("profiles")
        .select("first_name, last_name")
        .eq("id", user.id)
        .maybeSingle()
    : { data: null };

  const displayName =
    profile && (profile.first_name || profile.last_name)
      ? `${profile.first_name} ${profile.last_name}`.trim()
      : user?.email ?? "";

  const initials =
    profile && profile.first_name
      ? `${profile.first_name[0] ?? ""}${profile.last_name[0] ?? ""}`.toUpperCase()
      : (user?.email?.[0] ?? "?").toUpperCase();

  return (
    <header className="bg-white border-b border-[#e3e6ec] px-6 py-3 flex items-center justify-between">
      <div className="flex items-center gap-10">
        <Link href="/mes-soumissions" aria-label="Ventec — accueil">
          <Image
            src="/img/logo.png"
            alt="Ventec"
            width={196}
            height={56}
            priority
            className="h-8 w-auto"
          />
        </Link>
        <nav className="flex gap-6">
          <Link
            href="/mes-soumissions"
            className="text-sm font-semibold text-[#1a1f2e] border-b-2 border-[#F37021] py-1.5"
          >
            Mes soumissions
          </Link>
        </nav>
      </div>

      <div className="flex items-center gap-3">
        <div className="text-right hidden md:block">
          <div className="text-sm font-semibold text-[#1a1f2e]">
            {displayName}
          </div>
        </div>
        <div className="w-9 h-9 rounded-full bg-[#1b9ae0] text-white flex items-center justify-center font-bold text-sm">
          {initials}
        </div>
        <form action={signout}>
          <button
            type="submit"
            className="ml-1 text-sm text-[#5a6278] hover:text-[#1a1f2e] font-medium px-2 py-1"
            aria-label="Se déconnecter"
          >
            Déconnexion
          </button>
        </form>
      </div>
    </header>
  );
}
