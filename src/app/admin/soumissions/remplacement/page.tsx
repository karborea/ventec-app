import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { RemplacementForm } from "@/app/remplacement/remplacement-form";
import { createRemplacementAsAdmin } from "../proxy-actions";

export const metadata = {
  title: "Admin · Remplacement · Ventec",
};

type RpcRow = {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  company: string | null;
  role: "client" | "admin";
};

export default async function AdminRemplacementPage({
  searchParams,
}: {
  searchParams: Promise<{ client?: string }>;
}) {
  const params = await searchParams;
  const clientId = params.client;
  if (!clientId) redirect("/admin/soumissions/nouveau");

  const supabase = await createClient();
  const { data } = await supabase.rpc("list_users_for_admin");
  const rows: RpcRow[] = (data ?? []) as RpcRow[];
  const client = rows.find((r) => r.id === clientId && r.role === "client");
  if (!client) redirect("/admin/soumissions/nouveau");

  const fullName =
    `${client.first_name ?? ""} ${client.last_name ?? ""}`.trim();
  const label = client.company || fullName || client.email;

  return (
    <>
      <div className="bg-white border-b border-[#e3e6ec]">
        <div className="max-w-4xl mx-auto px-6 py-5">
          <div className="text-xs text-[#5a6278] mb-1">
            <Link href="/admin/soumissions" className="hover:underline">
              Soumissions
            </Link>{" "}
            ›{" "}
            <Link
              href="/admin/soumissions/nouveau"
              className="hover:underline"
            >
              Nouvelle
            </Link>{" "}
            › Remplacement pour {label}
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight">
            Remplacement
          </h1>
          <p className="text-xs text-[#5a6278] mt-1">
            Client : <span className="font-semibold">{label}</span> ·{" "}
            {client.email}
          </p>
        </div>
      </div>

      <main className="w-full max-w-6xl mx-auto px-6 py-8 pb-20">
        <RemplacementForm
          action={createRemplacementAsAdmin}
          cancelHref="/admin/soumissions"
          hiddenFields={{ target_user_id: clientId }}
        />
      </main>
    </>
  );
}
