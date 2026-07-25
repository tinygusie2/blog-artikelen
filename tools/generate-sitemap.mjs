#!/usr/bin/env node
/*
 * Genereert sitemap.xml en rss.xml voor de blog.
 *
 *   node tools/generate-sitemap.mjs --out dist
 *   node tools/generate-sitemap.mjs --url-style static   (voor /blog/<slug>.html)
 *
 * Artikelen met een publicatiedatum in de toekomst worden overgeslagen:
 * die horen nog niet in een sitemap.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { loadCore, readAllPosts, repoRoot, parseArgs, xmlEscape } from './lib.mjs';

const args = parseArgs(process.argv.slice(2));
const postsDir = resolve(repoRoot, args.posts || 'blog-artikelen');
const outDir = resolve(repoRoot, args.out || 'dist');
const siteUrl = (args['site-url'] || 'https://pwwplanner.nl').replace(/\/$/, '');

const core = loadCore({ siteUrl, urlStyle: args['url-style'] || 'query' });
const posts = readAllPosts(postsDir, core, { includeFuture: Boolean(args['include-future']) });

mkdirSync(outDir, { recursive: true });

const urlFor = (post) => siteUrl + core.articleUrl(post.slug);
const today = new Date().toISOString().slice(0, 10);

/* ----------------------------- sitemap ----------------------------- */

const sitemap = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  `  <url>
    <loc>${xmlEscape(siteUrl + core.config.blogPage)}</loc>
    <lastmod>${posts[0]?.meta.date || today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`,
  ...posts.map((post) => `  <url>
    <loc>${xmlEscape(urlFor(post))}</loc>
    <lastmod>${xmlEscape(post.meta.updated || post.meta.date || today)}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>`),
  '</urlset>',
  ''
].join('\n');

writeFileSync(join(outDir, 'sitemap.xml'), sitemap, 'utf8');

/* ------------------------------- RSS ------------------------------- */

const rssDate = (iso) => new Date(`${iso}T09:00:00Z`).toUTCString();

const rss = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
  '  <channel>',
  '    <title>PWW Planner Blog</title>',
  `    <link>${xmlEscape(siteUrl + core.config.blogPage)}</link>`,
  '    <description>Leertips, studiemethodes en planningsadvies voor scholieren.</description>',
  '    <language>nl-NL</language>',
  `    <atom:link href="${xmlEscape(siteUrl + '/blog/rss.xml')}" rel="self" type="application/rss+xml"/>`,
  ...posts.map((post) => `    <item>
      <title>${xmlEscape(post.meta.title)}</title>
      <link>${xmlEscape(urlFor(post))}</link>
      <guid isPermaLink="true">${xmlEscape(urlFor(post))}</guid>
      <description>${xmlEscape(post.meta.description)}</description>
      <category>${xmlEscape(post.meta.category || 'Blog')}</category>
      <pubDate>${rssDate(post.meta.date)}</pubDate>
    </item>`),
  '  </channel>',
  '</rss>',
  ''
].join('\n');

writeFileSync(join(outDir, 'rss.xml'), rss, 'utf8');

console.log(`sitemap.xml en rss.xml geschreven (${posts.length} gepubliceerde artikelen) -> ${outDir}`);
if (posts.length === 0) {
  console.log('Let op: alle artikelen hebben een datum in de toekomst en zijn dus overgeslagen.');
}
