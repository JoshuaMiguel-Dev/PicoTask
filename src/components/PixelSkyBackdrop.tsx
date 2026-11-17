/**
 * 8-Bit Pixel Night Sky Backdrop with undulating Aurora Borealis ribbons,
 * twinkling pixel stars, and falling shooting stars for the Clock & Focus Timer.
 */
export default function PixelSkyBackdrop() {
  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 overflow-hidden pointer-events-none select-none z-0 bg-[#0E162E]"
    >
      {/* Pixel SVG Aurora Borealis & Starfield */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 160 90"
        preserveAspectRatio="none"
        shapeRendering="crispEdges"
        className="w-full h-full"
      >
        {/* Deep Night Horizon Bands */}
        <rect x="0" y="0" width="160" height="90" fill="#0E162E" />
        <rect x="0" y="64" width="160" height="26" fill="#152244" />
        <rect x="0" y="78" width="160" height="12" fill="#1D2B53" />

        {/* --- AURORA BOREALIS CURTAIN 1 (Emerald Green & Cyan Pixel Ribbons) --- */}
        <g className="animate-aurora-1">
          {/* Upper Cyan-Green Shimmer */}
          <rect x="6" y="10" width="18" height="3" fill="#008751" />
          <rect x="24" y="8" width="22" height="3" fill="#008751" />
          <rect x="46" y="11" width="20" height="3" fill="#008751" />
          <rect x="66" y="14" width="24" height="3" fill="#008751" />
          <rect x="90" y="11" width="22" height="3" fill="#008751" />
          <rect x="112" y="8" width="24" height="3" fill="#008751" />
          <rect x="136" y="11" width="18" height="3" fill="#008751" />

          {/* Brighter Middle Ribbon */}
          <rect x="10" y="13" width="16" height="4" fill="#29ADFF" opacity="0.7" />
          <rect x="26" y="11" width="20" height="4" fill="#00E436" opacity="0.65" />
          <rect x="46" y="14" width="20" height="4" fill="#29ADFF" opacity="0.7" />
          <rect x="66" y="17" width="24" height="4" fill="#00E436" opacity="0.65" />
          <rect x="90" y="14" width="22" height="4" fill="#29ADFF" opacity="0.7" />
          <rect x="112" y="11" width="24" height="4" fill="#00E436" opacity="0.65" />
          <rect x="136" y="14" width="16" height="4" fill="#29ADFF" opacity="0.7" />

          {/* Vertical Aurora Pillar Rays */}
          <rect x="16" y="6" width="3" height="14" fill="#00E436" opacity="0.35" />
          <rect x="34" y="4" width="4" height="16" fill="#29ADFF" opacity="0.35" />
          <rect x="56" y="7" width="3" height="15" fill="#00E436" opacity="0.35" />
          <rect x="78" y="9" width="4" height="16" fill="#29ADFF" opacity="0.35" />
          <rect x="102" y="6" width="3" height="15" fill="#00E436" opacity="0.35" />
          <rect x="124" y="4" width="4" height="16" fill="#29ADFF" opacity="0.35" />
        </g>

        {/* --- AURORA BOREALIS CURTAIN 2 (Secondary Magenta / Blue Wave) --- */}
        <g className="animate-aurora-2">
          <rect x="12" y="22" width="24" height="2" fill="#FF004D" opacity="0.45" />
          <rect x="36" y="25" width="26" height="2" fill="#29ADFF" opacity="0.5" />
          <rect x="62" y="22" width="28" height="2" fill="#008751" opacity="0.55" />
          <rect x="90" y="25" width="26" height="2" fill="#FF004D" opacity="0.45" />
          <rect x="116" y="22" width="30" height="2" fill="#29ADFF" opacity="0.5" />

          <rect x="22" y="18" width="3" height="10" fill="#FF004D" opacity="0.25" />
          <rect x="74" y="16" width="3" height="11" fill="#29ADFF" opacity="0.3" />
          <rect x="130" y="17" width="3" height="10" fill="#00E436" opacity="0.25" />
        </g>

        {/* --- TWINKLING PIXEL STARS --- */}
        <g className="animate-twinkle-1">
          <rect x="12" y="6" width="2" height="2" fill="#FFF1E8" />
          <rect x="48" y="5" width="1" height="1" fill="#FFCCAA" />
          <rect x="88" y="4" width="2" height="2" fill="#FFF1E8" />
          <rect x="144" y="6" width="2" height="2" fill="#29ADFF" />
          <rect x="28" y="34" width="1" height="1" fill="#FFF1E8" />
          <rect x="134" y="36" width="1" height="1" fill="#FFF1E8" />
        </g>

        <g className="animate-twinkle-2">
          <rect x="26" y="5" width="1" height="1" fill="#FFF1E8" />
          <rect x="68" y="6" width="2" height="2" fill="#FFCCAA" />
          <rect x="116" y="5" width="1" height="1" fill="#FFF1E8" />
          <rect x="14" y="42" width="2" height="2" fill="#29ADFF" />
          <rect x="148" y="30" width="2" height="2" fill="#FFF1E8" />
        </g>

        {/* Distant Pixel Mountain Silhouette along Bottom Horizon */}
        <polygon
          points="0,90 0,80 18,70 34,80 56,66 78,80 104,68 128,79 146,71 160,78 160,90"
          fill="#090F22"
        />
      </svg>

      {/* --- FALLING / SHOOTING PIXEL STAR #1 --- */}
      <div className="animate-shooting-star-1 absolute top-3 right-8 flex items-center">
        <span className="w-2 h-2 bg-[#FFF1E8] shadow-[0_0_4px_#FFF1E8]" />
        <span className="w-3 h-1 bg-[#29ADFF] -ml-0.5 -mt-1" />
        <span className="w-4 h-0.5 bg-[#00E436]/70 -ml-0.5 -mt-2" />
      </div>

      {/* --- FALLING / SHOOTING PIXEL STAR #2 --- */}
      <div className="animate-shooting-star-2 absolute top-1 right-1/3 flex items-center">
        <span className="w-1.5 h-1.5 bg-[#FFCCAA]" />
        <span className="w-3 h-1 bg-[#FF004D]/80 -ml-0.5 -mt-1" />
        <span className="w-3 h-0.5 bg-[#FFF1E8]/50 -ml-0.5 -mt-1.5" />
      </div>
    </div>
  );
}
