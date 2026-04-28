/**
 * Petits icônes de mesure pour différencier visuellement
 * hauteur (flèche verticale) et longueur (flèche horizontale).
 *
 * Couleurs recommandées :
 *  - Hauteur : `text-[#1b9ae0]` (bleu Ventec)
 *  - Longueur : `text-[#f37021]` (orange Ventec accent)
 */

export function HauteurIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 20 20"
      aria-label="Hauteur"
      className={className}
    >
      <line
        x1="10"
        y1="3"
        x2="10"
        y2="17"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <polyline
        points="6,7 10,3 14,7"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <polyline
        points="6,13 10,17 14,13"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function LongueurIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 20 20"
      aria-label="Longueur"
      className={className}
    >
      <line
        x1="3"
        y1="10"
        x2="17"
        y2="10"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <polyline
        points="7,6 3,10 7,14"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <polyline
        points="13,6 17,10 13,14"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
