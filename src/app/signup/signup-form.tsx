"use client";

import { useActionState, useState } from "react";
import { signup, type AuthState } from "@/app/actions/auth";

export function SignupForm() {
  const [state, formAction, pending] = useActionState<AuthState, FormData>(
    signup,
    {},
  );
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [language, setLanguage] = useState<"fr" | "en">("fr");

  // Password strength — basic heuristic
  const strength = (() => {
    if (password.length === 0) return null;
    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    if (score <= 1) return { label: "Faible", level: "weak" as const };
    if (score <= 2) return { label: "Moyenne", level: "medium" as const };
    return { label: "Forte", level: "strong" as const };
  })();

  if (state?.pendingConfirmation) {
    return (
      <div className="rounded-lg border border-[#d5e7f2] bg-[#f0f7fb] px-4 py-4 text-sm text-[#1a1f2e]">
        <div className="font-bold mb-1">✉ Vérifiez votre courriel</div>
        <p>
          Nous avons envoyé un lien de confirmation à votre adresse. Cliquez
          dessus pour activer votre compte.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label
            htmlFor="first_name"
            className="block text-sm font-semibold mb-1.5"
          >
            Prénom <span className="text-[#f37021]">*</span>
          </label>
          <input
            id="first_name"
            name="first_name"
            type="text"
            autoComplete="given-name"
            required
            placeholder="Martin"
            className="w-full min-h-12 px-3.5 py-3 rounded-lg border-[1.5px] border-[#e3e6ec] bg-white focus:outline-none focus:border-[#1b9ae0] focus:ring-[3px] focus:ring-[#1b9ae0]/20"
          />
        </div>
        <div>
          <label
            htmlFor="last_name"
            className="block text-sm font-semibold mb-1.5"
          >
            Nom <span className="text-[#f37021]">*</span>
          </label>
          <input
            id="last_name"
            name="last_name"
            type="text"
            autoComplete="family-name"
            required
            placeholder="Harrisson"
            className="w-full min-h-12 px-3.5 py-3 rounded-lg border-[1.5px] border-[#e3e6ec] bg-white focus:outline-none focus:border-[#1b9ae0] focus:ring-[3px] focus:ring-[#1b9ae0]/20"
          />
        </div>
      </div>

      <div>
        <label htmlFor="company" className="block text-sm font-semibold mb-1.5">
          Entreprise / Ferme{" "}
          <span className="font-normal text-[#5a6278]">(recommandé)</span>
        </label>
        <input
          id="company"
          name="company"
          type="text"
          autoComplete="organization"
          placeholder="Ferme Laitière Test Inc."
          className="w-full min-h-12 px-3.5 py-3 rounded-lg border-[1.5px] border-[#e3e6ec] bg-white focus:outline-none focus:border-[#1b9ae0] focus:ring-[3px] focus:ring-[#1b9ae0]/20"
        />
        <p className="text-xs text-[#5a6278] mt-1">
          Le nom qui apparaîtra sur votre devis PDF.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label
            htmlFor="email"
            className="block text-sm font-semibold mb-1.5"
          >
            Courriel <span className="text-[#f37021]">*</span>
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="vous@exemple.com"
            className="w-full min-h-12 px-3.5 py-3 rounded-lg border-[1.5px] border-[#e3e6ec] bg-white focus:outline-none focus:border-[#1b9ae0] focus:ring-[3px] focus:ring-[#1b9ae0]/20"
          />
        </div>
        <div>
          <label
            htmlFor="phone"
            className="block text-sm font-semibold mb-1.5"
          >
            Téléphone <span className="text-[#f37021]">*</span>
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            required
            placeholder="(450) 555-1234"
            className="w-full min-h-12 px-3.5 py-3 rounded-lg border-[1.5px] border-[#e3e6ec] bg-white focus:outline-none focus:border-[#1b9ae0] focus:ring-[3px] focus:ring-[#1b9ae0]/20"
          />
        </div>
      </div>

      <div>
        <label
          htmlFor="password"
          className="block text-sm font-semibold mb-1.5"
        >
          Mot de passe <span className="text-[#f37021]">*</span>
        </label>
        <div className="relative">
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Minimum 8 caractères"
            className="w-full min-h-12 px-3.5 pr-20 py-3 rounded-lg border-[1.5px] border-[#e3e6ec] bg-white focus:outline-none focus:border-[#1b9ae0] focus:ring-[3px] focus:ring-[#1b9ae0]/20"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-2 top-1/2 -translate-y-1/2 px-2.5 py-2 text-sm text-[#5a6278] hover:text-[#1a1f2e]"
          >
            {showPassword ? "Masquer" : "Afficher"}
          </button>
        </div>
        {strength && (
          <div className="flex gap-1 mt-2" aria-hidden>
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className={`flex-1 h-1 rounded-sm ${
                  (strength.level === "weak" && i < 1) ||
                  (strength.level === "medium" && i < 2) ||
                  (strength.level === "strong" && i < 4)
                    ? strength.level === "strong"
                      ? "bg-[#22a06b]"
                      : "bg-[#f37021]"
                    : "bg-[#e3e6ec]"
                }`}
              />
            ))}
          </div>
        )}
        {strength && (
          <p className="text-xs text-[#5a6278] mt-1">
            Force : <span className="font-semibold">{strength.label}</span>
          </p>
        )}
      </div>

      <div>
        <label className="block text-sm font-semibold mb-1.5">
          Langue préférée
        </label>
        <input type="hidden" name="language" value={language} />
        <div className="inline-flex border-[1.5px] border-[#e3e6ec] rounded-lg overflow-hidden bg-white">
          <button
            type="button"
            onClick={() => setLanguage("fr")}
            className={`px-4 py-2.5 text-sm font-semibold ${
              language === "fr"
                ? "bg-[#1b9ae0] text-white"
                : "text-[#5a6278]"
            }`}
          >
            Français
          </button>
          <button
            type="button"
            onClick={() => setLanguage("en")}
            className={`px-4 py-2.5 text-sm font-semibold ${
              language === "en"
                ? "bg-[#1b9ae0] text-white"
                : "text-[#5a6278]"
            }`}
          >
            English
          </button>
        </div>
      </div>

      <label className="flex gap-2.5 text-sm text-[#5a6278] pt-1">
        <input
          type="checkbox"
          name="terms"
          required
          className="w-4 h-4 mt-1 accent-[#1b9ae0] flex-shrink-0"
        />
        <span>
          J'accepte les{" "}
          <a href="#" className="text-[#0f7bb5] hover:underline">
            conditions d'utilisation
          </a>{" "}
          et la{" "}
          <a href="#" className="text-[#0f7bb5] hover:underline">
            politique de confidentialité
          </a>{" "}
          de Ventec.
        </span>
      </label>

      {state?.error && (
        <div
          role="alert"
          className="rounded-lg border border-[#f4cccc] bg-[#fde9e9] px-3.5 py-2.5 text-sm text-[#a83030]"
        >
          {state.error}
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full min-h-12 rounded-lg bg-[#f37021] hover:bg-[#d85f16] disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold text-[15px] transition-colors"
      >
        {pending ? "Création..." : "Créer mon compte"}
      </button>
    </form>
  );
}
