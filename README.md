# samis-ellsaesser.de

Persönliche Seite, minimalistisch. Statisch, ohne Build-Schritt.

```bash
python3 -m http.server 8080
```

| Pfad | Inhalt |
| --- | --- |
| `index.html` | Die Seite: Name, Jetzt (aktuelle Projekte), Kontakt |
| `assets/site.css` | Farben als Tokens (hell und dunkel), eine Schrift, eine Akzentfarbe |
| `assets/site.js` | Der Name aus Rasterpunkten (Canvas 2D, ohne Bibliothek) |
| `assets/fonts/` | Plus Jakarta Sans und IBM Plex Mono, SIL Open Font License, selbst gehostet |
| `impressum.html` | Impressum und Datenschutz (Platzhalter ausfüllen) |
| `llms.txt` | Kurzfassung für KI-Assistenten |

## Animation

Verwandt mit der Prägung auf digitalemedien.de: Der Name wird als Halbton-Raster abgetastet.
Beim Laden fliegen die Punkte ein (Daten werden Druck), links feines Raster, rechts fast volle Fläche.
Die Umlautpunkte im „ä“ tragen die Akzentfarbe. Der Zeiger schiebt die Punkte sanft beiseite.
Bei „Bewegung reduzieren“ steht das Raster sofort, ohne JavaScript bleibt der normale Text.

## Auslieferung

`Dockerfile` baut einen Caddy-Server für Railway (wie bei digitalemedien).

## Offen

- Kontaktadresse `hallo@samis-ellsaesser.de` bestätigen (index.html, impressum.html, llms.txt)
- Impressum ausfüllen
