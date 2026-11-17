// Erzeugt das Verzeichnis der VOB Teil C (Allgemeine Technische Vertragsbedingungen für Bauleistungen, ATV)
// als data/gesetze/vobc.json – im selben Schema wie die Gesetze, aber OHNE Wortlaut.
//
// Warum ohne Wortlaut? Die ATV erscheinen als DIN-Normen (DIN 18299 ff.). Normen privater Normungsorganisationen
// bleiben urheberrechtlich geschützt, auch wenn Gesetze oder Verträge auf sie verweisen (§ 5 Abs. 3 UrhG).
// Der Text ist nur bei DIN Media erhältlich. Die App führt deshalb nur Nummer und Titel jeder ATV.
//
// Stand: VOB Gesamtausgabe 2019 mit Ergänzungsband 2023 (Einführungserlass des BMWSB vom 20.09.2023,
// in Kraft seit 01.10.2023). DIN 18310 ist zurückgezogen und gehört nicht mehr dazu.
// Titel abgeglichen mit dem BMWSB-Erlass (für die 2023 überarbeiteten und neuen ATV) und dem Normenverzeichnis
// von DIN Media. Abweichung: Der Erlass schreibt bei DIN 18451 „Gerüstbauarbeiten“, der Normtitel lautet „Gerüstarbeiten“.
//
// Aufruf: node scripts/vobc-verzeichnis.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ZIEL = path.join(ROOT, "data", "gesetze", "vobc.json");
const DIN_MEDIA = "https://www.dinmedia.de/de/themenseiten/voballgemein";
const ERLASS_2023 = "https://www.fib-bund.de/Inhalt/Vergabe/VOB/2023-09-20_BMWSB_Erlass_VOB-C_Ausgabe2023.pdf";

// Mit dem Ergänzungsband 2023 überarbeitet (fachtechnisch oder redaktionell) bzw. neu aufgenommen – laut BMWSB-Erlass vom 20.09.2023
const UEBERARBEITET_2023 = new Set(["18299", "18301", "18302", "18315", "18322", "18323", "18329", "18332", "18334", "18336", "18340", "18349", "18351", "18353", "18361", "18364", "18382", "18451"]);
const NEU_2023 = new Set(["18327", "18328", "18448"]);

const ATV = [
  ["18299", "Allgemeine Regelungen für Bauarbeiten jeder Art"],
  ["18300", "Erdarbeiten"],
  ["18301", "Bohrarbeiten"],
  ["18302", "Spezialtiefbauarbeiten zum Ausbau von Bohrungen"],
  ["18303", "Verbauarbeiten"],
  ["18304", "Ramm-, Rüttel- und Pressarbeiten"],
  ["18305", "Wasserhaltungsarbeiten"],
  ["18306", "Entwässerungskanalarbeiten"],
  ["18307", "Druckrohrleitungsarbeiten außerhalb von Gebäuden"],
  ["18308", "Drän- und Versickerarbeiten"],
  ["18309", "Einpressarbeiten"],
  ["18311", "Nassbaggerarbeiten"],
  ["18312", "Untertagebauarbeiten"],
  ["18313", "Schlitzwandarbeiten mit stützenden Flüssigkeiten"],
  ["18314", "Spritzbetonarbeiten"],
  ["18315", "Verkehrswegebauarbeiten – Oberbauschichten ohne Bindemittel"],
  ["18316", "Verkehrswegebauarbeiten – Oberbauschichten mit hydraulischen Bindemitteln"],
  ["18317", "Verkehrswegebauarbeiten – Oberbauschichten aus Asphalt"],
  ["18318", "Pflasterdecken und Plattenbeläge, Einfassungen"],
  ["18319", "Rohrvortriebsarbeiten"],
  ["18320", "Landschaftsbauarbeiten"],
  ["18321", "Düsenstrahlarbeiten"],
  ["18322", "Kabelleitungstiefbauarbeiten"],
  ["18323", "Kampfmittelräumarbeiten"],
  ["18324", "Horizontalspülbohrarbeiten"],
  ["18325", "Gleisbauarbeiten"],
  ["18326", "Renovierungsarbeiten an Entwässerungskanälen"],
  ["18327", "Brunnenbauarbeiten und Erdwärmesonden"],
  ["18328", "Aufbruch- und Rückbauarbeiten von Verkehrsflächen"],
  ["18329", "Verkehrssicherungsarbeiten"],
  ["18330", "Mauerarbeiten"],
  ["18331", "Betonarbeiten"],
  ["18332", "Naturwerksteinarbeiten"],
  ["18333", "Betonwerksteinarbeiten"],
  ["18334", "Zimmer- und Holzbauarbeiten"],
  ["18335", "Stahlbauarbeiten"],
  ["18336", "Abdichtungsarbeiten"],
  ["18338", "Dachdeckungsarbeiten"],
  ["18339", "Klempnerarbeiten"],
  ["18340", "Trockenbauarbeiten"],
  ["18345", "Wärmedämm-Verbundsysteme"],
  ["18349", "Betonerhaltungsarbeiten"],
  ["18350", "Putz- und Stuckarbeiten"],
  ["18351", "Vorgehängte Hinterlüftete Fassaden"],
  ["18352", "Fliesen- und Plattenarbeiten"],
  ["18353", "Estricharbeiten"],
  ["18354", "Gussasphaltarbeiten"],
  ["18355", "Tischlerarbeiten"],
  ["18356", "Parkett- und Holzpflasterarbeiten"],
  ["18357", "Beschlagarbeiten"],
  ["18358", "Rollladenarbeiten"],
  ["18360", "Metallbauarbeiten"],
  ["18361", "Verglasungsarbeiten"],
  ["18363", "Maler- und Lackierarbeiten – Beschichtungen"],
  ["18364", "Korrosionsschutzarbeiten an Stahlbauten"],
  ["18365", "Bodenbelagarbeiten"],
  ["18366", "Tapezierarbeiten"],
  ["18379", "Raumlufttechnische Anlagen"],
  ["18380", "Heizanlagen und zentrale Wassererwärmungsanlagen"],
  ["18381", "Gas-, Wasser- und Entwässerungsanlagen innerhalb von Gebäuden"],
  ["18382", "Elektro-, Sicherheits- und Informationstechnische Anlagen"],
  ["18384", "Blitzschutzanlagen"],
  ["18385", "Aufzugsanlagen, Fahrtreppen und Fahrsteige sowie Förderanlagen"],
  ["18386", "Gebäudeautomation"],
  ["18421", "Dämm- und Brandschutzarbeiten an technischen Anlagen"],
  ["18448", "Arbeiten an schadstoffbelasteten baulichen und technischen Anlagen"],
  ["18451", "Gerüstarbeiten"],
  ["18459", "Abbruch- und Rückbauarbeiten"],
];

// Grobe Einordnung nur zur Orientierung (keine amtliche Gliederung): Nummernbereiche der ATV
function bereich(nr) {
  const n = Number(nr);
  if (n === 18299) return "Allgemeine Regelungen (gilt für alle Bauarbeiten)";
  if (n <= 18329) return "ATV DIN 18300 bis 18329 – Tief-, Erd- und Verkehrswegebau";
  if (n <= 18366) return "ATV DIN 18330 bis 18366 – Hoch- und Ausbau";
  if (n <= 18421) return "ATV DIN 18379 bis 18421 – Technische Gebäudeausrüstung";
  return "ATV DIN 18448 bis 18459 – Weitere Arbeiten";
}

const fassung = (nr) =>
  NEU_2023.has(nr) ? "neu aufgenommen mit dem Ergänzungsband 2023" : UEBERARBEITET_2023.has(nr) ? "überarbeitet im Ergänzungsband 2023" : "Fassung der VOB Gesamtausgabe 2019";

const normen = ATV.map(([nr, titel]) => {
  const hinweis =
    `Verzeichniseintrag – der Wortlaut ist nicht enthalten. Die ATV DIN ${nr} ist eine DIN-Norm; ihr Text ist urheberrechtlich geschützt ` +
    `(§ 5 Abs. 3 UrhG) und bei DIN Media erhältlich. Stand: ${fassung(nr)}. ` +
    `Jede ATV ist gleich gegliedert: 0 Hinweise für das Aufstellen der Leistungsbeschreibung · 1 Geltungsbereich · 2 Stoffe, Bauteile · ` +
    `3 Ausführung · 4 Nebenleistungen, Besondere Leistungen · 5 Abrechnung.` +
    (nr === "18299" ? " Die ATV DIN 18299 gilt für Bauarbeiten jeder Art." : " Ergänzend gilt die ATV DIN 18299 (Allgemeine Regelungen für Bauarbeiten jeder Art).");
  return {
    id: nr,
    bez: `DIN ${nr}`,
    titel,
    gliederung: [bereich(nr)],
    weggefallen: false,
    inhalt: [{ t: "hinweis", v: hinweis }],
    text: `ATV DIN ${nr} ${titel}`,
    url: DIN_MEDIA,
    verweise: [], // ohne Wortlaut keine Verweise aus dem Text
  };
});

const verzeichnis = {
  id: "vobc",
  kurz: "VOB/C",
  titel: "Vergabe- und Vertragsordnung für Bauleistungen Teil C – Allgemeine Technische Vertragsbedingungen für Bauleistungen (ATV)",
  ebene: "Vergabe- und Vertragsordnung",
  stand: "VOB Gesamtausgabe 2019 mit Ergänzungsband 2023 (Einführungserlass BMWSB vom 20.09.2023, in Kraft seit 01.10.2023)",
  nurVerzeichnis: true,
  quelle: {
    name: "Verzeichnis nach BMWSB-Einführungserlass vom 20.09.2023 und DIN Media – Wortlaut nur bei DIN Media",
    url: DIN_MEDIA,
    erlass: ERLASS_2023,
    abgerufen: "2026-11-17",
  },
  normen,
};

fs.writeFileSync(ZIEL, JSON.stringify(verzeichnis, null, 1) + "\n");
console.log(`VOB/C-Verzeichnis geschrieben: ${normen.length} ATV (${NEU_2023.size} neu, ${UEBERARBEITET_2023.size} überarbeitet 2023)`);
