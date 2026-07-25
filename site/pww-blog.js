/*
 * PWW Blog — overzichtspagina (/blog/index.html)
 * ----------------------------------------------
 * Vult de hero en het kaartenraster, repareert de uitgelicht-knop, voegt
 * werkend zoeken en filteren toe, verbergt nog niet gepubliceerde artikelen
 * en plaatst de in-feed advertenties tussen de kaarten.
 *
 * Laad ná pww-blog-core.js:
 *   <script src="/blog/pww-blog-core.js"></script>
 *   <script src="/blog/pww-blog.js"></script>
 */
(function () {
  'use strict';

  var P = window.PWW_BLOG;
  var cfg = P.config;

  /* Wordt alleen gebruikt als index.json ontbreekt. Houd deze lijst gelijk
     aan de bestanden in de artikelenmap, of genereer het manifest met
     tools/generate-index.mjs. */
  var FALLBACK_SLUGS = [
    'uitgelicht',
    'pomodoro-methode-voor-scholieren',
    'perfecte-mindmap-toetsen',
    'spaced-repetition-leren',
    'feynman-techniek-studeren',
    'active-recall-studeren',
    'concentratie-verbeteren-leren',
    'flashcards-maken-gebruiken',
    'studieplanning-maken-tips',
    'toetsstress-verminderen-tips',
    'ideale-studieplek-inrichten',
    'effectief-samenvatten-tips',
    'studeren-met-muziek-tips'
  ];

  var grid = document.getElementById('blog-grid');
  var heroSection = document.getElementById('blog-hero-section');
  var heroTitle = document.getElementById('hero-title');
  var heroDescription = document.getElementById('hero-description');
  var heroIcon = document.getElementById('hero-bg-icon');
  var heroLink = document.getElementById('hero-read-more');
  var blogContent = document.getElementById('blog-content');

  if (!grid) return;

  var state = { posts: [], query: '', category: '' };

  P.setHead({
    title: 'Blog — leertips en studiehulp voor scholieren | PWW Planner',
    description: 'Praktische tips over leren, plannen en toetsen maken. ' +
      'Van active recall en mindmaps tot minder toetsstress.',
    url: P.absoluteUrl(cfg.blogPage),
    type: 'website'
  });

  P.fetchIndex(FALLBACK_SLUGS).then(function (posts) {
    state.posts = P.sortPosts(P.visiblePosts(posts));
    if (!state.posts.length) {
      grid.innerHTML = '<p>Er zijn nog geen artikelen gepubliceerd.</p>';
      return;
    }
    renderHero(pickFeatured(state.posts));
    renderToolbar();
    renderGrid();
    addListJsonLd(state.posts);
  }).catch(function (err) {
    grid.innerHTML = '<p>De artikelen konden niet worden geladen.</p>';
    if (window.console) console.error(err);
  });

  /* ------------------------------------------------------------------ *
   * Hero                                                                *
   * ------------------------------------------------------------------ */

  function pickFeatured(posts) {
    var flagged = posts.filter(function (p) {
      return String(p.featured) === 'true';
    })[0];
    if (flagged) return flagged;
    var named = posts.filter(function (p) {
      return P.slugFrom(p.slug) === cfg.featuredSlug;
    })[0];
    return named || posts[0];
  }

  function renderHero(post) {
    if (!post) return;
    var colors = P.colorsFor(post);
    var url = P.articleUrl(post.slug);

    if (heroTitle) heroTitle.textContent = post.title || '';
    if (heroDescription) heroDescription.textContent = post.description || '';
    if (heroIcon && post.icon) heroIcon.textContent = post.icon;
    if (heroSection) {
      heroSection.style.backgroundColor = colors.bg;
      if (post.image) {
        heroSection.style.backgroundImage = 'url("' + post.image + '")';
        heroSection.style.backgroundSize = 'cover';
        heroSection.style.backgroundPosition = 'center';
      }
    }

    /* In de oorspronkelijke pagina stond deze knop op display:none met
       href="#", waardoor het uitgelichte artikel nergens te openen was. */
    if (heroLink) {
      heroLink.href = url;
      heroLink.style.display = 'inline-flex';
      heroLink.setAttribute('aria-label', 'Lees het artikel: ' + (post.title || ''));
    }

    /* Maak de hele hero klikbaar, behalve de knoppen erin. */
    if (heroSection) {
      heroSection.classList.add('is-clickable');
      heroSection.addEventListener('click', function (event) {
        if (event.target.closest('a, button')) return;
        location.href = url;
      });
    }

    /* "Alle blogs"-knop laten scrollen naar het raster. */
    var scrollButton = heroSection && heroSection.querySelector('button');
    if (scrollButton && blogContent) {
      scrollButton.addEventListener('click', function () {
        blogContent.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
  }

  /* ------------------------------------------------------------------ *
   * Zoeken en filteren                                                  *
   * ------------------------------------------------------------------ */

  function renderToolbar() {
    var bar = document.createElement('div');
    bar.className = 'pww-blog-toolbar';

    var search = document.createElement('div');
    search.className = 'pww-blog-search';
    search.innerHTML = '<span class="material-symbols-outlined">search</span>' +
      '<input type="search" placeholder="Zoek in artikelen…" aria-label="Zoek in artikelen">';
    var input = search.querySelector('input');
    input.addEventListener('input', function () {
      state.query = input.value.trim().toLowerCase();
      renderGrid();
    });
    bar.appendChild(search);

    var chips = document.createElement('div');
    chips.className = 'pww-blog-chips';
    var categories = [''].concat(uniqueCategories(state.posts));
    categories.forEach(function (category) {
      var chip = document.createElement('button');
      chip.className = 'pww-chip' + (category === state.category ? ' is-active' : '');
      chip.textContent = category || 'Alles';
      chip.addEventListener('click', function () {
        state.category = category;
        Array.prototype.forEach.call(chips.children, function (c) {
          c.classList.toggle('is-active', c === chip);
        });
        renderGrid();
      });
      chips.appendChild(chip);
    });
    bar.appendChild(chips);

    if (blogContent) {
      var heading = blogContent.querySelector('h3');
      blogContent.insertBefore(bar, heading ? heading.nextSibling : blogContent.firstChild);
    }

    /* De knoppen in de topbalk deden niets; koppel ze aan deze toolbar. */
    var topButtons = document.querySelectorAll('.top-bar .icon-btn');
    Array.prototype.forEach.call(topButtons, function (btn) {
      var icon = btn.querySelector('.material-symbols-outlined');
      var name = icon ? icon.textContent.trim() : '';
      if (name === 'search') {
        btn.setAttribute('title', 'Zoeken in artikelen');
        btn.addEventListener('click', function () {
          bar.scrollIntoView({ behavior: 'smooth', block: 'center' });
          input.focus();
        });
      }
      if (name === 'filter_list') {
        btn.setAttribute('title', 'Filter op categorie');
        btn.addEventListener('click', function () {
          bar.scrollIntoView({ behavior: 'smooth', block: 'center' });
          chips.classList.add('is-highlighted');
          setTimeout(function () { chips.classList.remove('is-highlighted'); }, 1200);
        });
      }
    });
  }

  function uniqueCategories(posts) {
    var seen = {};
    posts.forEach(function (p) { if (p.category) seen[p.category] = true; });
    return Object.keys(seen).sort();
  }

  function matches(post) {
    if (state.category && post.category !== state.category) return false;
    if (!state.query) return true;
    var haystack = [post.title, post.description, post.category]
      .concat(post.tags || []).join(' ').toLowerCase();
    return haystack.indexOf(state.query) !== -1;
  }

  /* ------------------------------------------------------------------ *
   * Kaartenraster                                                       *
   * ------------------------------------------------------------------ */

  function renderGrid() {
    var posts = state.posts.filter(matches);
    grid.innerHTML = '';

    if (!posts.length) {
      var empty = document.createElement('p');
      empty.className = 'pww-empty';
      empty.textContent = 'Geen artikelen gevonden. Probeer een andere zoekterm.';
      grid.appendChild(empty);
      return;
    }

    var featuredSlug = P.slugFrom(pickFeatured(state.posts).slug);

    posts.forEach(function (post, index) {
      grid.appendChild(card(post, P.slugFrom(post.slug) === featuredSlug));

      /* In-feed advertentie na de eerste rij, en bij een lang raster nog
         een keer verderop. Alleen zonder actief filter, zodat de advertentie
         nooit tussen twee overgebleven kaarten valt. */
      if (state.query || state.category) return;
      if (index === 2 && posts.length > 5) {
        grid.appendChild(P.createAdSlot('inFeed', { className: 'pww-ad-card', format: 'fluid' }));
      }
      if (index === 8 && posts.length > 11) {
        grid.appendChild(P.createAdSlot('inFeed', { className: 'pww-ad-card', format: 'fluid' }));
      }
    });

    P.pushAds(grid);
  }

  function card(post, isFeatured) {
    var colors = P.colorsFor(post);
    var a = document.createElement('a');
    a.className = 'blog-card';
    a.href = P.articleUrl(post.slug);

    a.innerHTML =
      '<div class="blog-card-image" style="background-color:' + colors.bg + '">' +
      '<div class="blog-card-category">' + P.escapeHtml(post.category || 'Blog') + '</div>' +
      (isFeatured ? '<div class="blog-card-featured">Uitgelicht</div>' : '') +
      '<span class="material-symbols-outlined" style="font-size:80px;color:' + colors.icon + '">' +
      P.escapeHtml(post.icon || 'article') + '</span>' +
      '</div>' +
      '<div class="blog-card-content">' +
      '<h4 class="blog-card-title">' + P.escapeHtml(post.title || '') + '</h4>' +
      '<p class="blog-card-excerpt">' + P.escapeHtml(post.description || '') + '</p>' +
      '<div class="blog-card-meta">' +
      '<time datetime="' + P.escapeHtml(post.date || '') + '">' +
      P.escapeHtml(P.formatDate(post.date)) + '</time>' +
      (post.words ? '<span>' + Math.max(1, Math.round(post.words / 200)) + ' min</span>' : '') +
      '</div>' +
      '<div class="blog-card-footer"><span>Lees artikel</span>' +
      '<span class="material-symbols-outlined" style="font-size:20px;">arrow_forward</span></div>' +
      '</div>';
    return a;
  }

  /* ------------------------------------------------------------------ *
   * Gestructureerde data                                                *
   * ------------------------------------------------------------------ */

  function addListJsonLd(posts) {
    P.addJsonLd({
      '@context': 'https://schema.org',
      '@type': 'Blog',
      name: 'PWW Planner Blog',
      description: 'Leertips, studiemethodes en planningsadvies voor scholieren.',
      inLanguage: 'nl-NL',
      url: P.absoluteUrl(cfg.blogPage),
      blogPost: posts.map(function (post) {
        return {
          '@type': 'BlogPosting',
          headline: post.title || '',
          description: post.description || '',
          datePublished: post.date || undefined,
          url: P.absoluteUrl(P.articleUrl(post.slug))
        };
      })
    }, 'ld-blog');
  }
})();
