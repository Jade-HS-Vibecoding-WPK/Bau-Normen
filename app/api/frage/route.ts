import { NextResponse } from "next/server";
import { ortsauskunft } from "@/lib/ort";
import { beantworte } from "@/lib/verstehen";

export const runtime = "nodejs";

interface Anfrage {
  text?: string;
  /** Strukturierte Ortsauskunft aus dem Formular (ohne Textverständnis) */
  adresse?: { strasse?: string; hausnummer?: string };
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as Anfrage;

  if (body.adresse) {
    const strasse = (body.adresse.strasse ?? "").trim().slice(0, 120);
    const hausnummer = (body.adresse.hausnummer ?? "").trim().slice(0, 12);
    if (!strasse || !hausnummer) {
      return NextResponse.json({ antworten: [{ art: "fehler", text: "Bitte Straße und Hausnummer angeben." }] }, { status: 400 });
    }
    return NextResponse.json({ antworten: [{ art: "ort", ort: await ortsauskunft(strasse, hausnummer, "") }] });
  }

  const text = body.text;
  if (!text || typeof text !== "string" || text.length > 2000) {
    return NextResponse.json({ antworten: [{ art: "fehler", text: "Bitte eine Frage eingeben (max. 2000 Zeichen)." }] }, { status: 400 });
  }
  return NextResponse.json({ antworten: await beantworte(text) });
}
