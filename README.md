# Blog van PWWplanner.nl

Deze repository bevat de blogartikelen van [pwwplanner.nl/blog](https://pwwplanner.nl/blog/index.html),
plus de bestanden en generatoren om die blog beter vindbaar te maken en er
advertenties in te plaatsen.

```
blog-artikelen/     de artikelen (markdown + front matter) en index.json
site/               drop-in bestanden voor de website + PATCHES.md
tools/              generatoren (manifest, sitemap, RSS, statische pagina's)
VOORSTEL-blog-verbetering-en-ads.md   analyse en onderbouwing
```

## De artikelen

Elk artikel is een markdown-bestand met front matter:

```yaml
---
title: Active Recall: Waarom passief lezen niet werkt
description: Leer effectiever door je hersenen actief aan het werk te zetten…
icon: psychology                       # Material Symbols-naam
date: 2026-08-11                       # publicatiedatum
category: Leerstrategie                # Leerstrategie | Samenvatten | Focus | Toetsen
tags: active recall, geheugen, overhoren
author: Team PWW Planner
related: flashcards-maken-gebruiken, spaced-repetition-leren
color_bg: var(--event-huiswerk-bg)     # kleur van de kaart en de hero
color_icon: var(--event-huiswerk-text)
---
```

Structuur van de tekst (belangrijk voor Google en voor de leeswijzer op de site):

- `#` — één openingskop (wordt een `<h2>`, de `<h1>` staat in de hero)
- `##` — de secties, waaronder altijd **Veelgestelde vragen** en **Aan de slag**
- `###` — de vragen in de FAQ; hier bouwt de site automatisch FAQ-schema van
- interne links naar andere artikelen: `[tekst](artikel.html?post=slug.md)`

Na het wijzigen van een artikel:

```bash
node tools/generate-index.mjs
```

## Generatoren

Alle scripts draaien op kale Node (geen dependencies) en gebruiken dezelfde
markdown-renderer als de site, zodat de uitvoer altijd overeenkomt.

```bash
# manifest voor het blogoverzicht -> blog-artikelen/index.json
node tools/generate-index.mjs

# sitemap.xml en rss.xml -> dist/
node tools/generate-sitemap.mjs --out dist
node tools/generate-sitemap.mjs --out dist --include-future   # ook geplande artikelen

# statische artikelpagina's op basis van je eigen artikel.html
node tools/prerender.mjs --template ../pwwplanner/blog/artikel.html --out dist/blog
```

`prerender.mjs` gebruikt je bestaande `artikel.html` als sjabloon en zet daar per
artikel de inhoud, de titel, de meta-tags en de JSON-LD in. Zet de uitvoer naast
`artikel.html` (dus `/blog/<slug>.html`), dan blijven alle relatieve paden
kloppen. Daarna kun je `urlStyle: 'static'` zetten in `pww-blog-core.js`.

## De site aanpassen

Zie **[site/PATCHES.md](site/PATCHES.md)** voor de exacte wijzigingen. Kort:

1. Zet `pww-blog-core.js`, `pww-blog.js`, `pww-artikel.js` en `pww-blog.css` in `/blog/`.
2. Haal het bestaande blog-JavaScript weg (anders renderen twee scripts hetzelfde).
3. Laad de nieuwe bestanden en maak van de hero-titel de `<h1>`.
4. Vul je AdSense-slot-ID's in en zet Auto ads uit.

Wat de scripts oplossen of toevoegen:

| Onderdeel | Was | Wordt |
|---|---|---|
| Uitgelicht artikel | Knop met `href="#"` en `display:none`, artikel niet te openen | Werkende knop, klikbare hero, ook in het raster |
| Titel en description | Op elke pagina hetzelfde | Per artikel uniek, plus canonical en Open Graph |
| Gestructureerde data | Geen | BlogPosting, BreadcrumbList en FAQPage |
| Datum | `2026-09-01` | `1 september 2026` in een `<time>`-element |
| Categorie | Overal "Tips", één kleur | Vier categorieën met eigen kleur |
| Zoeken en filteren | Knoppen zonder functie | Werkend zoekveld en categoriefilters |
| Delen en favoriet | Knoppen zonder functie | Web Share met kopieer-fallback, favoriet in localStorage |
| Koppen | Twee `<h1>`'s, `#` → `###` | Eén `<h1>`, nette h2/h3-structuur |
| Einde artikel | Alleen een zin over PWWplanner | Leeswijzer, CTA per categorie, drie gerelateerde artikelen |
| Advertenties | Geen | Vier gereserveerde slots met huisadvertentie als terugval |

## Volgorde die we aanraden

1. De patches uit `site/PATCHES.md` doorvoeren (hero-fix en meta-tags).
2. `sitemap.xml` genereren en indienen bij Search Console.
3. `prerender.mjs` draaien zodra je de statische pagina's wilt gebruiken.
4. Pas daarna de AdSense-slot-ID's invullen. De inhoud staat er nu klaar voor:
   alle artikelen zijn 840–1020 woorden, ruim boven de grens waaronder we geen
   advertenties tonen.

De onderbouwing en de afwegingen staan in
[VOORSTEL-blog-verbetering-en-ads.md](VOORSTEL-blog-verbetering-en-ads.md).
