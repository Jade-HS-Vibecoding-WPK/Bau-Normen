import fs from "node:fs";
import path from "node:path";
import ChatApp from "@/components/ChatApp";
import { gesetzListe } from "@/lib/gesetze";

export const dynamic = "force-dynamic";

export default function Startseite() {
  // Pfad zum Obsidian-Vault (wird von "npm run obsidian" erzeugt) – für den Button "Obsidian-Ansicht".
  const vault = path.join(process.cwd(), "obsidian");
  const obsidianPfad = fs.existsSync(path.join(vault, "Start.md")) ? vault : null;
  return <ChatApp gesetze={gesetzListe()} obsidianPfad={obsidianPfad} />;
}
