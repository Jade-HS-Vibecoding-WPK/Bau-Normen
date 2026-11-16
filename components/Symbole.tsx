// Schlichte Linien-Symbole (SVG), angelehnt an Planzeichen.
type P = { size?: number; className?: string };

export function Logo({ size = 34 }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 34 34" aria-hidden="true">
      <rect x="1" y="1" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M6 15 L17 7 L28 15" fill="none" stroke="#9bc4a4" strokeWidth="2" strokeLinejoin="miter" />
      <text x="17" y="28" textAnchor="middle" fontSize="14" fill="currentColor" style={{ fontFamily: "var(--font-serif), Georgia, serif" }}>
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
