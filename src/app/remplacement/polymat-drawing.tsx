type Props = {
  systeme?: "simple" | "double";
  className?: string;
};

export function PolymatDrawing({ systeme = "double", className }: Props) {
  const isDouble = systeme === "double";

  return (
    <svg
      viewBox="0 0 120 260"
      className={className}
      aria-label={
        isDouble ? "Schéma Polymat double" : "Schéma Polymat simple"
      }
      role="img"
    >
      {/* Outer rails */}
      <rect x="36" y="10" width="5" height="240" fill="#c9d1dc" />
      <rect x="79" y="10" width="5" height="240" fill="#c9d1dc" />

      {/* Top header bracket */}
      <rect
        x="28"
        y="6"
        width="21"
        height="34"
        fill="none"
        stroke="#1a1f2e"
        strokeWidth="1.5"
      />

      {/* Bottom footer bracket */}
      <rect
        x="71"
        y="220"
        width="21"
        height="34"
        fill="none"
        stroke="#1a1f2e"
        strokeWidth="1.5"
      />

      {/* Diagonal connection top-right */}
      <line
        x1="49"
        y1="40"
        x2="79"
        y2="52"
        stroke="#1a1f2e"
        strokeWidth="1.5"
      />

      {/* Diagonal connection bottom-left */}
      <line
        x1="41"
        y1="208"
        x2="71"
        y2="220"
        stroke="#1a1f2e"
        strokeWidth="1.5"
      />

      {/* Upper curtain (top polymat) */}
      <rect
        x="41"
        y="40"
        width="38"
        height={isDouble ? 80 : 168}
        fill="#eef3f7"
        stroke="#1a1f2e"
        strokeWidth="1.5"
      />
      {/* Horizontal cell lines — upper */}
      {Array.from({ length: isDouble ? 4 : 8 }).map((_, i) => (
        <line
          key={`u-${i}`}
          x1="41"
          y1={52 + i * (isDouble ? 16 : 18)}
          x2="79"
          y2={52 + i * (isDouble ? 16 : 18)}
          stroke="#c9d1dc"
          strokeWidth="0.8"
        />
      ))}

      {/* Lower curtain (bottom polymat) — only for double */}
      {isDouble && (
        <>
          <rect
            x="41"
            y="128"
            width="38"
            height="80"
            fill="#eef3f7"
            stroke="#1a1f2e"
            strokeWidth="1.5"
          />
          {Array.from({ length: 4 }).map((_, i) => (
            <line
              key={`l-${i}`}
              x1="41"
              y1={140 + i * 16}
              x2="79"
              y2={140 + i * 16}
              stroke="#c9d1dc"
              strokeWidth="0.8"
            />
          ))}
        </>
      )}

      {/* Anchor/dot between sections (double only) */}
      {isDouble && (
        <circle
          cx="60"
          cy="124"
          r="3"
          fill="#1b9ae0"
          stroke="#fff"
          strokeWidth="1"
        />
      )}
    </svg>
  );
}
