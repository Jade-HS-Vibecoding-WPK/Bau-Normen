import fs from "node:fs";
import path from "node:path";
import ChatApp from "@/components/ChatApp";
import { EinstellungenProvider } from "@/components/Einstellungen";
import "@/lib/daten-server";
import { gesetzListe } from "@/lib/gesetze";

export default function Startseite() {
  // Pfad zum Obsidian-Vault (wird von "npm run obsidian" erzeugt) – für den Button "Obsidian-Ansicht".
  // In der statischen Online-Version (GitHub Pages) gibt es keinen lokalen Vault.
  const vault = path.join(process.cwd(), "obsidian");
  const obsidianPfad = process.env.NEXT_PUBLIC_STATISCH !== "1" && fs.existsSync(path.join(vault, "Start.md")) ? vault : null;
  return (
    <EinstellungenProvider>
      <ChatApp gesetze={gesetzListe()} obsidianPfad={obsidianPfad} />
    </EinstellungenProvider>
  );
}
