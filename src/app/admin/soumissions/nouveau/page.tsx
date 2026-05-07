import { createClient } from "@/lib/supabase/server";
import { ClientPicker, type AdminClientLite } from "./client-picker";

export const metadata = {
  title: "Admin · Nouvelle soumission · Ventec",
};

type RpcRow = {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  company: string | null;
  role: "client" | "admin";
};

export default async function AdminNouvelleSoumissionPage() {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("list_users_for_admin");
  const rows: RpcRow[] = error || !data ? [] : (data as RpcRow[]);
  const clients: AdminClientLite[] = rows
    .filter((r) => r.role === "client")
    .map((r) => ({
      id: r.id,
      email: r.email,
      first_name: r.first_name,
      last_name: r.last_name,
      company: r.company,
    }));

  return (
    <main className="max-w-2xl w-full mx-auto px-6 pb-20 pt-8">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight">
          Nouvelle soumission
        </h1>
        <p className="text-[#5a6278] mt-1">
          Choisissez le client et le type de soumission à créer.
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded-lg border border-[#fde9e9] bg-[#fef5f5] px-4 py-3 text-sm text-[#d94c4c]">
          Impossible de charger les clients : {error.message}
        </div>
      )}

      <ClientPicker clients={clients} />
    </main>
  );
}
