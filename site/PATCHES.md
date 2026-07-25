# Wijzigingen in index.html en artikel.html

De bestanden in deze map zijn drop-ins: je hoeft je pagina's niet te herschrijven,
alleen de scripts te laden en drie kleine dingen in de HTML aan te passen.

De regelnummers verwijzen naar de opgeslagen versie van 25-07-2026; zoek op de
aangehaalde tekst als je bestand inmiddels is gewijzigd.

---

## 0. Bestanden plaatsen

| Bestand | Zet neer op |
|---|---|
| `site/pww-blog-core.js` | `/blog/pww-blog-core.js` |
| `site/pww-blog.js` | `/blog/pww-blog.js` |
| `site/pww-artikel.js` | `/blog/pww-artikel.js` |
| `site/pww-blog.css` | `/blog/pww-blog.css` |
| `blog-artikelen/*.md` + `index.json` | `/blog/artikelen/` |

Staan je markdown-bestanden ergens anders? Pas dan `postsPath` en `indexPath`
aan bovenin `pww-blog-core.js`, of zet vóór het script:

```html
<script>window.PWW_BLOG_CONFIG = {
  postsPath: '/pad/naar/artikelen/',
  indexPath: '/pad/naar/artikelen/index.json'
};</script>
```

---

## 1. Verwijder je huidige blog-JavaScript

**Dit is de belangrijkste stap.** `pww-blog.js` en `pww-artikel.js` doen zelf het
ophalen, parsen en renderen van de artikelen. Laat je je bestaande script staan,
dan vullen twee scripts dezelfde elementen en krijg je dubbele of knipperende
inhoud.

Haal dus in `index.html` en `artikel.html` het `<script>`-blok weg dat nu
`#blog-grid` en `#article-content` vult (inline of als apart bestand).

Wat de nieuwe scripts overnemen: front matter lezen, markdown renderen, hero
vullen, leestijd berekenen, datum tonen, kaarten bouwen.

---

## 2. index.html

### 2a. Stijlen laden (in `<head>`, ná `style.css`)

```html
<link rel="stylesheet" href="/blog/pww-blog.css">
```

### 2b. Scripts laden (vlak vóór `</body>`)

```html
<script src="/blog/pww-blog-core.js"></script>
<script src="/blog/pww-blog.js"></script>
```

### 2c. Niets anders

De hero-knop, de zoek- en filterknoppen en het kaartenraster worden door het
script gerepareerd en gevuld. Je hoeft aan de HTML zelf niets te wijzigen.

> Wat er gebeurt: `#hero-read-more` stond op `href="#"` met `display: none`,
> waardoor het uitgelichte artikel nergens te openen was. Het script zet nu de
> juiste link, maakt de knop zichtbaar en maakt de hele hero klikbaar. Ook komt
> `uitgelicht.md` er nu bij in het raster (met een "Uitgelicht"-label), zodat het
> artikel ook via de lijst bereikbaar is.

---

## 3. artikel.html

### 3a. Stijlen en scripts

```html
<!-- in <head>, ná style.css -->
<link rel="stylesheet" href="/blog/pww-blog.css">

<!-- vlak vóór </body> -->
<script src="/blog/pww-blog-core.js"></script>
<script src="/blog/pww-artikel.js"></script>
```

### 3b. Eén `<h1>` per pagina

Nu staan er twee titels als `<h1>`/`<h2>` door elkaar. Zoek in de topbalk:

```html
<h1 class="header-title" id="article-title" style="font-size: 1.5rem; margin: 0;">…</h1>
```

en maak daar een `div` van:

```html
<div class="header-title" id="article-title" style="font-size: 1.5rem; margin: 0; font-weight: 700;">…</div>
```

Maak vervolgens de titel in de hero de echte `<h1>`:

```html
<!-- was: <h2 id="hero-title" style="…">…</h2> -->
<h1 id="hero-title" style="font-size: clamp(1.8rem, 5vw, 3rem); line-height: 1.1; margin-bottom: 0.5rem; color: white; text-shadow: 0 2px 10px rgba(0,0,0,0.3);">…</h1>
```

Zo heeft de pagina precies één h1 (de artikeltitel), zijn de sectiekoppen h2 en
de FAQ-vragen h3.

### 3c. De vaste `<meta name="description">` mag blijven staan

Het script overschrijft hem per artikel. Wil je het netjes, verwijder dan de
regel uit `artikel.html`; hij is daar toch nooit correct.

---

## 4. AdSense aanzetten

### 4a. Loader in de `<head>` van **alleen de blogpagina's**

```html
<script async
  src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-8783660023118178"
  crossorigin="anonymous"></script>
```

Zet deze loader **niet** op de pagina's van de app zelf (Planner, Vakken,
Mindmap, PWWDocs, PWWGroepen).

### 4b. Auto ads uitzetten

Zet in AdSense → Advertenties → Per site → **Auto ads uit** voor `pwwplanner.nl`.
De blog draait in dezelfde app-shell als de tool (nav-rail, modals, command
palette); Auto ads plaatst daar voorspelbaar advertenties op de verkeerde plek.

### 4c. Vier displayblokken aanmaken en de ID's invullen

Maak in AdSense vier blokken aan en zet hun slot-ID in `pww-blog-core.js`:

```js
slots: {
  inFeed: '1234567890',      // In-feed, blogoverzicht
  inArticle: '2345678901',   // In-artikel, na de inleiding
  midArticle: '3456789012',  // In-artikel, halverwege
  endArticle: '4567890123'   // Display, onder het artikel
}
```

Zolang een slot-ID leeg is, toont die plek een **eigen huisadvertentie** (een
verwijzing naar PWW Planner) in plaats van een leeg gat. Je kunt de plaatsing
dus eerst bekijken voordat er echte advertenties in komen.

### 4d. Waar ze terechtkomen

| Slot | Plek | Voorwaarde |
|---|---|---|
| `inFeed` | Na de derde kaart in het raster, en nog eens na de negende | Minstens 6 respectievelijk 12 kaarten, en geen actief filter |
| `inArticle` | Direct na de tweede alinea | Artikel ≥ 600 woorden |
| `midArticle` | Vlak vóór een kop halverwege het artikel | Artikel ≥ 900 woorden |
| `endArticle` | Onder de eigen CTA, boven het auteursblok | Artikel ≥ 600 woorden |

Elk slot krijgt een gereserveerde hoogte en het label "Advertentie", zodat de
pagina niet verspringt terwijl de advertentie laadt.

Alles uitzetten kan met één regel: `ads: { enabled: false }`.

---

## 5. Nog te regelen buiten de code

- **Toestemming (AVG).** Voor gepersonaliseerde advertenties heb je een door
  Google gecertificeerde CMP nodig. Zonder consent-oplossing mag je alleen
  niet-gepersonaliseerde advertenties tonen.
- **Minderjarig publiek.** Zet in AdSense de gevoelige categorieën uit (gokken,
  dating, alcohol, gewichtsverlies, cosmetische ingrepen). Richt je je ook op
  lezers onder de 13, markeer de blog dan als kindgericht.
- **Sitemap.** Dien `sitemap.xml` in bij Search Console (de
  `google-site-verification` staat al in je HTML).

---

## 6. Controlelijst na het doorvoeren

- [ ] De hero op `/blog` is klikbaar en "Lees dit artikel" opent `uitgelicht.md`
- [ ] Het raster toont 13 kaarten met vier verschillende categoriekleuren
- [ ] Zoeken en de categoriechips filteren het raster
- [ ] Een artikelpagina heeft precies één `<h1>`
- [ ] De titel in het browsertabblad verschilt per artikel
- [ ] `view-source:` toont een eigen `<meta name="description">` en `<link rel="canonical">`
- [ ] Onderaan het artikel staan drie gerelateerde artikelen
- [ ] De advertentievakken houden hun hoogte, ook als er (nog) niets in staat
- [ ] Delen werkt op mobiel (Web Share) en kopieert de link op desktop
