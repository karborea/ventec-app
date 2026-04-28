"use client";

import { useActionState, useMemo, useState } from "react";
import type { SoumissionFormState } from "@/app/actions/soumissions";
import {
  getCellsForHauteurSimple,
  MODELES_POLYMAT,
  type ModelePolymat,
} from "@/lib/soumissions/rules";
import { HauteurIcon, LongueurIcon } from "@/components/measurement-icons";
import { FileDropzone } from "@/components/file-dropzone";
import { PolymatDrawing } from "./polymat-drawing";

type ManufacturierOrigine = "ventec" | "autre";
type Systeme = "simple" | "double";
type RideauARemplacer = "haut" | "bas" | "les_deux";

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

export type RemplacementOpeningDraft = {
  systeme: Systeme;
  rideau_a_remplacer: RideauARemplacer | "";
  hauteur_support_simple_po: string;
  hauteur_support_haut_po: string;
  hauteur_support_bas_po: string;
  modele_polymat: ModelePolymat | "";
  /** Longueur du polymat — partie en pieds. */
  longueur_pi: string;
  /** Longueur du polymat — pouces résiduels (0–11). Total envoyé au server
   *  = longueur_pi × 12 + longueur_po. */
  longueur_po: string;
  nb_cellules_simple: string;
  nb_cellules_haut: string;
  nb_cellules_bas: string;
  /** Systeme simple : nombre total de souffleurs (1–4). */
  souffleurs_count: string;
  /** Systeme double : souffleurs côté haut (1–4). */
  souffleurs_count_haut: string;
  /** Systeme double : souffleurs côté bas (1–4). */
  souffleurs_count_bas: string;
  souffleurs_aux_deux_extremites: boolean;
};

type FormAction = (
  prev: SoumissionFormState | undefined,
  formData: FormData,
) => Promise<SoumissionFormState>;

type Props = {
  action: FormAction;
  initialProjectName?: string;
  initialManufacturier?: ManufacturierOrigine;
  initialOpenings?: RemplacementOpeningDraft[];
  cancelHref?: string;
};

function emptyOpening(): RemplacementOpeningDraft {
  return {
    systeme: "simple",
    rideau_a_remplacer: "",
    hauteur_support_simple_po: "",
    hauteur_support_haut_po: "",
    hauteur_support_bas_po: "",
    modele_polymat: "",
    longueur_pi: "",
    longueur_po: "",
    nb_cellules_simple: "",
    nb_cellules_haut: "",
    nb_cellules_bas: "",
    souffleurs_count: "",
    souffleurs_count_haut: "",
    souffleurs_count_bas: "",
    souffleurs_aux_deux_extremites: false,
  };
}

function formatInches(raw: string): string {
  if (!raw) return "—";
  return `${raw} po`;
}

const SYSTEME_LABELS: Record<Systeme, string> = {
  simple: "Simple",
  double: "Double",
};

const RIDEAU_REPL_LABELS: Record<RideauARemplacer, string> = {
  haut: "Rideau du haut",
  bas: "Rideau du bas",
  les_deux: "Les deux",
};

export function RemplacementForm({
  action,
  initialProjectName = "",
  initialManufacturier = "ventec",
  initialOpenings,
  cancelHref = "/mes-soumissions",
}: Props) {
  const [state, formAction, pending] = useActionState<
    SoumissionFormState,
    FormData
  >(action, {});

  const [projectName, setProjectName] = useState(initialProjectName);
  const [manufacturier, setManufacturier] =
    useState<ManufacturierOrigine>(initialManufacturier);
  const [openings, setOpenings] = useState<RemplacementOpeningDraft[]>(
    initialOpenings && initialOpenings.length > 0
      ? initialOpenings
      : [emptyOpening()],
  );
  const [activeIndex, setActiveIndex] = useState(0);

  const active = openings[activeIndex];

  // Saisie en pieds + pouces, convertie en pouces totaux pour la BD.
  const longueurPi = parseNum(active.longueur_pi);
  const longueurPoReste = parseNum(active.longueur_po);
  const longueurPo =
    longueurPi !== null || longueurPoReste !== null
      ? (longueurPi ?? 0) * 12 + (longueurPoReste ?? 0)
      : null;

  const hauteurSimplePo = parseNum(active.hauteur_support_simple_po);
  const hauteurHautPo = parseNum(active.hauteur_support_haut_po);
  const hauteurBasPo = parseNum(active.hauteur_support_bas_po);
  const cellsSimpleRec =
    hauteurSimplePo !== null ? getCellsForHauteurSimple(hauteurSimplePo) : null;

  // Cellules en systeme double : lookup INDÉPENDANT par côté dans la
  // table simple, basé sur la hauteur du support de ce côté. (Même logique
  // pour les_deux, haut ou bas — chaque côté est traité individuellement.)
  let cellsHautRec: number | null = null;
  let cellsBasRec: number | null = null;
  if (active.systeme === "double") {
    const showHaut =
      active.rideau_a_remplacer === "haut" ||
      active.rideau_a_remplacer === "les_deux";
    const showBas =
      active.rideau_a_remplacer === "bas" ||
      active.rideau_a_remplacer === "les_deux";
    if (showHaut && hauteurHautPo !== null) {
      cellsHautRec = getCellsForHauteurSimple(hauteurHautPo);
    }
    if (showBas && hauteurBasPo !== null) {
      cellsBasRec = getCellsForHauteurSimple(hauteurBasPo);
    }
  }

  function updateActive(patch: Partial<RemplacementOpeningDraft>) {
    setOpenings((prev) =>
      prev.map((op, i) => (i === activeIndex ? { ...op, ...patch } : op)),
    );
  }

  // Change le rideau à remplacer ET vide les champs du côté non remplacé
  // (hauteur du support, cellules, souffleurs) pour éviter les conflits.
  function setRideauARemplacer(value: RideauARemplacer) {
    const patch: Partial<RemplacementOpeningDraft> = {
      rideau_a_remplacer: value,
    };
    if (value === "haut") {
      patch.hauteur_support_bas_po = "";
      patch.nb_cellules_bas = "";
      patch.souffleurs_count_bas = "";
    } else if (value === "bas") {
      patch.hauteur_support_haut_po = "";
      patch.nb_cellules_haut = "";
      patch.souffleurs_count_haut = "";
    }
    updateActive(patch);
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
        manufacturier_origine: manufacturier,
        // Convertit longueur_pi + longueur_po (résidu) en pouces totaux
        // avant envoi au server.
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
    [projectName, manufacturier, openings],
  );

  // Choix de souffleurs : 1–4 pour Ventec, 1–8 pour autre manufacturier.
  const souffleurOptions =
    manufacturier === "autre"
      ? [1, 2, 3, 4, 5, 6, 7, 8]
      : [1, 2, 3, 4];

  const isDouble = active.systeme === "double";
  // En remplacement avec autre manufacturier + rideau simple, on met la
  // hauteur (3) et la longueur (5) côte à côte (2 colonnes). La section 4
  // étant masquée pour autre, le grid contient juste 3 et 5.
  const sideBySideHauteurLongueur =
    !isDouble && manufacturier === "autre";
  // En systeme double : on n'affiche que les côtés effectivement remplacés
  // (hauteur du support, cellules, souffleurs). Évite les conflits de
  // données : seule la configuration active reste à l'écran.
  const replaceHaut =
    isDouble &&
    (active.rideau_a_remplacer === "haut" ||
      active.rideau_a_remplacer === "les_deux");
  const replaceBas =
    isDouble &&
    (active.rideau_a_remplacer === "bas" ||
      active.rideau_a_remplacer === "les_deux");

  return (
    <form action={formAction}>
      <input type="hidden" name="payload" value={payload} />

      <div className="grid w-full grid-cols-1 md:grid-cols-[360px_minmax(0,1fr)] gap-6">
        {/* SIDEBAR */}
        <aside className="md:sticky md:top-6 md:self-start">
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

          <div className="bg-white border border-[#e3e6ec] rounded-xl p-5">
            <h3 className="text-[11px] font-bold text-[#5a6278] uppercase tracking-[0.5px] mb-3">
              Schéma du système
            </h3>
            <div className="mb-5 flex justify-center">
              <PolymatDrawing
                systeme={active.systeme}
                className="h-48 w-auto"
              />
            </div>

            <h3 className="text-[11px] font-bold text-[#5a6278] uppercase tracking-[0.5px] mb-3 pt-4 border-t border-[#e3e6ec]">
              Votre sélection
            </h3>

            <dl className="text-[13px] space-y-1.5">
              <div className="flex justify-between gap-3">
                <dt className="text-[#5a6278]">Projet</dt>
                <dd className="font-semibold text-right truncate max-w-[180px]">
                  {projectName || "—"}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-[#5a6278]">Manufacturier</dt>
                <dd className="font-semibold">
                  {manufacturier === "ventec" ? "Ventec" : "Autre"}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-[#5a6278]">Nb d&apos;ouvertures</dt>
                <dd className="font-semibold">{openings.length}</dd>
              </div>
            </dl>

            {openings.map((op, i) => {
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
                  <dl className="text-[13px] space-y-1">
                    <div className="flex justify-between gap-3">
                      <dt className="text-[#5a6278]">Système</dt>
                      <dd className="font-semibold">
                        {SYSTEME_LABELS[op.systeme]}
                      </dd>
                    </div>
                    {op.systeme === "double" && op.rideau_a_remplacer && (
                      <div className="flex justify-between gap-3">
                        <dt className="text-[#5a6278]">À remplacer</dt>
                        <dd className="font-semibold">
                          {RIDEAU_REPL_LABELS[op.rideau_a_remplacer]}
                        </dd>
                      </div>
                    )}
                    {manufacturier === "ventec" && (
                      <div className="flex justify-between gap-3">
                        <dt className="text-[#5a6278]">Modèle</dt>
                        <dd className="font-semibold">
                          {op.modele_polymat
                            ? MODELES_POLYMAT.find(
                                (m) => m.value === op.modele_polymat,
                              )?.label
                            : "—"}
                        </dd>
                      </div>
                    )}
                    <div className="flex justify-between gap-3">
                      <dt className="text-[#5a6278]">Longueur polymat</dt>
                      <dd className="font-semibold">
                        {op.longueur_pi || op.longueur_po
                          ? `${op.longueur_pi || "0"} pi${op.longueur_po ? ` ${op.longueur_po} po` : ""}`
                          : "—"}
                      </dd>
                    </div>
                    {op.systeme === "simple" ? (
                      <>
                        <div className="flex justify-between gap-3">
                          <dt className="text-[#5a6278]">Hauteur support</dt>
                          <dd className="font-semibold">
                            {formatInches(op.hauteur_support_simple_po)}
                          </dd>
                        </div>
                        <div className="flex justify-between gap-3">
                          <dt className="text-[#5a6278]">Cellules</dt>
                          <dd className="font-semibold">
                            {op.nb_cellules_simple || "—"}
                          </dd>
                        </div>
                      </>
                    ) : (
                      (() => {
                        const showHaut =
                          op.rideau_a_remplacer === "haut" ||
                          op.rideau_a_remplacer === "les_deux";
                        const showBas =
                          op.rideau_a_remplacer === "bas" ||
                          op.rideau_a_remplacer === "les_deux";
                        return (
                          <>
                            {showHaut && (
                              <>
                                <div className="flex justify-between gap-3">
                                  <dt className="text-[#5a6278]">Support haut</dt>
                                  <dd className="font-semibold">
                                    {formatInches(op.hauteur_support_haut_po)}
                                  </dd>
                                </div>
                                <div className="flex justify-between gap-3">
                                  <dt className="text-[#5a6278]">Cellules haut</dt>
                                  <dd className="font-semibold">
                                    {op.nb_cellules_haut || "—"}
                                  </dd>
                                </div>
                              </>
                            )}
                            {showBas && (
                              <>
                                <div className="flex justify-between gap-3">
                                  <dt className="text-[#5a6278]">Support bas</dt>
                                  <dd className="font-semibold">
                                    {formatInches(op.hauteur_support_bas_po)}
                                  </dd>
                                </div>
                                <div className="flex justify-between gap-3">
                                  <dt className="text-[#5a6278]">Cellules bas</dt>
                                  <dd className="font-semibold">
                                    {op.nb_cellules_bas || "—"}
                                  </dd>
                                </div>
                              </>
                            )}
                          </>
                        );
                      })()
                    )}
                    {op.systeme === "simple" ? (
                      <div className="flex justify-between gap-3">
                        <dt className="text-[#5a6278]">Souffleurs</dt>
                        <dd className="font-semibold">
                          {op.souffleurs_count || "—"}
                          {op.souffleurs_aux_deux_extremites && (
                            <span className="ml-1.5 text-[11px] font-normal text-[#5a6278]">
                              · 2 extrémités
                            </span>
                          )}
                        </dd>
                      </div>
                    ) : (
                      <>
                        {(op.rideau_a_remplacer === "haut" ||
                          op.rideau_a_remplacer === "les_deux") && (
                          <div className="flex justify-between gap-3">
                            <dt className="text-[#5a6278]">Soufflerie haut</dt>
                            <dd className="font-semibold">
                              {op.souffleurs_count_haut || "—"}
                            </dd>
                          </div>
                        )}
                        {(op.rideau_a_remplacer === "bas" ||
                          op.rideau_a_remplacer === "les_deux") && (
                          <div className="flex justify-between gap-3">
                            <dt className="text-[#5a6278]">Soufflerie bas</dt>
                            <dd className="font-semibold">
                              {op.souffleurs_count_bas || "—"}
                              {op.souffleurs_aux_deux_extremites && (
                                <span className="ml-1.5 text-[11px] font-normal text-[#5a6278]">
                                  · 2 extrémités
                                </span>
                              )}
                            </dd>
                          </div>
                        )}
                      </>
                    )}
                  </dl>
                </div>
              );
            })}
          </div>
        </aside>

        {/* FORM */}
        <section className="min-w-0">
          {/* Project + manufacturier */}
          <div className="bg-white border border-[#e3e6ec] rounded-xl p-6 mb-5">
            <h2 className="text-[17px] font-bold mb-1">
              1. Informations du projet
            </h2>
            <p className="text-sm text-[#5a6278] mb-4">
              Remplacement de rideau sur un système existant.
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
              placeholder="Ex: Remplacement étable principale"
              className="w-full min-h-12 px-3.5 py-3 rounded-lg border-[1.5px] border-[#e3e6ec] bg-white focus:outline-none focus:border-[#1b9ae0] focus:ring-[3px] focus:ring-[#1b9ae0]/20"
            />

            <div className="mt-4">
              <label className="block text-sm font-semibold mb-2">
                Manufacturier d&apos;origine{" "}
                <span className="text-[#f37021]">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setManufacturier("ventec")}
                  className={`border-[1.5px] rounded-lg p-3.5 text-left transition-all ${
                    manufacturier === "ventec"
                      ? "border-[#1b9ae0] bg-[#1b9ae0]/[0.06] ring-1 ring-inset ring-[#1b9ae0]"
                      : "border-[#e3e6ec] bg-white hover:border-[#1b9ae0]"
                  }`}
                >
                  <div className="font-bold text-[15px]">Ventec</div>
                  <div className="text-xs text-[#5a6278] mt-0.5">
                    Système Polymat d&apos;origine
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setManufacturier("autre")}
                  className={`border-[1.5px] rounded-lg p-3.5 text-left transition-all ${
                    manufacturier === "autre"
                      ? "border-[#1b9ae0] bg-[#1b9ae0]/[0.06] ring-1 ring-inset ring-[#1b9ae0]"
                      : "border-[#e3e6ec] bg-white hover:border-[#1b9ae0]"
                  }`}
                >
                  <div className="font-bold text-[15px]">Autre manufacturier</div>
                  <div className="text-xs text-[#5a6278] mt-0.5">
                    Installation non-Ventec à remplacer
                  </div>
                </button>
              </div>
            </div>
          </div>

          {/* Active opening */}
          <div className="bg-white border border-[#e3e6ec] rounded-xl overflow-hidden">
            <div className="px-6 py-4 bg-[#fafbfc] border-b border-[#e3e6ec] flex items-center gap-2.5">
              <span className="bg-[#1b9ae0] text-white text-[11px] font-bold px-2.5 py-0.5 rounded uppercase tracking-[0.5px]">
                Ouverture {activeIndex + 1}
              </span>
              {openings.length > 1 && (
                <span className="text-sm text-[#5a6278]">
                  de {openings.length}
                </span>
              )}
            </div>

            <div className="p-6 space-y-8">
              {/* Système */}
              <section>
                <h3 className="text-[15px] font-bold mb-1">2. Système existant</h3>
                <p className="text-sm text-[#5a6278] mb-3">
                  Quel type de système est actuellement installé ?
                </p>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() =>
                      updateActive({
                        systeme: "simple",
                        rideau_a_remplacer: "",
                      })
                    }
                    className={`border-[1.5px] rounded-lg p-3.5 text-left transition-all ${
                      active.systeme === "simple"
                        ? "border-[#1b9ae0] bg-[#1b9ae0]/[0.06] ring-1 ring-inset ring-[#1b9ae0]"
                        : "border-[#e3e6ec] bg-white hover:border-[#1b9ae0]"
                    }`}
                  >
                    <div className="font-bold text-[15px]">Simple</div>
                    <div className="text-xs text-[#5a6278] mt-0.5">
                      Un seul rideau Polymat
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => updateActive({ systeme: "double" })}
                    className={`border-[1.5px] rounded-lg p-3.5 text-left transition-all ${
                      active.systeme === "double"
                        ? "border-[#1b9ae0] bg-[#1b9ae0]/[0.06] ring-1 ring-inset ring-[#1b9ae0]"
                        : "border-[#e3e6ec] bg-white hover:border-[#1b9ae0]"
                    }`}
                  >
                    <div className="font-bold text-[15px]">Double</div>
                    <div className="text-xs text-[#5a6278] mt-0.5">
                      Deux rideaux superposés
                    </div>
                  </button>
                </div>

                {/* Rideau à remplacer (double only) */}
                {active.systeme === "double" && (
                  <div className="mt-4 pt-4 border-t border-dashed border-[#e3e6ec]">
                    <label className="block text-sm font-semibold mb-2">
                      Quel rideau remplacer ?{" "}
                      <span className="text-[#f37021]">*</span>
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {(
                        [
                          { value: "haut", label: "Rideau du haut" },
                          { value: "bas", label: "Rideau du bas" },
                          { value: "les_deux", label: "Les deux" },
                        ] as const
                      ).map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setRideauARemplacer(opt.value)}
                          className={`border-[1.5px] rounded-lg p-3 text-center transition-all ${
                            active.rideau_a_remplacer === opt.value
                              ? "border-[#1b9ae0] bg-[#1b9ae0]/[0.06] ring-1 ring-inset ring-[#1b9ae0]"
                              : "border-[#e3e6ec] bg-white hover:border-[#1b9ae0]"
                          }`}
                        >
                          <div className="font-semibold text-[13px]">
                            {opt.label}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </section>

              {/* Sections 3, 4, 5 — en 2 colonnes si simple + autre manufacturier */}
              <div
                className={
                  sideBySideHauteurLongueur
                    ? "grid grid-cols-1 sm:grid-cols-2 gap-8 items-start"
                    : "space-y-8"
                }
              >
              {/* Hauteur du support */}
              <section>
                <h3 className="text-[15px] font-bold mb-1 flex items-center gap-2">
                  <HauteurIcon className="text-[#1b9ae0] shrink-0" />
                  3. Hauteur du support
                </h3>
                <p className="text-sm text-[#5a6278] mb-3">
                  Hauteur du support en pouces.
                  {active.systeme === "double" &&
                    active.rideau_a_remplacer !== "" &&
                    active.rideau_a_remplacer !== "les_deux" &&
                    " Une seule hauteur requise (le rideau à remplacer)."}
                </p>

                {active.systeme === "simple" ? (
                  <div className="max-w-[260px] relative">
                    <input
                      type="number"
                      min={0}
                      value={active.hauteur_support_simple_po}
                      onChange={(e) =>
                        updateActive({
                          hauteur_support_simple_po: e.target.value,
                        })
                      }
                      placeholder="84"
                      className="w-full min-h-12 px-3.5 pr-14 py-3 rounded-lg border-[1.5px] border-[#e3e6ec] bg-white focus:outline-none focus:border-[#1b9ae0] focus:ring-[3px] focus:ring-[#1b9ae0]/20"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[#5a6278] text-sm pointer-events-none">
                      po
                    </span>
                  </div>
                ) : (
                  <div
                    className={`grid grid-cols-1 ${replaceHaut && replaceBas ? "sm:grid-cols-2" : ""} gap-3`}
                  >
                    {replaceHaut && (
                      <div className="border-[1.5px] rounded-xl p-4 border-[#e3e6ec] bg-[#fafbfc]">
                        <div className="flex items-center gap-2.5 mb-3 flex-wrap">
                          <span className="bg-[#1b9ae0] text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-[0.5px]">
                            Support haut
                          </span>
                        </div>
                        <div className="relative">
                          <input
                            type="number"
                            min={0}
                            value={active.hauteur_support_haut_po}
                            onChange={(e) =>
                              updateActive({
                                hauteur_support_haut_po: e.target.value,
                              })
                            }
                            placeholder="72"
                            className="w-full min-h-12 px-3.5 pr-14 py-3 rounded-lg border-[1.5px] border-[#e3e6ec] bg-white focus:outline-none focus:border-[#1b9ae0] focus:ring-[3px] focus:ring-[#1b9ae0]/20"
                          />
                          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[#5a6278] text-sm pointer-events-none">
                            po
                          </span>
                        </div>
                      </div>
                    )}
                    {replaceBas && (
                      <div className="border-[1.5px] rounded-xl p-4 border-[#e3e6ec] bg-[#fafbfc]">
                        <div className="flex items-center gap-2.5 mb-3 flex-wrap">
                          <span className="bg-[#1a1f2e] text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-[0.5px]">
                            Support bas
                          </span>
                        </div>
                        <div className="relative">
                          <input
                            type="number"
                            min={0}
                            value={active.hauteur_support_bas_po}
                            onChange={(e) =>
                              updateActive({
                                hauteur_support_bas_po: e.target.value,
                              })
                            }
                            placeholder="60"
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

              {/* Modèle Polymat — uniquement si manufacturier = Ventec */}
              {manufacturier === "ventec" && (
                <section>
                  <h3 className="text-[15px] font-bold mb-1">
                    4. Modèle Polymat
                  </h3>
                  <p className="text-sm text-[#5a6278] mb-3">
                    Sélectionnez le modèle du système existant.
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {MODELES_POLYMAT.filter((m) => m.value !== "autre").map(
                      (opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() =>
                            updateActive({ modele_polymat: opt.value })
                          }
                          className={`border-[1.5px] rounded-lg p-3 flex flex-col items-center gap-2 transition-all ${
                            active.modele_polymat === opt.value
                              ? "border-[#1b9ae0] bg-[#1b9ae0]/[0.06] ring-1 ring-inset ring-[#1b9ae0]"
                              : "border-[#e3e6ec] bg-white hover:border-[#1b9ae0]"
                          }`}
                        >
                          <PolymatDrawing
                            systeme="double"
                            className="h-20 w-auto"
                          />
                          <span className="text-[13px] font-semibold">
                            {opt.label}
                          </span>
                        </button>
                      ),
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => updateActive({ modele_polymat: "autre" })}
                    className={`mt-2 w-full border-[1.5px] rounded-lg px-4 py-3 flex items-center gap-3 text-left transition-all ${
                      active.modele_polymat === "autre"
                        ? "border-[#1b9ae0] bg-[#1b9ae0]/[0.06] ring-1 ring-inset ring-[#1b9ae0]"
                        : "border-dashed border-[#c9d1dc] bg-white hover:border-[#1b9ae0]"
                    }`}
                  >
                    <span
                      className="w-8 h-8 rounded-full bg-[#eef1f5] text-[#5a6278] flex items-center justify-center text-lg font-bold shrink-0"
                      aria-hidden
                    >
                      ?
                    </span>
                    <span className="flex-1">
                      <span className="block text-[13px] font-semibold">
                        Autre modèle
                      </span>
                      <span className="block text-xs text-[#5a6278] mt-0.5">
                        Modèle non listé ci-dessus. Ventec vous contactera pour
                        préciser.
                      </span>
                    </span>
                  </button>
                </section>
              )}

              {/* Longueur du polymat */}
              <section>
                <h3 className="text-[15px] font-bold mb-1 flex items-center gap-2">
                  <LongueurIcon className="text-[#f37021] shrink-0" />
                  5. Longueur du polymat
                </h3>
                <p className="text-sm text-[#5a6278] mb-3">
                  Saisissez la longueur en pieds et pouces.
                </p>
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="relative w-[140px]">
                    <input
                      type="number"
                      min={0}
                      step={1}
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
                      step={1}
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
                </div>
              </section>
              </div>

              {/* Nombre de cellules */}
              <section>
                <h3 className="text-[15px] font-bold mb-1">
                  6. Nombre de cellules
                </h3>
                <p className="text-sm text-[#5a6278] mb-3">
                  Valeur recommandée selon la hauteur du support (étape 3).
                  Ajustez au besoin.
                </p>

                {active.systeme === "simple" ? (
                  hauteurSimplePo === null ? (
                    <div className="rounded-lg border border-dashed border-[#c9d1dc] bg-[#fafbfc] px-4 py-3 text-[13px] text-[#5a6278]">
                      Entrez d&apos;abord la hauteur du support à l&apos;étape 3.
                    </div>
                  ) : (
                    <>
                      <div className="flex items-start gap-3 flex-wrap">
                        <div className="max-w-[220px]">
                          <input
                            type="number"
                            min={0}
                            value={active.nb_cellules_simple}
                            onChange={(e) =>
                              updateActive({
                                nb_cellules_simple: e.target.value,
                              })
                            }
                            placeholder={
                              cellsSimpleRec !== null
                                ? String(cellsSimpleRec)
                                : ""
                            }
                            className="w-full min-h-12 px-3.5 py-3 rounded-lg border-[1.5px] border-[#e3e6ec] bg-white focus:outline-none focus:border-[#1b9ae0] focus:ring-[3px] focus:ring-[#1b9ae0]/20"
                          />
                        </div>
                        {cellsSimpleRec !== null ? (
                          <div className="bg-[#f0f7fb] text-[#0f7bb5] px-2.5 py-1.5 rounded-md text-xs font-semibold">
                            Recommandé : {cellsSimpleRec}
                          </div>
                        ) : (
                          <div className="bg-[#fff7e5] text-[#7a5d00] px-2.5 py-1.5 rounded-md text-xs font-semibold">
                            Hors table standard
                          </div>
                        )}
                      </div>
                      <CellsMismatchWarning
                        value={active.nb_cellules_simple}
                        recommendation={cellsSimpleRec}
                      />
                    </>
                  )
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <CellsInputCard
                      tone="haut"
                      hauteurPo={hauteurHautPo}
                      active={replaceHaut}
                      value={active.nb_cellules_haut}
                      recommendation={cellsHautRec}
                      onChange={(v) => updateActive({ nb_cellules_haut: v })}
                    />
                    <CellsInputCard
                      tone="bas"
                      hauteurPo={hauteurBasPo}
                      active={replaceBas}
                      value={active.nb_cellules_bas}
                      recommendation={cellsBasRec}
                      onChange={(v) => updateActive({ nb_cellules_bas: v })}
                    />
                  </div>
                )}
              </section>

              {/* Souffleurs */}
              <section>
                <h3 className="text-[15px] font-bold mb-1">7. Souffleurs</h3>
                <p className="text-sm text-[#5a6278] mb-3">
                  {active.systeme === "double"
                    ? "Sélectionnez le nombre de souffleurs pour chaque côté (haut et bas)."
                    : "Sélectionnez le nombre de souffleurs."}
                </p>

                {active.systeme === "simple" ? (
                  <div className="max-w-[240px]">
                    <select
                      value={active.souffleurs_count}
                      onChange={(e) =>
                        updateActive({ souffleurs_count: e.target.value })
                      }
                      className="w-full min-h-12 px-3.5 py-3 rounded-lg border-[1.5px] border-[#e3e6ec] bg-white focus:outline-none focus:border-[#1b9ae0] focus:ring-[3px] focus:ring-[#1b9ae0]/20"
                    >
                      <option value="">— Sélectionner —</option>
                      {souffleurOptions.map((n) => (
                        <option key={n} value={String(n)}>
                          {n} souffleur{n > 1 ? "s" : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div
                    className={`grid grid-cols-1 ${replaceHaut && replaceBas ? "sm:grid-cols-2" : ""} gap-3`}
                  >
                    {replaceHaut && (
                      <div className="border-[1.5px] border-[#e3e6ec] rounded-xl p-4 bg-[#fafbfc]">
                        <div className="flex items-center gap-2.5 mb-3">
                          <span className="bg-[#1b9ae0] text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-[0.5px]">
                            Soufflerie du haut
                          </span>
                        </div>
                        <select
                          value={active.souffleurs_count_haut}
                          onChange={(e) =>
                            updateActive({
                              souffleurs_count_haut: e.target.value,
                            })
                          }
                          className="w-full min-h-12 px-3.5 py-3 rounded-lg border-[1.5px] border-[#e3e6ec] bg-white focus:outline-none focus:border-[#1b9ae0] focus:ring-[3px] focus:ring-[#1b9ae0]/20"
                        >
                          <option value="">— Sélectionner —</option>
                          {souffleurOptions.map((n) => (
                            <option key={n} value={String(n)}>
                              {n} souffleur{n > 1 ? "s" : ""}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                    {replaceBas && (
                      <div className="border-[1.5px] border-[#e3e6ec] rounded-xl p-4 bg-[#fafbfc]">
                        <div className="flex items-center gap-2.5 mb-3">
                          <span className="bg-[#1a1f2e] text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-[0.5px]">
                            Soufflerie du bas
                          </span>
                        </div>
                        <select
                          value={active.souffleurs_count_bas}
                          onChange={(e) =>
                            updateActive({
                              souffleurs_count_bas: e.target.value,
                            })
                          }
                          className="w-full min-h-12 px-3.5 py-3 rounded-lg border-[1.5px] border-[#e3e6ec] bg-white focus:outline-none focus:border-[#1b9ae0] focus:ring-[3px] focus:ring-[#1b9ae0]/20"
                        >
                          <option value="">— Sélectionner —</option>
                          {souffleurOptions.map((n) => (
                            <option key={n} value={String(n)}>
                              {n} souffleur{n > 1 ? "s" : ""}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
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
                    <div className="font-semibold text-[14px]">
                      Souffleries aux deux extrémités
                    </div>
                    <div className="text-[13px] text-[#5a6278]">
                      Cochez si des souffleurs sont installés aux deux côtés.
                    </div>
                  </div>
                </label>
              </section>

              {/* Fichiers d'installation actuels */}
              <section>
                <h3 className="text-[15px] font-bold mb-1">
                  8. Fichier de vos installations actuelles
                </h3>
                <p className="text-sm text-[#5a6278] mb-3">
                  Joignez des photos de l&apos;installation existante (optionnel).
                  Maximum 5 fichiers.
                </p>
                <FileDropzone name="installation_files" />
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

function CellsInputCard({
  tone,
  hauteurPo,
  active,
  value,
  recommendation,
  onChange,
}: {
  tone: "haut" | "bas";
  hauteurPo: number | null;
  active: boolean;
  value: string;
  recommendation: number | null;
  onChange: (v: string) => void;
}) {
  const label = tone === "haut" ? "Cellules haut" : "Cellules bas";
  const badgeClass =
    tone === "haut" ? "bg-[#1b9ae0] text-white" : "bg-[#1a1f2e] text-white";

  return (
    <div
      className={`border-[1.5px] rounded-xl p-4 ${
        active
          ? "border-[#e3e6ec] bg-[#fafbfc]"
          : "border-dashed border-[#e3e6ec] bg-white opacity-60"
      }`}
    >
      <div className="flex items-center gap-2.5 mb-3">
        <span
          className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-[0.5px] ${badgeClass}`}
        >
          {label}
        </span>
      </div>
      {!active ? (
        <div className="text-[13px] text-[#5a6278]">
          Pas requis selon la sélection.
        </div>
      ) : hauteurPo === null ? (
        <div className="text-[13px] text-[#5a6278]">
          Entrez d&apos;abord la hauteur à l&apos;étape 3.
        </div>
      ) : (
        <>
          <input
            type="number"
            min={0}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={recommendation !== null ? String(recommendation) : ""}
            className="w-full min-h-12 px-3.5 py-3 rounded-lg border-[1.5px] border-[#e3e6ec] bg-white focus:outline-none focus:border-[#1b9ae0] focus:ring-[3px] focus:ring-[#1b9ae0]/20"
          />
          {recommendation !== null ? (
            <div className="mt-2 text-xs text-[#0f7bb5] font-semibold">
              Recommandé : {recommendation}
            </div>
          ) : (
            <div className="mt-2 text-xs text-[#7a5d00] font-semibold">
              Hors table standard
            </div>
          )}
          <CellsMismatchWarning
            value={value}
            recommendation={recommendation}
          />
        </>
      )}
    </div>
  );
}

/**
 * Avertissement non-bloquant affiché quand le nombre de cellules saisi
 * diffère de la recommandation issue du tableau.
 */
function CellsMismatchWarning({
  value,
  recommendation,
}: {
  value: string;
  recommendation: number | null;
}) {
  if (recommendation === null || !value) return null;
  const entered = Number(value);
  if (!Number.isFinite(entered) || entered === recommendation) return null;
  return (
    <div className="mt-2 rounded-lg border border-[#f2d89a] bg-[#fff7e5] p-2.5 text-[12px] text-[#7a5d00] flex items-start gap-2">
      <span aria-hidden>⚠</span>
      <div>
        La hauteur entrée correspond généralement à{" "}
        <span className="font-bold">{recommendation}</span> cellule
        {recommendation > 1 ? "s" : ""}. Êtes-vous sûr de vouloir continuer
        avec {entered} ?
      </div>
    </div>
  );
}
