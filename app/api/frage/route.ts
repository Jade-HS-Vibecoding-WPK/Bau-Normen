import { NextResponse } from "next/server";
import "@/lib/daten-server";
import { bearbeite, type Anfrage } from "@/lib/anfrage";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as Anfrage;
  try {
    const { antworten, status } = await bearbeite(body);
    return NextResponse.json({ antworten }, { status });
  } catch (e) {
    // Unerwarteter Fehler: als verständliche Antwort zurückgeben statt einer leeren 500-Seite
    // (sonst meldet die Oberfläche fälschlich „Verbindung fehlgeschlagen“).
    console.error("Fehler bei /api/frage:", e);
    const en = body?.sprache === "en";
    return NextResponse.json(
      {
        antworten: [
          {
            art: "fehler",
            text: en
              ? "The request could not be processed (internal error). Please try again or rephrase the question."
              : "Die Anfrage konnte nicht bearbeitet werden (interner Fehler). Bitte erneut versuchen oder anders formulieren.",
          },
        ],
      },
      { status: 500 },
    );
  }
}
