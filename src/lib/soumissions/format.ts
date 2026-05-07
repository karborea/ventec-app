/** Format a length in inches as "X pieds Y pouces" with proper
 *  singular/plural handling. Returns "—" for null/undefined. */
export function formatPiedsPouces(po: number | null | undefined): string {
  if (po === null || po === undefined || !Number.isFinite(po)) return "—";
  const ft = Math.floor(po / 12);
  const inches = po - ft * 12;
  const ftStr = ft === 1 ? "1 pied" : `${ft} pieds`;
  const inLabel = inches === 1 ? "pouce" : "pouces";
  const inStr = `${inches} ${inLabel}`;
  if (ft === 0) return inStr;
  if (inches === 0) return ftStr;
  return `${ftStr} ${inStr}`;
}
