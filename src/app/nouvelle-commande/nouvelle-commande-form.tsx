"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import type { SoumissionFormState } from "@/app/actions/soumissions";
import {
  KIT_EXTREMITE_PO,
  longueurTotale,
  getSouffleursChoice,
  SOUFFLEURS_RANGE,
  validateHauteurForRideau,
} from "@/lib/soumissions/rules";
import { HauteurIcon, LongueurIcon } from "@/components/measurement-icons";
import { OpeningSchema } from "./opening-schema";
import { MeasurementGuideButton } from "./measurement-guide-button";

type Materiau = "bois" | "acier" | "beton";
type RideauType = "simple" | "double";
type RideauGrandeur = "standard" | "hors_standard";

function parseNum(s: string): number | null {
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function formatFeetInches(po: number): string {
  if (!Number.isFinite(po) || po <= 0) return "";
  const ft = Math.floor(po / 12);
  const inches = po % 12;
  if (ft === 0) return `${inches} po`;
  if (inches === 0) return `${ft} pi`;
  return `${ft} pi ${inches} po`;
}

export type OpeningDraft = {
  /** Pieds — partie entière de la longueur. */
  longueur_pi: string;
  /** Pouces résiduels (0–11). Combiné avec longueur_pi pour total en po. */
  longueur_po: string;
  longueur_totale_po: string;
  materiau_haut: Materiau;
  materiau_bas: Materiau;
  rideau_type: RideauType;
  rideau_grandeur: RideauGrandeur | "";
  polymat_unique_hauteur_po: string;
  polymat_haut_hauteur_po: string;
  polymat_bas_hauteur_po: string;
  souffleurs_count: string;
  souffleurs_aux_deux_extremites: boolean;
};

type FormAction = (
  prev: SoumissionFormState | undefined,
  formData: FormData,
) => Promise<SoumissionFormState>;

type Props = {
  action: FormAction;
  initialProjectName?: string;
  initialOpenings?: OpeningDraft[];
  cancelHref?: string;
};

const MATERIAU_OPTIONS: { value: Materiau; label: string; color: string }[] = [
  { value: "bois", label: "Bois", color: "from-[#b08755] to-[#8a6538]" },
  { value: "acier", label: "Acier", color: "from-[#aab2bd] to-[#6e7480]" },
  { value: "beton", label: "Béton", color: "from-[#c8cbcf] to-[#979ba0]" },
];

const MATERIAU_LABELS: Record<Materiau, string> = {
  bois: "Bois",
  acier: "Acier",
  beton: "Béton",
};

function emptyOpening(): OpeningDraft {
  return {
    longueur_pi: "",
    longueur_po: "",
    longueur_totale_po: "",
    materiau_haut: "bois",
    materiau_bas: "acier",
    rideau_type: "simple",
    rideau_grandeur: "",
    polymat_unique_hauteur_po: "",
    polymat_haut_hauteur_po: "",
    polymat_bas_hauteur_po: "",
    souffleurs_count: "",
    souffleurs_aux_deux_extremites: false,
  };
}

function formatInches(raw: string): string {
  if (!raw) return "—";
  return `${raw} po`;
}

export function NouvelleCommandeForm({
  action,
  initialProjectName = "",
  initialOpenings,
  cancelHref = "/mes-soumissions",
}: Props) {
  const [state, formAction, pending] = useActionState<
    SoumissionFormState,
    FormData
  >(action, {});

  const [projectName, setProjectName] = useState(initialProjectName);
  const [openings, setOpenings] = useState<OpeningDraft[]>(
    initialOpenings && initialOpenings.length > 0
      ? initialOpenings
      : [emptyOpening()],
  );
  const [activeIndex, setActiveIndex] = useState(0);

  const active = openings[activeIndex];

  // Derived values for the active opening — longueur totale (po) =
  // pieds × 12 + pouces résiduels.
  const longueurPiNum = parseNum(active.longueur_pi);
  const longueurPoReste = parseNum(active.longueur_po);
  const longueurPo =
    longueurPiNum !== null || longueurPoReste !== null
      ? (longueurPiNum ?? 0) * 12 + (longueurPoReste ?? 0)
      : null;
  // Hauteur de référence (utilisée pour le calcul des souffleurs).
  // - Simple        → hauteur du polymat unique
  // - Double standard → hauteur de l'ouverture totale (longueur_totale_po)
  // - Double hors-standard → somme des hauteurs polymat haut + bas
  const hauteurPo =
    active.rideau_type === "simple"
      ? parseNum(active.polymat_unique_hauteur_po)
      : active.rideau_grandeur === "standard"
        ? parseNum(active.longueur_totale_po)
        : (parseNum(active.polymat_haut_hauteur_po) ?? 0) +
            (parseNum(active.polymat_bas_hauteur_po) ?? 0) || null;
  const souffleursChoice =
    hauteurPo !== null
      ? getSouffleursChoice(active.rideau_type, hauteurPo, longueurPo)
      : null;
  const souffleursRange = SOUFFLEURS_RANGE[active.rideau_type];
  const souffleursOutOfRange =
    hauteurPo !== null &&
    souffleursChoice === null &&
    (hauteurPo < souffleursRange.minPo || hauteurPo > souffleursRange.maxPo);
  const hauteurValidation =
    hauteurPo !== null
      ? validateHauteurForRideau(active.rideau_type, hauteurPo)
      : { ok: true as const };

  // Auto-check "aux 2 extrémités" when longueur crosses the threshold.
  const recommendAuxDeuxExt =
    souffleursChoice?.auxDeuxExtremitesRecommended ?? false;
  useEffect(() => {
    if (!recommendAuxDeuxExt) return;
    setOpenings((prev) =>
      prev.map((op, i) =>
        i === activeIndex && !op.souffleurs_aux_deux_extremites
          ? { ...op, souffleurs_aux_deux_extremites: true }
          : op,
      ),
    );
  }, [recommendAuxDeuxExt, activeIndex]);

  function updateActive(patch: Partial<OpeningDraft>) {
    setOpenings((prev) =>
      prev.map((op, i) => (i === activeIndex ? { ...op, ...patch } : op)),
    );
  }

  function addOpening() {
    setOpenings((prev) => {
      const next = [...prev, emptyOpening()];
      setActiveIndex(next.length - 1);
      return next;
    });
  }

  function removeOpening(idx: number) {
    setOpenings((prev) => {
      if (prev.length <= 1) return prev;
      const next = prev.filter((_, i) => i !== idx);
      setActiveIndex((ai) => {
        if (ai === idx) return Math.max(0, idx - 1);
        if (ai > idx) return ai - 1;
        return ai;
      });
      return next;
    });
  }

  const payload = useMemo(
    () =>
      JSON.stringify({
        project_name: projectName,
        openings: openings.map((op) => {
          const pi = parseNum(op.longueur_pi);
          const poReste = parseNum(op.longueur_po);
          const total =
            pi !== null || poReste !== null
              ? (pi ?? 0) * 12 + (poReste ?? 0)
              : null;
          return {
            ...op,
            longueur_po: total !== null ? String(total) : "",
          };
        }),
      }),
    [projectName, openings],
  );

  return (
    <form action={formAction}>
      <input type="hidden" name="payload" value={payload} />

      <div className="grid w-full grid-cols-1 md:grid-cols-[360px_minmax(0,1fr)] gap-6">
        {/* SIDEBAR */}
        <aside className="md:sticky md:top-6 md:self-start">
          {/* Tabs */}
          <div className="flex flex-wrap gap-1.5 mb-4">
            {openings.map((_, i) => (
              <div key={i} className="flex items-stretch">
                <button
                  type="button"
                  onClick={() => setActiveIndex(i)}
                  className={`px-3 py-2 rounded-l-lg text-[13px] font-semibold border-[1.5px] transition-colors ${
                    activeIndex === i
                      ? "bg-[#1b9ae0] text-white border-[#1b9ae0]"
                      : "bg-white text-[#5a6278] border-[#e3e6ec] hover:border-[#1b9ae0]/60"
                  } ${openings.length === 1 ? "rounded-r-lg" : ""}`}
                >
                  Ouverture {i + 1}
                </button>
                {openings.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeOpening(i)}
                    className={`px-2 border-[1.5px] border-l-0 rounded-r-lg text-sm transition-colors ${
                      activeIndex === i
                        ? "bg-[#1b9ae0] text-white border-[#1b9ae0] hover:bg-[#0f7bb5]"
                        : "bg-white text-[#5a6278] border-[#e3e6ec] hover:border-[#d94c4c] hover:text-[#d94c4c]"
                    }`}
                    aria-label={`Supprimer ouverture ${i + 1}`}
                    title="Supprimer"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={addOpening}
              className="px-3 py-2 rounded-lg text-[13px] font-semibold border-[1.5px] border-dashed border-[#c9d1dc] text-[#0f7bb5] hover:border-[#1b9ae0] hover:bg-[#1b9ae0]/[0.04]"
            >
              + Ajouter
            </button>
          </div>

          {/* Schema + Recap */}
          <div className="bg-white border border-[#e3e6ec] rounded-xl p-5">
            <h3 className="text-[11px] font-bold text-[#5a6278] uppercase tracking-[0.5px] mb-3">
              Aperçu de l&apos;ouverture
            </h3>
            <div className="mb-5">
              <OpeningSchema longueurPo={longueurPo} />
            </div>

            <h3 className="text-[11px] font-bold text-[#5a6278] uppercase tracking-[0.5px] mb-3 pt-4 border-t border-[#e3e6ec]">
              Votre sélection
            </h3>

            {/* Global */}
            <dl className="text-[13px] space-y-1.5">
              <div className="flex justify-between gap-3">
                <dt className="text-[#5a6278]">Projet</dt>
                <dd className="font-semibold text-right truncate max-w-[180px]">
                  {projectName || "—"}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-[#5a6278]">Nb d&apos;ouvertures</dt>
                <dd className="font-semibold">{openings.length}</dd>
              </div>
            </dl>

            {/* Per-opening summary */}
            {openings.map((op, i) => {
              const opPi = parseNum(op.longueur_pi);
              const opPo = parseNum(op.longueur_po);
              const opLongueurPo =
                opPi !== null || opPo !== null
                  ? (opPi ?? 0) * 12 + (opPo ?? 0)
                  : null;
              const total =
                opLongueurPo !== null ? opLongueurPo + 48 : null;
              const isActive = i === activeIndex;
              return (
                <div
                  key={i}
                  className={`mt-4 pt-3 border-t ${
                    isActive
                      ? "border-[#1b9ae0]/30"
                      : "border-dashed border-[#e3e6ec]"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[11px] font-bold uppercase tracking-[0.5px] px-2 py-0.5 rounded ${
                          isActive
                            ? "bg-[#1b9ae0] text-white"
                            : "bg-[#eef1f5] text-[#5a6278]"
                        }`}
                      >
                        Ouverture {i + 1}
                      </span>
                    </div>
                  </div>
                  <dl className="text-[13px] space-y-1">
                    <div className="flex justify-between gap-3">
                      <dt className="text-[#5a6278]">Matériau haut</dt>
                      <dd className="font-semibold">
                        {MATERIAU_LABELS[op.materiau_haut]}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-[#5a6278]">Matériau bas</dt>
                      <dd className="font-semibold">
                        {MATERIAU_LABELS[op.materiau_bas]}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-[#5a6278]">Longueur</dt>
                      <dd className="font-semibold">
                        {opLongueurPo !== null
                          ? formatFeetInches(opLongueurPo)
                          : "—"}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-[#5a6278]">+ Kit d&apos;extrémité</dt>
                      <dd className="font-semibold">48 po</dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-[#5a6278]">Rideau</dt>
                      <dd className="font-semibold capitalize">
                        {op.rideau_type}
                      </dd>
                    </div>
                    {op.rideau_type === "double" && (
                      <div className="flex justify-between gap-3">
                        <dt className="text-[#5a6278]">Grandeur</dt>
                        <dd className="font-semibold">
                          {op.rideau_grandeur === "standard"
                            ? "Standard"
                            : op.rideau_grandeur === "hors_standard"
                              ? "Hors-standard"
                              : "—"}
                        </dd>
                      </div>
                    )}
                    {op.rideau_type === "double" &&
                      (op.rideau_grandeur === "standard" ||
                        op.rideau_grandeur === "hors_standard") && (
                        <div className="flex justify-between gap-3">
                          <dt className="text-[#5a6278]">Hauteur totale</dt>
                          <dd className="font-semibold">
                            {op.longueur_totale_po
                              ? `${op.longueur_totale_po} po`
                              : "—"}
                          </dd>
                        </div>
                      )}
                    {op.rideau_type === "simple" ? (
                      <div className="flex justify-between gap-3">
                        <dt className="text-[#5a6278]">Hauteur</dt>
                        <dd className="font-semibold">
                          {formatInches(op.polymat_unique_hauteur_po)}
                        </dd>
                      </div>
                    ) : op.rideau_grandeur === "hors_standard" ? (
                      <>
                        <div className="flex justify-between gap-3">
                          <dt className="text-[#5a6278]">Polymat haut</dt>
                          <dd className="font-semibold">
                            {formatInches(op.polymat_haut_hauteur_po)}
                          </dd>
                        </div>
                        <div className="flex justify-between gap-3">
                          <dt className="text-[#5a6278]">Polymat bas</dt>
                          <dd className="font-semibold">
                            {formatInches(op.polymat_bas_hauteur_po)}
                          </dd>
                        </div>
                      </>
                    ) : null}
                    <div className="flex justify-between gap-3">
                      <dt className="text-[#5a6278]">Souffleurs</dt>
                      <dd className="font-semibold text-right">
                        {op.souffleurs_count || "—"}
                        {op.souffleurs_aux_deux_extremites && (
                          <span className="ml-1.5 text-[11px] font-normal text-[#5a6278]">
                            · 2 extrémités
                          </span>
                        )}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-3 pt-1.5 mt-1 border-t border-dashed border-[#e3e6ec]">
                      <dt className="text-[#5a6278] font-semibold">
                        Longueur totale
                      </dt>
                      <dd className="font-bold">
                        {total !== null ? `${total} po` : "—"}
                      </dd>
                    </div>
                  </dl>
                </div>
              );
            })}
          </div>
        </aside>

        {/* FORM */}
        <section className="min-w-0">
          {/* Project */}
          <div className="bg-white border border-[#e3e6ec] rounded-xl p-6 mb-5">
            <h2 className="text-[17px] font-bold mb-1">
              1. Informations du projet
            </h2>
            <p className="text-sm text-[#5a6278] mb-4">
              Nommez votre projet pour le retrouver facilement plus tard.
            </p>
            <label
              htmlFor="project_name"
              className="block text-sm font-semibold mb-1.5"
            >
              Nom du projet <span className="text-[#f37021]">*</span>
            </label>
            <input
              id="project_name"
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              required
              placeholder="Ex: Agrandissement étable ouest"
              className="w-full min-h-12 px-3.5 py-3 rounded-lg border-[1.5px] border-[#e3e6ec] bg-white focus:outline-none focus:border-[#1b9ae0] focus:ring-[3px] focus:ring-[#1b9ae0]/20"
            />
          </div>

          {/* Active opening block */}
          <div className="bg-white border border-[#e3e6ec] rounded-xl overflow-hidden">
            <div className="px-6 py-4 bg-[#fafbfc] border-b border-[#e3e6ec] flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2.5">
                <span className="bg-[#1b9ae0] text-white text-[11px] font-bold px-2.5 py-0.5 rounded uppercase tracking-[0.5px]">
                  Ouverture {activeIndex + 1}
                </span>
                {openings.length > 1 && (
                  <span className="text-sm text-[#5a6278]">
                    de {openings.length}
                  </span>
                )}
              </div>
              <MeasurementGuideButton label="Guide de mesures" />
            </div>
            <div className="p-6 space-y-8">

            {/* Longueur */}
            <section>
              <h3 className="text-[15px] font-bold mb-1 flex items-center gap-2">
                <LongueurIcon className="text-[#f37021] shrink-0" />
                2. Longueur de l&apos;ouverture
                <MeasurementGuideButton compact />
              </h3>
              <p className="text-sm text-[#5a6278] mb-3">
                Saisissez la longueur en pieds et pouces. Le kit
                d&apos;extrémité est ajouté automatiquement.
              </p>
              <div className="flex items-center gap-3 flex-wrap">
                <div className="relative w-[140px]">
                  <input
                    type="number"
                    min={0}
                    value={active.longueur_pi}
                    onChange={(e) =>
                      updateActive({ longueur_pi: e.target.value })
                    }
                    placeholder="100"
                    className="w-full min-h-12 px-3.5 pr-12 py-3 rounded-lg border-[1.5px] border-[#e3e6ec] bg-white focus:outline-none focus:border-[#1b9ae0] focus:ring-[3px] focus:ring-[#1b9ae0]/20"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[#5a6278] text-sm pointer-events-none">
                    pi
                  </span>
                </div>
                <div className="relative w-[140px]">
                  <input
                    type="number"
                    min={0}
                    max={11}
                    value={active.longueur_po}
                    onChange={(e) =>
                      updateActive({ longueur_po: e.target.value })
                    }
                    placeholder="6"
                    className="w-full min-h-12 px-3.5 pr-12 py-3 rounded-lg border-[1.5px] border-[#e3e6ec] bg-white focus:outline-none focus:border-[#1b9ae0] focus:ring-[3px] focus:ring-[#1b9ae0]/20"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[#5a6278] text-sm pointer-events-none">
                    po
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[13px] text-[#5a6278] flex-wrap">
                  <span>+</span>
                  <span className="bg-[#eef1f5] px-2.5 py-1.5 rounded-md font-mono">
                    {KIT_EXTREMITE_PO} po
                  </span>
                  <span>kit d&apos;extrémité =</span>
                  <span className="bg-[#f0f7fb] px-2.5 py-1.5 rounded-md font-mono font-semibold text-[#0f7bb5]">
                    {longueurPo !== null
                      ? formatFeetInches(longueurTotale(longueurPo))
                      : "— pi — po"}
                  </span>
                </div>
              </div>
            </section>

            {/* Matériaux */}
            <section>
              <h3 className="text-[15px] font-bold mb-1">
                3. Structure du bâtiment
              </h3>
              <p className="text-sm text-[#5a6278] mb-3">
                De quoi est fait le mur au-dessus et en dessous de
                l&apos;ouverture ?
              </p>

              <div className="mb-4">
                <label className="block text-sm font-semibold mb-2">
                  Matériau du haut
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {MATERIAU_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => updateActive({ materiau_haut: opt.value })}
                      className={`border-[1.5px] rounded-lg p-2.5 text-center flex flex-col items-center gap-1.5 transition-all ${
                        active.materiau_haut === opt.value
                          ? "border-[#1b9ae0] bg-[#1b9ae0]/[0.06] ring-1 ring-inset ring-[#1b9ae0]"
                          : "border-[#e3e6ec] bg-white hover:border-[#1b9ae0]"
                      }`}
                    >
                      <span
                        className={`w-12 h-12 rounded-md bg-gradient-to-br ${opt.color} border border-black/10`}
                      />
                      <span className="text-[13px] font-semibold">
                        {opt.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">
                  Matériau du bas
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {MATERIAU_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => updateActive({ materiau_bas: opt.value })}
                      className={`border-[1.5px] rounded-lg p-2.5 text-center flex flex-col items-center gap-1.5 transition-all ${
                        active.materiau_bas === opt.value
                          ? "border-[#1b9ae0] bg-[#1b9ae0]/[0.06] ring-1 ring-inset ring-[#1b9ae0]"
                          : "border-[#e3e6ec] bg-white hover:border-[#1b9ae0]"
                      }`}
                    >
                      <span
                        className={`w-12 h-12 rounded-md bg-gradient-to-br ${opt.color} border border-black/10`}
                      />
                      <span className="text-[13px] font-semibold">
                        {opt.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </section>

            {/* Type de rideau */}
            <section>
              <h3 className="text-[15px] font-bold mb-1">4. Type de rideau</h3>
              <p className="text-sm text-[#5a6278] mb-3">
                Le rideau double est recommandé au-delà de 10,5 pi (126 po) de
                hauteur.
              </p>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => updateActive({ rideau_type: "simple" })}
                  className={`border-[1.5px] rounded-lg p-3.5 text-left transition-all ${
                    active.rideau_type === "simple"
                      ? "border-[#1b9ae0] bg-[#1b9ae0]/[0.06] ring-1 ring-inset ring-[#1b9ae0]"
                      : "border-[#e3e6ec] bg-white hover:border-[#1b9ae0]"
                  }`}
                >
                  <div className="font-bold text-[15px]">Rideau simple</div>
                  <div className="text-xs text-[#5a6278] mt-0.5">
                    Hauteur 32 à 124 po · 1 polymat
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => updateActive({ rideau_type: "double" })}
                  className={`border-[1.5px] rounded-lg p-3.5 text-left transition-all ${
                    active.rideau_type === "double"
                      ? "border-[#1b9ae0] bg-[#1b9ae0]/[0.06] ring-1 ring-inset ring-[#1b9ae0]"
                      : "border-[#e3e6ec] bg-white hover:border-[#1b9ae0]"
                  }`}
                >
                  <div className="font-bold text-[15px]">Rideau double</div>
                  <div className="text-xs text-[#5a6278] mt-0.5">
                    Hauteur 92 à 185 po · 2 polymats empilés
                  </div>
                </button>
              </div>

              {/* Sub-option : grandeur (only for double) */}
              {active.rideau_type === "double" && (
                <div className="mt-4 pt-4 border-t border-dashed border-[#e3e6ec]">
                  <label className="block text-sm font-semibold mb-1">
                    Grandeur du rideau double{" "}
                    <span className="text-[#f37021]">*</span>
                  </label>
                  <p className="text-xs text-[#5a6278] mb-2.5">
                    Un rideau standard suit nos dimensions pré-configurées. Un
                    rideau hors-standard sera vérifié et ajusté par Ventec.
                  </p>
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() =>
                        updateActive({ rideau_grandeur: "standard" })
                      }
                      className={`border-[1.5px] rounded-lg p-3 text-left transition-all ${
                        active.rideau_grandeur === "standard"
                          ? "border-[#1b9ae0] bg-[#1b9ae0]/[0.06] ring-1 ring-inset ring-[#1b9ae0]"
                          : "border-[#e3e6ec] bg-white hover:border-[#1b9ae0]"
                      }`}
                    >
                      <div className="font-bold text-[14px]">Standard</div>
                      <div className="text-xs text-[#5a6278] mt-0.5">
                        Dimensions pré-configurées Ventec
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        updateActive({ rideau_grandeur: "hors_standard" })
                      }
                      className={`border-[1.5px] rounded-lg p-3 text-left transition-all ${
                        active.rideau_grandeur === "hors_standard"
                          ? "border-[#1b9ae0] bg-[#1b9ae0]/[0.06] ring-1 ring-inset ring-[#1b9ae0]"
                          : "border-[#e3e6ec] bg-white hover:border-[#1b9ae0]"
                      }`}
                    >
                      <div className="font-bold text-[14px]">Hors-standard</div>
                      <div className="text-xs text-[#5a6278] mt-0.5">
                        Dimensions personnalisées
                      </div>
                    </button>
                  </div>

                  {/* Additional dimension for Standard or Hors-standard double curtains */}
                  {(active.rideau_grandeur === "standard" ||
                    active.rideau_grandeur === "hors_standard") && (
                    <div className="mt-4 pt-4 border-t border-dashed border-[#e3e6ec]">
                      <label
                        htmlFor="longueur-totale"
                        className="block text-sm font-semibold mb-1 flex items-center gap-2"
                      >
                        <HauteurIcon className="text-[#1b9ae0] shrink-0" />
                        Hauteur de l&apos;ouverture totale{" "}
                        <span className="text-[#f37021]">*</span>
                        <MeasurementGuideButton compact />
                      </label>
                      <p className="text-xs text-[#5a6278] mb-2.5">
                        Indiquez la hauteur totale à couvrir, en pouces.
                      </p>
                      <div className="max-w-[260px] relative">
                        <input
                          id="longueur-totale"
                          type="number"
                          min={0}
                          value={active.longueur_totale_po}
                          onChange={(e) =>
                            updateActive({
                              longueur_totale_po: e.target.value,
                            })
                          }
                          placeholder="1440"
                          className="w-full min-h-12 px-3.5 pr-14 py-3 rounded-lg border-[1.5px] border-[#e3e6ec] bg-white focus:outline-none focus:border-[#1b9ae0] focus:ring-[3px] focus:ring-[#1b9ae0]/20"
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[#5a6278] text-sm pointer-events-none">
                          po
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </section>

            {/* Hauteurs — masqué en rideau double STANDARD car Ventec a
                déjà la répartition haut/bas pré-déterminée à l'interne.
                La hauteur totale (étape 4) est utilisée comme hauteur de
                référence pour le calcul des souffleurs. */}
            {!(active.rideau_type === "double" && active.rideau_grandeur === "standard") && (
            <section>
              <h3 className="text-[15px] font-bold mb-1 flex items-center gap-2">
                <HauteurIcon className="text-[#1b9ae0] shrink-0" />
                5. Hauteur des polymat
                <MeasurementGuideButton compact />
              </h3>
              <p className="text-sm text-[#5a6278] mb-3">
                {active.rideau_type === "simple"
                  ? "Hauteur de l'ouverture en pouces."
                  : "Entrez la hauteur de chaque polymat séparément."}
              </p>

              {active.rideau_type === "simple" ? (
                <div>
                  <div className="max-w-[260px] relative">
                    <input
                      type="number"
                      min={0}
                      value={active.polymat_unique_hauteur_po}
                      onChange={(e) =>
                        updateActive({
                          polymat_unique_hauteur_po: e.target.value,
                        })
                      }
                      placeholder="116"
                      className="w-full min-h-12 px-3.5 pr-14 py-3 rounded-lg border-[1.5px] border-[#e3e6ec] bg-white focus:outline-none focus:border-[#1b9ae0] focus:ring-[3px] focus:ring-[#1b9ae0]/20"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[#5a6278] text-sm pointer-events-none">
                      po
                    </span>
                  </div>
                  {!hauteurValidation.ok && (
                    <div className="mt-3 rounded-lg border border-[#f2d89a] bg-[#fff7e5] p-3 text-[13px] text-[#7a5d00] flex items-start gap-2.5">
                      <span aria-hidden>⚠</span>
                      <div className="flex-1">
                        <p>{hauteurValidation.message}</p>
                        {hauteurValidation.suggestion && (
                          <button
                            type="button"
                            onClick={() =>
                              updateActive({
                                rideau_type: hauteurValidation.suggestion!,
                              })
                            }
                            className="mt-2 text-xs font-bold underline hover:no-underline"
                          >
                            Basculer vers rideau{" "}
                            {hauteurValidation.suggestion}
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="border-[1.5px] border-[#e3e6ec] rounded-xl p-4 bg-[#fafbfc]">
                      <div className="flex items-center gap-2.5 mb-3">
                        <span className="bg-[#1b9ae0] text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-[0.5px]">
                          Polymat du haut
                        </span>
                      </div>
                      <div className="relative">
                        <input
                          type="number"
                          min={0}
                          value={active.polymat_haut_hauteur_po}
                          onChange={(e) =>
                            updateActive({
                              polymat_haut_hauteur_po: e.target.value,
                            })
                          }
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
                      </div>
                      <div className="relative">
                        <input
                          type="number"
                          min={0}
                          value={active.polymat_bas_hauteur_po}
                          onChange={(e) =>
                            updateActive({
                              polymat_bas_hauteur_po: e.target.value,
                            })
                          }
                          placeholder="70"
                          className="w-full min-h-12 px-3.5 pr-14 py-3 rounded-lg border-[1.5px] border-[#e3e6ec] bg-white focus:outline-none focus:border-[#1b9ae0] focus:ring-[3px] focus:ring-[#1b9ae0]/20"
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[#5a6278] text-sm pointer-events-none">
                          po
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap text-[13px]">
                    <HauteurIcon className="text-[#1b9ae0] shrink-0" />
                    <span className="text-[#5a6278]">
                      Hauteur de l&apos;ouverture totale =
                    </span>
                    <span className="bg-[#f0f7fb] text-[#0f7bb5] px-2.5 py-1.5 rounded-md font-mono font-semibold">
                      {hauteurPo !== null ? `${hauteurPo} po` : "— po"}
                    </span>
                  </div>

                  {!hauteurValidation.ok && (
                    <div className="rounded-lg border border-[#f2d89a] bg-[#fff7e5] p-3 text-[13px] text-[#7a5d00] flex items-start gap-2.5">
                      <span aria-hidden>⚠</span>
                      <div className="flex-1">
                        <p>{hauteurValidation.message}</p>
                        {hauteurValidation.suggestion && (
                          <button
                            type="button"
                            onClick={() =>
                              updateActive({
                                rideau_type: hauteurValidation.suggestion!,
                              })
                            }
                            className="mt-2 text-xs font-bold underline hover:no-underline"
                          >
                            Basculer vers rideau{" "}
                            {hauteurValidation.suggestion}
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </section>
            )}

            {/* Souffleurs */}
            <section>
              <h3 className="text-[15px] font-bold mb-1">6. Souffleurs</h3>
              <p className="text-sm text-[#5a6278] mb-3">
                Le nombre de souffleurs dépend de la hauteur du rideau.
                L&apos;option aux deux extrémités se propose automatiquement
                selon la longueur.
              </p>

              {hauteurPo === null ? (
                <div className="rounded-lg border border-dashed border-[#c9d1dc] bg-[#fafbfc] px-4 py-3 text-[13px] text-[#5a6278]">
                  Entrez d&apos;abord la hauteur du polymat (étape 5) pour voir
                  les options disponibles.
                </div>
              ) : souffleursOutOfRange ? (
                <div className="rounded-lg border border-[#f2d89a] bg-[#fff7e5] p-3 text-[13px] text-[#7a5d00] flex items-start gap-2.5">
                  <span aria-hidden>⚠</span>
                  <div>
                    Hauteur hors plage standard pour un rideau{" "}
                    {active.rideau_type} ({souffleursRange.minPo}–
                    {souffleursRange.maxPo} po). Ventec vous contactera pour
                    préciser le nombre de souffleurs.
                  </div>
                </div>
              ) : souffleursChoice ? (
                <div className="flex items-start gap-3 flex-wrap">
                  <div className="max-w-[240px]">
                    <select
                      value={active.souffleurs_count}
                      onChange={(e) =>
                        updateActive({ souffleurs_count: e.target.value })
                      }
                      className="w-full min-h-12 px-3.5 py-3 rounded-lg border-[1.5px] border-[#e3e6ec] bg-white focus:outline-none focus:border-[#1b9ae0] focus:ring-[3px] focus:ring-[#1b9ae0]/20"
                    >
                      <option value="">— Sélectionner —</option>
                      {souffleursChoice.baseOptions.map((n) => (
                        <option key={n} value={String(n)}>
                          {n} souffleur{n > 1 ? "s" : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="bg-[#f0f7fb] text-[#0f7bb5] px-2.5 py-1.5 rounded-md text-xs font-semibold">
                    Plage {souffleursChoice.rangeLabel}
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border border-[#f2d89a] bg-[#fff7e5] p-3 text-[13px] text-[#7a5d00] flex items-start gap-2.5">
                  <span aria-hidden>⚠</span>
                  <div>
                    Hauteur non couverte par la table standard. Ventec vous
                    contactera pour préciser.
                  </div>
                </div>
              )}

              <label className="mt-4 flex items-start gap-3 p-3 rounded-lg border-[1.5px] border-[#e3e6ec] bg-white hover:border-[#1b9ae0] cursor-pointer">
                <input
                  type="checkbox"
                  checked={active.souffleurs_aux_deux_extremites}
                  onChange={(e) =>
                    updateActive({
                      souffleurs_aux_deux_extremites: e.target.checked,
                    })
                  }
                  className="w-5 h-5 mt-0.5 accent-[#1b9ae0] shrink-0 cursor-pointer"
                />
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-[14px] flex items-center gap-2 flex-wrap">
                    Souffleries aux deux extrémités
                    {recommendAuxDeuxExt && (
                      <span className="inline-flex items-center gap-1 bg-[#e8f5ee] text-[#1f7a3a] px-1.5 py-0.5 rounded text-[11px] font-semibold">
                        ⚡ Recommandé
                      </span>
                    )}
                  </div>
                  <div className="text-[13px] text-[#5a6278]">
                    {souffleursChoice && longueurPo !== null && longueurPo >= souffleursChoice.doubleThresholdPo
                      ? `Longueur ${Math.round(longueurPo / 12)}′ ≥ seuil ${souffleursChoice.doubleThresholdFt}′. Souffleries des 2 côtés recommandées.`
                      : souffleursChoice
                        ? `Seuil : longueur ≥ ${souffleursChoice.doubleThresholdFt}′.`
                        : "Cochez si des souffleurs sont installés à gauche ET à droite."}
                  </div>
                </div>
              </label>
            </section>
            </div>
          </div>

          {state?.error && (
            <div
              role="alert"
              className="mt-5 rounded-lg border border-[#f4cccc] bg-[#fde9e9] px-4 py-3 text-sm text-[#a83030]"
            >
              {state.error}
            </div>
          )}

          {/* Actions */}
          <div className="mt-5 flex justify-between items-center gap-3 flex-wrap">
            <a
              href={cancelHref}
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
                className="min-h-12 px-5 py-3 rounded-lg border-[1.5px] border-[#e3e6ec] hover:border-[#5a6278] text-sm font-bold bg-white disabled:opacity-60"
              >
                {pending ? "Sauvegarde..." : "Enregistrer brouillon"}
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
        </section>
      </div>
    </form>
  );
}
