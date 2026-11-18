"""Baut aus index.html die Fassung für ein Claude-Artefakt (dist/artefakt.html).
Das Artefakt legt selbst <!doctype>, <html>, <head> und <body> herum; CSS, JS, Schriften und
Impressum werden als mitveröffentlichte Dateien unter denselben relativen Pfaden ausgeliefert."""
import re, pathlib
root = pathlib.Path(__file__).resolve().parent.parent
html = (root / 'index.html').read_text()
head = re.search(r'<head>(.*?)</head>', html, re.S).group(1)
body = re.search(r'<body>(.*?)</body>', html, re.S).group(1)
# nur, was im Artefakt gebraucht wird: Titel, Beschreibung, Stil, Auftakt-Skript
keep = []
keep.append(re.search(r'<title>.*?</title>', head).group(0))
keep.append('<meta name="claude:viewport-fit-sides" content="cover">')
keep.append(re.search(r'<meta name="description"[^>]*>', head).group(0))
keep.append('<link rel="stylesheet" href="assets/site.css">')
keep.append(re.search(r'<script>\n/\* Auftakt.*?</script>', head, re.S).group(0))
# Vercel-Analytics gibt es im Artefakt nicht (CSP, kein /_vercel)
body = re.sub(r'<!-- Vercel Web Analytics.*?speed-insights/script.js"></script>', '', body, flags=re.S)
out = '\n'.join(keep) + '\n' + body.strip() + '\n'
dist = root / 'dist'; dist.mkdir(exist_ok=True)
(dist / 'artefakt.html').write_text(out)
print(dist / 'artefakt.html', len(out), 'Zeichen')
