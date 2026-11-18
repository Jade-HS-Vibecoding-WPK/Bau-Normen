// Schlichte Linien-Symbole (SVG) im Stil der Linienkunst.
type P = { size?: number; className?: string };

/** Paragraphenzeichen als eigene Linie (keine Schrift): zwei gleiche S-Bögen, um 180° gedreht, Mittelpunkt genau bei (20, 20) */
export const LOGO_PARAGRAPH =
  "M24.18 12.36C23.64 10.82 22.09 10 20.09 10 17.64 10 16 11.27 16 13.18 16 15.36 18.27 16.18 20.55 16.91 22.73 17.64 24.18 18.64 24.18 20.55 24.18 22.36 22.73 23.55 20.91 23.91" +
  "M15.82 27.64C16.36 29.18 17.91 30 19.91 30 22.36 30 24 28.73 24 26.82 24 24.64 21.73 23.82 19.45 23.09 17.27 22.36 15.82 21.36 15.82 19.45 15.82 17.64 17.27 16.45 19.09 16.09";
/** Organische Fläche (wie ein Flurstück im Lageplan) und eine feine Höhenlinie */
export const LOGO_FLAECHE = "M21 2.5C31 3 38.5 10 37.5 20.5S29 38 19 37.5 2 30 2.5 19.5 11 2 21 2.5Z";
export const LOGO_HOEHENLINIE = "M20.5 6.5C28 7 33.5 12 33 20S27 33.5 19.5 33 6.5 27.5 7 19.5 13 6 20.5 6.5Z";

export function Logo({ size = 40 }: P) {
  // Selbst gezeichnet (keine Schrift, kein fremdes Symbol): Fläche, Höhenlinie und Paragraphenzeichen
  return (
    <svg className="logo" width={size} height={size} viewBox="0 0 40 40" aria-hidden="true">
      <path d={LOGO_FLAECHE} style={{ fill: "var(--logo-flaeche)" }} />
      <path d={LOGO_HOEHENLINIE} fill="none" style={{ stroke: "var(--logo-linie)" }} strokeOpacity=".45" strokeWidth=".9" />
      <path d={LOGO_PARAGRAPH} fill="none" style={{ stroke: "var(--logo-text)" }} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
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
