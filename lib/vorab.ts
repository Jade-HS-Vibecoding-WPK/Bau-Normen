// Wird im <head> vor dem ersten Zeichnen ausgeführt (app/layout.tsx), damit Farbschema, Sprache und
// "Animationen aus" nicht erst nachträglich umspringen. Liest die gespeicherten Einstellungen (components/Einstellungen.tsx).
export const EINSTELLUNGEN_SCHLUESSEL = "bnk-einstellungen";

export const VORAB_SKRIPT = `try{var e=JSON.parse(localStorage.getItem("${EINSTELLUNGEN_SCHLUESSEL}")||"{}"),d=document.documentElement;if(e.thema==="hell"||e.thema==="dunkel")d.dataset.theme=e.thema;if(e.bewegung===false)d.dataset.bewegung="aus";if(e.sprache==="en")d.lang="en";}catch(x){}`;
