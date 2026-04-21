"use client";

import { useActionState, useState } from "react";
import { login, type AuthState } from "@/app/actions/auth";

export function LoginForm() {
  const [state, formAction, pending] = useActionState<AuthState, FormData>(
    login,
    {},
  );
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label
          htmlFor="email"
          className="block text-sm font-semibold mb-1.5 text-[#1a1f2e]"
        >
          Courriel
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          autoFocus
          placeholder="vous@exemple.com"
          className="w-full min-h-12 px-3.5 py-3 rounded-lg border-[1.5px] border-[#e3e6ec] bg-white focus:outline-none focus:border-[#1b9ae0] focus:ring-[3px] focus:ring-[#1b9ae0]/20"
        />
      </div>

      <div>
        <label
          htmlFor="password"
          className="block text-sm font-semibold mb-1.5 text-[#1a1f2e]"
        >
          Mot de passe
        </label>
        <div className="relative">
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            placeholder="••••••••"
            className="w-full min-h-12 px-3.5 pr-20 py-3 rounded-lg border-[1.5px] border-[#e3e6ec] bg-white focus:outline-none focus:border-[#1b9ae0] focus:ring-[3px] focus:ring-[#1b9ae0]/20"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-2 top-1/2 -translate-y-1/2 px-2.5 py-2 text-sm text-[#5a6278] hover:text-[#1a1f2e]"
            aria-label={
              showPassword
                ? "Masquer le mot de passe"
                : "Afficher le mot de passe"
            }
          >
            {showPassword ? "Masquer" : "Afficher"}
          </button>
        </div>
      </div>

      <div className="flex justify-between items-center py-1 text-sm">
        <label className="flex items-center gap-2 font-medium text-[#5a6278] cursor-pointer">
          <input
            type="checkbox"
            name="remember"
            className="w-4 h-4 accent-[#1b9ae0]"
          />
          Se souvenir de moi
        </label>
        <a href="/forgot-password" className="text-[#0f7bb5] hover:underline">
          Mot de passe oublié ?
        </a>
      </div>

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
        {pending ? "Connexion..." : "Se connecter"}
      </button>
    </form>
  );
}
