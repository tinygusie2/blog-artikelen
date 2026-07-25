/*
 * PWW Blog — artikelpagina (/blog/artikel.html)
 * ---------------------------------------------
 * Laadt het artikel uit de markdown, vult de bestaande hero en article-
 * container, en voegt toe: correcte meta-tags, Open Graph, canonical,
 * JSON-LD, een leeswijzer, voortgangsbalk, deelknop, gerelateerde
 * artikelen, een eigen call-to-action en de advertentieslots.
 *
 * Laad ná pww-blog-core.js:
 *   <script src="/blog/pww-blog-core.js"></script>
 *   <script src="/blog/pww-artikel.js"></script>
 */
(function () {
  'use strict';

  var P = window.PWW_BLOG;
  var cfg = P.config;

  var el = {
    topCategory: document.getElementById('article-category'),
    topTitle: document.getElementById('article-title'),
    hero: document.getElementById('article-hero'),
    heroTitle: document.getElementById('hero-title'),
    badge: document.getElementById('article-badge'),
    icon: document.getElementById('article-icon'),
    tag: document.getElementById('article-tag'),
    date: document.getElementById('article-date'),
    reading: document.getElementById('reading-time'),
    content: document.getElementById('article-content')
  };

  if (!el.content) return;
  var articleEl = el.content.closest('article');
  var container = articleEl ? articleEl.parentElement : el.content.parentElement;

  function param(name) {
    var m = new RegExp('[?&]' + name + '=([^&#]*)').exec(location.search);
    return m ? decodeURIComponent(m[1].replace(/\+/g, ' ')) : '';
  }

  /* Bij een statische, voorgerenderde pagina staat de slug in een meta-tag
     in plaats van in de querystring. */
  var metaPost = document.head.querySelector('meta[name="pww-post"]');
  var slug = P.slugFrom(param('post') || (metaPost ? metaPost.content : ''));
  var isPrerendered = el.content.getAttribute('data-prerendered') === '1';

  if (!slug) {
    showError('Geen artikel opgegeven.');
    return;
  }

  P.fetchPost(slug).then(render).catch(function (err) {
    showError('Dit artikel kon niet worden geladen.');
    if (window.console) console.error(err);
  });

  /* ------------------------------------------------------------------ */

  function showError(message) {
    el.content.innerHTML = '<p>' + P.escapeHtml(message) + '</p>' +
      '<p><a href="' + cfg.blogPage + '">Terug naar het blogoverzicht</a></p>';
  }

  function render(post) {
    var meta = post.meta;
    var words = P.countWords(post.body);
    var colors = P.colorsFor(meta);
    var url = P.absoluteUrl(P.articleUrl(slug));

    /* --- kop en hero ------------------------------------------------ */
    if (el.topTitle) el.topTitle.textContent = meta.title || '';
    if (el.heroTitle) el.heroTitle.textContent = meta.title || '';
    if (el.topCategory) el.topCategory.textContent = meta.category || 'Blog';
    if (el.tag) el.tag.textContent = meta.category || 'Blog';
    if (el.icon && meta.icon) el.icon.textContent = meta.icon;
    if (el.hero) {
      el.hero.style.backgroundColor = colors.bg;
      if (meta.image) {
        el.hero.style.backgroundImage = 'url("' + meta.image + '")';
        el.hero.style.backgroundSize = 'cover';
        el.hero.style.backgroundPosition = 'center';
      }
    }
    if (el.badge) el.badge.style.background = colors.bg;
    if (el.badge) el.badge.style.color = colors.icon;

    if (el.date) {
      el.date.innerHTML = '<time datetime="' + P.escapeHtml(meta.date || '') + '">' +
        P.escapeHtml(P.formatDate(meta.date)) + '</time>';
    }
    if (el.reading) el.reading.textContent = Math.max(1, Math.round(words / 200)) + ' min leestijd';

    /* --- inhoud ----------------------------------------------------- */
    /* De markdown-# wordt een h2, zodat de <h1> in de hero de enige h1 van
       de pagina blijft. Bij een voorgerenderde pagina staat de HTML er al;
       die laten we staan om knipperen te voorkomen. */
    if (!isPrerendered) {
      el.content.innerHTML = P.renderMarkdown(post.body, 1);
    }

    /* --- head ------------------------------------------------------- */
    P.setHead({
      title: (meta.title || 'Blog') + ' | PWW Planner',
      shareTitle: meta.title || 'Blog',
      description: meta.description || '',
      url: url,
      image: meta.image ? P.absoluteUrl(meta.image) : cfg.defaultImage,
      type: 'article',
      published: meta.date
    });
    addStructuredData(meta, url, words);

    /* --- extra's ---------------------------------------------------- */
    buildToc();
    insertAds(words);
    insertCta(meta);
    setupShare(meta, url);
    setupProgress();
    loadRelated(meta);

    P.pushAds(document);
  }

  /* ------------------------------------------------------------------ *
   * Gestructureerde data                                                *
   * ------------------------------------------------------------------ */

  function addStructuredData(meta, url, words) {
    P.addJsonLd({
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      headline: meta.title || '',
      description: meta.description || '',
      inLanguage: 'nl-NL',
      datePublished: meta.date || undefined,
      dateModified: meta.updated || meta.date || undefined,
      wordCount: words,
      keywords: (meta.tags || []).join(', ') || undefined,
      articleSection: meta.category || undefined,
      image: meta.image ? P.absoluteUrl(meta.image) : cfg.defaultImage,
      author: { '@type': 'Organization', name: meta.author || 'Team PWW Planner' },
      publisher: {
        '@type': 'Organization',
        name: 'PWW Planner',
        logo: { '@type': 'ImageObject', url: P.absoluteUrl('/icoontje.png') }
      },
      mainEntityOfPage: { '@type': 'WebPage', '@id': url }
    }, 'ld-article');

    P.addJsonLd({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: cfg.siteUrl },
        { '@type': 'ListItem', position: 2, name: 'Blog', item: P.absoluteUrl(cfg.blogPage) },
        { '@type': 'ListItem', position: 3, name: meta.title || '', item: url }
      ]
    }, 'ld-breadcrumb');

    var faq = collectFaq();
    if (faq.length >= 2) {
      P.addJsonLd({
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: faq.map(function (item) {
          return {
            '@type': 'Question',
            name: item.q,
            acceptedAnswer: { '@type': 'Answer', text: item.a }
          };
        })
      }, 'ld-faq');
    }
  }

  /* Leest de sectie "Veelgestelde vragen": elke h3 is een vraag, de tekst
     eronder tot de volgende kop is het antwoord. */
  function collectFaq() {
    var faq = [];
    var headings = el.content.querySelectorAll('h2');
    var start = null;
    Array.prototype.forEach.call(headings, function (h) {
      if (!start && /veelgestelde vragen/i.test(h.textContent)) start = h;
    });
    if (!start) return faq;

    var node = start.nextElementSibling;
    var current = null;
    while (node && node.tagName !== 'H2') {
      if (node.tagName === 'H3') {
        if (current && current.a) faq.push(current);
        current = { q: node.textContent.trim(), a: '' };
      } else if (current && node.textContent.trim()) {
        current.a += (current.a ? ' ' : '') + node.textContent.trim();
      }
      node = node.nextElementSibling;
    }
    if (current && current.a) faq.push(current);
    return faq;
  }

  /* ------------------------------------------------------------------ *
   * Leeswijzer                                                          *
   * ------------------------------------------------------------------ */

  function buildToc() {
    var headings = Array.prototype.filter.call(
      el.content.querySelectorAll('h2'),
      function (h) { return !h.classList.contains('article-lead'); }
    );
    if (headings.length < 4) return;

    var nav = document.createElement('nav');
    nav.className = 'pww-toc';
    nav.setAttribute('aria-label', 'Inhoud van dit artikel');
    var html = '<div class="pww-toc-title">In dit artikel</div><ol>';
    headings.forEach(function (h) {
      if (!h.id) h.id = P.headingId(h.textContent);
      html += '<li><a href="#' + h.id + '">' + P.escapeHtml(h.textContent) + '</a></li>';
    });
    nav.innerHTML = html + '</ol>';
    headings[0].parentNode.insertBefore(nav, headings[0]);
  }

  /* ------------------------------------------------------------------ *
   * Advertenties                                                        *
   * ------------------------------------------------------------------ */

  function insertAds(words) {
    /* Geen advertenties op korte artikelen: dat is slechte gebruikerservaring
       en het is precies waar AdSense op afkeurt. */
    if (words < cfg.ads.minWords) return;

    var children = Array.prototype.slice.call(el.content.children);

    /* Slot 1 — na de tweede alinea, dus ná de inleiding. */
    var paragraphs = children.filter(function (n) { return n.tagName === 'P'; });
    if (paragraphs.length >= 3) {
      var after = paragraphs[1];
      after.parentNode.insertBefore(P.createAdSlot('inArticle'), after.nextSibling);
    }

    /* Slot 2 — halverwege, alleen bij lange artikelen, altijd vlak vóór een
       kop zodat we nooit midden in een opsomming of stappenplan zitten. */
    if (words >= cfg.ads.midArticleMinWords) {
      var heads = Array.prototype.filter.call(
        el.content.querySelectorAll('h2'),
        function (h) { return !h.classList.contains('article-lead'); }
      );
      if (heads.length >= 4) {
        var middle = heads[Math.floor(heads.length / 2)];
        if (middle && !/veelgestelde vragen/i.test(middle.textContent)) {
          middle.parentNode.insertBefore(P.createAdSlot('midArticle'), middle);
        }
      }
    }
  }

  /* ------------------------------------------------------------------ *
   * Eigen call-to-action + slotadvertentie                              *
   * ------------------------------------------------------------------ */

  /* Koppelt een onderwerp aan de bijbehorende tool in de app. */
  var CTA_BY_CATEGORY = {
    Leerstrategie: {
      title: 'Overhoor jezelf met Woordjes Leren',
      text: 'Maak je eigen lijsten en laat PWW Planner bijhouden wat je nog niet kent.',
      button: 'Probeer het gratis'
    },
    Samenvatten: {
      title: 'Bouw je mindmap in PWW Planner',
      text: 'Zet je samenvatting om in een overzichtelijke mindmap bij het juiste vak.',
      button: 'Open de Mindmap-tool'
    },
    Focus: {
      title: 'Plan je studieblokken en pauzes',
      text: 'Sleep je blokken in je week en weet precies wanneer je klaar bent.',
      button: 'Naar de Planner'
    },
    Toetsen: {
      title: 'Krijg grip op je proefwerkweek',
      text: 'Vul je toetsen in en zie meteen of je planning haalbaar is.',
      button: 'Maak je planning'
    }
  };

  function insertCta(meta) {
    var cta = CTA_BY_CATEGORY[meta.category] || CTA_BY_CATEGORY.Focus;

    var card = document.createElement('aside');
    card.className = 'pww-cta';
    card.innerHTML =
      '<div class="pww-cta-icon"><span class="material-symbols-outlined">' +
      P.escapeHtml(meta.icon || 'rocket_launch') + '</span></div>' +
      '<div class="pww-cta-body">' +
      '<h3>' + P.escapeHtml(cta.title) + '</h3>' +
      '<p>' + P.escapeHtml(cta.text) + '</p>' +
      '</div>' +
      '<a class="pww-cta-button" href="' + cfg.siteUrl + '">' +
      P.escapeHtml(cta.button) +
      '<span class="material-symbols-outlined">arrow_forward</span></a>';
    el.content.appendChild(card);

    var words = P.countWords(el.content.textContent);
    if (words >= cfg.ads.minWords) {
      el.content.appendChild(P.createAdSlot('endArticle'));
    }
  }

  /* ------------------------------------------------------------------ *
   * Delen en opslaan                                                    *
   * ------------------------------------------------------------------ */

  function setupShare(meta, url) {
    if (!articleEl) return;
    var buttons = articleEl.querySelectorAll('.icon-btn');
    Array.prototype.forEach.call(buttons, function (btn) {
      var icon = btn.querySelector('.material-symbols-outlined');
      var name = icon ? icon.textContent.trim() : '';

      if (name === 'share') {
        btn.setAttribute('title', 'Deel dit artikel');
        btn.addEventListener('click', function () {
          var data = { title: meta.title, text: meta.description, url: url };
          if (navigator.share) {
            navigator.share(data).catch(function () { /* geannuleerd */ });
          } else if (navigator.clipboard) {
            navigator.clipboard.writeText(url).then(function () {
              flash(btn, 'done', 'Link gekopieerd');
            });
          }
        });
      }

      if (name === 'favorite') {
        var key = 'pww-blog-favoriet:' + slug;
        var active = localStorage.getItem(key) === '1';
        setFavorite(btn, active);
        btn.addEventListener('click', function () {
          active = !active;
          if (active) localStorage.setItem(key, '1');
          else localStorage.removeItem(key);
          setFavorite(btn, active);
        });
      }
    });
  }

  function setFavorite(btn, active) {
    btn.classList.toggle('is-active', active);
    btn.setAttribute('title', active ? 'Verwijder uit favorieten' : 'Bewaar dit artikel');
    btn.setAttribute('aria-pressed', active ? 'true' : 'false');
  }

  function flash(btn, iconName, title) {
    var icon = btn.querySelector('.material-symbols-outlined');
    if (!icon) return;
    var original = icon.textContent;
    icon.textContent = iconName;
    btn.setAttribute('title', title);
    setTimeout(function () { icon.textContent = original; }, 1600);
  }

  /* ------------------------------------------------------------------ *
   * Leesvoortgang                                                       *
   * ------------------------------------------------------------------ */

  function scrollParent(node) {
    var parent = node && node.parentElement;
    while (parent) {
      var style = getComputedStyle(parent);
      if (/(auto|scroll)/.test(style.overflowY) && parent.scrollHeight > parent.clientHeight) {
        return parent;
      }
      parent = parent.parentElement;
    }
    return null;
  }

  function setupProgress() {
    var bar = document.createElement('div');
    bar.className = 'pww-progress';
    bar.innerHTML = '<div class="pww-progress-inner"></div>';
    document.body.appendChild(bar);
    var inner = bar.firstChild;
    var scroller = scrollParent(el.content);

    function update() {
      var top, height, view;
      if (scroller) {
        top = scroller.scrollTop;
        height = scroller.scrollHeight;
        view = scroller.clientHeight;
      } else {
        top = window.scrollY || document.documentElement.scrollTop;
        height = document.documentElement.scrollHeight;
        view = window.innerHeight;
      }
      var max = Math.max(1, height - view);
      inner.style.width = Math.min(100, Math.max(0, (top / max) * 100)) + '%';
    }

    (scroller || window).addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    update();
  }

  /* ------------------------------------------------------------------ *
   * Gerelateerde artikelen                                              *
   * ------------------------------------------------------------------ */

  function loadRelated(meta) {
    var slugs = (meta.related || []).map(P.slugFrom).filter(function (s) {
      return s && s !== slug;
    });
    if (!slugs.length) return;

    P.fetchIndex(slugs).then(function (all) {
      var bySlug = {};
      all.forEach(function (p) { bySlug[P.slugFrom(p.slug || p.file || '')] = p; });

      var posts = slugs.map(function (s) { return bySlug[s]; }).filter(Boolean);
      if (cfg.hideFuturePosts) {
        posts = posts.filter(function (p) { return !P.isFuture(p.date); });
      }
      if (!posts.length) return;

      var section = document.createElement('section');
      section.className = 'pww-related';
      section.innerHTML = '<h2 class="pww-related-title">' +
        '<span class="material-symbols-outlined">auto_stories</span>Lees ook</h2>';

      var grid = document.createElement('div');
      grid.className = 'pww-related-grid';
      posts.slice(0, 3).forEach(function (p) {
        grid.appendChild(relatedCard(p));
      });
      section.appendChild(grid);
      container.appendChild(section);
    }).catch(function () { /* gerelateerd is optioneel */ });
  }

  function relatedCard(post) {
    var colors = P.colorsFor(post);
    var a = document.createElement('a');
    a.className = 'pww-related-card';
    a.href = P.articleUrl(post.slug);
    a.innerHTML =
      '<div class="pww-related-icon" style="background:' + colors.bg + ';color:' + colors.icon + '">' +
      '<span class="material-symbols-outlined">' + P.escapeHtml(post.icon || 'article') + '</span></div>' +
      '<div class="pww-related-text">' +
      '<span class="pww-related-cat">' + P.escapeHtml(post.category || 'Blog') + '</span>' +
      '<strong>' + P.escapeHtml(post.title || '') + '</strong>' +
      '<span class="pww-related-desc">' + P.escapeHtml(post.description || '') + '</span>' +
      '</div>';
    return a;
  }
})();
