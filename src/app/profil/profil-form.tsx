"use client";

import { useActionState, useState } from "react";
import { updateOwnProfile, type ProfilState } from "./actions";

type BillingAddress = {
  street?: string;
  city?: string;
  province?: string;
  postal_code?: string;
  country?: string;
};

export type ProfilData = {
  email: string;
  first_name: string;
  last_name: string;
  company: string | null;
  phone: string | null;
  language: string;
  billing_address: BillingAddress | null;
};

export function ProfilForm({ data }: { data: ProfilData }) {
  const [state, formAction, pending] = useActionState<
    ProfilState | undefined,
    FormData
  >(updateOwnProfile, undefined);
  const [pwd, setPwd] = useState("");

  return (
    <form
      action={formAction}
      className="bg-white border-[1.5px] border-[#e3e6ec] rounded-2xl p-6"
    >
      <h2 className="text-xs font-bold text-[#5a6278] uppercase tracking-wider mb-3">
        Informations
      </h2>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Courriel" full>
          <input
            type="email"
            value={data.email}
            disabled
            className="w-full border-[1.5px] border-[#e3e6ec] rounded-lg px-3 py-2 text-sm bg-[#fafbfc] text-[#5a6278]"
          />
        </Field>
        <Field label="Prénom">
          <input
            name="first_name"
            defaultValue={data.first_name}
            required
            className="w-full border-[1.5px] border-[#e3e6ec] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#F37021]"
          />
        </Field>
        <Field label="Nom">
          <input
            name="last_name"
            defaultValue={data.last_name}
            required
            className="w-full border-[1.5px] border-[#e3e6ec] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#F37021]"
          />
        </Field>
        <Field label="Entreprise" full>
          <input
            name="company"
            defaultValue={data.company ?? ""}
            className="w-full border-[1.5px] border-[#e3e6ec] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#F37021]"
          />
        </Field>
        <Field label="Téléphone">
          <input
            name="phone"
            defaultValue={data.phone ?? ""}
            className="w-full border-[1.5px] border-[#e3e6ec] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#F37021]"
          />
        </Field>
        <Field label="Langue">
          <select
            name="language"
            defaultValue={data.language === "en" ? "en" : "fr"}
            className="w-full border-[1.5px] border-[#e3e6ec] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#F37021] bg-white"
          >
            <option value="fr">Français</option>
            <option value="en">English</option>
          </select>
        </Field>
      </div>

      <h2 className="text-xs font-bold text-[#5a6278] uppercase tracking-wider mt-6 mb-3">
        Adresse de facturation
      </h2>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Rue" full>
          <input
            name="addr_street"
            defaultValue={data.billing_address?.street ?? ""}
            className="w-full border-[1.5px] border-[#e3e6ec] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#F37021]"
          />
        </Field>
        <Field label="Ville">
          <input
            name="addr_city"
            defaultValue={data.billing_address?.city ?? ""}
            className="w-full border-[1.5px] border-[#e3e6ec] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#F37021]"
          />
        </Field>
        <Field label="Province">
          <input
            name="addr_province"
            defaultValue={data.billing_address?.province ?? ""}
            placeholder="QC"
            className="w-full border-[1.5px] border-[#e3e6ec] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#F37021]"
          />
        </Field>
        <Field label="Code postal">
          <input
            name="addr_postal_code"
            defaultValue={data.billing_address?.postal_code ?? ""}
            placeholder="H2X 1Y4"
            className="w-full border-[1.5px] border-[#e3e6ec] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#F37021]"
          />
        </Field>
        <Field label="Pays">
          <input
            name="addr_country"
            defaultValue={data.billing_address?.country ?? "Canada"}
            className="w-full border-[1.5px] border-[#e3e6ec] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#F37021]"
          />
        </Field>
      </div>

      <h2 className="text-xs font-bold text-[#5a6278] uppercase tracking-wider mt-6 mb-3">
        Mot de passe
      </h2>
      <p className="text-xs text-[#5a6278] mb-2">
        Laissez vide pour conserver votre mot de passe actuel.
      </p>
      <input
        name="new_password"
        type="password"
        value={pwd}
        onChange={(e) => setPwd(e.target.value)}
        autoComplete="new-password"
        placeholder="Nouveau mot de passe (min. 8 caractères)"
        className="w-full border-[1.5px] border-[#e3e6ec] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#F37021]"
      />

      {state?.error && (
        <div className="mt-4 rounded-lg border border-[#fde9e9] bg-[#fef5f5] px-3 py-2 text-xs text-[#d94c4c]">
          {state.error}
        </div>
      )}
      {state?.ok && (
        <div className="mt-4 rounded-lg border border-[#d6f1e2] bg-[#eaf7f0] px-3 py-2 text-xs text-[#22a06b]">
          Profil mis à jour.
        </div>
      )}

      <div className="flex justify-end mt-6">
        <button
          type="submit"
          disabled={pending}
          className="px-4 py-2 rounded-lg bg-[#F37021] hover:bg-[#d85f16] disabled:opacity-60 text-white text-sm font-bold"
        >
          {pending ? "Enregistrement…" : "Enregistrer"}
        </button>
      </div>
    </form>
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
