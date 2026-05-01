"use client";

import { useActionState, useEffect, useState } from "react";
import {
  createUserAccount,
  deleteUserAccount,
  updateUserProfile,
  type CreateUserState,
  type DeleteUserState,
  type UpdateUserState,
} from "./actions";

const PWD_CHARS =
  "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";

function generatePassword(length = 14): string {
  const arr = new Uint32Array(length);
  crypto.getRandomValues(arr);
  return Array.from(arr, (n) => PWD_CHARS[n % PWD_CHARS.length]).join("");
}

export type BillingAddress = {
  street?: string;
  city?: string;
  province?: string;
  postal_code?: string;
  country?: string;
};

export type AdminUser = {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  company: string | null;
  phone: string | null;
  language: string;
  role: "client" | "admin";
  billing_address: BillingAddress | null;
  created_at: string;
};

function initials(u: AdminUser): string {
  if (u.company) {
    return u.company.slice(0, 2).toUpperCase();
  }
  if (u.first_name || u.last_name) {
    return `${u.first_name[0] ?? ""}${u.last_name[0] ?? ""}`.toUpperCase();
  }
  return (u.email[0] ?? "?").toUpperCase();
}

function fullName(u: AdminUser): string {
  return `${u.first_name} ${u.last_name}`.trim() || u.email;
}

export function AdminUsersView({
  clients,
  admins,
  currentUserId,
}: {
  clients: AdminUser[];
  admins: AdminUser[];
  currentUserId: string;
}) {
  const [editing, setEditing] = useState<AdminUser | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<AdminUser | null>(null);

  return (
    <>
      <div className="flex justify-end mb-4">
        <button
          onClick={() => setCreating(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#F37021] hover:bg-[#d85f16] text-white text-sm font-bold"
        >
          <span className="text-lg leading-none">＋</span>
          Ajouter un utilisateur
        </button>
      </div>

      <Section
        title="Administrateurs"
        count={admins.length}
        users={admins}
        onEdit={setEditing}
        onDelete={setDeleting}
        currentUserId={currentUserId}
        emptyHint="Aucun administrateur."
      />
      <div className="h-10" />
      <Section
        title="Clients"
        count={clients.length}
        users={clients}
        onEdit={setEditing}
        onDelete={setDeleting}
        currentUserId={currentUserId}
        emptyHint="Aucun client pour le moment."
      />

      {editing && (
        <EditDialog
          key={editing.id}
          user={editing}
          onClose={() => setEditing(null)}
        />
      )}
      {creating && <CreateDialog onClose={() => setCreating(false)} />}
      {deleting && (
        <DeleteUserDialog
          key={deleting.id}
          user={deleting}
          onClose={() => setDeleting(null)}
        />
      )}
    </>
  );
}

function Section({
  title,
  count,
  users,
  onEdit,
  onDelete,
  currentUserId,
  emptyHint,
}: {
  title: string;
  count: number;
  users: AdminUser[];
  onEdit: (u: AdminUser) => void;
  onDelete: (u: AdminUser) => void;
  currentUserId: string;
  emptyHint: string;
}) {
  return (
    <section>
      <h2 className="text-xs font-bold text-[#5a6278] uppercase tracking-wider mb-3">
        {title} ({count})
      </h2>
      {users.length === 0 ? (
        <div className="rounded-xl border-[1.5px] border-dashed border-[#e3e6ec] bg-white py-10 px-6 text-center text-sm text-[#5a6278]">
          {emptyHint}
        </div>
      ) : (
        <div className="space-y-2.5">
          {users.map((u) => (
            <div
              key={u.id}
              className="bg-white border-[1.5px] border-[#e3e6ec] rounded-xl p-4 grid grid-cols-[auto_1fr_auto_auto] gap-4 items-start hover:border-[#c9d1dc] hover:shadow-[0_2px_12px_rgba(0,0,0,0.04)] transition-all"
            >
              <button
                type="button"
                onClick={() => onEdit(u)}
                className="contents text-left"
                aria-label={`Modifier ${fullName(u)}`}
              >
                <div
                  className={`w-11 h-11 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${
                    u.role === "admin"
                      ? "bg-[#F37021] text-white"
                      : "bg-[#1b9ae0] text-white"
                  }`}
                >
                  {initials(u)}
                </div>
                <div className="min-w-0">
                  <div className="font-semibold text-[15px] text-[#1a1f2e] truncate">
                    {u.company || fullName(u)}
                  </div>
                  {u.company && (
                    <div className="text-xs text-[#5a6278] truncate">
                      {fullName(u)}
                    </div>
                  )}
                  <div className="text-xs text-[#5a6278] truncate">
                    {u.email}
                  </div>
                </div>
                <span className="text-[#5a6278] text-sm pt-1 self-center">
                  Modifier ›
                </span>
              </button>
              {u.id !== currentUserId ? (
                <button
                  type="button"
                  onClick={() => onDelete(u)}
                  aria-label={`Supprimer ${fullName(u)}`}
                  className="w-9 h-9 self-center flex items-center justify-center rounded-lg text-[#5a6278] hover:bg-[#fef5f5] hover:text-[#d94c4c]"
                >
                  <TrashIcon />
                </button>
              ) : (
                <div className="w-9 h-9" aria-hidden="true" />
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function EditDialog({
  user,
  onClose,
}: {
  user: AdminUser;
  onClose: () => void;
}) {
  const [state, formAction, pending] = useActionState<
    UpdateUserState | undefined,
    FormData
  >(updateUserProfile, undefined);

  // Close after a successful save (component is keyed per user, so
  // state.ok is reset on the next open).
  useEffect(() => {
    if (state?.ok) onClose();
  }, [state, onClose]);

  // Esc key to close.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-xl w-full max-w-lg"
      >
        <form action={formAction} className="p-6">
        <input type="hidden" name="user_id" value={user.id} />

        <div className="flex items-start justify-between mb-5">
          <div>
            <h3 className="text-lg font-extrabold tracking-tight">
              Modifier l&apos;utilisateur
            </h3>
            <p className="text-xs text-[#5a6278] mt-0.5">{user.email}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="text-[#5a6278] hover:text-[#1a1f2e] text-xl leading-none px-2"
          >
            ×
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Prénom">
            <input
              name="first_name"
              defaultValue={user.first_name}
              className="w-full border-[1.5px] border-[#e3e6ec] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#F37021]"
            />
          </Field>
          <Field label="Nom">
            <input
              name="last_name"
              defaultValue={user.last_name}
              className="w-full border-[1.5px] border-[#e3e6ec] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#F37021]"
            />
          </Field>
          <Field label="Entreprise" full>
            <input
              name="company"
              defaultValue={user.company ?? ""}
              className="w-full border-[1.5px] border-[#e3e6ec] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#F37021]"
            />
          </Field>
          <Field label="Téléphone">
            <input
              name="phone"
              defaultValue={user.phone ?? ""}
              className="w-full border-[1.5px] border-[#e3e6ec] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#F37021]"
            />
          </Field>
          <Field label="Langue">
            <select
              name="language"
              defaultValue={user.language === "en" ? "en" : "fr"}
              className="w-full border-[1.5px] border-[#e3e6ec] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#F37021] bg-white"
            >
              <option value="fr">Français</option>
              <option value="en">English</option>
            </select>
          </Field>
          <Field label="Rôle" full>
            <select
              name="role"
              defaultValue={user.role}
              className="w-full border-[1.5px] border-[#e3e6ec] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#F37021] bg-white"
            >
              <option value="client">Client</option>
              <option value="admin">Administrateur</option>
            </select>
          </Field>
        </div>

        <div className="mt-5 pt-5 border-t border-[#e3e6ec]">
          <h4 className="text-xs font-bold text-[#5a6278] uppercase tracking-wider mb-3">
            Adresse de facturation
          </h4>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Rue" full>
              <input
                name="addr_street"
                defaultValue={user.billing_address?.street ?? ""}
                className="w-full border-[1.5px] border-[#e3e6ec] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#F37021]"
              />
            </Field>
            <Field label="Ville">
              <input
                name="addr_city"
                defaultValue={user.billing_address?.city ?? ""}
                className="w-full border-[1.5px] border-[#e3e6ec] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#F37021]"
              />
            </Field>
            <Field label="Province">
              <input
                name="addr_province"
                defaultValue={user.billing_address?.province ?? ""}
                placeholder="QC"
                className="w-full border-[1.5px] border-[#e3e6ec] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#F37021]"
              />
            </Field>
            <Field label="Code postal">
              <input
                name="addr_postal_code"
                defaultValue={user.billing_address?.postal_code ?? ""}
                placeholder="H2X 1Y4"
                className="w-full border-[1.5px] border-[#e3e6ec] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#F37021]"
              />
            </Field>
            <Field label="Pays">
              <input
                name="addr_country"
                defaultValue={user.billing_address?.country ?? "Canada"}
                className="w-full border-[1.5px] border-[#e3e6ec] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#F37021]"
              />
            </Field>
          </div>
        </div>

        <PasswordSection />

        {state?.error && (
          <div className="mt-4 rounded-lg border border-[#fde9e9] bg-[#fef5f5] px-3 py-2 text-xs text-[#d94c4c]">
            {state.error}
          </div>
        )}

        <div className="flex justify-end gap-2 mt-6">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-[#5a6278] hover:text-[#1a1f2e]"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={pending}
            className="px-4 py-2 rounded-lg bg-[#F37021] hover:bg-[#d85f16] disabled:opacity-60 text-white text-sm font-bold"
          >
            {pending ? "Enregistrement…" : "Enregistrer"}
          </button>
        </div>
        </form>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
  full,
}: {
  label: string;
  children: React.ReactNode;
  full?: boolean;
}) {
  return (
    <label className={`block ${full ? "col-span-2" : ""}`}>
      <span className="block text-xs font-semibold text-[#5a6278] mb-1">
        {label}
      </span>
      {children}
    </label>
  );
}

function PasswordSection({ initial = "" }: { initial?: string }) {
  const [pwd, setPwd] = useState(initial);
  return (
    <div className="mt-5 pt-5 border-t border-[#e3e6ec]">
      <h4 className="text-xs font-bold text-[#5a6278] uppercase tracking-wider mb-3">
        Mot de passe
      </h4>
      <p className="text-xs text-[#5a6278] mb-2">
        Laissez vide pour conserver le mot de passe actuel.
      </p>
      <div className="flex gap-2">
        <input
          name="new_password"
          type="text"
          value={pwd}
          onChange={(e) => setPwd(e.target.value)}
          autoComplete="new-password"
          placeholder="Nouveau mot de passe"
          className="flex-1 font-mono border-[1.5px] border-[#e3e6ec] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#F37021]"
        />
        <button
          type="button"
          onClick={() => setPwd(generatePassword())}
          className="px-3 py-2 rounded-lg border-[1.5px] border-[#e3e6ec] hover:border-[#5a6278] text-xs font-bold text-[#1a1f2e]"
        >
          Générer
        </button>
      </div>
    </div>
  );
}

function CreateDialog({ onClose }: { onClose: () => void }) {
  const [pwd, setPwd] = useState(() => generatePassword());
  const [state, formAction, pending] = useActionState<
    CreateUserState | undefined,
    FormData
  >(createUserAccount, undefined);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  // If the server-confirmed creation succeeded, we keep the dialog
  // open and show the credentials so the admin can copy them.
  const created = state?.ok ? state : null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-xl w-full max-w-lg"
      >
        {created ? (
          <CreatedSummary
            email={created.email!}
            password={created.password!}
            onClose={onClose}
          />
        ) : (
          <form action={formAction} className="p-6">
            <div className="flex items-start justify-between mb-5">
              <div>
                <h3 className="text-lg font-extrabold tracking-tight">
                  Ajouter un utilisateur
                </h3>
                <p className="text-xs text-[#5a6278] mt-0.5">
                  Le compte est créé immédiatement (pas de courriel de
                  confirmation).
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Fermer"
                className="text-[#5a6278] hover:text-[#1a1f2e] text-xl leading-none px-2"
              >
                ×
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Type de compte" full>
                <select
                  name="role"
                  defaultValue="client"
                  className="w-full border-[1.5px] border-[#e3e6ec] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#F37021] bg-white"
                >
                  <option value="client">Client</option>
                  <option value="admin">Administrateur</option>
                </select>
              </Field>
              <Field label="Courriel" full>
                <input
                  name="email"
                  type="email"
                  required
                  className="w-full border-[1.5px] border-[#e3e6ec] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#F37021]"
                />
              </Field>
              <Field label="Prénom">
                <input
                  name="first_name"
                  className="w-full border-[1.5px] border-[#e3e6ec] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#F37021]"
                />
              </Field>
              <Field label="Nom">
                <input
                  name="last_name"
                  className="w-full border-[1.5px] border-[#e3e6ec] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#F37021]"
                />
              </Field>
              <Field label="Entreprise" full>
                <input
                  name="company"
                  className="w-full border-[1.5px] border-[#e3e6ec] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#F37021]"
                />
              </Field>
              <Field label="Téléphone">
                <input
                  name="phone"
                  className="w-full border-[1.5px] border-[#e3e6ec] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#F37021]"
                />
              </Field>
              <Field label="Langue">
                <select
                  name="language"
                  defaultValue="fr"
                  className="w-full border-[1.5px] border-[#e3e6ec] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#F37021] bg-white"
                >
                  <option value="fr">Français</option>
                  <option value="en">English</option>
                </select>
              </Field>
            </div>

            <div className="mt-5 pt-5 border-t border-[#e3e6ec]">
              <h4 className="text-xs font-bold text-[#5a6278] uppercase tracking-wider mb-3">
                Adresse de facturation (optionnelle)
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Rue" full>
                  <input
                    name="addr_street"
                    className="w-full border-[1.5px] border-[#e3e6ec] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#F37021]"
                  />
                </Field>
                <Field label="Ville">
                  <input
                    name="addr_city"
                    className="w-full border-[1.5px] border-[#e3e6ec] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#F37021]"
                  />
                </Field>
                <Field label="Province">
                  <input
                    name="addr_province"
                    placeholder="QC"
                    className="w-full border-[1.5px] border-[#e3e6ec] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#F37021]"
                  />
                </Field>
                <Field label="Code postal">
                  <input
                    name="addr_postal_code"
                    placeholder="H2X 1Y4"
                    className="w-full border-[1.5px] border-[#e3e6ec] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#F37021]"
                  />
                </Field>
                <Field label="Pays">
                  <input
                    name="addr_country"
                    defaultValue="Canada"
                    className="w-full border-[1.5px] border-[#e3e6ec] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#F37021]"
                  />
                </Field>
              </div>
            </div>

            <div className="mt-5 pt-5 border-t border-[#e3e6ec]">
              <h4 className="text-xs font-bold text-[#5a6278] uppercase tracking-wider mb-3">
                Mot de passe
              </h4>
              <div className="flex gap-2">
                <input
                  name="password"
                  type="text"
                  value={pwd}
                  onChange={(e) => setPwd(e.target.value)}
                  autoComplete="new-password"
                  required
                  className="flex-1 font-mono border-[1.5px] border-[#e3e6ec] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#F37021]"
                />
                <button
                  type="button"
                  onClick={() => setPwd(generatePassword())}
                  className="px-3 py-2 rounded-lg border-[1.5px] border-[#e3e6ec] hover:border-[#5a6278] text-xs font-bold text-[#1a1f2e]"
                >
                  Générer
                </button>
              </div>
            </div>

            {state?.error && (
              <div className="mt-4 rounded-lg border border-[#fde9e9] bg-[#fef5f5] px-3 py-2 text-xs text-[#d94c4c]">
                {state.error}
              </div>
            )}

            <div className="flex justify-end gap-2 mt-6">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-[#5a6278] hover:text-[#1a1f2e]"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={pending}
                className="px-4 py-2 rounded-lg bg-[#F37021] hover:bg-[#d85f16] disabled:opacity-60 text-white text-sm font-bold"
              >
                {pending ? "Création…" : "Créer l'utilisateur"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function CreatedSummary({
  email,
  password,
  onClose,
}: {
  email: string;
  password: string;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(
        `Courriel: ${email}\nMot de passe: ${password}`,
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-start justify-between mb-5">
        <div>
          <h3 className="text-lg font-extrabold tracking-tight">
            Compte créé
          </h3>
          <p className="text-xs text-[#5a6278] mt-0.5">
            Notez ces identifiants — le mot de passe ne sera plus affiché.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer"
          className="text-[#5a6278] hover:text-[#1a1f2e] text-xl leading-none px-2"
        >
          ×
        </button>
      </div>

      <div className="rounded-lg border border-[#e3e6ec] bg-[#fafbfc] p-4 space-y-2">
        <div className="text-xs font-semibold text-[#5a6278]">Courriel</div>
        <div className="font-mono text-sm">{email}</div>
        <div className="text-xs font-semibold text-[#5a6278] pt-2">
          Mot de passe
        </div>
        <div className="font-mono text-sm">{password}</div>
      </div>

      <div className="flex justify-end gap-2 mt-6">
        <button
          type="button"
          onClick={copy}
          className="px-4 py-2 rounded-lg border-[1.5px] border-[#e3e6ec] hover:border-[#5a6278] text-sm font-bold"
        >
          {copied ? "Copié ✓" : "Copier"}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 rounded-lg bg-[#F37021] hover:bg-[#d85f16] text-white text-sm font-bold"
        >
          Terminé
        </button>
      </div>
    </div>
  );
}

function DeleteUserDialog({
  user,
  onClose,
}: {
  user: AdminUser;
  onClose: () => void;
}) {
  const [state, formAction, pending] = useActionState<
    DeleteUserState | undefined,
    FormData
  >(deleteUserAccount, undefined);

  useEffect(() => {
    if (state?.ok) onClose();
  }, [state, onClose]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-xl w-full max-w-md"
      >
        <form action={formAction} className="p-6">
          <input type="hidden" name="user_id" value={user.id} />
          <h3 className="text-lg font-extrabold tracking-tight mb-2">
            Supprimer cet utilisateur ?
          </h3>
          <p className="text-sm text-[#5a6278] mb-1">
            <span className="font-semibold text-[#1a1f2e]">
              {fullName(user)}
            </span>
          </p>
          <p className="text-xs text-[#5a6278] mb-4">{user.email}</p>
          <p className="text-sm text-[#d94c4c]">
            Cette action supprime également toutes les soumissions liées à
            cet utilisateur. Elle est irréversible.
          </p>

          {state?.error && (
            <div className="mt-4 rounded-lg border border-[#fde9e9] bg-[#fef5f5] px-3 py-2 text-xs text-[#d94c4c]">
              {state.error}
            </div>
          )}

          <div className="flex justify-end gap-2 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm font-semibold text-[#5a6278] hover:text-[#1a1f2e]"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={pending}
              className="px-4 py-2 rounded-lg bg-[#d94c4c] hover:bg-[#bd3a3a] disabled:opacity-60 text-white text-sm font-bold"
            >
              {pending ? "Suppression…" : "Supprimer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function TrashIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 6h18" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </svg>
  );
}
