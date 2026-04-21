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
 * Recommend number of souffleurs (blowers) based on opening length in inches.
 * Conservative default; will be replaced by the validated table.
 */
export function recommendSouffleurs(longueurPo: number): number | null {
  if (!Number.isFinite(longueurPo) || longueurPo <= 0) return null;
  if (longueurPo <= 64 * 12) return 2; // ≤ 64 ft
  if (longueurPo <= 124 * 12) return 3; // ≤ 124 ft
  if (longueurPo <= 146 * 12) return 4;
  return 6; // 147+ ft
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
