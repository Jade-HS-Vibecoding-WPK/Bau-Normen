// Minimalistische Gecko-Silhouette (Draufsicht, Kopf nach oben), einfarbig über "currentColor".
// Koordinatensystem 0 0 60 100. Beine, Rumpf und Schwanz sind getrennt, damit sie sich beim Laufen bewegen.
export function GeckoFigur() {
  return (
    <g className="gk">
      <g className="gk-schwanz">
        <path d="M30 61 C30 70, 30.5 76, 32.5 82" strokeWidth="5.6" />
        <path d="M32.5 82 C35 89, 41 93, 45.5 89.5" strokeWidth="3.6" />
        <path d="M45.5 89.5 C49 86, 47.5 80.5, 43.5 81.5" strokeWidth="2.2" />
        <path d="M43.5 81.5 C41.6 82, 41.2 84.4, 42.6 85.4" strokeWidth="1.4" />
      </g>
      <Bein klasse="gk-vl" d="M25.5 26 L19 24.5 L15.5 17.5" fuss={[15.5, 17.5]} zehen={[[11.2, 14.3], [13.2, 11.9], [16.4, 11.8], [19, 13.8]]} />
      <Bein klasse="gk-vr" d="M34.5 26 L41 24.5 L44.5 17.5" fuss={[44.5, 17.5]} zehen={[[48.8, 14.3], [46.8, 11.9], [43.6, 11.8], [41, 13.8]]} />
      <Bein klasse="gk-hl" d="M26.5 53 L19 55.5 L15 62.5" fuss={[15, 62.5]} zehen={[[10.4, 63.4], [10.9, 67.2], [14, 69.6], [17.6, 67.6]]} />
      <Bein klasse="gk-hr" d="M33.5 53 L41 55.5 L45 62.5" fuss={[45, 62.5]} zehen={[[49.6, 63.4], [49.1, 67.2], [46, 69.6], [42.4, 67.6]]} />
      <path
        className="gk-rumpf"
        d="M30 2 C33.5 2, 36.5 5.5, 36.5 10 C36.5 14, 34.5 17, 33.2 19.5 C35.5 23, 36.8 28, 36.6 33 C36.4 39, 37 44, 36.2 49 C35.6 53, 34.6 56, 33.2 59 C32.6 61, 32.3 62.5, 32 64 L28 64 C27.7 62.5, 27.4 61, 26.8 59 C25.4 56, 24.4 53, 23.8 49 C23 44, 23.6 39, 23.4 33 C23.2 28, 24.5 23, 26.8 19.5 C25.5 17, 23.5 14, 23.5 10 C23.5 5.5, 26.5 2, 30 2 Z"
      />
    </g>
  );
}

function Bein({ klasse, d, fuss, zehen }: { klasse: string; d: string; fuss: [number, number]; zehen: number[][] }) {
  return (
    <g className={`gk-bein ${klasse}`}>
      <path d={d} strokeWidth="3.1" />
      {zehen.map(([x, y], i) => (
        <g key={i}>
          <path d={`M${fuss[0]} ${fuss[1]} L${x} ${y}`} strokeWidth="1.3" />
          <circle cx={x} cy={y} r="1.3" />
        </g>
      ))}
    </g>
  );
}
