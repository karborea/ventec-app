/**
 * Business rules for Polymat soumissions.
 *
 * ⚠ These tables are provisional and MUST be validated with
 * Normand Hébert (Ventec/Jolco logistics) before going live.
 * Source of truth when confirmed → will live in a `soumission_rules` table
 * in Supabase so it can be edited without a code deploy.
 */

export const KIT_EXTREMITE_PO = 48; // 4 ft total (2 ft each end)

// Height ranges for curtain types (client update April 2026 — aligned
// with the souffleurs table boundaries).
export const RIDEAU_SIMPLE_MIN_PO = 32;
export const RIDEAU_SIMPLE_MAX_PO = 124;
export const RIDEAU_DOUBLE_MIN_PO = 92;
export const RIDEAU_DOUBLE_MAX_PO = 185;

/**
 * Official Ventec blower-count table (client-provided April 2026).
 * Driven by HAUTEUR (po) + SYSTÈME. The "aux deux extrémités" mode
 * is recommended automatically when longueur exceeds a per-row threshold (ft).
 *
 * Hauteur reference:
 *  - Nouvelle commande simple  → hauteur du polymat (unique)
 *  - Nouvelle commande double  → haut + bas cumulés
 *  - Remplacement simple       → hauteur du support simple
 *  - Remplacement double       → hauteur max(haut, bas) — couvrance totale
 */
type SouffleursRule = {
  systeme: "simple" | "double";
  /** Inclusive lower bound in po (matches .25 boundaries from source sheet). */
  minPo: number;
  /** Inclusive upper bound in po. */
  maxPo: number;
  /** Base count options (per single side). User picks one. */
  baseOptions: readonly number[];
  /** Longueur (ft) above which "aux 2 extrémités" is auto-recommended. */
  doubleThresholdFt: number;
};

const SOUFFLEURS_RULES: readonly SouffleursRule[] = [
  // Rideau simple
  { systeme: "simple", minPo: 32, maxPo: 64, baseOptions: [2], doubleThresholdFt: 220 },
  { systeme: "simple", minPo: 64.25, maxPo: 80, baseOptions: [3], doubleThresholdFt: 200 },
  { systeme: "simple", minPo: 80.25, maxPo: 124, baseOptions: [3], doubleThresholdFt: 160 },
  // Rideau double
  { systeme: "double", minPo: 92, maxPo: 124, baseOptions: [3], doubleThresholdFt: 220 },
  { systeme: "double", minPo: 124.25, maxPo: 135, baseOptions: [3, 6], doubleThresholdFt: 200 },
  { systeme: "double", minPo: 135.25, maxPo: 146, baseOptions: [3, 4, 6], doubleThresholdFt: 200 },
  { systeme: "double", minPo: 146.25, maxPo: 185, baseOptions: [4, 8], doubleThresholdFt: 200 },
] as const;

export const SOUFFLEURS_RANGE: Record<"simple" | "double", { minPo: number; maxPo: number }> = {
  simple: { minPo: 32, maxPo: 124 },
  double: { minPo: 92, maxPo: 185 },
};

export type SouffleursChoice = {
  baseOptions: number[];
  doubleThresholdFt: number;
  doubleThresholdPo: number;
  rangeLabel: string;
  /** True when longueur exceeds the "aux 2 extrémités" threshold. */
  auxDeuxExtremitesRecommended: boolean;
};

/**
 * Returns the allowed souffleurs configuration for a given hauteur (po) +
 * système, or null when the hauteur is outside any table row.
 * Pass longueurPo to get the auto-recommendation for "aux 2 extrémités".
 */
export function getSouffleursChoice(
  systeme: "simple" | "double",
  hauteurPo: number,
  longueurPo: number | null,
): SouffleursChoice | null {
  if (!Number.isFinite(hauteurPo) || hauteurPo <= 0) return null;
  for (const rule of SOUFFLEURS_RULES) {
    if (rule.systeme !== systeme) continue;
    if (hauteurPo >= rule.minPo && hauteurPo <= rule.maxPo) {
      const thresholdPo = rule.doubleThresholdFt * 12;
      return {
        baseOptions: [...rule.baseOptions],
        doubleThresholdFt: rule.doubleThresholdFt,
        doubleThresholdPo: thresholdPo,
        rangeLabel: `${rule.minPo}–${rule.maxPo} po`,
        auxDeuxExtremitesRecommended:
          longueurPo !== null && longueurPo >= thresholdPo,
      };
    }
  }
  return null;
}

/**
 * Return a message explaining why the height might not fit the curtain type.
 * Returns null when the combination is within bounds.
 */
export function validateHauteurForRideau(
  rideauType: "simple" | "double",
  hauteurPo: number,
): { ok: true } | { ok: false; message: string; suggestion?: "simple" | "double" } {
  if (!Number.isFinite(hauteurPo) || hauteurPo <= 0) {
    return { ok: true };
  }

  if (rideauType === "simple") {
    if (hauteurPo < RIDEAU_SIMPLE_MIN_PO) {
      return {
        ok: false,
        message: `Le rideau simple est prévu pour ${RIDEAU_SIMPLE_MIN_PO} à ${RIDEAU_SIMPLE_MAX_PO} po. ${hauteurPo} po est inférieur au minimum.`,
      };
    }
    if (hauteurPo > RIDEAU_SIMPLE_MAX_PO) {
      return {
        ok: false,
        message: `Un rideau simple est prévu pour une hauteur maximum de ${RIDEAU_SIMPLE_MAX_PO} po. À ${hauteurPo} po, un rideau double est recommandé.`,
        suggestion: "double",
      };
    }
  } else {
    if (hauteurPo < RIDEAU_DOUBLE_MIN_PO) {
      return {
        ok: false,
        message: `Un rideau double est prévu pour une hauteur minimum de ${RIDEAU_DOUBLE_MIN_PO} po. À ${hauteurPo} po, un rideau simple est recommandé.`,
        suggestion: "simple",
      };
    }
    if (hauteurPo > RIDEAU_DOUBLE_MAX_PO) {
      return {
        ok: false,
        message: `Le rideau double est prévu pour ${RIDEAU_DOUBLE_MIN_PO} à ${RIDEAU_DOUBLE_MAX_PO} po. ${hauteurPo} po dépasse le maximum.`,
      };
    }
  }
  return { ok: true };
}

export function longueurTotale(longueurPo: number): number {
  return longueurPo + KIT_EXTREMITE_PO;
}

/**
 * Official Ventec cell-count tables (Couverture avec compression).
 * Client-provided update, April 2026.
 *
 * Two tables:
 *  - SIMPLE : hauteur du support (po) → nombre de cellules (total côté unique)
 *  - DOUBLE : hauteur totale de couvrance (= haut + bas, po) → { haut, bas }
 *            Le premier nombre = cellules côté haut, le second = côté bas.
 *
 * Pour systeme double, on somme les deux hauteurs de support et on fait un
 * seul lookup dans la table DOUBLE. L'ordre haut/bas est significatif.
 */
type CellsRangeSimple = {
  minPo: number;
  maxPo: number;
  cells: number;
};

type CellsRangeDouble = {
  minPo: number;
  maxPo: number;
  haut: number;
  bas: number;
};

const CELLS_TABLE_SIMPLE: readonly CellsRangeSimple[] = [
  { minPo: 24, maxPo: 24.25, cells: 4 },
  { minPo: 24.5, maxPo: 29.5, cells: 5 },
  { minPo: 29.75, maxPo: 35, cells: 6 },
  { minPo: 35.25, maxPo: 40, cells: 7 },
  { minPo: 40.25, maxPo: 46, cells: 8 },
  { minPo: 46.25, maxPo: 50, cells: 9 },
  { minPo: 50.25, maxPo: 56, cells: 10 },
  { minPo: 56.25, maxPo: 61, cells: 11 },
  { minPo: 61.25, maxPo: 66, cells: 12 },
  { minPo: 66.25, maxPo: 72, cells: 13 },
  { minPo: 72.25, maxPo: 77, cells: 14 },
  { minPo: 77.25, maxPo: 83, cells: 15 },
  { minPo: 83.25, maxPo: 88, cells: 16 },
  { minPo: 88.25, maxPo: 93.75, cells: 17 },
  { minPo: 94, maxPo: 99, cells: 18 },
  { minPo: 99.25, maxPo: 104, cells: 19 },
  { minPo: 104.25, maxPo: 110, cells: 20 },
  { minPo: 110.25, maxPo: 115, cells: 21 },
  { minPo: 115.25, maxPo: 121, cells: 22 },
  { minPo: 121.25, maxPo: 126, cells: 23 },
  { minPo: 126.25, maxPo: 132, cells: 24 },
] as const;

const CELLS_TABLE_DOUBLE: readonly CellsRangeDouble[] = [
  { minPo: 99.25, maxPo: 104, haut: 9, bas: 10 },
  { minPo: 104.25, maxPo: 110, haut: 10, bas: 10 },
  { minPo: 110.25, maxPo: 115, haut: 10, bas: 11 },
  { minPo: 115.25, maxPo: 121, haut: 11, bas: 11 },
  { minPo: 121.5, maxPo: 126, haut: 11, bas: 12 },
  { minPo: 126.25, maxPo: 133, haut: 12, bas: 12 },
  { minPo: 133.25, maxPo: 138, haut: 12, bas: 13 },
  { minPo: 138.25, maxPo: 143, haut: 13, bas: 13 },
  { minPo: 143.25, maxPo: 148, haut: 13, bas: 14 },
  { minPo: 148.25, maxPo: 154, haut: 14, bas: 14 },
  { minPo: 154.25, maxPo: 160, haut: 14, bas: 15 },
  { minPo: 160.25, maxPo: 166, haut: 15, bas: 15 },
  { minPo: 166.25, maxPo: 172, haut: 15, bas: 16 },
  { minPo: 172.25, maxPo: 178, haut: 16, bas: 16 },
  { minPo: 178.25, maxPo: 184, haut: 16, bas: 17 },
  { minPo: 184.25, maxPo: 190, haut: 17, bas: 17 },
  { minPo: 190.25, maxPo: 196, haut: 17, bas: 18 },
] as const;

export const CELLS_RANGE: Record<"simple" | "double", { minPo: number; maxPo: number }> = {
  simple: { minPo: 24, maxPo: 132 },
  double: { minPo: 99.25, maxPo: 196 },
};

/**
 * Systeme simple : lookup cellules par hauteur du support.
 */
export function getCellsForHauteurSimple(hauteurPo: number): number | null {
  if (!Number.isFinite(hauteurPo) || hauteurPo <= 0) return null;
  for (const row of CELLS_TABLE_SIMPLE) {
    if (hauteurPo >= row.minPo && hauteurPo <= row.maxPo) return row.cells;
  }
  return null;
}

/**
 * Systeme double : lookup cellules haut + bas par hauteur totale (somme
 * haut + bas). Premier nombre = côté haut, second = côté bas.
 */
export function getCellsForHauteurDouble(
  hauteurTotalePo: number,
): { haut: number; bas: number } | null {
  if (!Number.isFinite(hauteurTotalePo) || hauteurTotalePo <= 0) return null;
  for (const row of CELLS_TABLE_DOUBLE) {
    if (hauteurTotalePo >= row.minPo && hauteurTotalePo <= row.maxPo) {
      return { haut: row.haut, bas: row.bas };
    }
  }
  return null;
}

export const MODELES_POLYMAT = [
  { value: "xl_a", label: "Polymat XL A" },
  { value: "xl_b", label: "Polymat XL B" },
  { value: "xl_c", label: "Polymat XL C" },
  { value: "xl_d", label: "Polymat XL D" },
  { value: "g3_e", label: "Polymat G3 E" },
  { value: "g3_f", label: "Polymat G3 F" },
  { value: "autre", label: "Autre modèle" },
] as const;

export type ModelePolymat = (typeof MODELES_POLYMAT)[number]["value"];
