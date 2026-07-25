# Voorstel: PWWplanner.nl blog verbeteren + advertentieplaatsing

Gebaseerd op een analyse van twee opgeslagen pagina's (`/blog/index.html` en
`/blog/artikel.html?post=studeren-met-muziek-tips.md`, snapshot 25-07-2026) en de
13 markdown-artikelen in deze repository.

> **Let op bij het lezen:** in een `.mht`-snapshot worden `<script>`-tags door de browser
> verwijderd. Alles wat hieronder over de *HTML/DOM* staat is hard geverifieerd; conclusies
> over JavaScript (bijv. "de knop werkt niet") zijn afgeleid uit de gerenderde DOM en
> verdienen een korte controle op de live site.

---

## 1. Wat er nu staat (feiten uit de snapshot)

| Onderdeel | Bevinding |
|---|---|
| Artikelen | 13 markdown-bestanden, **201–355 woorden** per stuk |
| URL-structuur | `/blog/artikel.html?post=<slug>.md` (client-side gerenderd) |
| Meta description | Op **elke** pagina identiek: "De gratis planner voor scholieren…" |
| `og:image` | Op elke pagina dezelfde `BANNER.png`; geen `og:title`/`og:description`/`og:url` |
| Canonical | Ontbreekt |
| Gestructureerde data | Geen JSON-LD (`Article`, `BreadcrumbList`, `FAQPage`) |
| Categorieën | Alle 12 kaarten tonen hetzelfde label "Tips" |
| Kleuren | Alle artikelen gebruiken `var(--event-afspraak-bg)` → grid is één egale kleur |
| Datum | Ruwe ISO-weergave `2026-09-01`; alle 13 artikelen staan **in de toekomst** t.o.v. 25-07-2026 |
| Koppenstructuur | Twee `<h1>`'s per artikelpagina (top-bar + markdown) en `#` → `###` (h2 overgeslagen) |
| Uitgelicht-artikel | `uitgelicht.md` staat **alleen** in de hero, niet in het grid |
| Hero-CTA | `<a id="hero-read-more" href="#" style="display: none; …">` → **niet klikbaar en onzichtbaar** |
| Zoek/filter-knoppen | Aanwezig in de top-bar, zonder zichtbare functie |
| Deel/favoriet-knoppen | Aanwezig onderaan artikel, zonder zichtbare functie |
| Interne links | Alleen een tekstuele vermelding "PWWplanner.nl" in de slotalinea; geen links tussen artikelen |
| Advertenties | `<meta name="google-adsense-account" content="ca-pub-8783660023118178">` staat er, maar **geen enkel ad-container** (`<ins class="adsbygoogle">`) in de DOM → er draaien nu geen advertenties |

**De belangrijkste conclusie:** het uitgelichte artikel is via de hero niet te bereiken, en
de blog is technisch nauwelijks vindbaar (geen unieke meta's, geen schone URL's, geen
sitemap-vriendelijke structuur). Advertenties toevoegen heeft pas zin als dat is opgelost —
zonder verkeer is elke plaatsing €0.

---

## 2. Blogverbeteringen, op volgorde van opbrengst

### Prioriteit 1 — Kapot / direct fixbaar (deze week)

1. **Hero-CTA repareren.** Zet in de blog-JS de `href` naar
   `artikel.html?post=uitgelicht.md` en verwijder `display:none` zodra het artikel geladen is.
   Maak daarnaast de héle hero klikbaar. Nu is het meest prominente element van de pagina een
   dood vlak.
2. **`uitgelicht.md` ook in het grid tonen** (of expliciet uitsluiten met een `featured: true`
   veld) — nu is het willekeurig welk artikel wel/niet in de lijst zit.
3. **Datums.** Alle artikelen zijn toekomstig gedateerd (26-07 t/m 01-09-2026). Kies één van
   twee: publicatieplanning bouwen (artikelen met `date > vandaag` verbergen) óf de datums
   terugzetten naar de echte publicatiedatum. Toon ze daarna als "1 september 2026" in een
   `<time datetime="2026-09-01">`-element.
4. **Zoeken, filteren, delen en favoriet**: implementeren of weghalen. Niet-werkende knoppen
   kosten vertrouwen, en op een pagina met advertenties is verloren vertrouwen duur.
   "Delen" is met de Web Share API ~10 regels code.

### Prioriteit 2 — SEO-fundament (bepaalt of er ooit advertentie-inkomsten zijn)

5. **Unieke meta per artikel.** Vul `<title>`, `<meta name="description">` en
   `<link rel="canonical">` uit de front matter voordat de pagina rendert. Nu concurreren 13
   pagina's met exact dezelfde beschrijving.
6. **Open Graph per artikel**: `og:title`, `og:description`, `og:url`, `og:type=article` en
   een eigen `og:image`. Genereer die afbeelding desnoods automatisch (titel + icoon op de
   themakleur) — scheelt handwerk en levert deelbare kaarten op WhatsApp/Instagram op, precies
   waar scholieren links doorsturen.
7. **Schone URL's**: `/blog/studeren-met-muziek-tips/` in plaats van
   `/blog/artikel.html?post=studeren-met-muziek-tips.md`. Met een rewrite-regel + `history`-
   fallback te doen zonder de architectuur te verbouwen. De `.md`-extensie in een publieke URL
   is een SEO-signaal dat je niet wilt geven.
8. **`sitemap.xml` + RSS-feed** genereren uit de markdown-map; sitemap opgeven in Search Console
   (de `google-site-verification` staat er al).
9. **Server-side of build-time renderen.** De artikelinhoud wordt nu met JS uit een `.md`
   gehaald. Google kan dat aan, maar Bing, ChatGPT/Perplexity-crawlers en WhatsApp-previews
   veel minder goed. Eén build-stap die per markdown-bestand een statische HTML-pagina
   uitspuugt lost meteen punt 5, 6, 7 én dit punt op — dit is de grootste enkele verbetering.
10. **JSON-LD** toevoegen: `Article` (headline, datePublished, dateModified, author,
    image), `BreadcrumbList` en waar passend `FAQPage`.
11. **Koppenstructuur**: één `<h1>` per pagina (de top-bar-titel naar `<div>`/`aria-label`), en
    in de markdown `##` gebruiken in plaats van `###`.

### Prioriteit 3 — Inhoud (nodig voor zowel Google als AdSense)

12. **Artikelen verdiepen naar 700–1200 woorden.** 200–350 woorden is te dun om voor
    concurrerende zoekwoorden te ranken, én het valt onder AdSense's "thin content"-risico:
    advertenties op korte pagina's zonder eigen waarde zijn een bekende reden voor afkeuring.
    Verdiep per artikel met: een concreet voorbeeld uit een schoolvak, een stappenplan, een
    veelgemaakte-fouten-blokje en 3–4 FAQ-vragen (goed voor featured snippets).
13. **Onderling linken.** Elk artikel verwijst nu alleen in de slotzin naar de planner. Voeg per
    artikel 2–3 contextuele links naar verwante artikelen toe (Pomodoro ↔ concentratie ↔
    studieplek; active recall ↔ flashcards ↔ spaced repetition) plus een "Lees ook"-blok
    onderaan. Dit verhoogt pagina's per sessie — en daarmee direct de advertentie-inkomsten.
14. **Front matter uitbreiden** zodat de site meer kan tonen:
    ```yaml
    category: Leerstrategie      # i.p.v. hardcoded "Tips"
    tags: [active recall, toetsen, havo]
    author: Team PWW Planner
    updated: 2026-07-25
    image: /blog/img/active-recall.jpg
    related: [flashcards-maken-gebruiken, spaced-repetition-leren]
    ```
    Hiermee werken de filterknop, de categoriebadges en de gerelateerde artikelen ineens
    inhoudelijk. Geef categorieën ook eigen kleuren — nu is het hele grid één kleur.
15. **Contentkalender rond het schooljaar**: proefwerkweek (nov/jan/apr), examentraining
    (apr–mei), boeken kaften/nieuw schooljaar (aug), kerstvakantie-inhaalweek. Zoekvolume voor
    scholieren is extreem seizoensgebonden; publiceer 3–4 weken vóór de piek.
16. **Zoekwoorden waar PWW echt op kan winnen** (lange staart, weinig concurrentie):
    "proefwerkweek planning maken", "hoe leer je voor een toets in 1 dag", "planner voor
    school gratis", "samenvatting maken havo", "woordjes leren Frans sneller". Maak per stuk
    een artikel dat eindigt in de tool zelf.

### Prioriteit 4 — Conversie (belangrijker dan advertenties)

17. Elk artikel eindigt met een tekstuele merknaam, geen knop. Voeg toe:
    - een **in-artikel CTA-kaart** na de eerste sectie ("Plan dit meteen in je PWW Planner →"),
    - een **eind-CTA** met knop boven het auteursblok,
    - een **"gerelateerde app"-koppeling** per onderwerp (mindmap-artikel → Mindmap-tool,
      woordjes-artikel → Woordjes Leren, planning-artikel → Planner).
    Een eigen aanmelding is vrijwel altijd meer waard dan een advertentieklik.
18. **Leesvoortgangsbalk + inhoudsopgave** bij artikelen boven ~700 woorden.

---

## 3. Advertentieplaatsing

### Uitgangspunten

- **Alleen op `/blog/*`.** Nooit in de ingelogde app (Planner, Vakken, Mindmap, PWWDocs,
  PWWGroepen). Advertenties in een schoolwerktool voelen als een downgrade van het product en
  zijn de snelste route naar scholen die de site blokkeren.
- **Handmatige plaatsingen, Auto Ads uit.** De blog draait in dezelfde app-shell als de tool
  (nav-rail, modals, pickers, command palette). Auto Ads injecteert daar voorspelbaar op de
  verkeerde plek. Zet in AdSense **Auto ads uit voor het hele domein** en definieer zelf
  displayblokken.
- **Eerst de dunne artikelen verdiepen** (punt 12), dan pas advertenties aanzetten. Advertenties
  op pagina's van 200 woorden is precies het profiel dat AdSense afkeurt.
- **Elke slot krijgt een gereserveerde hoogte** (`min-height`) plus het label "Advertentie".
  Zonder reservering krijg je layout shift (CLS) en zakken juist je rankings.

### Blogoverzicht — `/blog/index.html`

```
┌─────────────────────────────────────────────┐
│  Top-bar: PWW Blog • Ontdek & Leer          │
├─────────────────────────────────────────────┤
│  HERO "Uitgelicht"          ← geen advertentie boven of in de hero
├─────────────────────────────────────────────┤
│  [kaart] [kaart] [kaart]                    │
│  ██ IN-FEED ADVERTENTIE ██  ← A: na de 1e rij, als kaart vormgegeven
│  [kaart] [kaart] [kaart]                    │
│  [kaart] [kaart] [kaart]                    │
│  ██ IN-FEED ADVERTENTIE ██  ← B: pas als het grid >12 kaarten telt
└─────────────────────────────────────────────┘
```

- **A. In-feed na de eerste rij** (positie 4 in het grid). AdSense heeft hiervoor het
  *In-feed*-formaat: je stelt de kaartstijl in zodat de advertentie dezelfde `border-radius:
  32px` en oppervlaktekleur krijgt als een blogkaart. Dit is op overzichtspagina's het
  best presterende formaat.
- **B. Tweede in-feed** pas invoegen zodra er meer dan 12 artikelen zijn — anders zit er te
  weinig inhoud tussen.
- **Niet doen:** een banner boven de hero. Dat verpest de eerste indruk van de pagina waar je
  merk moet landen.

### Artikelpagina — `/blog/artikel.html`

```
┌─────────────────────────────────────────────┐
│  HERO (350px, titel + datum + leestijd)     │  ← geen advertentie
├─────────────────────────────────────────────┤
│  <h1> + inleidende alinea's                 │
│  ██ SLOT 1 — in-artikel, na ±2 alinea's ██  │  responsive display, max 336px hoog
│  <h2> sectie                                │
│  ██ SLOT 2 — midden, tussen twee secties ██ │  alleen bij >600 woorden
│  <h2> sectie + slotalinea                   │
│  ┌──────────────────────────────────────┐   │
│  │  EIGEN CTA: "Plan het in PWW Planner"│   │  ← eigen conversie vóór de advertentie
│  └──────────────────────────────────────┘   │
│  ██ SLOT 3 — einde artikel ██               │  hoogst presterende slot
│  Auteursblok + delen                        │
│  "Lees ook" — 3 gerelateerde artikelen      │
└─────────────────────────────────────────────┘
   ██ SLOT 4 — anchor/sticky onderaan (mobiel) ██  optioneel, sluitbaar
```

- **Slot 1 (in-artikel, na de inleiding).** Hoogste zichtbaarheid. Plaats hem ná de eerste
  twee alinea's — nooit tussen de titel en de eerste zin.
- **Slot 2 (midden).** Alleen inschakelen bij artikelen boven ~600 woorden, tussen twee
  `<h2>`-secties, nooit midden in een opsomming of stappenplan.
- **Slot 3 (einde artikel).** Direct na de laatste alinea, vóór het auteursblok. Presteert
  goed omdat lezers daar toch stoppen, en het onderbreekt niets.
- **Slot 4 (anchor op mobiel).** Optioneel en sluitbaar. Levert relatief veel op, maar is de
  meest irritante vorm — ik zou hem pas aanzetten als 1–3 draaien en de bounce rate stabiel is.
- **Maximaal 3 advertenties per artikel** zolang artikelen onder de 1000 woorden zitten. Meer
  advertenties dan koppen is zowel beleidsmatig als voor de gebruikerservaring verkeerd.

### Implementatievoorbeeld (per slot)

```html
<div class="ad-slot" aria-label="Advertentie">
  <span class="ad-label">Advertentie</span>
  <ins class="adsbygoogle"
       style="display:block"
       data-ad-client="ca-pub-8783660023118178"
       data-ad-slot="XXXXXXXXXX"
       data-ad-format="auto"
       data-full-width-responsive="true"></ins>
</div>
```

```css
.ad-slot{
  min-height: 280px;                 /* reserveert ruimte → geen layout shift */
  margin: 2.5rem 0;
  border-radius: 24px;
  background: var(--md-sys-color-surface-container);
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  overflow: hidden;
}
.ad-label{
  font-size: .7rem; letter-spacing: .08em; text-transform: uppercase;
  color: var(--md-sys-color-text-tertiary); margin-bottom: .5rem;
}
```

Laad `adsbygoogle.js` met `async` en push de slots ná het renderen van de markdown — de
artikelinhoud wordt via JS ingevoegd, dus advertenties die eerder worden gepusht landen in een
lege container.

### Randvoorwaarden die je moet regelen

- **Toestemming (AVG).** Nederlands publiek → je hebt een door Google gecertificeerde CMP
  nodig voor gepersonaliseerde advertenties. Zonder consent-oplossing mag je alleen
  niet-gepersonaliseerde advertenties tonen.
- **Minderjarig publiek.** Het publiek is grotendeels 12–18. Zet in AdSense de gevoelige
  categorieën uit (gokken, dating, alcohol, gewichtsverlies, cosmetische ingrepen). Als een
  deel van de doelgroep onder de 13 is, moet je de blog als kindgericht markeren
  (`tagForUnderAgeOfConsent` / de instelling in AdSense) — dat beperkt targeting, maar het
  alternatief is een beleidsovertreding.
- **Huisadvertenties als vangnet.** Vul de slots bij lage fill met een eigen banner
  (donatie-oproep of een PWW-feature). Zo staat er nooit een leeg gat op de pagina.
- **Verwachting.** Bij Nederlands scholierenverkeer is een RPM van ruwweg €1–4 realistisch.
  Bij 10.000 pageviews per maand is dat €10–40. Met andere woorden: de winst zit in stap 2 en 3
  van dit voorstel (verkeer + inhoud), niet in de plaatsing zelf.

---

## 4. Voorgestelde volgorde

| Fase | Werk | Waarom eerst |
|---|---|---|
| 1 | Hero-CTA, uitgelicht in grid, datums, dode knoppen | Kapotte dingen; enkele uren werk |
| 2 | Unieke meta's, canonical, OG per artikel, sitemap, schone URL's, statische build | Zonder dit is er geen verkeer om te verzilveren |
| 3 | Artikelen naar 700–1200 woorden, interne links, categorieën, gerelateerde artikelen | Voorwaarde voor ranking én voor AdSense-goedkeuring |
| 4 | Eigen CTA's in artikelen | Aanmeldingen zijn meer waard dan advertentieklikken |
| 5 | Advertentieslots 1–3, daarna eventueel slot 4 | Pas zinvol als 1–4 staan |
| 6 | Meten: Search Console, GA4 + AdSense per slot, contentkalender | Optimaliseren op cijfers i.p.v. gevoel |
