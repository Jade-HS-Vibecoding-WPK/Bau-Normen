// Organische Formen und Linienkunst – reine Dekoration (aria-hidden), trägt keine Inhalte.
// Leitidee: Gelände. Weiche Flächen wie Grünflächen im Lageplan, feine Höhenlinien wie auf einer Geländekarte.

/** Ein organischer Ring um den Nullpunkt (Radius ca. 95) – Grundform der Höhenlinien. */
const RING = "M0-95C55-94 98-58 96 0S55 95-4 95-98 55-96-4-52-96 0-95Z";

/** Höhenlinien: derselbe Ring mehrfach verkleinert und leicht gedreht – wie eine Kuppe auf der Geländekarte. */
function Hoehenlinien({ x, y, r, n = 6, drehung = 0, className }: { x: number; y: number; r: number; n?: number; drehung?: number; className?: string }) {
  return (
    <g className={className} transform={`translate(${x} ${y}) rotate(${drehung}) scale(${r / 95})`}>
      {Array.from({ length: n }, (_, i) => (
        <path key={i} d={RING} transform={`rotate(${i * 9}) scale(${1 - i * (0.82 / n)})`} vectorEffect="non-scaling-stroke" />
      ))}
    </g>
  );
}

/** Ein Bündel fließender, paralleler Linien. */
function Linienbuendel({ n, d, className }: { n: number; d: (i: number) => string; className?: string }) {
  return (
    <g className={className}>
      {Array.from({ length: n }, (_, i) => (
        <path key={i} d={d(i)} vectorEffect="non-scaling-stroke" />
      ))}
    </g>
  );
}

/** Hintergrund der ganzen Seite: große weiche Flächen und feine Linien, fest hinter allen Inhalten. */
export function Landschaft() {
  return (
    <svg className="landschaft" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <path className="ls-salbei" d="M1180-60C1320-40 1480 40 1470 190 1460 330 1340 360 1240 320 1140 280 1080 180 1090 90 1100 10 1120-70 1180-60Z" />
      <path className="ls-minze" d="M-80 640C20 560 170 580 230 670 290 760 250 880 140 920 30 960-110 900-130 790-150 700-130 680-80 640Z" />
      <path className="ls-aqua" d="M1250 720C1330 680 1430 700 1460 780 1490 860 1420 940 1330 930 1240 920 1190 850 1200 790 1205 760 1220 735 1250 720Z" />
      <path className="ls-flieder" d="M640 380C700 350 780 370 790 430 800 490 740 520 690 510 640 500 600 470 605 430 608 405 620 390 640 380Z" opacity=".6" />
      <path className="ls-flieder" d="M1380 420C1420 400 1470 420 1475 460 1480 500 1440 520 1405 512 1370 505 1352 480 1356 455 1358 438 1366 428 1380 420Z" />
      <Hoehenlinien className="ls-linie" x={1300} y={770} r={170} n={8} drehung={-12} />
      <Hoehenlinien className="ls-linie" x={130} y={210} r={120} n={6} drehung={25} />
      <Linienbuendel
        className="ls-linie ls-fein"
        n={9}
        d={(i) => `M-40 ${540 + i * 13}C260 ${450 + i * 15} 520 ${640 + i * 9} 820 ${520 + i * 12}S1260 ${380 + i * 14} 1480 ${430 + i * 11}`}
      />
    </svg>
  );
}

/** Feine Linien im dunklen Kopf. */
export function KopfLinien() {
  return (
    <svg className="kopf-linien" viewBox="0 0 700 90" preserveAspectRatio="xMaxYMid slice" aria-hidden="true">
      <path className="kl-flaeche" d="M520-30C600-40 690 0 700 60 710 120 640 140 580 120 520 100 470 60 480 20 485 0 495-25 520-30Z" />
      <Linienbuendel n={7} d={(i) => `M0 ${18 + i * 9}C160 ${-6 + i * 9} 300 ${58 + i * 9} 460 ${22 + i * 9}S640 ${-4 + i * 10} 720 ${16 + i * 9}`} />
    </svg>
  );
}

/** Weiche Unterkante des Kopfes statt einer geraden Linie. */
export function Welle() {
  return (
    <svg className="kopf-welle" viewBox="0 0 1440 28" preserveAspectRatio="none" aria-hidden="true">
      {/* gleicher Farbverlauf wie der Kopf: links Minze, Mitte Aqua, rechts Flieder */}
      <defs>
        <linearGradient id="kopf-verlauf" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" className="kw-a" />
          <stop offset="0.55" className="kw-b" />
          <stop offset="1" className="kw-c" />
        </linearGradient>
      </defs>
      <path d="M0 0H1440V10C1240 30 1040 2 820 14 600 26 380 0 200 10 110 15 40 18 0 12Z" fill="url(#kopf-verlauf)" />
    </svg>
  );
}

/** Linienzeichnung für die Startansicht: Gelände mit Höhenlinien, Haus, Pflanze und Baum. */
export function LinienBild({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 320 240" aria-hidden="true">
      <path className="lb-flaeche" d="M60 40C120-5 230 10 270 60 310 110 300 190 230 215 160 240 70 225 35 170 0 115 10 75 60 40Z" />
      <circle className="lb-sonne" cx="252" cy="58" r="17" />
      <g className="lb-gelaende">
        <path d="M18 196C70 176 110 206 160 191S252 166 302 186" />
        <path d="M30 210C80 193 120 220 170 205S256 183 296 199" />
        <path d="M46 223C92 209 132 231 182 219S256 201 286 212" />
      </g>
      <path className="lb-krone" d="M238 147C216 147 209 124 221 111 227 96 249 94 258 108 272 116 266 146 238 147Z" />
      <g className="lb-strich">
        <path d="M238 182V146M238 162L229 154M238 157L247 149" />
        <path d="M96 182H222" />
        <path d="M120 182V134L160 105 200 134V182" />
        <path d="M150 182V156H170V182" />
        <path d="M128 142H142V156H128Z" />
        <circle cx="182" cy="149" r="7" />
        <path d="M92 182C88 154 92 128 104 102" />
        <path d="M95 152C78 148 70 134 72 122 86 126 95 138 95 152ZM95 152L80 130" />
        <path d="M98 130C112 124 122 110 120 98 106 102 98 116 98 130ZM98 130L114 104" />
        <path d="M102 110C92 100 92 86 98 78 106 86 106 100 102 110ZM102 110L99 84" />
      </g>
    </svg>
  );
}
