import { createClient } from "@/lib/supabase/server";
import { signout } from "@/app/actions/auth";

export const metadata = {
  title: "Mes devis · Ventec",
};

export default async function MesDevisPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="flex-1 flex flex-col items-center justify-center py-10 px-5">
      <div className="max-w-md w-full bg-white rounded-2xl border border-[#e3e6ec] p-10 text-center">
        <h1 className="text-2xl font-extrabold mb-3">Mes devis</h1>
        <p className="text-[#5a6278] mb-6">
          Connecté en tant que{" "}
          <strong className="text-[#1a1f2e]">{user?.email}</strong>
        </p>
        <form action={signout}>
          <button
            type="submit"
            className="px-5 py-3 rounded-lg border-[1.5px] border-[#e3e6ec] hover:border-[#5a6278] font-semibold text-sm"
          >
            Se déconnecter
          </button>
        </form>
      </div>
    </div>
  );
}
