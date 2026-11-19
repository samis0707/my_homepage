# samis-ellsaesser.de

Persönliche Seite, minimalistisch. Statisch, ohne Build-Schritt.

```bash
python3 -m http.server 8080
```

| Pfad | Inhalt |
| --- | --- |
| `index.html` | Die Seite: Name, Jetzt (Schwarz Digits), Projekte, Kontakt |
| `assets/site.css` | Farben als Tokens: heller Grund, Dunkelblau, Ozeanblau als Akzent |
| `assets/site.js` | Der Name aus Rasterpunkten (Canvas 2D, ohne Bibliothek) |
| `assets/fonts/` | Plus Jakarta Sans und IBM Plex Mono, SIL Open Font License, selbst gehostet |
| `tools/artefakt.py` | baut `dist/artefakt.html` für die Vorschau als Claude-Artefakt |
| `assets/kontakt.js` | setzt Mail und Anschrift erst im Browser ein (Schutz vor Crawlern) |
| `impressum.html` | Impressum und Datenschutz (Platzhalter ausfüllen) |
| `llms.txt` | Kurzfassung für KI-Assistenten |

## Auftakt

Ein Mauszeiger fliegt herein und klickt auf den Namen; aus dem Klickpunkt schießen die Rasterpunkte in ihre Plätze,
danach blendet die Seite gestaffelt ein (Muster „Geste & Abgang“ aus dem Skill website-overlay-clips im Repo digitalemedien).
Overlay-Clips (Roboterhand aus Google Flow) kommen dazu, sobald sie generiert sind; sie lösen dieselben Marken aus.

## Raster

Verwandt mit der Prägung auf digitalemedien.de: Der Name wird als Halbton-Raster abgetastet.
Beim Klick im Auftakt fliegen die Punkte ein, links feiner, rechts fast volle Fläche.
Die Umlautpunkte im „ä“ tragen die Akzentfarbe (Ozeanblau). Der Zeiger schiebt die Punkte sanft beiseite.
Bei „Bewegung reduzieren“ steht das Raster sofort, ohne JavaScript bleibt der normale Text.

## Auslieferung

Vercel, verbunden mit diesem GitHub-Repo: Jeder Push baut eine Vorschau, der Produktions-Branch geht live.
`vercel.json` setzt saubere URLs und Header. Vercel Web Analytics und Speed Insights sind per Skript-Tag
eingebunden (`/_vercel/insights/script.js`, `/_vercel/speed-insights/script.js`) und müssen im Projekt aktiviert sein.

## Offen

- Postleitzahl im Impressum bestätigen, Datenschutzerklärung prüfen lassen
