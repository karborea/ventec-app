import { createClient } from "@/lib/supabase/server";
import { AdminUsersView, type AdminUser } from "../admin-users-view";

export const metadata = {
  title: "Admin · Utilisateurs · Ventec",
};

export default async function AdminUtilisateursPage() {
  const supabase = await createClient();
  const [usersRes, authRes] = await Promise.all([
    supabase.rpc("list_users_for_admin"),
    supabase.auth.getUser(),
  ]);

  const users: AdminUser[] =
    usersRes.error || !usersRes.data ? [] : (usersRes.data as AdminUser[]);
  const clients = users.filter((u) => u.role === "client");
  const admins = users.filter((u) => u.role === "admin");
  const currentUserId = authRes.data.user?.id ?? "";

  return (
    <main className="max-w-5xl w-full mx-auto px-6 pb-20 pt-8">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight">
          Utilisateurs
        </h1>
        <p className="text-[#5a6278] mt-1">
          Gérez les comptes clients et administrateurs.
        </p>
      </div>

      {usersRes.error && (
        <div className="mb-6 rounded-lg border border-[#fde9e9] bg-[#fef5f5] px-4 py-3 text-sm text-[#d94c4c]">
          Impossible de charger les utilisateurs : {usersRes.error.message}
        </div>
      )}

      <AdminUsersView
        clients={clients}
        admins={admins}
        currentUserId={currentUserId}
      />
    </main>
  );
}
