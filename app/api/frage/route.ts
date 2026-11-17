import { NextResponse } from "next/server";
import "@/lib/daten-server";
import { bearbeite, type Anfrage } from "@/lib/anfrage";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as Anfrage;
  const { antworten, status } = await bearbeite(body);
  return NextResponse.json({ antworten }, { status });
}
