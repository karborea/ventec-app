// Pure parsing / validation helpers for soumission form payloads.
// Lives outside any "use server" file so we can export sync helpers
// (Server-Action files require every export to be async).

import { SOUFFLEURS_RANGE } from "./rules";

export type SoumissionFormState = {
  error?: string;
};

const MATERIAUX = new Set(["bois", "acier", "beton"] as const);
const RIDEAU_TYPES = new Set(["simple", "double"] as const);
const RIDEAU_GRANDEURS = new Set(["standard", "hors_standard"] as const);
const MANUFACTURIERS = new Set(["ventec", "autre"] as const);
const SYSTEMES = new Set(["simple", "double"] as const);
const RIDEAUX_A_REMPLACER = new Set(["haut", "bas", "les_deux"] as const);
const MODELES_POLYMAT = new Set([
  "xl_a",
  "xl_b",
  "xl_c",
  "xl_d",
  "g3_e",
  "g3_f",
  "autre",
] as const);

export type Materiau = "bois" | "acier" | "beton";
export type RideauType = "simple" | "double";
export type RideauGrandeur = "standard" | "hors_standard";
export type ManufacturierOrigine = "ventec" | "autre";
export type Systeme = "simple" | "double";
export type RideauARemplacer = "haut" | "bas" | "les_deux";
export type ModelePolymat =
  | "xl_a"
  | "xl_b"
  | "xl_c"
  | "xl_d"
  | "g3_e"
  | "g3_f"
  | "autre";

export type OpeningPayload = {
  longueur_po?: number | null;
  longueur_totale_po?: number | null;
  materiau_haut?: Materiau | null;
  materiau_bas?: Materiau | null;
  rideau_type?: RideauType | null;
  rideau_grandeur?: RideauGrandeur | null;
  polymat_unique_hauteur_po?: number | null;
  polymat_haut_hauteur_po?: number | null;
  polymat_bas_hauteur_po?: number | null;
  souffleurs_count?: number | null;
  souffleurs_aux_deux_extremites?: boolean;
  souffleurs_instructions_speciales?: string | null;
};

export type FormPayload = {
  project_name: string;
  openings: OpeningPayload[];
};

export type RemplacementOpeningPayload = {
  systeme?: Systeme | null;
  rideau_a_remplacer?: RideauARemplacer | null;
  hauteur_support_simple_po?: number | null;
  hauteur_support_haut_po?: number | null;
  hauteur_support_bas_po?: number | null;
  modele_polymat?: ModelePolymat | null;
  longueur_po?: number | null;
  nb_cellules_simple?: number | null;
  nb_cellules_haut?: number | null;
  nb_cellules_bas?: number | null;
  souffleurs_count?: number | null;
  souffleurs_count_haut?: number | null;
  souffleurs_count_bas?: number | null;
  souffleurs_aux_deux_extremites?: boolean;
  souffleurs_instructions_speciales?: string | null;
};

export type RemplacementFormPayload = {
  project_name: string;
  manufacturier_origine: ManufacturierOrigine | null;
  /** Free-text company name when manufacturier_origine = "autre". */
  manufacturier_autre_nom: string | null;
  openings: RemplacementOpeningPayload[];
};

function toInt(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number.parseInt(String(v), 10);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function toNum(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number.parseFloat(String(v));
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100) / 100;
}

export function parsePayload(raw: unknown): FormPayload | null {
  if (typeof raw !== "string" || !raw) return null;
  let obj: unknown;
  try {
    obj = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!obj || typeof obj !== "object") return null;
  const p = obj as Record<string, unknown>;
  const projectName =
    typeof p.project_name === "string" ? p.project_name.trim() : "";
  if (!projectName) return null;

  const openingsRaw = Array.isArray(p.openings) ? p.openings : [];
  const openings: OpeningPayload[] = openingsRaw.map((o) => {
    const op = (o ?? {}) as Record<string, unknown>;
    const mh =
      typeof op.materiau_haut === "string" &&
      MATERIAUX.has(op.materiau_haut as Materiau)
        ? (op.materiau_haut as Materiau)
        : null;
    const mb =
      typeof op.materiau_bas === "string" &&
      MATERIAUX.has(op.materiau_bas as Materiau)
        ? (op.materiau_bas as Materiau)
        : null;
    const rt =
      typeof op.rideau_type === "string" &&
      RIDEAU_TYPES.has(op.rideau_type as RideauType)
        ? (op.rideau_type as RideauType)
        : null;
    const rg =
      typeof op.rideau_grandeur === "string" &&
      RIDEAU_GRANDEURS.has(op.rideau_grandeur as RideauGrandeur)
        ? (op.rideau_grandeur as RideauGrandeur)
        : null;
    const cleanedGrandeur = rt === "double" ? rg : null;
    return {
      longueur_po: toInt(op.longueur_po),
      longueur_totale_po:
        rt === "double" && cleanedGrandeur !== null
          ? toNum(op.longueur_totale_po)
          : null,
      materiau_haut: mh,
      materiau_bas: mb,
      rideau_type: rt,
      rideau_grandeur: cleanedGrandeur,
      polymat_unique_hauteur_po:
        rt === "simple" ? toNum(op.polymat_unique_hauteur_po) : null,
      polymat_haut_hauteur_po:
        rt === "double" && cleanedGrandeur === "hors_standard"
          ? toNum(op.polymat_haut_hauteur_po)
          : null,
      polymat_bas_hauteur_po:
        rt === "double" && cleanedGrandeur === "hors_standard"
          ? toNum(op.polymat_bas_hauteur_po)
          : null,
      souffleurs_count: toInt(op.souffleurs_count),
      souffleurs_aux_deux_extremites:
        op.souffleurs_aux_deux_extremites === true,
      souffleurs_instructions_speciales:
        typeof op.souffleurs_instructions_speciales === "string"
          ? op.souffleurs_instructions_speciales.trim() || null
          : null,
    };
  });

  return { project_name: projectName, openings };
}

export function validateForSubmission(
  payload: FormPayload,
): { ok: true } | { ok: false; error: string } {
  if (payload.openings.length === 0) {
    return { ok: false, error: "Au moins une ouverture est requise." };
  }
  for (const [i, op] of payload.openings.entries()) {
    const n = i + 1;
    if (!op.materiau_haut || !op.materiau_bas || !op.rideau_type) {
      return {
        ok: false,
        error: `Ouverture ${n} : sélectionnez les matériaux et le type de rideau.`,
      };
    }
    if (!op.longueur_po) {
      return { ok: false, error: `Ouverture ${n} : la longueur est requise.` };
    }
    if (op.rideau_type === "simple") {
      if (!op.polymat_unique_hauteur_po) {
        return {
          ok: false,
          error: `Ouverture ${n} : la hauteur est requise.`,
        };
      }
    } else {
      if (
        op.rideau_grandeur === "hors_standard" &&
        (!op.polymat_haut_hauteur_po || !op.polymat_bas_hauteur_po)
      ) {
        return {
          ok: false,
          error: `Ouverture ${n} : les hauteurs du haut et du bas sont requises.`,
        };
      }
      if (!op.rideau_grandeur) {
        return {
          ok: false,
          error: `Ouverture ${n} : sélectionnez la grandeur du rideau double (standard ou hors-standard).`,
        };
      }
      if (
        (op.rideau_grandeur === "standard" ||
          op.rideau_grandeur === "hors_standard") &&
        !op.longueur_totale_po
      ) {
        return {
          ok: false,
          error: `Ouverture ${n} : la hauteur de l'ouverture totale est requise pour un rideau double.`,
        };
      }
    }

    const hauteurRef =
      op.rideau_type === "simple"
        ? (op.polymat_unique_hauteur_po ?? null)
        : op.rideau_grandeur === "standard"
          ? (op.longueur_totale_po ?? null)
          : (op.polymat_haut_hauteur_po ?? 0) +
                (op.polymat_bas_hauteur_po ?? 0) || null;
    const range = op.rideau_type
      ? SOUFFLEURS_RANGE[op.rideau_type]
      : null;
    const inRange =
      hauteurRef !== null &&
      range !== null &&
      hauteurRef >= range.minPo &&
      hauteurRef <= range.maxPo;
    if (inRange && !op.souffleurs_count) {
      return {
        ok: false,
        error: `Ouverture ${n} : le nombre de souffleurs est requis.`,
      };
    }
  }
  return { ok: true };
}

export function parseRemplacementPayload(
  raw: unknown,
): RemplacementFormPayload | null {
  if (typeof raw !== "string" || !raw) return null;
  let obj: unknown;
  try {
    obj = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!obj || typeof obj !== "object") return null;
  const p = obj as Record<string, unknown>;
  const projectName =
    typeof p.project_name === "string" ? p.project_name.trim() : "";
  if (!projectName) return null;

  const mfr =
    typeof p.manufacturier_origine === "string" &&
    MANUFACTURIERS.has(p.manufacturier_origine as ManufacturierOrigine)
      ? (p.manufacturier_origine as ManufacturierOrigine)
      : null;
  const mfrAutreNom =
    mfr === "autre" && typeof p.manufacturier_autre_nom === "string"
      ? p.manufacturier_autre_nom.trim() || null
      : null;

  const openingsRaw = Array.isArray(p.openings) ? p.openings : [];
  const openings: RemplacementOpeningPayload[] = openingsRaw.map((o) => {
    const op = (o ?? {}) as Record<string, unknown>;
    const systeme =
      typeof op.systeme === "string" && SYSTEMES.has(op.systeme as Systeme)
        ? (op.systeme as Systeme)
        : null;
    const rideauARemplacer =
      typeof op.rideau_a_remplacer === "string" &&
      RIDEAUX_A_REMPLACER.has(op.rideau_a_remplacer as RideauARemplacer)
        ? (op.rideau_a_remplacer as RideauARemplacer)
        : null;
    const cleanedRideauARemplacer =
      systeme === "double" ? rideauARemplacer : null;
    const modele =
      mfr === "ventec" &&
      typeof op.modele_polymat === "string" &&
      MODELES_POLYMAT.has(op.modele_polymat as ModelePolymat)
        ? (op.modele_polymat as ModelePolymat)
        : null;

    const isDouble = systeme === "double";
    const wantHaut =
      !isDouble ||
      cleanedRideauARemplacer === "haut" ||
      cleanedRideauARemplacer === "les_deux";
    const wantBas =
      isDouble &&
      (cleanedRideauARemplacer === "bas" ||
        cleanedRideauARemplacer === "les_deux");

    return {
      systeme,
      rideau_a_remplacer: cleanedRideauARemplacer,
      hauteur_support_simple_po: !isDouble
        ? toNum(op.hauteur_support_simple_po)
        : null,
      hauteur_support_haut_po:
        isDouble && wantHaut ? toNum(op.hauteur_support_haut_po) : null,
      hauteur_support_bas_po:
        isDouble && wantBas ? toNum(op.hauteur_support_bas_po) : null,
      modele_polymat: modele,
      longueur_po: toInt(op.longueur_po),
      nb_cellules_simple: !isDouble ? toInt(op.nb_cellules_simple) : null,
      nb_cellules_haut:
        isDouble && wantHaut ? toInt(op.nb_cellules_haut) : null,
      nb_cellules_bas: isDouble && wantBas ? toInt(op.nb_cellules_bas) : null,
      souffleurs_count: !isDouble ? toInt(op.souffleurs_count) : null,
      souffleurs_count_haut:
        isDouble && wantHaut ? toInt(op.souffleurs_count_haut) : null,
      souffleurs_count_bas:
        isDouble && wantBas ? toInt(op.souffleurs_count_bas) : null,
      souffleurs_aux_deux_extremites:
        op.souffleurs_aux_deux_extremites === true,
      souffleurs_instructions_speciales:
        typeof op.souffleurs_instructions_speciales === "string"
          ? op.souffleurs_instructions_speciales.trim() || null
          : null,
    };
  });

  return {
    project_name: projectName,
    manufacturier_origine: mfr,
    manufacturier_autre_nom: mfrAutreNom,
    openings,
  };
}

export function validateRemplacementForSubmission(
  payload: RemplacementFormPayload,
): { ok: true } | { ok: false; error: string } {
  if (!payload.manufacturier_origine) {
    return { ok: false, error: "Sélectionnez le manufacturier d'origine." };
  }
  if (
    payload.manufacturier_origine === "autre" &&
    !payload.manufacturier_autre_nom
  ) {
    return {
      ok: false,
      error: "Indiquez le nom de la compagnie du manufacturier d'origine.",
    };
  }
  if (payload.openings.length === 0) {
    return { ok: false, error: "Au moins une ouverture est requise." };
  }
  for (const [i, op] of payload.openings.entries()) {
    const n = i + 1;
    if (!op.systeme) {
      return { ok: false, error: `Ouverture ${n} : sélectionnez le système.` };
    }
    if (op.systeme === "double" && !op.rideau_a_remplacer) {
      return {
        ok: false,
        error: `Ouverture ${n} : précisez quel rideau remplacer.`,
      };
    }
    if (payload.manufacturier_origine === "ventec" && !op.modele_polymat) {
      return {
        ok: false,
        error: `Ouverture ${n} : sélectionnez le modèle Polymat.`,
      };
    }
    if (!op.longueur_po) {
      return { ok: false, error: `Ouverture ${n} : la longueur est requise.` };
    }
    if (op.systeme === "simple") {
      if (!op.hauteur_support_simple_po) {
        return {
          ok: false,
          error: `Ouverture ${n} : la hauteur du support est requise.`,
        };
      }
      if (!op.nb_cellules_simple) {
        return {
          ok: false,
          error: `Ouverture ${n} : le nombre de cellules est requis.`,
        };
      }
      if (!op.souffleurs_count) {
        return {
          ok: false,
          error: `Ouverture ${n} : le nombre de souffleurs est requis.`,
        };
      }
    } else {
      const needHaut =
        op.rideau_a_remplacer === "haut" ||
        op.rideau_a_remplacer === "les_deux";
      const needBas =
        op.rideau_a_remplacer === "bas" ||
        op.rideau_a_remplacer === "les_deux";
      if (needHaut && !op.hauteur_support_haut_po) {
        return {
          ok: false,
          error: `Ouverture ${n} : la hauteur du support haut est requise.`,
        };
      }
      if (needBas && !op.hauteur_support_bas_po) {
        return {
          ok: false,
          error: `Ouverture ${n} : la hauteur du support bas est requise.`,
        };
      }
      if (needHaut && !op.nb_cellules_haut) {
        return {
          ok: false,
          error: `Ouverture ${n} : le nombre de cellules du haut est requis.`,
        };
      }
      if (needBas && !op.nb_cellules_bas) {
        return {
          ok: false,
          error: `Ouverture ${n} : le nombre de cellules du bas est requis.`,
        };
      }
      if (needHaut && !op.souffleurs_count_haut) {
        return {
          ok: false,
          error: `Ouverture ${n} : le nombre de souffleurs du haut est requis.`,
        };
      }
      if (needBas && !op.souffleurs_count_bas) {
        return {
          ok: false,
          error: `Ouverture ${n} : le nombre de souffleurs du bas est requis.`,
        };
      }
    }
  }
  return { ok: true };
}

export function remplacementOuvertureRow(
  soumissionId: string,
  op: RemplacementOpeningPayload,
  idx: number,
) {
  return {
    soumission_id: soumissionId,
    order_index: idx + 1,
    longueur_po: op.longueur_po ?? null,
    systeme: op.systeme ?? null,
    rideau_a_remplacer: op.rideau_a_remplacer ?? null,
    hauteur_support_simple_po: op.hauteur_support_simple_po ?? null,
    hauteur_support_haut_po: op.hauteur_support_haut_po ?? null,
    hauteur_support_bas_po: op.hauteur_support_bas_po ?? null,
    modele_polymat: op.modele_polymat ?? null,
    nb_cellules_simple: op.nb_cellules_simple ?? null,
    nb_cellules_haut: op.nb_cellules_haut ?? null,
    nb_cellules_bas: op.nb_cellules_bas ?? null,
    souffleurs_count: op.souffleurs_count ?? null,
    souffleurs_count_haut: op.souffleurs_count_haut ?? null,
    souffleurs_count_bas: op.souffleurs_count_bas ?? null,
    souffleurs_aux_deux_extremites: op.souffleurs_aux_deux_extremites ?? false,
    souffleurs_instructions_speciales:
      op.souffleurs_instructions_speciales ?? null,
  };
}
