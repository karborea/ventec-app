import { createClient } from "@/lib/supabase/server";
import { AdminSoumissionsList, type AdminSoumission } from "./list";

export const metadata = {
  title: "Admin · Soumissions · Ventec",
};

export default async function AdminSoumissionsPage() {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("list_soumissions_for_admin");
  const items: AdminSoumission[] =
    error || !data ? [] : (data as AdminSoumission[]);

  return (
    <main className="max-w-5xl w-full mx-auto px-6 pb-20 pt-8">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight">Soumissions</h1>
        <p className="text-[#5a6278] mt-1">
          Toutes les soumissions, tous clients confondus.
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded-lg border border-[#fde9e9] bg-[#fef5f5] px-4 py-3 text-sm text-[#d94c4c]">
          Impossible de charger les soumissions : {error.message}
        </div>
      )}

      <AdminSoumissionsList items={items} />
    </main>
  );
}
