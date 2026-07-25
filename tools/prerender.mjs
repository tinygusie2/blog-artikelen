#!/usr/bin/env node
/*
 * Maakt per artikel een statische HTML-pagina, zodat de inhoud, de titel en
 * de meta-tags in de broncode staan in plaats van pas na het uitvoeren van
 * JavaScript. Dit is de grootste SEO-winst voor de blog: crawlers en
 * link-previews (WhatsApp, Slack, X) zien nu direct het echte artikel.
 *
 * De generator gebruikt je EIGEN artikel.html als sjabloon, zodat de pagina's
 * automatisch meegaan met wijzigingen aan de huisstijl.
 *
 *   node tools/prerender.mjs --template ../pwwplanner/blog/artikel.html --out dist/blog
 *
 * De uitvoer komt in dezelfde map als artikel.html te staan (/blog/<slug>.html),
 * zodat alle relatieve paden naar CSS, JS en afbeeldingen blijven kloppen.
 * Zet daarna urlStyle op 'static' in pww-blog-core.js.
 */
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { loadCore, readAllPosts, repoRoot, parseArgs } from './lib.mjs';

const args = parseArgs(process.argv.slice(2));

if (!args.template) {
  console.error('Geef het sjabloon op: --template pad/naar/blog/artikel.html');
  process.exit(1);
}

const postsDir = resolve(repoRoot, args.posts || 'blog-artikelen');
const outDir = resolve(repoRoot, args.out || 'dist/blog');
const siteUrl = (args['site-url'] || 'https://pwwplanner.nl').replace(/\/$/, '');
const includeFuture = Boolean(args['include-future']);

const core = loadCore({ siteUrl, urlStyle: 'static' });
const template = readFileSync(args.template, 'utf8');
const posts = readAllPosts(postsDir, core, { includeFuture });

mkdirSync(outDir, { recursive: true });

const esc = core.escapeHtml;

/* Vervangt de inhoud van een element met een bepaald id. */
function fillById(html, id, content) {
  const pattern = new RegExp(
    `(<([a-zA-Z0-9]+)([^>]*\\sid=["']${id}["'][^>]*)>)([\\s\\S]*?)(</\\2>)`
  );
  if (!pattern.test(html)) {
    console.warn(`  let op: element met id="${id}" niet gevonden in het sjabloon`);
    return html;
  }
  return html.replace(pattern, (_, open, tag, attrs, _old, close) =>
    `${open}${content}${close}`);
}

function buildHead(post, url, articleHtml) {
  const meta = post.meta;
  const image = meta.image ? (meta.image.startsWith('http') ? meta.image : siteUrl + meta.image)
    : `${siteUrl}/BANNER.png`;

  const faq = collectFaq(articleHtml);

  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      headline: meta.title || '',
      description: meta.description || '',
      inLanguage: 'nl-NL',
      datePublished: meta.date || undefined,
      dateModified: meta.updated || meta.date || undefined,
      wordCount: post.words,
      keywords: (meta.tags || []).join(', ') || undefined,
      articleSection: meta.category || undefined,
      image,
      author: { '@type': 'Organization', name: meta.author || 'Team PWW Planner' },
      publisher: {
        '@type': 'Organization',
        name: 'PWW Planner',
        logo: { '@type': 'ImageObject', url: `${siteUrl}/icoontje.png` }
      },
      mainEntityOfPage: { '@type': 'WebPage', '@id': url }
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: siteUrl },
        { '@type': 'ListItem', position: 2, name: 'Blog', item: siteUrl + core.config.blogPage },
        { '@type': 'ListItem', position: 3, name: meta.title || '', item: url }
      ]
    }
  ];

  if (faq.length >= 2) {
    jsonLd.push({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faq.map((item) => ({
        '@type': 'Question',
        name: item.q,
        acceptedAnswer: { '@type': 'Answer', text: item.a }
      }))
    });
  }

  return [
    `    <meta name="pww-post" content="${esc(post.slug)}">`,
    `    <meta name="description" content="${esc(meta.description || '')}">`,
    `    <link rel="canonical" href="${esc(url)}">`,
    `    <meta property="og:type" content="article">`,
    `    <meta property="og:title" content="${esc(meta.title || '')}">`,
    `    <meta property="og:description" content="${esc(meta.description || '')}">`,
    `    <meta property="og:url" content="${esc(url)}">`,
    `    <meta property="og:image" content="${esc(image)}">`,
    `    <meta property="og:site_name" content="PWW Planner">`,
    `    <meta property="og:locale" content="nl_NL">`,
    `    <meta property="article:published_time" content="${esc(meta.date || '')}">`,
    `    <meta name="twitter:card" content="summary_large_image">`,
    `    <meta name="twitter:title" content="${esc(meta.title || '')}">`,
    `    <meta name="twitter:description" content="${esc(meta.description || '')}">`,
    `    <meta name="twitter:image" content="${esc(image)}">`,
    ...jsonLd.map((obj) =>
      `    <script type="application/ld+json">${JSON.stringify(obj)}</script>`)
  ].join('\n');
}

/* Haalt de vraag-en-antwoordparen uit de gerenderde HTML. */
function collectFaq(html) {
  const section = /<h2[^>]*>\s*Veelgestelde vragen\s*<\/h2>([\s\S]*?)(?=<h2|$)/i.exec(html);
  if (!section) return [];
  const faq = [];
  const pattern = /<h3[^>]*>([\s\S]*?)<\/h3>\s*<p>([\s\S]*?)<\/p>/g;
  let match;
  while ((match = pattern.exec(section[1])) !== null) {
    faq.push({ q: stripTags(match[1]), a: stripTags(match[2]) });
  }
  return faq;
}

function stripTags(value) {
  return value.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

/* ------------------------------------------------------------------ */

let written = 0;

for (const post of posts) {
  const meta = post.meta;
  const url = siteUrl + core.articleUrl(post.slug);
  const colors = core.colorsFor(meta);
  const articleHtml = core.renderMarkdown(post.body, 1);
  const readingTime = Math.max(1, Math.round(post.words / 200));

  let html = template;

  // Titel
  html = html.replace(/<title>[\s\S]*?<\/title>/i,
    `<title>${esc(meta.title || '')} | PWW Planner</title>`);

  // Bestaande generieke description en canonical weghalen; buildHead zet de juiste terug.
  html = html.replace(/\s*<meta\s+name=["']description["'][^>]*>/gi, '');
  html = html.replace(/\s*<link\s+rel=["']canonical["'][^>]*>/gi, '');
  html = html.replace(/\s*<meta\s+(?:property|name)=["'](?:og:|twitter:|article:)[^"']*["'][^>]*>/gi, '');

  html = html.replace(/<\/head>/i, `${buildHead(post, url, articleHtml)}\n</head>`);

  // Zichtbare inhoud
  html = fillById(html, 'article-title', esc(meta.title || ''));
  html = fillById(html, 'hero-title', esc(meta.title || ''));
  html = fillById(html, 'article-category', esc(meta.category || 'Blog'));
  html = fillById(html, 'article-tag', esc(meta.category || 'Blog'));
  html = fillById(html, 'article-icon', esc(meta.icon || 'article'));
  html = fillById(html, 'article-date',
    `<time datetime="${esc(meta.date || '')}">${esc(core.formatDate(meta.date))}</time>`);
  html = fillById(html, 'reading-time', `${readingTime} min leestijd`);
  html = fillById(html, 'article-content', `\n${articleHtml}\n`);

  // Markeer de inhoud als voorgerenderd en geef de hero de juiste kleur.
  html = html.replace(/(<div[^>]*\sid=["']article-content["'])/i, '$1 data-prerendered="1"');
  html = html.replace(/(<div[^>]*\sid=["']article-hero["'][^>]*style=["'])/i,
    `$1background-color: ${colors.bg}; `);

  const outFile = join(outDir, `${post.slug}.html`);
  writeFileSync(outFile, html, 'utf8');
  written += 1;
}

console.log(`${written} statische artikelpagina's geschreven -> ${outDir}`);
if (!includeFuture) {
  console.log('Artikelen met een datum in de toekomst zijn overgeslagen (--include-future om ze wel mee te nemen).');
}
