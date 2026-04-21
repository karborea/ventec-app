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
 * Ranges are in FEET (from the Ventec blowers table). The first option
 * in each row is the "standard" recommendation; additional options are
 * alternatives offered to the client.
 *
 * Note : the table has a gap at 125 ft (intentional, from the source).
 */
type SouffleursRange = {
  minFt: number;
  maxFt: number;
  /** First value is the standard / recommended choice. */
  options: readonly number[];
};

const SOUFFLEURS_TABLE: readonly SouffleursRange[] = [
  { minFt: 32, maxFt: 64, options: [2] },
  { minFt: 65, maxFt: 124, options: [3] },
  { minFt: 126, maxFt: 135, options: [3, 6] },
  { minFt: 136, maxFt: 146, options: [3, 4, 6] },
  { minFt: 147, maxFt: 185, options: [4, 6] },
] as const;

export const SOUFFLEURS_TABLE_MIN_PO = 32 * 12;
export const SOUFFLEURS_TABLE_MAX_PO = 185 * 12;

export type SouffleursChoice = {
  /** All allowed counts for this length, in order (first = standard). */
  options: number[];
  /** The standard / recommended count for this length. */
  recommended: number;
  /** Human-readable feet range (e.g. "65 à 124 pi"). */
  feetRangeLabel: string;
};

/**
 * Returns the allowed souffleurs counts for a given opening length (po),
 * or null when the length is outside any table row.
 */
export function getSouffleursChoice(
  longueurPo: number,
): SouffleursChoice | null {
  if (!Number.isFinite(longueurPo) || longueurPo <= 0) return null;
  const feet = longueurPo / 12;
  for (const row of SOUFFLEURS_TABLE) {
    if (feet >= row.minFt && feet <= row.maxFt) {
      return {
        options: [...row.options],
        recommended: row.options[0],
        feetRangeLabel: `${row.minFt} à ${row.maxFt} pi`,
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
