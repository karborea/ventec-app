import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { AdminSoumission } from "./soumissions/list";

export const metadata = {
  title: "Admin · Tableau de bord · Ventec",
};

type Soumission = {
  type: "nouvelle_commande" | "remplacement";
  status: "brouillon" | "soumis" | "envoye" | "accepte" | "refuse";
};

const STATUS_LABELS: Record<AdminSoumission["status"], string> = {
  brouillon: "Brouillon",
  soumis: "Soumis",
  envoye: "Envoyé",
  accepte: "Accepté",
  refuse: "Refusé",
};

const STATUS_CLASSES: Record<AdminSoumission["status"], string> = {
  brouillon: "bg-[#eef1f5] text-[#5a6278]",
  soumis: "bg-[#e9f4fb] text-[#0f7bb5]",
  envoye: "bg-[#efe9f8] text-[#5b3a9e]",
  accepte: "bg-[#eaf7f0] text-[#22a06b]",
  refuse: "bg-[#fde9e9] text-[#d94c4c]",
};

function clientLabel(s: AdminSoumission): string {
  if (s.user_company) return s.user_company;
  const name = `${s.user_first_name ?? ""} ${s.user_last_name ?? ""}`.trim();
  return name || s.user_email;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-CA", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default async function AdminDashboardPage() {
  const supabase = await createClient();

  const [clientsRes, soumissionsRes, recentRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "client"),
    supabase.from("soumissions").select("type, status").returns<Soumission[]>(),
    supabase.rpc("list_soumissions_for_admin"),
  ]);

  const clientsCount = clientsRes.count ?? 0;
  const soumissions = soumissionsRes.data ?? [];
  const recent: AdminSoumission[] = recentRes.error
    ? []
    : ((recentRes.data ?? []) as AdminSoumission[]).slice(0, 10);

  const nouvelleCommande = soumissions.filter(
    (s) => s.type === "nouvelle_commande",
  ).length;
  const remplacement = soumissions.filter(
    (s) => s.type === "remplacement",
  ).length;
  const brouillons = soumissions.filter((s) => s.status === "brouillon").length;
  const soumis = soumissions.filter((s) => s.status === "soumis").length;

  return (
    <main className="max-w-5xl w-full mx-auto px-6 pb-20 pt-8">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight">
          Tableau de bord
        </h1>
        <p className="text-[#5a6278] mt-1">
          Vue d&apos;ensemble des clients et soumissions.
        </p>
      </div>

      <section className="mb-8">
        <h2 className="text-xs font-bold text-[#5a6278] uppercase tracking-wider mb-3">
          Clients
        </h2>
        <KpiCard label="Comptes clients" value={clientsCount} />
      </section>

      <section className="mb-8">
        <h2 className="text-xs font-bold text-[#5a6278] uppercase tracking-wider mb-3">
          Soumissions par type
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <KpiCard label="Nouvelle commande" value={nouvelleCommande} />
          <KpiCard label="Remplacement" value={remplacement} />
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-xs font-bold text-[#5a6278] uppercase tracking-wider mb-3">
          Soumissions par statut
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <KpiCard label="Brouillons" value={brouillons} accent="#5a6278" />
          <KpiCard label="Soumises" value={soumis} accent="#1b9ae0" />
        </div>
      </section>

      <section>
        <div className="flex items-end justify-between mb-3">
          <h2 className="text-xs font-bold text-[#5a6278] uppercase tracking-wider">
            10 dernières soumissions
          </h2>
          <Link
            href="/admin/soumissions"
            className="text-xs font-bold text-[#F37021] hover:text-[#d85f16]"
          >
            Tout voir →
          </Link>
        </div>
        {recent.length === 0 ? (
          <div className="rounded-xl border-[1.5px] border-dashed border-[#e3e6ec] bg-white py-10 px-6 text-center text-sm text-[#5a6278]">
            Aucune soumission pour le moment.
          </div>
        ) : (
          <div className="space-y-2.5">
            {recent.map((s) => (
              <Link
                key={s.id}
                href={`/soumissions/${s.id}`}
                className="bg-white border-[1.5px] border-[#e3e6ec] rounded-xl p-4 grid grid-cols-[auto_1fr_auto] gap-4 items-center hover:border-[#c9d1dc] hover:shadow-[0_2px_12px_rgba(0,0,0,0.04)] transition-all"
              >
                <div
                  className={`w-11 h-11 rounded-xl flex items-center justify-center text-lg shrink-0 ${
                    s.type === "nouvelle_commande"
                      ? "bg-[#F37021]/10 text-[#F37021]"
                      : "bg-[#1b9ae0]/10 text-[#1b9ae0]"
                  }`}
                >
                  {s.type === "nouvelle_commande" ? "＋" : "↻"}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <span className="font-bold text-[#1a1f2e] text-[15px] truncate">
                      {s.project_name}
                    </span>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-[0.3px] ${STATUS_CLASSES[s.status]}`}
                    >
                      {STATUS_LABELS[s.status]}
                    </span>
                  </div>
                  <div className="text-xs text-[#5a6278] truncate">
                    {clientLabel(s)} · {s.user_email}
                  </div>
                </div>
                <div className="text-right text-xs text-[#5a6278] whitespace-nowrap">
                  <div className="font-semibold text-sm text-[#1a1f2e]">
                    #{s.soumission_number}
                  </div>
                  <div>{formatDate(s.created_at)}</div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function KpiCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: string;
}) {
  return (
    <div className="bg-white border-[1.5px] border-[#e3e6ec] rounded-xl p-5">
      <div className="text-xs font-semibold text-[#5a6278] uppercase tracking-wider mb-2">
        {label}
      </div>
      <div
        className="text-4xl font-extrabold tracking-tight"
        style={accent ? { color: accent } : undefined}
      >
        {value}
      </div>
    </div>
  );
}
