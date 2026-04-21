/**
 * Business rules for Polymat soumissions.
 *
 * ⚠ These tables are provisional and MUST be validated with
 * Normand Hébert (Ventec/Jolco logistics) before going live.
 * Source of truth when confirmed → will live in a `soumission_rules` table
 * in Supabase so it can be edited without a code deploy.
 */

export const KIT_EXTREMITE_PO = 48; // 4 ft total (2 ft each end)

// Height ranges for curtain types (from product spec)
export const RIDEAU_SIMPLE_MIN_PO = 36; //  3 ft
export const RIDEAU_SIMPLE_MAX_PO = 126; // 10.5 ft
export const RIDEAU_DOUBLE_MIN_PO = 96; //  8 ft
export const RIDEAU_DOUBLE_MAX_PO = 168; // 14 ft

/**
 * Official Ventec blower-count table.
 * Source ranges were in feet; converted to inches (× 12) here so all
 * calculations stay in the same unit as the form.
 *
 * Note : the source table has a gap at 125 ft (= 1500 po), intentional
 * and preserved as-is.
 */
type SouffleursRange = {
  minPo: number;
  maxPo: number;
  /** First value is the standard / recommended choice. */
  options: readonly number[];
};

const SOUFFLEURS_TABLE: readonly SouffleursRange[] = [
  { minPo: 32 * 12, maxPo: 64 * 12, options: [2] }, //   384 – 768 po
  { minPo: 65 * 12, maxPo: 124 * 12, options: [3] }, //  780 – 1488 po
  { minPo: 126 * 12, maxPo: 135 * 12, options: [3, 6] }, // 1512 – 1620 po
  { minPo: 136 * 12, maxPo: 146 * 12, options: [3, 4, 6] }, // 1632 – 1752 po
  { minPo: 147 * 12, maxPo: 185 * 12, options: [4, 6] }, // 1764 – 2220 po
] as const;

export const SOUFFLEURS_TABLE_MIN_PO = SOUFFLEURS_TABLE[0].minPo;
export const SOUFFLEURS_TABLE_MAX_PO =
  SOUFFLEURS_TABLE[SOUFFLEURS_TABLE.length - 1].maxPo;

export type SouffleursChoice = {
  /** All allowed counts for this length, in order (first = standard). */
  options: number[];
  /** The standard / recommended count for this length. */
  recommended: number;
  /** Human-readable inches range (e.g. "780 à 1488 po"). */
  rangeLabel: string;
};

/**
 * Returns the allowed souffleurs counts for a given opening length (po),
 * or null when the length is outside any table row.
 */
export function getSouffleursChoice(
  longueurPo: number,
): SouffleursChoice | null {
  if (!Number.isFinite(longueurPo) || longueurPo <= 0) return null;
  for (const row of SOUFFLEURS_TABLE) {
    if (longueurPo >= row.minPo && longueurPo <= row.maxPo) {
      return {
        options: [...row.options],
        recommended: row.options[0],
        rangeLabel: `${row.minPo} à ${row.maxPo} po`,
      };
    }
  }
  return null;
}

/**
 * Legacy helper kept for backward compatibility : returns the standard
 * recommendation only, not the full list of options.
 */
export function recommendSouffleurs(longueurPo: number): number | null {
  return getSouffleursChoice(longueurPo)?.recommended ?? null;
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
