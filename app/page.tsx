import ChatApp from "@/components/ChatApp";
import { gesetzListe } from "@/lib/gesetze";

export const dynamic = "force-dynamic";

export default function Startseite() {
  return <ChatApp gesetze={gesetzListe()} />;
}
