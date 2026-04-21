"use client";

import { useActionState, useState } from "react";
import {
  createNouvelleCommande,
  type SoumissionFormState,
} from "@/app/actions/soumissions";

type Materiau = "bois" | "acier" | "beton";
type RideauType = "simple" | "double";

const MATERIAU_OPTIONS: { value: Materiau; label: string; color: string }[] = [
  { value: "bois", label: "Bois", color: "from-[#b08755] to-[#8a6538]" },
  { value: "acier", label: "Acier", color: "from-[#aab2bd] to-[#6e7480]" },
  { value: "beton", label: "Béton", color: "from-[#c8cbcf] to-[#979ba0]" },
];

export function NouvelleCommandeForm() {
  const [state, formAction, pending] = useActionState<
    SoumissionFormState,
    FormData
  >(createNouvelleCommande, {});

  const [materiauHaut, setMateriauHaut] = useState<Materiau>("bois");
  const [materiauBas, setMateriauBas] = useState<Materiau>("acier");
  const [rideauType, setRideauType] = useState<RideauType>("simple");

  return (
    <form action={formAction} className="space-y-8">
      {/* 1. Project info */}
      <section>
        <h2 className="text-[17px] font-bold mb-1">
          1. Informations du projet
        </h2>
        <p className="text-sm text-[#5a6278] mb-4">
          Nommez votre projet pour le retrouver facilement plus tard.
        </p>
        <div>
          <label
            htmlFor="project_name"
            className="block text-sm font-semibold mb-1.5"
          >
            Nom du projet <span className="text-[#f37021]">*</span>
          </label>
          <input
            id="project_name"
            name="project_name"
            type="text"
            required
            placeholder="Ex: Agrandissement étable ouest"
            className="w-full min-h-12 px-3.5 py-3 rounded-lg border-[1.5px] border-[#e3e6ec] bg-white focus:outline-none focus:border-[#1b9ae0] focus:ring-[3px] focus:ring-[#1b9ae0]/20"
          />
        </div>
      </section>

      {/* 2. Longueur */}
      <section>
        <h2 className="text-[17px] font-bold mb-1">
          2. Longueur de l&apos;ouverture
        </h2>
        <p className="text-sm text-[#5a6278] mb-4">
          Largeur totale de l&apos;ouverture dans votre bâtiment, en pouces. Le
          kit d&apos;extrémité (48 po total) sera ajouté automatiquement.
        </p>
        <div className="max-w-[260px] relative">
          <input
            id="longueur_po"
            name="longueur_po"
            type="number"
            min={0}
            placeholder="1206"
            className="w-full min-h-12 px-3.5 pr-14 py-3 rounded-lg border-[1.5px] border-[#e3e6ec] bg-white focus:outline-none focus:border-[#1b9ae0] focus:ring-[3px] focus:ring-[#1b9ae0]/20"
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[#5a6278] text-sm pointer-events-none">
            po
          </span>
        </div>
      </section>

      {/* 3. Matériaux */}
      <section>
        <h2 className="text-[17px] font-bold mb-1">
          3. Structure du bâtiment
        </h2>
        <p className="text-sm text-[#5a6278] mb-4">
          De quoi est fait le mur au-dessus et en dessous de l&apos;ouverture ?
        </p>

        <div className="mb-5">
          <label className="block text-sm font-semibold mb-2">
            Matériau du haut
          </label>
          <input type="hidden" name="materiau_haut" value={materiauHaut} />
          <div className="grid grid-cols-3 gap-2">
            {MATERIAU_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setMateriauHaut(opt.value)}
                className={`border-[1.5px] rounded-lg p-2.5 text-center flex flex-col items-center gap-1.5 transition-all ${
                  materiauHaut === opt.value
                    ? "border-[#1b9ae0] bg-[#1b9ae0]/[0.06] ring-1 ring-inset ring-[#1b9ae0]"
                    : "border-[#e3e6ec] bg-white hover:border-[#1b9ae0]"
                }`}
              >
                <span
                  className={`w-12 h-12 rounded-md bg-gradient-to-br ${opt.color} border border-black/10`}
                />
                <span className="text-[13px] font-semibold">{opt.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold mb-2">
            Matériau du bas
          </label>
          <input type="hidden" name="materiau_bas" value={materiauBas} />
          <div className="grid grid-cols-3 gap-2">
            {MATERIAU_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setMateriauBas(opt.value)}
                className={`border-[1.5px] rounded-lg p-2.5 text-center flex flex-col items-center gap-1.5 transition-all ${
                  materiauBas === opt.value
                    ? "border-[#1b9ae0] bg-[#1b9ae0]/[0.06] ring-1 ring-inset ring-[#1b9ae0]"
                    : "border-[#e3e6ec] bg-white hover:border-[#1b9ae0]"
                }`}
              >
                <span
                  className={`w-12 h-12 rounded-md bg-gradient-to-br ${opt.color} border border-black/10`}
                />
                <span className="text-[13px] font-semibold">{opt.label}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* 4. Type de rideau */}
      <section>
        <h2 className="text-[17px] font-bold mb-1">4. Type de rideau</h2>
        <p className="text-sm text-[#5a6278] mb-4">
          Le rideau double est recommandé au-delà de 10,5 pi de hauteur.
        </p>
        <input type="hidden" name="rideau_type" value={rideauType} />
        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => setRideauType("simple")}
            className={`border-[1.5px] rounded-lg p-3.5 text-left transition-all ${
              rideauType === "simple"
                ? "border-[#1b9ae0] bg-[#1b9ae0]/[0.06] ring-1 ring-inset ring-[#1b9ae0]"
                : "border-[#e3e6ec] bg-white hover:border-[#1b9ae0]"
            }`}
          >
            <div className="font-bold text-[15px]">Rideau simple</div>
            <div className="text-xs text-[#5a6278] mt-0.5">
              Hauteur 3 pi à 10,5 pi · 1 polymat
            </div>
          </button>
          <button
            type="button"
            onClick={() => setRideauType("double")}
            className={`border-[1.5px] rounded-lg p-3.5 text-left transition-all ${
              rideauType === "double"
                ? "border-[#1b9ae0] bg-[#1b9ae0]/[0.06] ring-1 ring-inset ring-[#1b9ae0]"
                : "border-[#e3e6ec] bg-white hover:border-[#1b9ae0]"
            }`}
          >
            <div className="font-bold text-[15px]">Rideau double</div>
            <div className="text-xs text-[#5a6278] mt-0.5">
              Hauteur 8 pi à 14 pi · 2 polymats empilés
            </div>
          </button>
        </div>
      </section>

      {/* 5. Hauteurs */}
      <section>
        <h2 className="text-[17px] font-bold mb-1">
          5. Hauteur{rideauType === "double" ? "s" : ""} des polymats
        </h2>
        <p className="text-sm text-[#5a6278] mb-4">
          {rideauType === "simple"
            ? "Hauteur de l'ouverture en pouces."
            : "Un rideau double comporte deux polymats empilés. Entrez la hauteur de chacun séparément."}
        </p>

        {rideauType === "simple" ? (
          <div className="max-w-[260px] relative">
            <input
              id="polymat_unique_hauteur_po"
              name="polymat_unique_hauteur_po"
              type="number"
              min={0}
              placeholder="116"
              className="w-full min-h-12 px-3.5 pr-14 py-3 rounded-lg border-[1.5px] border-[#e3e6ec] bg-white focus:outline-none focus:border-[#1b9ae0] focus:ring-[3px] focus:ring-[#1b9ae0]/20"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[#5a6278] text-sm pointer-events-none">
              po
            </span>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="border-[1.5px] border-[#e3e6ec] rounded-xl p-4 bg-[#fafbfc]">
              <div className="flex items-center gap-2.5 mb-3">
                <span className="bg-[#1b9ae0] text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-[0.5px]">
                  Polymat du haut
                </span>
                <span className="text-xs text-[#5a6278]">
                  Polymat supérieur
                </span>
              </div>
              <div className="max-w-[260px] relative">
                <input
                  id="polymat_haut_hauteur_po"
                  name="polymat_haut_hauteur_po"
                  type="number"
                  min={0}
                  placeholder="62"
                  className="w-full min-h-12 px-3.5 pr-14 py-3 rounded-lg border-[1.5px] border-[#e3e6ec] bg-white focus:outline-none focus:border-[#1b9ae0] focus:ring-[3px] focus:ring-[#1b9ae0]/20"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[#5a6278] text-sm pointer-events-none">
                  po
                </span>
              </div>
            </div>

            <div className="border-[1.5px] border-[#e3e6ec] rounded-xl p-4 bg-[#fafbfc]">
              <div className="flex items-center gap-2.5 mb-3">
                <span className="bg-[#1a1f2e] text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-[0.5px]">
                  Polymat du bas
                </span>
                <span className="text-xs text-[#5a6278]">
                  Polymat inférieur
                </span>
              </div>
              <div className="max-w-[260px] relative">
                <input
                  id="polymat_bas_hauteur_po"
                  name="polymat_bas_hauteur_po"
                  type="number"
                  min={0}
                  placeholder="70"
                  className="w-full min-h-12 px-3.5 pr-14 py-3 rounded-lg border-[1.5px] border-[#e3e6ec] bg-white focus:outline-none focus:border-[#1b9ae0] focus:ring-[3px] focus:ring-[#1b9ae0]/20"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[#5a6278] text-sm pointer-events-none">
                  po
                </span>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* 6. Souffleurs */}
      <section>
        <h2 className="text-[17px] font-bold mb-1">6. Souffleurs</h2>
        <p className="text-sm text-[#5a6278] mb-4">
          Nombre de souffleurs à installer (sera validé par Ventec selon la
          table de référence).
        </p>
        <div className="max-w-[180px]">
          <input
            id="souffleurs_count"
            name="souffleurs_count"
            type="number"
            min={1}
            placeholder="3"
            className="w-full min-h-12 px-3.5 py-3 rounded-lg border-[1.5px] border-[#e3e6ec] bg-white focus:outline-none focus:border-[#1b9ae0] focus:ring-[3px] focus:ring-[#1b9ae0]/20"
          />
        </div>
      </section>

      {/* Errors */}
      {state?.error && (
        <div
          role="alert"
          className="rounded-lg border border-[#f4cccc] bg-[#fde9e9] px-4 py-3 text-sm text-[#a83030]"
        >
          {state.error}
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-between items-center pt-6 border-t border-[#e3e6ec] gap-3 flex-wrap">
        <a
          href="/mes-soumissions"
          className="text-sm font-semibold text-[#5a6278] hover:text-[#1a1f2e]"
        >
          ← Annuler
        </a>
        <div className="flex gap-2.5">
          <button
            type="submit"
            name="action"
            value="draft"
            disabled={pending}
            className="min-h-12 px-5 py-3 rounded-lg border-[1.5px] border-[#e3e6ec] hover:border-[#5a6278] text-sm font-bold disabled:opacity-60"
          >
            {pending ? "Sauvegarde..." : "Enregistrer comme brouillon"}
          </button>
          <button
            type="submit"
            name="action"
            value="submit"
            disabled={pending}
            className="min-h-12 px-6 py-3 rounded-lg bg-[#f37021] hover:bg-[#d85f16] text-white text-sm font-bold disabled:opacity-60"
          >
            {pending ? "Envoi..." : "Soumettre à Ventec →"}
          </button>
        </div>
      </div>
    </form>
  );
}
