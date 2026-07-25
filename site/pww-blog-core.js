/*
 * PWW Blog — gedeelde kern
 * ------------------------
 * Bevat de configuratie, de front-matter-parser, een kleine markdown-renderer
 * en wat hulpfuncties. Laad dit bestand vóór pww-blog.js en pww-artikel.js.
 *
 *   <script src="/blog/pww-blog-core.js"></script>
 *
 * Wil je iets aanpassen (paden, ad-slots, categoriekleuren), doe dat in
 * PWW_BLOG.config hieronder of overschrijf het vóór dit script met:
 *   <script>window.PWW_BLOG_CONFIG = { postsPath: '/blog/artikelen/' };</script>
 */
(function (global) {
  'use strict';

  var defaults = {
    /* Map waar de .md-bestanden staan (met afsluitende slash). */
    postsPath: '/blog/artikelen/',
    /* Manifest met alle artikelen; genereer met tools/generate-index.mjs.
       Staat het bestand er niet, dan valt de blog terug op fallbackPosts. */
    indexPath: '/blog/artikelen/index.json',
    /* Basis-URL van de site, gebruikt voor canonical, OG en JSON-LD. */
    siteUrl: 'https://pwwplanner.nl',
    /* Pad naar de artikelpagina, gezien vanaf /blog/. */
    articlePage: '/blog/artikel.html',
    blogPage: '/blog/index.html',
    /* 'query'  -> /blog/artikel.html?post=slug.md (huidige situatie)
       'static' -> /blog/slug.html (na het draaien van tools/prerender.mjs).
       Zet dit pas op 'static' als de statische pagina's echt online staan. */
    urlStyle: 'query',
    /* Slug van het uitgelichte artikel in de hero. */
    featuredSlug: 'uitgelicht',
    /* Publicatieplanning: artikelen met een datum in de toekomst verbergen.
       LET OP: alle artikelen staan nu op een datum tussen 26-07 en 01-09-2026.
       Zet je dit op true vóór die periode, dan is de blog (bijna) leeg tot de
       datums bereikt zijn. Zet het aan zodra de datums kloppen met wanneer je
       ze echt wilt publiceren. */
    hideFuturePosts: false,
    /* Standaard deelafbeelding; per artikel te overschrijven met `image:`. */
    defaultImage: 'https://pwwplanner.nl/BANNER.png',
    /* AdSense. Zet enabled op false om alle advertenties uit te zetten. */
    ads: {
      enabled: true,
      client: 'ca-pub-8783660023118178',
      /* Vul de slot-ID's in die je in AdSense aanmaakt. Een leeg slot-ID
         betekent: container wel reserveren, maar niets laden. */
      slots: {
        inFeed: '',      // blogoverzicht, tussen de kaarten
        inArticle: '',   // artikel, na de inleiding
        midArticle: '',  // artikel, halverwege (alleen bij lange artikelen)
        endArticle: ''   // artikel, onder de laatste alinea
      },
      /* Minimaal aantal woorden voordat een artikel advertenties krijgt.
         Voorkomt advertenties op dunne pagina's (AdSense-beleid). */
      minWords: 600,
      /* Extra advertentie halverwege vanaf dit aantal woorden. */
      midArticleMinWords: 900
    },
    /* Kleur per categorie; valt terug op de waarden uit de front matter. */
    categoryColors: {
      Leerstrategie: ['var(--event-huiswerk-bg)', 'var(--event-huiswerk-text)'],
      Samenvatten: ['var(--event-taak-bg)', 'var(--event-taak-text)'],
      Focus: ['var(--event-afspraak-bg)', 'var(--event-afspraak-text)'],
      Toetsen: ['var(--event-toets-bg)', 'var(--event-toets-text)']
    }
  };

  var config = Object.assign({}, defaults, global.PWW_BLOG_CONFIG || {});
  if (global.PWW_BLOG_CONFIG && global.PWW_BLOG_CONFIG.ads) {
    config.ads = Object.assign({}, defaults.ads, global.PWW_BLOG_CONFIG.ads);
    config.ads.slots = Object.assign({}, defaults.ads.slots, global.PWW_BLOG_CONFIG.ads.slots || {});
  }

  var MONTHS = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli',
    'augustus', 'september', 'oktober', 'november', 'december'];

  function slugFrom(name) {
    return String(name || '').replace(/\.md$/, '').replace(/^.*\//, '');
  }

  function fileFrom(name) {
    var slug = slugFrom(name);
    return slug ? slug + '.md' : '';
  }

  function articleUrl(name) {
    if (config.urlStyle === 'static') {
      return config.articlePage.replace(/[^/]+$/, '') + slugFrom(name) + '.html';
    }
    return config.articlePage + '?post=' + encodeURIComponent(fileFrom(name));
  }

  function absoluteUrl(path) {
    if (/^https?:/.test(path)) return path;
    return config.siteUrl.replace(/\/$/, '') + path;
  }

  /* "2026-08-11" -> "11 augustus 2026" */
  function formatDate(iso) {
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || ''));
    if (!m) return String(iso || '');
    return Number(m[3]) + ' ' + MONTHS[Number(m[2]) - 1] + ' ' + m[1];
  }

  function isFuture(iso) {
    var d = new Date(String(iso || '') + 'T23:59:59');
    return !isNaN(d) && d.getTime() > Date.now();
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /* ---------------------------------------------------------------- *
   * Front matter                                                      *
   * ---------------------------------------------------------------- */

  /* Splitst een .md-bestand in { meta, body }. Waarden zijn strings; de
     sleutels `tags` en `related` worden als komma-lijst opgesplitst. */
  function parseFrontMatter(raw) {
    var text = String(raw || '').replace(/^﻿/, '');
    var meta = {};
    var body = text;
    var match = /^---\s*\r?\n([\s\S]*?)\r?\n---\s*\r?\n?/.exec(text);
    if (match) {
      body = text.slice(match[0].length);
      match[1].split(/\r?\n/).forEach(function (line) {
        var idx = line.indexOf(':');
        if (idx < 1) return;
        var key = line.slice(0, idx).trim();
        var value = line.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
        meta[key] = value;
      });
    }
    ['tags', 'related'].forEach(function (key) {
      if (typeof meta[key] === 'string') {
        meta[key] = meta[key]
          .replace(/^\[|\]$/g, '')
          .split(',')
          .map(function (s) { return s.trim(); })
          .filter(Boolean);
      } else if (!meta[key]) {
        meta[key] = [];
      }
    });
    return { meta: meta, body: body };
  }

  /* ---------------------------------------------------------------- *
   * Markdown                                                          *
   * ---------------------------------------------------------------- */

  function inline(text) {
    var out = escapeHtml(text);
    var codes = [];
    out = out.replace(/`([^`]+)`/g, function (_, code) {
      codes.push(code);
      return '\u0000' + (codes.length - 1) + '\u0000';
    });
    out = out.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, function (_, label, href) {
      var safe = /^(https?:|mailto:|\/|\.|artikel\.html|index\.html)/.test(href) ? href : '#';
      var external = /^https?:/.test(safe) && safe.indexOf(config.siteUrl) !== 0;
      return '<a href="' + safe + '"' +
        (external ? ' target="_blank" rel="noopener noreferrer"' : '') +
        '>' + label + '</a>';
    });
    out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    out = out.replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1<em>$2</em>');
    out = out.replace(/\u0000(\d+)\u0000/g, function (_, i) {
      return '<code>' + escapeHtml(codes[Number(i)]) + '</code>';
    });
    return out;
  }

  /* Kleine markdown-renderer. Ondersteunt koppen, alinea's, lijsten,
     citaten en horizontale lijnen — precies wat de blogartikelen gebruiken.
     Met demoteTitle wordt alleen de openingskop (#) een <h2>, zodat de <h1>
     in de hero de enige h1 van de pagina blijft. De sectiekoppen (##) blijven
     h2 en de vragen (###) blijven h3. */
  function renderMarkdown(md, demoteTitle) {
    var demote = demoteTitle ? 1 : 0;
    var lines = String(md || '').replace(/\r\n/g, '\n').split('\n');
    var html = [];
    var list = null;      // 'ul' | 'ol'
    var para = [];
    var quote = [];

    function flushPara() {
      if (!para.length) return;
      html.push('<p>' + inline(para.join(' ')) + '</p>');
      para = [];
    }
    function flushList() {
      if (!list) return;
      html.push('</' + list + '>');
      list = null;
    }
    function flushQuote() {
      if (!quote.length) return;
      html.push('<blockquote><p>' + inline(quote.join(' ')) + '</p></blockquote>');
      quote = [];
    }
    function flushAll() { flushPara(); flushList(); flushQuote(); }

    lines.forEach(function (line) {
      var trimmed = line.trim();

      if (!trimmed) { flushAll(); return; }

      var heading = /^(#{1,6})\s+(.*)$/.exec(trimmed);
      if (heading) {
        flushAll();
        var isLead = heading[1].length === 1;
        var level = Math.min(6, heading[1].length + (isLead ? demote : 0));
        var text = heading[2];
        html.push('<h' + level + (isLead ? ' class="article-lead"' : '') +
          ' id="' + headingId(text) + '">' + inline(text) + '</h' + level + '>');
        return;
      }

      if (/^(-{3,}|\*{3,})$/.test(trimmed)) { flushAll(); html.push('<hr>'); return; }

      if (/^>\s?/.test(trimmed)) {
        flushPara(); flushList();
        quote.push(trimmed.replace(/^>\s?/, ''));
        return;
      }

      var ordered = /^(\d+)[.)]\s+(.*)$/.exec(trimmed);
      var bullet = /^[-*+]\s+(.*)$/.exec(trimmed);
      if (ordered || bullet) {
        flushPara(); flushQuote();
        var want = ordered ? 'ol' : 'ul';
        if (list && list !== want) flushList();
        if (!list) { list = want; html.push('<' + want + '>'); }
        html.push('<li>' + inline(ordered ? ordered[2] : bullet[1]) + '</li>');
        return;
      }

      flushList(); flushQuote();
      para.push(trimmed);
    });

    flushAll();
    return html.join('\n');
  }

  function headingId(text) {
    return String(text).toLowerCase()
      .replace(/[^a-z0-9à-ÿ\s-]/g, '')
      .trim().replace(/\s+/g, '-').slice(0, 60);
  }

  function countWords(md) {
    return String(md || '').replace(/[#*_>`\[\]()-]/g, ' ').split(/\s+/).filter(Boolean).length;
  }

  function readingTime(md) {
    return Math.max(1, Math.round(countWords(md) / 200));
  }

  /* ---------------------------------------------------------------- *
   * Head-tags                                                         *
   * ---------------------------------------------------------------- */

  function setMeta(attr, key, value) {
    if (!value) return;
    var el = document.head.querySelector(attr + '[' + (attr === 'link' ? 'rel' : (key.indexOf('og:') === 0 || key.indexOf('article:') === 0 ? 'property' : 'name')) + '="' + key + '"]');
    if (!el) {
      el = document.createElement(attr);
      if (attr === 'link') el.setAttribute('rel', key);
      else el.setAttribute(key.indexOf('og:') === 0 || key.indexOf('article:') === 0 ? 'property' : 'name', key);
      document.head.appendChild(el);
    }
    el.setAttribute(attr === 'link' ? 'href' : 'content', value);
  }

  function setHead(data) {
    if (data.title) document.title = data.title;
    /* Voor het delen gebruiken we de titel zonder "| PWW Planner": de
       sitenaam staat al in og:site_name. */
    var shareTitle = data.shareTitle || data.title;
    setMeta('meta', 'description', data.description);
    setMeta('link', 'canonical', data.url);
    setMeta('meta', 'og:type', data.type || 'website');
    setMeta('meta', 'og:title', shareTitle);
    setMeta('meta', 'og:description', data.description);
    setMeta('meta', 'og:url', data.url);
    setMeta('meta', 'og:image', data.image || config.defaultImage);
    setMeta('meta', 'og:site_name', 'PWW Planner');
    setMeta('meta', 'og:locale', 'nl_NL');
    setMeta('meta', 'twitter:card', 'summary_large_image');
    setMeta('meta', 'twitter:title', shareTitle);
    setMeta('meta', 'twitter:description', data.description);
    setMeta('meta', 'twitter:image', data.image || config.defaultImage);
    if (data.published) setMeta('meta', 'article:published_time', data.published);
  }

  function addJsonLd(obj, id) {
    var existing = document.getElementById(id);
    if (existing) existing.remove();
    var script = document.createElement('script');
    script.type = 'application/ld+json';
    script.id = id;
    script.textContent = JSON.stringify(obj);
    document.head.appendChild(script);
  }

  /* ---------------------------------------------------------------- *
   * Advertenties                                                      *
   * ---------------------------------------------------------------- */

  /* Bouwt een advertentiecontainer met gereserveerde hoogte, zodat de
     pagina niet verspringt als de advertentie laadt (CLS). */
  function createAdSlot(slotKey, options) {
    var opts = options || {};
    var slotId = (config.ads.slots || {})[slotKey] || '';
    var wrap = document.createElement('div');
    wrap.className = 'pww-ad' + (opts.className ? ' ' + opts.className : '');
    wrap.setAttribute('aria-label', 'Advertentie');
    wrap.setAttribute('data-slot', slotKey);

    var label = document.createElement('span');
    label.className = 'pww-ad-label';
    label.textContent = 'Advertentie';
    wrap.appendChild(label);

    if (!config.ads.enabled || !slotId) {
      /* Geen slot-ID of advertenties uit: toon een eigen huisadvertentie
         in plaats van een leeg gat. */
      wrap.classList.add('pww-ad-house');
      var house = document.createElement('a');
      house.className = 'pww-ad-house-inner';
      house.href = config.siteUrl;
      house.innerHTML = '<strong>Plan je schoolwerk met PWW Planner</strong>' +
        '<span>Gratis planner voor scholieren — huiswerk, toetsen en samenvattingen op één plek.</span>';
      wrap.appendChild(house);
      return wrap;
    }

    var ins = document.createElement('ins');
    ins.className = 'adsbygoogle';
    ins.style.display = 'block';
    ins.setAttribute('data-ad-client', config.ads.client);
    ins.setAttribute('data-ad-slot', slotId);
    if (opts.format) ins.setAttribute('data-ad-format', opts.format);
    else ins.setAttribute('data-ad-format', 'auto');
    if (opts.layoutKey) ins.setAttribute('data-ad-layout-key', opts.layoutKey);
    if (opts.layout) ins.setAttribute('data-ad-layout', opts.layout);
    ins.setAttribute('data-full-width-responsive', 'true');
    wrap.appendChild(ins);
    wrap.setAttribute('data-pending', '1');
    return wrap;
  }

  /* Roep dit aan nadat de slots in de DOM staan. */
  function pushAds(root) {
    if (!config.ads.enabled) return;
    var pending = (root || document).querySelectorAll('.pww-ad[data-pending="1"]');
    if (!pending.length) return;
    global.adsbygoogle = global.adsbygoogle || [];
    Array.prototype.forEach.call(pending, function (slot) {
      slot.removeAttribute('data-pending');
      try { global.adsbygoogle.push({}); } catch (e) { /* adblocker of offline */ }
    });
  }

  /* ---------------------------------------------------------------- *
   * Ophalen van artikelen                                             *
   * ---------------------------------------------------------------- */

  function fetchPost(name) {
    var file = fileFrom(name);
    return fetch(config.postsPath + file, { cache: 'no-cache' })
      .then(function (res) {
        if (!res.ok) throw new Error('Artikel niet gevonden: ' + file);
        return res.text();
      })
      .then(function (raw) {
        var parsed = parseFrontMatter(raw);
        parsed.slug = slugFrom(file);
        return parsed;
      });
  }

  /* Haalt het manifest op. Ontbreekt het, dan wordt elk artikel uit
     fallbackSlugs los opgehaald zodat de blog blijft werken. */
  function fetchIndex(fallbackSlugs) {
    return fetch(config.indexPath, { cache: 'no-cache' })
      .then(function (res) {
        if (!res.ok) throw new Error('geen manifest');
        return res.json();
      })
      .then(function (data) {
        return Array.isArray(data) ? data : (data.posts || []);
      })
      .catch(function () {
        var slugs = fallbackSlugs || [];
        return Promise.all(slugs.map(function (slug) {
          return fetchPost(slug)
            .then(function (post) {
              return Object.assign({ slug: post.slug, words: countWords(post.body) }, post.meta);
            })
            .catch(function () { return null; });
        })).then(function (list) { return list.filter(Boolean); });
      });
  }

  function sortPosts(posts) {
    return posts.slice().sort(function (a, b) {
      return String(b.date || '').localeCompare(String(a.date || ''));
    });
  }

  function visiblePosts(posts) {
    if (!config.hideFuturePosts) return posts;
    return posts.filter(function (p) { return !isFuture(p.date); });
  }

  function colorsFor(meta) {
    var pair = config.categoryColors[meta.category];
    return {
      bg: meta.color_bg || (pair && pair[0]) || 'var(--event-afspraak-bg)',
      icon: meta.color_icon || (pair && pair[1]) || 'var(--event-afspraak-text)'
    };
  }

  global.PWW_BLOG = {
    config: config,
    slugFrom: slugFrom,
    fileFrom: fileFrom,
    articleUrl: articleUrl,
    absoluteUrl: absoluteUrl,
    formatDate: formatDate,
    isFuture: isFuture,
    escapeHtml: escapeHtml,
    parseFrontMatter: parseFrontMatter,
    renderMarkdown: renderMarkdown,
    headingId: headingId,
    countWords: countWords,
    readingTime: readingTime,
    setHead: setHead,
    addJsonLd: addJsonLd,
    createAdSlot: createAdSlot,
    pushAds: pushAds,
    fetchPost: fetchPost,
    fetchIndex: fetchIndex,
    sortPosts: sortPosts,
    visiblePosts: visiblePosts,
    colorsFor: colorsFor
  };
})(window);
