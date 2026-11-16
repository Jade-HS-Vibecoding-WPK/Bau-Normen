// Stellt den Gesetzestext dar – Wort für Wort aus der Quelle, nur mit Struktur (Absätze, Nummern).
import type { TextKnoten } from "@/lib/typen";

export default function Normtext({ inhalt }: { inhalt: TextKnoten[] }) {
  return <div className="normtext">{knoten(inhalt)}</div>;
}

function knoten(nodes: TextKnoten[]): React.ReactNode[] {
  return nodes.map((n, i) => {
    if (typeof n === "string") return n;
    switch (n.t) {
      case "p":
        return n.c.length ? <div className="absatz" key={i}>{knoten(n.c)}</div> : null;
      case "br":
        return <br key={i} />;
      case "b":
        return <strong key={i}>{knoten(n.c)}</strong>;
      case "i":
        return <em key={i}>{knoten(n.c)}</em>;
      case "sup":
        return <sup key={i}>{knoten(n.c)}</sup>;
      case "sub":
        return <sub key={i}>{knoten(n.c)}</sub>;
      case "dl":
        return (
          <div className="liste" key={i}>
            {n.items.map((it, j) => (
              <div className="punkt" key={j}>
                <span className="marke">{it.dt}</span>
                <span>{knoten(it.c)}</span>
              </div>
            ))}
          </div>
        );
      case "table":
        return (
          <table className="tabelle" key={i}>
            <tbody>
              {n.rows.map((r, j) => (
                <tr key={j}>{r.map((c, k) => <td key={k}>{c}</td>)}</tr>
              ))}
            </tbody>
          </table>
        );
      case "pre":
        return <pre key={i}>{n.v}</pre>;
      case "hinweis":
        return <div className="fundstelle" key={i}>{n.v}</div>;
      default:
        return null;
    }
  });
}
