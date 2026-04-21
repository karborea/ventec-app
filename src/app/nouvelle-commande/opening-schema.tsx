"use client";

/**
 * Compact static schema of an opening — the barn-blueprint metaphor
 * from the prototypes : tan wall on top, gray wall on bottom, support
 * pipes left + right, opening in the middle.
 *
 * Purely decorative; does not scale with real dimensions. Shows the
 * entered longueur (po) in a centered label.
 */

type Props = {
  longueurPo: number | null;
};

export function OpeningSchema({ longueurPo }: Props) {
  return (
    <div className="relative aspect-[4/3] rounded-lg bg-[#fafbfc] border border-[#e3e6ec] overflow-hidden">
      {/* Top wall */}
      <div className="absolute inset-x-0 top-0 h-[22%] bg-[#e8dcc0]" />
      <div className="absolute top-2 left-3 text-[10px] font-bold uppercase tracking-[0.5px] text-[#5a6278]">
        Haut
      </div>

      {/* Bottom wall */}
      <div className="absolute inset-x-0 bottom-0 h-[22%] bg-[#d4d7dc]" />
      <div className="absolute bottom-2 left-3 text-[10px] font-bold uppercase tracking-[0.5px] text-[#5a6278]">
        Bas
      </div>

      {/* Left support */}
      <div className="absolute left-[4%] top-[18%] bottom-[18%] w-[16%] bg-white border-[1.5px] border-[#e3e6ec] rounded-sm flex flex-col items-center justify-between py-2 text-[10px] text-[#5a6278]">
        <span>▲</span>
        <span className="text-[10px] font-bold text-[#1b9ae0]">V</span>
        <span>▼</span>
      </div>

      {/* Right support */}
      <div className="absolute right-[4%] top-[18%] bottom-[18%] w-[16%] bg-white border-[1.5px] border-[#e3e6ec] rounded-sm flex flex-col items-center justify-between py-2 text-[10px] text-[#5a6278]">
        <span>▲</span>
        <span className="text-[10px] font-bold text-[#1b9ae0]">V</span>
        <span>▼</span>
      </div>

      {/* Opening */}
      <div className="absolute top-[22%] bottom-[22%] left-[22%] right-[22%] border-2 border-dashed border-[#b6bec9] bg-[#1b9ae0]/[0.03] rounded-sm" />

      {/* Length arrow + label */}
      <div className="absolute left-[22%] right-[22%] top-1/2 -translate-y-1/2 flex items-center gap-1.5 px-1 pointer-events-none">
        <div className="flex-1 h-px bg-[#1a1f2e] relative">
          <span className="absolute -left-[1px] top-1/2 -translate-y-1/2 w-0 h-0 border-y-[4px] border-y-transparent border-r-[5px] border-r-[#1a1f2e]" />
        </div>
        <span className="bg-white border border-[#e3e6ec] rounded px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap">
          {longueurPo !== null ? `${longueurPo} po` : "Longueur"}
        </span>
        <div className="flex-1 h-px bg-[#1a1f2e] relative">
          <span className="absolute -right-[1px] top-1/2 -translate-y-1/2 w-0 h-0 border-y-[4px] border-y-transparent border-l-[5px] border-l-[#1a1f2e]" />
        </div>
      </div>
    </div>
  );
}
