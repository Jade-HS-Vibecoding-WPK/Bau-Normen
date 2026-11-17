// Schlichte Linien-Symbole (SVG) im Stil der Linienkunst.
type P = { size?: number; className?: string };

export function Logo({ size = 40 }: P) {
  // Organische Fläche mit Paragraphenzeichen und feiner Höhenlinie
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true">
      <path d="M21 2.5C31 3 38.5 10 37.5 20.5S29 38 19 37.5 2 30 2.5 19.5 11 2 21 2.5Z" style={{ fill: "var(--logo-flaeche)" }} />
      <path d="M20.5 6.5C28 7 33.5 12 33 20S27 33.5 19.5 33 6.5 27.5 7 19.5 13 6 20.5 6.5Z" fill="none" style={{ stroke: "var(--logo-linie)" }} strokeOpacity=".45" strokeWidth=".9" />
      <text x="20" y="27" textAnchor="middle" fontSize="20" fontWeight="600" style={{ fill: "var(--logo-text)", fontFamily: "var(--font-display), Georgia, serif" }}>
        §
      </text>
    </svg>
  );
}

export function SymbolPin({ size = 26, className }: P) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <path d="M12 21s-6.5-6.2-6.5-11A6.5 6.5 0 0 1 18.5 10c0 4.8-6.5 11-6.5 11Z" />
      <circle cx="12" cy="10" r="2.3" />
      <path d="M3 21h18" strokeDasharray="2 2" />
    </svg>
  );
}

export function SymbolPlan({ size = 16, className }: P) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" />
      <path d="M3 9h7v12M10 13h11M15 3v10" />
    </svg>
  );
}

export function SymbolDenkmal({ size = 16, className }: P) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
      <path d="M3 9 12 4l9 5M4 9h16M6 9v9M10 9v9M14 9v9M18 9v9M3 21h18M4 18h16" />
    </svg>
  );
}
