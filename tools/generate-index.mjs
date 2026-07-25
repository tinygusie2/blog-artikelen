#!/usr/bin/env node
/*
 * Bouwt het manifest index.json uit de front matter van alle artikelen.
 * De blog leest dit bestand om het overzicht te vullen zonder elk
 * markdown-bestand apart op te halen.
 *
 *   node tools/generate-index.mjs
 *   node tools/generate-index.mjs --posts blog-artikelen --out blog-artikelen/index.json
 */
import { writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { loadCore, readAllPosts, repoRoot, parseArgs } from './lib.mjs';

const args = parseArgs(process.argv.slice(2));
const postsDir = resolve(repoRoot, args.posts || 'blog-artikelen');
const outFile = args.out ? resolve(repoRoot, args.out) : join(postsDir, 'index.json');

const core = loadCore();
const posts = readAllPosts(postsDir, core);

const manifest = posts.map((post) => {
  const meta = post.meta;
  return {
    slug: post.slug,
    file: post.file,
    title: meta.title || '',
    description: meta.description || '',
    icon: meta.icon || 'article',
    date: meta.date || '',
    category: meta.category || '',
    tags: meta.tags || [],
    related: meta.related || [],
    author: meta.author || 'Team PWW Planner',
    image: meta.image || '',
    featured: meta.featured === 'true' || undefined,
    color_bg: meta.color_bg || '',
    color_icon: meta.color_icon || '',
    words: post.words,
    readingTime: Math.max(1, Math.round(post.words / 200))
  };
});

writeFileSync(outFile, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
console.log(`index.json geschreven: ${manifest.length} artikelen -> ${outFile}`);
