/*
 * Gedeelde hulpfuncties voor de generatoren.
 *
 * In plaats van de markdown-renderer te dupliceren, laden we hier hetzelfde
 * site/pww-blog-core.js in een minimale sandbox. Zo levert de build exact
 * dezelfde HTML op als de browser, en is er maar één plek om te onderhouden.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
export const repoRoot = resolve(here, '..');

export function loadCore(overrides = {}) {
  const source = readFileSync(join(repoRoot, 'site', 'pww-blog-core.js'), 'utf8');
  const sandbox = { PWW_BLOG_CONFIG: overrides };
  // De IIFE eindigt op })(window); dus de sandbox komt binnen als `global`.
  new Function('window', source)(sandbox);
  return sandbox.PWW_BLOG;
}

export function listPosts(postsDir) {
  return readdirSync(postsDir)
    .filter((name) => name.endsWith('.md'))
    .sort();
}

export function readPost(postsDir, file, core) {
  const raw = readFileSync(join(postsDir, file), 'utf8');
  const parsed = core.parseFrontMatter(raw);
  const slug = file.replace(/\.md$/, '');
  return {
    slug,
    file,
    body: parsed.body,
    meta: parsed.meta,
    words: core.countWords(parsed.body)
  };
}

export function readAllPosts(postsDir, core, { includeFuture = true } = {}) {
  const posts = listPosts(postsDir)
    .map((file) => readPost(postsDir, file, core))
    .filter((post) => includeFuture || !core.isFuture(post.meta.date));

  return posts.sort((a, b) =>
    String(b.meta.date || '').localeCompare(String(a.meta.date || '')));
}

export function xmlEscape(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/* Heel simpele argumentenparser: --key waarde  of  --key=waarde */
export function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const item = argv[i];
    if (!item.startsWith('--')) continue;
    const eq = item.indexOf('=');
    if (eq !== -1) {
      args[item.slice(2, eq)] = item.slice(eq + 1);
    } else if (argv[i + 1] && !argv[i + 1].startsWith('--')) {
      args[item.slice(2)] = argv[i + 1];
      i += 1;
    } else {
      args[item.slice(2)] = true;
    }
  }
  return args;
}
