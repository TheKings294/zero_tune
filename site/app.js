(function () {
  'use strict';

  var TTL = 5 * 60 * 1000;
  var CATEGORIES = ['Mathématiques', 'Français', 'Langues', 'Sciences', 'Histoire-Géo',
    'Informatique', 'Calculatrices', 'Fournitures', 'Livres', 'Autre'];
  var vue = document.getElementById('vue');
  var current = { cat: '', tri: 'recent', page: 1 }; // dernier état de la liste (pour le retour du détail)
  var token = 0;

  function el(tag, props, children) {
    var n = document.createElement(tag);
    Object.keys(props || {}).forEach(function (k) {
      if (k === 'text') n.textContent = props[k];
      else n.setAttribute(k, props[k]);
    });
    (children || []).forEach(function (c) { if (c) n.appendChild(c); });
    return n;
  }

  function price(cents) {
    if (!cents) return null;
    var e = cents / 100;
    return (e === Math.round(e) ? String(e) : e.toFixed(2).replace('.', ',')) + ' €';
  }

  function relDate(iso) {
    var d = (Date.now() - new Date(iso).getTime()) / 86400000;
    if (d < 0.04) return "À l'instant";
    if (d < 1) return "Aujourd'hui";
    if (d < 2) return 'Hier';
    if (d < 7) return 'Il y a ' + Math.floor(d) + ' jours';
    if (d < 30) { var w = Math.floor(d / 7); return 'Il y a ' + w + (w > 1 ? ' semaines' : ' semaine'); }
    return "Il y a plus d'un mois";
  }

  function priceNode(cents) {
    var p = price(cents);
    if (!p) return el('span', { 'class': 'badge', text: 'Don' });
    return el('span', { 'class': 'price' }, [el('span', { 'class': 'sr-only', text: 'Prix : ' }), document.createTextNode(p)]);
  }

  // ---- état dans l'ancre : #liste?cat=…&tri=…&page=… et #annonce-12?cat=…&tri=…&page=… ----
  function qs(st) {
    var parts = [];
    if (st.cat) parts.push('cat=' + encodeURIComponent(st.cat));
    if (st.tri !== 'recent') parts.push('tri=' + st.tri);
    if (st.page > 1) parts.push('page=' + st.page);
    return parts.length ? '?' + parts.join('&') : '';
  }
  function listHash(st) { return '#liste' + qs(st); }
  function parseState(query) {
    var p = new URLSearchParams(query || '');
    var cat = p.get('cat') || '';
    var tri = p.get('tri') === 'prix' ? 'prix' : 'recent';
    var page = parseInt(p.get('page'), 10);
    return { cat: CATEGORIES.indexOf(cat) > -1 ? cat : '', tri: tri, page: page > 0 ? page : 1 };
  }

  function setView(title, nodes) {
    document.title = title + ' — Repasse';
    vue.textContent = '';
    nodes.forEach(function (n) { if (n) vue.appendChild(n); });
    var h1 = document.getElementById('banner') || vue.querySelector('h1');
    if (h1) { h1.setAttribute('tabindex', '-1'); h1.focus(); }
    window.scrollTo(0, 0);
  }

  function stateBox(lines, action) {
    var box = el('div', { 'class': 'state', role: 'alert' }, lines.map(function (t) { return el('p', { text: t }); }));
    if (action) box.appendChild(action);
    return box;
  }

  // ---- cache navigateur (localStorage, 5 min) ----
  function cacheKey(st) { return 'rp:list:' + st.cat + ':' + st.tri + ':' + st.page; }
  function readCache(st) {
    try { return JSON.parse(localStorage.getItem(cacheKey(st))); } catch (e) { return null; }
  }
  function writeCache(st, data) {
    try { localStorage.setItem(cacheKey(st), JSON.stringify({ t: Date.now(), data: data })); } catch (e) { /* quota ou mode privé */ }
  }

  function getList(st) {
    var hit = readCache(st);
    if (hit && Date.now() - hit.t < TTL) return Promise.resolve({ data: hit.data, source: 'cache' });
    var url = '/api/annonces?page=' + st.page + '&tri=' + st.tri + (st.cat ? '&categorie=' + encodeURIComponent(st.cat) : '');
    return fetch(url).then(function (res) {
      if (!res.ok) throw new Error('http');
      return res.json();
    }).then(function (data) {
      writeCache(st, data);
      return { data: data, source: 'reseau' };
    }, function (err) {
      if (err.message === 'http') throw err;
      if (hit) return { data: hit.data, source: 'hors-ligne' };
      throw new Error('offline');
    });
  }

  // ---- écran liste ----
  function option(value, label, selected) {
    var o = el('option', { value: value, text: label });
    if (selected) o.selected = true;
    return o;
  }

  function filters(st) {
    var cat = el('select', { id: 'f-cat' }, [option('', 'Toutes les catégories', !st.cat)].concat(
      CATEGORIES.map(function (c) { return option(c, c, c === st.cat); })));
    var tri = el('select', { id: 'f-tri' }, [
      option('recent', 'Plus récentes', st.tri === 'recent'),
      option('prix', 'Prix croissant (dons en premier)', st.tri === 'prix')]);
    function apply() {
      location.hash = listHash({ cat: cat.value, tri: tri.value, page: 1 });
    }
    cat.addEventListener('change', apply);
    tri.addEventListener('change', apply);
    return el('form', { 'class': 'filters', id: 'filtres' }, [
      el('div', {}, [el('label', { 'for': 'f-cat', text: 'Catégorie' }), cat]),
      el('div', {}, [el('label', { 'for': 'f-tri', text: 'Trier par' }), tri])
    ]);
  }

  function pagerLink(label, hidden, st, page, isCurrent) {
    var a = el('a', { 'class': 'btn', href: listHash({ cat: st.cat, tri: st.tri, page: page }) }, [document.createTextNode(label)]);
    if (hidden) a.appendChild(el('span', { 'class': 'sr-only', text: hidden }));
    if (isCurrent) a.setAttribute('aria-current', 'page');
    if (/^\d+$/.test(label)) a.setAttribute('aria-label', 'Page ' + label);
    return a;
  }

  function pager(d, st) {
    var items = [d.page > 1 ? pagerLink('‹ Précédent', ' : page précédente', st, d.page - 1)
      : el('span', { 'class': 'btn', 'aria-disabled': 'true', text: '‹ Précédent' })];
    for (var i = 1; i <= d.pages; i++) items.push(pagerLink(String(i), '', st, i, i === d.page));
    items.push(d.page < d.pages ? pagerLink('Suivant ›', ' : page suivante', st, d.page + 1)
      : el('span', { 'class': 'btn', 'aria-disabled': 'true', text: 'Suivant ›' }));
    return el('nav', { 'class': 'pager', 'aria-label': 'Pagination des annonces' },
      [el('ul', {}, items.map(function (n) { return el('li', {}, [n]); }))]);
  }

  var NOTES = {
    reseau: 'Liste chargée depuis le réseau.',
    cache: 'Liste chargée depuis le cache — aucune nouvelle requête.',
    'hors-ligne': 'Hors connexion — dernière liste enregistrée.'
  };

  function fill(box, nodes) {
    box.textContent = '';
    nodes.forEach(function (n) { if (n) box.appendChild(n); });
  }

  function renderList(st, keepFocus) {
    var me = ++token;
    var shell = flash ? null : document.getElementById('filtres'); // un message à afficher reconstruit l'écran
    if (!shell) {
      var banner = flash ? el('p', { id: 'banner', 'class': 'banner', role: 'status', tabindex: '-1', text: '✓ ' + flash }) : null;
      flash = '';
      setView(st.cat ? 'Annonces — ' + st.cat : 'Annonces', [
        banner,
        el('h1', { text: 'Annonces du lycée' }),
        el('p', { 'class': 'lead', text: 'Matériel donné ou vendu entre élèves. Consultation libre, sans compte.' }),
        filters(st),
        el('h2', { id: 'compteur', role: 'status' }),
        el('div', { id: 'resultats' })
      ]);
    } else {
      document.getElementById('f-cat').value = st.cat;
      document.getElementById('f-tri').value = st.tri;
      document.title = (st.cat ? 'Annonces — ' + st.cat : 'Annonces') + ' — Repasse';
      if (!keepFocus) { var h = vue.querySelector('h1'); h.setAttribute('tabindex', '-1'); h.focus(); window.scrollTo(0, 0); }
    }
    var compteur = document.getElementById('compteur');
    var box = document.getElementById('resultats');

    getList(st).then(function (r) {
      if (me !== token) return;
      var d = r.data;
      current = { cat: st.cat, tri: st.tri, page: d.page };
      var where = st.cat ? ' en ' + st.cat : '';
      if (!d.total) {
        compteur.textContent = 'Aucune annonce' + where;
        var reset = el('button', { 'class': 'btn', type: 'button', text: 'Afficher toutes les catégories' });
        reset.addEventListener('click', function () {
          location.hash = listHash({ cat: '', tri: st.tri, page: 1 });
          document.getElementById('f-cat').focus();
        });
        fill(box, [stateBox(st.cat
          ? ['Aucune annonce en ligne dans la catégorie « ' + st.cat + ' » pour le moment.', 'Revenez plus tard, ou consultez les autres catégories.']
          : ['Aucune annonce en ligne pour le moment.', 'Revenez plus tard.'], st.cat ? reset : null)]);
        return;
      }
      compteur.textContent = d.total + (d.total > 1 ? ' annonces' : ' annonce') + where + ' · page ' + d.page + ' sur ' + d.pages;
      var cards = d.items.map(function (a) {
        return el('li', {}, [el('a', { 'class': 'card', href: '#annonce-' + a.id + qs(current) }, [
          el('h3', { text: a.titre }),
          el('span', { 'class': 'meta' }, [
            priceNode(a.prix_cents),
            el('span', {}, [el('span', { 'class': 'sr-only', text: 'Catégorie : ' }), document.createTextNode(a.categorie)]),
            el('span', { text: relDate(a.created_at) })
          ])
        ])]);
      });
      fill(box, [
        el('ul', { 'class': 'cards' }, cards),
        d.pages > 1 ? pager(d, st) : null,
        el('p', { 'class': 'note', text: NOTES[r.source] })
      ]);
    }).catch(function (err) {
      if (me !== token) return;
      compteur.textContent = '';
      var retry = el('button', { 'class': 'btn', type: 'button', text: 'Réessayer' });
      retry.addEventListener('click', route);
      fill(box, [stateBox([err.message === 'offline'
        ? "Vous êtes hors connexion et la liste n'a jamais été chargée."
        : 'Service indisponible, réessayez plus tard.'], retry)]);
    });
  }

  // ---- contact (US3) : lu à la demande, jamais conservé ----
  function contactLink(c, a) {
    if (c.type === 'email') {
      return { kind: 'Email', href: 'mailto:' + c.valeur + '?subject=' + encodeURIComponent('Repasse : ' + a.titre) };
    }
    var digits = c.valeur.replace(/\D/g, '');
    return { kind: 'Téléphone', href: 'tel:' + (digits.charAt(0) === '0' ? '+33' + digits.slice(1) : '+' + digits) };
  }

  function contactSection(a) {
    var live = el('div', { role: 'status', 'class': 'sr-only' });
    var zone = el('div', { 'class': 'contact-zone' });
    var msg = el('p', { 'class': 'err', hidden: 'hidden' });
    var btn = el('button', { 'class': 'btn btn-primary', type: 'button', text: 'Afficher le contact de ' + a.vendeur });
    zone.appendChild(btn);

    btn.addEventListener('click', function () {
      btn.disabled = true;
      btn.textContent = 'Affichage…';
      msg.hidden = true;
      function fail(text) {
        btn.disabled = false;
        btn.textContent = 'Afficher le contact de ' + a.vendeur;
        msg.textContent = text;
        msg.hidden = false;
      }
      fetch('/api/annonces/' + a.id + '/contact').then(function (res) {
        if (res.status === 404) return fail("Cette annonce n'existe plus ou a été clôturée.");
        if (!res.ok) return fail('Impossible d’afficher le contact, réessayez.');
        return res.json().then(function (c) {
          var l = contactLink(c, a);
          var link = el('a', { 'class': 'btn', href: l.href, text: c.valeur });
          zone.textContent = '';
          zone.appendChild(el('p', { 'class': 'contact-kind', text: l.kind + ' :' }));
          zone.appendChild(link);
          live.textContent = 'Contact de ' + a.vendeur + ' affiché : ' + l.kind.toLowerCase() + ', ' + c.valeur + '.';
          link.focus();
        });
      }, function () {
        fail('Vous êtes hors connexion : le contact ne peut pas être affiché.');
      });
    });

    return el('section', { 'class': 'contact', 'aria-labelledby': 'h2-contact' }, [
      el('h2', { id: 'h2-contact', text: 'Contacter ' + a.vendeur }),
      el('p', { 'class': 'lead', text: "Le contact reste masqué jusqu'à votre demande. Vous échangez directement, sans passer par l'application." }),
      zone, msg, live
    ]);
  }

  // ---- écran détail ----
  function backLink(st) {
    return el('p', {}, [el('a', { 'class': 'back', href: listHash(st) }, [document.createTextNode('← Retour aux annonces')])]);
  }

  function renderDetail(id, st) {
    var me = ++token;
    fetch('/api/annonces/' + id).then(function (res) {
      if (res.status === 404) return null;
      if (!res.ok) throw new Error('http');
      return res.json();
    }).then(function (a) {
      if (me !== token) return;
      if (!a) {
        setView('Annonce introuvable', [backLink(st), el('h1', { text: 'Annonce introuvable' }),
          stateBox(["Cette annonce n'existe plus ou a été clôturée."])]);
        return;
      }
      setView(a.titre, [
        backLink(st),
        el('article', {}, [
          el('h1', { text: a.titre }),
          el('dl', {}, [
            el('div', {}, [el('dt', { text: 'Prix' }), el('dd', {}, [priceNode(a.prix_cents)])]),
            el('div', {}, [el('dt', { text: 'Catégorie' }), el('dd', { text: a.categorie })]),
            el('div', {}, [el('dt', { text: 'Publiée' }), el('dd', { text: relDate(a.created_at) })]),
            el('div', {}, [el('dt', { text: 'Proposée par' }), el('dd', { text: a.vendeur })])
          ]),
          el('h2', { text: 'Description' }),
          el('p', { 'class': 'desc', text: a.description }),
          contactSection(a)
        ])
      ]);
    }).catch(function (err) {
      if (me !== token) return;
      setView('Annonce', [backLink(st), el('h1', { text: 'Annonce indisponible' }), stateBox([err && err.message === 'http'
        ? 'Service indisponible, réessayez plus tard.'
        : 'Vous êtes hors connexion. Cette annonce n’a pas été enregistrée sur votre appareil.'])]);
    });
  }

  // ---- compte (US4) ----
  var me = null;
  var meReady = false;
  var flash = '';
  var afterLogin = '';

  function api(method, url, body) {
    var opts = { method: method, headers: {}, credentials: 'same-origin' };
    if (body !== undefined) { opts.headers['Content-Type'] = 'application/json'; opts.body = JSON.stringify(body); }
    return fetch(url, opts).then(function (res) {
      var parsed = res.status === 204 ? Promise.resolve({}) : res.json().catch(function () { return {}; });
      return parsed.then(function (j) { return { status: res.status, ok: res.ok, json: j }; });
    });
  }

  // Visiteur sans compte (pas de témoin rp_auth) : aucune requête /api/me.
  var hasHint = /(?:^|;\s*)rp_auth=1/.test(document.cookie);
  var meP = (hasHint ? api('GET', '/api/me').then(function (r) { me = r.ok ? r.json.user : null; }, function () { me = null; })
    : Promise.resolve()).then(function () { meReady = true; renderNav(); });

  function go(hash) {
    if (location.hash === hash) route(); else location.hash = hash;
  }

  function renderNav() {
    var nav = document.getElementById('nav');
    var cur = location.hash.split('?')[0];
    nav.textContent = '';
    function link(href, label) {
      var a = el('a', { 'class': 'navlink', href: href, text: label });
      if (cur === href) a.setAttribute('aria-current', 'page');
      nav.appendChild(el('li', {}, [a]));
    }
    if (me) {
      link('#publier', 'Ajouter une annonce');
      link('#mes-annonces', 'Mes annonces');
      var out = el('button', { type: 'button', 'class': 'navlink', text: 'Se déconnecter' });
      out.addEventListener('click', logout);
      nav.appendChild(el('li', {}, [out]));
    } else if (meReady) {
      link('#connexion', 'Se connecter');
      link('#inscription', 'Créer un compte');
    }
    document.getElementById('session').textContent = me ? 'Session : ' + me.prenom : '';
    document.getElementById('nav-toggle').hidden = !nav.children.length; // pas de bouton « Menu » tant que le menu est vide
    setMenu(false);
  }

  // ---- menu mobile (bouton « Menu » + liste déroulante) ----
  var navToggle = document.getElementById('nav-toggle');
  var navList = document.getElementById('nav');
  function menuOpen() { return navToggle.getAttribute('aria-expanded') === 'true'; }
  function setMenu(open, focusButton) {
    navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    navList.classList.toggle('open', open);
    if (!open && focusButton) navToggle.focus();
  }
  navToggle.addEventListener('click', function () { setMenu(!menuOpen()); });
  navList.addEventListener('click', function () { setMenu(false); }); // choisir un lien ou se déconnecter referme le menu
  document.addEventListener('keydown', function (ev) {
    if ((ev.key === 'Escape' || ev.key === 'Esc') && menuOpen() && navToggle.offsetParent !== null) { ev.preventDefault(); setMenu(false, true); }
  });
  document.addEventListener('click', function (ev) { if (menuOpen() && !ev.target.closest('nav')) setMenu(false); });
  navList.parentNode.addEventListener('focusout', function (ev) {
    if (menuOpen() && ev.relatedTarget && !navList.parentNode.contains(ev.relatedTarget)) setMenu(false);
  });

  function logout() {
    api('POST', '/api/logout').then(function () {}, function () {}).then(function () {
      me = null;
      flash = 'Vous êtes déconnecté·e. Les annonces restent consultables sans compte.';
      renderNav();
      go('#liste');
    });
  }

  // ---- formulaires : champs, erreurs liées (aria-describedby / aria-invalid), récapitulatif ----
  function field(o) {
    var attrs = { id: o.id, name: o.id, 'aria-required': 'true' };
    if (!o.textarea) attrs.type = o.type || 'text';
    ['autocomplete', 'maxlength', 'inputmode', 'autocapitalize', 'spellcheck'].forEach(function (k) { if (o[k]) attrs[k] = o[k]; });
    var input = el(o.textarea ? 'textarea' : 'input', attrs);
    var ids = [];
    var kids = [el('label', { 'for': o.id, text: o.label + (o.optional ? '' : ' (obligatoire)') }), input];
    if (o.hint) { kids.push(el('p', { 'class': 'hint', id: o.id + '-hint', text: o.hint })); ids.push(o.id + '-hint'); }
    var count = null;
    if (o.counter) {
      count = el('p', { 'class': 'hint count', id: o.id + '-count', text: '0 / ' + o.counter });
      kids.push(count); ids.push(o.id + '-count');
      input.addEventListener('input', function () { count.textContent = [].slice.call(input.value).length + ' / ' + o.counter; });
    }
    var err = el('p', { 'class': 'err', id: o.id + '-err', hidden: 'hidden' });
    kids.push(err); ids.push(o.id + '-err');
    input.setAttribute('aria-describedby', ids.join(' '));
    return {
      id: o.id, input: input, wrap: el('div', { 'class': 'field' }, kids),
      setError: function (msg) {
        err.textContent = '⚠ ' + msg; err.hidden = false; input.setAttribute('aria-invalid', 'true');
      },
      clear: function () { err.hidden = true; err.textContent = ''; input.removeAttribute('aria-invalid'); }
    };
  }

  function summary() {
    return el('div', { 'class': 'summary', role: 'alert', tabindex: '-1', hidden: 'hidden' });
  }

  // errors : [{field: <champ>, msg}] — le récapitulatif reçoit le focus, chaque lien mène au champ.
  function showErrors(box, errors, lead) {
    box.textContent = '';
    box.appendChild(el('h2', { text: lead || (errors.length > 1 ? errors.length + ' champs à corriger' : '1 champ à corriger') }));
    var ul = el('ul', {});
    errors.forEach(function (e) {
      e.field.setError(e.msg);
      var a = el('a', { href: '#' + e.field.id, text: e.msg });
      a.addEventListener('click', function (ev) { ev.preventDefault(); e.field.input.focus(); });
      ul.appendChild(el('li', {}, [a]));
    });
    box.appendChild(ul);
    box.hidden = false;
    box.focus();
  }

  function networkMessage(box, text) {
    box.textContent = '';
    box.appendChild(el('h2', { text: text }));
    box.hidden = false;
    box.focus();
  }

  function fromServer(errs, map) {
    return Object.keys(errs || {}).filter(function (k) { return map[k]; }).map(function (k) { return { field: map[k], msg: errs[k] }; });
  }

  // ---- connexion ----
  function renderLogin() {
    if (me) return go('#liste');
    var id = field({ id: 'l-username', label: 'Identifiant', autocomplete: 'username', autocapitalize: 'none', spellcheck: 'false', hint: 'En minuscules, sans espace.' });
    var pw = field({ id: 'l-password', label: 'Mot de passe', type: 'password', autocomplete: 'current-password' });
    var box = summary();
    var btn = el('button', { 'class': 'btn btn-primary', type: 'submit', text: 'Se connecter' });
    var form = el('form', { 'class': 'card-form', novalidate: 'novalidate' }, [
      el('p', { 'class': 'lead', text: 'Les deux champs sont obligatoires.' }), id.wrap, pw.wrap, btn]);
    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      id.clear(); pw.clear();
      var errs = [];
      if (!id.input.value.trim()) errs.push({ field: id, msg: 'Indiquez votre identifiant.' });
      if (!pw.input.value) errs.push({ field: pw, msg: 'Indiquez votre mot de passe.' });
      if (errs.length) return showErrors(box, errs);
      box.hidden = true; btn.disabled = true;
      api('POST', '/api/login', { username: id.input.value.trim(), password: pw.input.value }).then(function (r) {
        btn.disabled = false;
        if (r.ok) {
          me = r.json.user; flash = 'Connexion réussie. Bonjour ' + me.prenom + ' !';
          var next = afterLogin || '#liste'; afterLogin = '';
          if (next !== '#liste') flash = '';
          renderNav(); return go(next);
        }
        pw.input.value = '';
        id.input.setAttribute('aria-invalid', 'true');
        showErrors(box, [{ field: pw, msg: r.json.erreur || 'Connexion impossible.' }], 'Connexion refusée');
      }, function () {
        btn.disabled = false;
        networkMessage(box, 'Vous êtes hors connexion : impossible de vous connecter.');
      });
    });
    setView('Connexion', [el('h1', { text: 'Se connecter' }),
      el('p', { 'class': 'lead', text: "Un compte n'est utile que pour publier ou gérer vos annonces." }), box, form,
      el('p', { 'class': 'note' }, [document.createTextNode('Pas encore de compte ? '), el('a', { href: '#inscription', text: 'Créer un compte' })])]);
  }

  // ---- inscription ----
  function renderRegister() {
    if (me) return go('#liste');
    var f = {
      username: field({ id: 'r-username', label: 'Identifiant', autocomplete: 'username', autocapitalize: 'none', spellcheck: 'false', hint: '3 à 30 caractères : minuscules, chiffres, tiret ou souligné.' }),
      password: field({ id: 'r-password', label: 'Mot de passe', type: 'password', autocomplete: 'new-password', hint: '8 caractères minimum.' }),
      prenom: field({ id: 'r-prenom', label: 'Prénom', autocomplete: 'given-name', maxlength: '40', hint: 'Affiché sur vos annonces.' }),
      value: field({ id: 'r-contact', label: 'Votre contact', type: 'email', autocomplete: 'email', hint: 'Format attendu : prenom@exemple.fr. Affiché seulement quand un élève le demande.' })
    };
    var radios = ['email', 'tel'].map(function (v) {
      var r = el('input', { type: 'radio', name: 'r-type', value: v, id: 'r-type-' + v });
      if (v === 'email') r.checked = true;
      return { v: v, r: r };
    });
    function setType() {
      var tel = radios[1].r.checked;
      f.value.input.type = tel ? 'tel' : 'email';
      f.value.input.setAttribute('autocomplete', tel ? 'tel' : 'email');
      document.getElementById('r-contact-hint').textContent = tel
        ? 'Format attendu : 06 12 34 56 78. Affiché seulement quand un élève le demande.'
        : 'Format attendu : prenom@exemple.fr. Affiché seulement quand un élève le demande.';
    }
    var choice = el('fieldset', { 'class': 'choices' }, [el('legend', { text: 'Moyen de contact (obligatoire)' })].concat(radios.map(function (x) {
      x.r.addEventListener('change', setType);
      return el('label', { 'class': 'choice', 'for': 'r-type-' + x.v }, [x.r, document.createTextNode(x.v === 'email' ? 'Email' : 'Téléphone')]);
    })));
    var box = summary();
    var btn = el('button', { 'class': 'btn btn-primary', type: 'submit', text: 'Créer mon compte' });
    var form = el('form', { 'class': 'card-form', novalidate: 'novalidate' },
      [f.username.wrap, f.password.wrap, f.prenom.wrap, choice, f.value.wrap, btn]);
    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      Object.keys(f).forEach(function (k) { f[k].clear(); });
      var errs = [];
      if (!/^[a-z0-9_-]{3,30}$/.test(f.username.input.value.trim())) errs.push({ field: f.username, msg: 'Identifiant : 3 à 30 caractères, minuscules, chiffres, tiret ou souligné.' });
      if (f.password.input.value.length < 8) errs.push({ field: f.password, msg: 'Mot de passe : 8 caractères minimum.' });
      if (!f.prenom.input.value.trim()) errs.push({ field: f.prenom, msg: 'Indiquez votre prénom.' });
      if (!f.value.input.value.trim()) errs.push({ field: f.value, msg: radios[1].r.checked ? 'Indiquez votre téléphone.' : 'Indiquez votre email.' });
      if (errs.length) return showErrors(box, errs);
      box.hidden = true; btn.disabled = true;
      api('POST', '/api/register', {
        username: f.username.input.value.trim(), password: f.password.input.value, prenom: f.prenom.input.value.trim(),
        contact_type: radios[1].r.checked ? 'tel' : 'email', contact_value: f.value.input.value.trim()
      }).then(function (r) {
        btn.disabled = false;
        if (r.ok) {
          me = r.json.user; flash = 'Compte créé. Bonjour ' + me.prenom + ' ! Vous pouvez publier une annonce.';
          renderNav(); return go('#liste');
        }
        var list = fromServer(r.json.erreurs, { username: f.username, password: f.password, prenom: f.prenom, contact_value: f.value });
        if (list.length) showErrors(box, list); else networkMessage(box, r.json.erreur || 'Inscription impossible, réessayez.');
      }, function () {
        btn.disabled = false;
        networkMessage(box, 'Vous êtes hors connexion : impossible de créer le compte.');
      });
    });
    setView('Créer un compte', [el('h1', { text: 'Créer un compte' }),
      el('p', { 'class': 'lead', text: 'Un compte permet de publier et de clôturer vos annonces. Tous les champs sont obligatoires.' }), box, form,
      el('p', { 'class': 'note' }, [document.createTextNode('Déjà un compte ? '), el('a', { href: '#connexion', text: 'Se connecter' })])]);
  }

  // ---- publier une annonce (US4 / US6 : en ligne immédiatement) ----
  function renderPublish() {
    var f = {
      titre: field({ id: 'p-titre', label: 'Titre', maxlength: '80', counter: 80 }),
      desc: field({ id: 'p-desc', label: 'Description', textarea: true, maxlength: '1000', counter: 1000 }),
      prix: field({ id: 'p-prix', label: 'Prix en euros', inputmode: 'decimal', autocomplete: 'off', hint: 'Format attendu : 12 ou 12,50. Laissez vide si c’est un don.' })
    };
    f.prix.wrap.querySelector('label').textContent = 'Prix en euros (obligatoire, sauf don)';
    var don = el('input', { type: 'checkbox', id: 'p-don' });
    var donLabel = el('label', { 'class': 'choice', 'for': 'p-don' }, [don, document.createTextNode("C'est un don")]);
    don.addEventListener('change', function () {
      f.prix.input.disabled = don.checked;
      if (don.checked) { f.prix.input.value = ''; f.prix.clear(); }
    });
    var catSel = el('select', { id: 'p-cat', 'aria-required': 'true', 'aria-describedby': 'p-cat-err' },
      [option('', 'Choisir une catégorie', true)].concat(CATEGORIES.map(function (c) { return option(c, c, false); })));
    var catErr = el('p', { 'class': 'err', id: 'p-cat-err', hidden: 'hidden' });
    var cat = {
      id: 'p-cat', input: catSel,
      setError: function (m) { catErr.textContent = '⚠ ' + m; catErr.hidden = false; catSel.setAttribute('aria-invalid', 'true'); },
      clear: function () { catErr.hidden = true; catSel.removeAttribute('aria-invalid'); }
    };
    var box = summary();
    var btn = el('button', { 'class': 'btn btn-primary', type: 'submit', text: "Créer l'annonce" });
    var contactNote = el('p', { 'class': 'note', text: 'Les élèves verront votre ' + (me.contact.type === 'email' ? 'email' : 'téléphone') + ' (' + me.contact.valeur + ') uniquement s’ils demandent à l’afficher.' });
    var form = el('form', { 'class': 'card-form', novalidate: 'novalidate' }, [
      el('p', { 'class': 'lead', text: 'Tous les champs sont obligatoires. Texte uniquement : pas de photo, pour une application légère.' }),
      f.titre.wrap, f.desc.wrap, f.prix.wrap, donLabel,
      el('div', { 'class': 'field' }, [el('label', { 'for': 'p-cat', text: 'Catégorie (obligatoire)' }), catSel, catErr]),
      contactNote, btn]);
    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      [f.titre, f.desc, f.prix, cat].forEach(function (x) { x.clear(); });
      var errs = [];
      var titre = f.titre.input.value.trim(), desc = f.desc.input.value.trim();
      var prix = f.prix.input.value.trim().replace(',', '.');
      if (!titre) errs.push({ field: f.titre, msg: 'Indiquez un titre.' });
      if (!desc) errs.push({ field: f.desc, msg: 'Ajoutez une description.' });
      var p = Number(prix);
      if (!don.checked && (!prix || !isFinite(p) || p <= 0 || p > 9999)) errs.push({ field: f.prix, msg: 'Indiquez un prix (de 0,01 à 9 999 €) ou cochez « C’est un don ».' });
      if (!catSel.value) errs.push({ field: cat, msg: 'Choisissez une catégorie.' });
      if (errs.length) return showErrors(box, errs);
      box.hidden = true; btn.disabled = true; btn.textContent = 'Création…';
      var body = { titre: titre, description: desc, categorie: catSel.value };
      if (don.checked) body.don = true; else body.prix = p;
      api('POST', '/api/annonces', body).then(function (r) {
        btn.disabled = false; btn.textContent = "Créer l'annonce";
        if (r.ok) {
          purgeListCache();
          flash = 'Votre annonce est en ligne : elle apparaît en tête de la liste.';
          return go('#liste');
        }
        if (r.status === 401) { me = null; renderNav(); afterLogin = '#publier'; return go('#connexion'); }
        var list = fromServer(r.json.erreurs, { titre: f.titre, description: f.desc, prix: f.prix, categorie: cat });
        if (list.length) showErrors(box, list); else networkMessage(box, 'Publication impossible, réessayez.');
      }, function () {
        btn.disabled = false; btn.textContent = "Créer l'annonce";
        networkMessage(box, 'Vous êtes hors connexion : l’annonce n’a pas été publiée. Vos champs sont conservés, réessayez avec du réseau.');
      });
    });
    setView('Ajouter une annonce', [el('h1', { text: 'Ajouter une annonce' }), box, form]);
  }

  // ---- boîte de dialogue accessible (sans <dialog> : absent des anciens iOS) ----
  function confirmDialog(o) {
    var yes = el('button', { 'class': 'btn btn-primary', type: 'button', text: o.yes });
    var no = el('button', { 'class': 'btn', type: 'button', text: o.no });
    var dlg = el('div', { 'class': 'dialog', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'dlg-title', 'aria-describedby': 'dlg-desc', tabindex: '-1' }, [
      el('h2', { id: 'dlg-title', text: o.title }), el('p', { id: 'dlg-desc', text: o.text }),
      el('div', { 'class': 'dialog-actions' }, [yes, no])]);
    var overlay = el('div', { 'class': 'overlay' }, [dlg]);
    var behind = [].slice.call(document.querySelectorAll('body > .skip, body > header, body > main, body > footer'));
    behind.forEach(function (n) { n.setAttribute('aria-hidden', 'true'); });
    document.body.appendChild(overlay);
    function close(restore) {
      document.removeEventListener('keydown', onKey, true);
      document.body.removeChild(overlay);
      behind.forEach(function (n) { n.removeAttribute('aria-hidden'); });
      if (restore && o.origin) o.origin.focus();
    }
    function onKey(ev) {
      if (ev.key === 'Escape' || ev.key === 'Esc') { ev.preventDefault(); close(true); return; }
      if (ev.key !== 'Tab') return;
      var first = yes, last = no, a = document.activeElement;
      if (ev.shiftKey && (a === first || a === dlg)) { ev.preventDefault(); last.focus(); }
      else if (!ev.shiftKey && a === last) { ev.preventDefault(); first.focus(); }
      else if (a !== first && a !== last) { ev.preventDefault(); first.focus(); }
    }
    document.addEventListener('keydown', onKey, true);
    overlay.addEventListener('click', function (ev) { if (ev.target === overlay) close(true); });
    no.addEventListener('click', function () { close(true); });
    yes.addEventListener('click', function () { close(false); o.onYes(); });
    dlg.focus();
  }

  // ---- mes annonces et clôture (US5) ----
  function purgeListCache() {
    try { Object.keys(localStorage).forEach(function (k) { if (k.indexOf('rp:list:') === 0) localStorage.removeItem(k); }); } catch (e) { /* ignoré */ }
  }

  function renderMine() {
    var me2 = ++token;
    var status = el('p', { 'class': 'banner', role: 'status', tabindex: '-1', hidden: 'hidden' });
    var problem = el('p', { 'class': 'summary', role: 'alert', tabindex: '-1', hidden: 'hidden' });
    var box = el('div', {});
    setView('Mes annonces', [el('h1', { text: 'Mes annonces' }), status, problem, box]);

    function say(node, text) { node.textContent = text; node.hidden = false; node.focus(); }

    function row(a) {
      var onLine = a.statut === 'active';
      var meta = [priceNode(a.prix_cents),
        el('span', {}, [el('span', { 'class': 'sr-only', text: 'Catégorie : ' }), document.createTextNode(a.categorie)]),
        el('span', { text: relDate(a.created_at) }),
        el('span', { 'class': 'badge ' + (onLine ? 'badge-on' : 'badge-off'), text: onLine ? 'En ligne' : 'Clôturée' })];
      var kids = [el('h3', { text: a.titre }), el('span', { 'class': 'meta' }, meta)];
      if (onLine) {
        var b = el('button', { 'class': 'btn', type: 'button', text: 'Clôturer', 'aria-label': 'Clôturer l’annonce « ' + a.titre + ' »' });
        b.addEventListener('click', function () {
          confirmDialog({
            title: "L'échange a été effectué ?",
            text: 'L’annonce « ' + a.titre + ' » passera en statut « Clôturée » et disparaîtra de la liste publique.',
            yes: "Oui, clôturer l'annonce", no: 'Non, la garder en ligne', origin: b,
            onYes: function () {
              problem.hidden = true;
              api('POST', '/api/annonces/' + a.id + '/cloture', {}).then(function (r) {
                if (r.ok) {
                  purgeListCache();
                  a.statut = 'closed';
                  fill(box, [list(rowsData)]);
                  return say(status, 'Annonce clôturée — cache de la liste mis à jour.');
                }
                if (r.status === 401) { me = null; renderNav(); afterLogin = '#mes-annonces'; return go('#connexion'); }
                say(problem, r.status === 404 || r.status === 409
                  ? "Cette annonce n'existe plus ou est déjà clôturée. La liste est à jour après rechargement."
                  : 'Clôture impossible, réessayez.');
                b.focus();
              }, function () {
                say(problem, 'Vous êtes hors connexion : l’annonce n’a pas été clôturée.');
                b.focus();
              });
            }
          });
        });
        kids.push(b);
      }
      return el('li', {}, [el('div', { 'class': 'card mine' }, kids)]);
    }
    var rowsData = [];
    function list(items) { return el('ul', { 'class': 'cards' }, items.map(row)); }

    api('GET', '/api/mes-annonces').then(function (r) {
      if (me2 !== token) return;
      if (r.status === 401) { me = null; renderNav(); afterLogin = '#mes-annonces'; return go('#connexion'); }
      if (!r.ok) throw new Error('http');
      rowsData = r.json.items;
      if (!rowsData.length) {
        return fill(box, [el('div', { 'class': 'state' }, [el('p', { text: "Vous n'avez publié aucune annonce pour le moment." }),
          el('a', { 'class': 'btn', href: '#publier', text: 'Ajouter une annonce' })])]);
      }
      fill(box, [list(rowsData)]);
    }).catch(function (err) {
      if (me2 !== token) return;
      fill(box, [stateBox([err.message === 'http' ? 'Service indisponible, réessayez plus tard.'
        : 'Vous êtes hors connexion : vos annonces ne peuvent pas être affichées.'])]);
    });
  }

  // ---- impact environnemental : mesures CO2.js du serveur + transfert de la visite en cours ----
  function fmtNum(n, o) { return n.toLocaleString('fr-FR', o || { maximumFractionDigits: 1 }); }
  function fmtG(g) { return g == null ? '—' : fmtNum(g, { maximumSignificantDigits: 3 }) + ' g CO2e'; }
  function fmtKo(o) { return fmtNum(o / 1024) + ' Ko'; }

  // Transfert de la visite en cours, d'après le navigateur. `available: false` quand il ne renseigne pas
  // transferSize (anciens navigateurs) : on n'affiche alors aucune valeur plutôt qu'un « 0 » trompeur.
  function thisVisit() {
    if (!window.performance || !performance.getEntriesByType) return null;
    var all = performance.getEntriesByType('navigation').concat(performance.getEntriesByType('resource'));
    if (!all.length) return null;
    var bytes = 0;
    var numeric = all.every(function (e) { return typeof e.transferSize === 'number'; });
    var informative = all.some(function (e) { return e.transferSize > 0 || e.encodedBodySize > 0; });
    all.forEach(function (e) { bytes += e.transferSize || 0; });
    return { requests: all.length, bytes: bytes, available: numeric && informative };
  }

  // Budget de performance (brief, règle la plus stricte) comparé aux mesures réelles de l'équipe.
  // À mettre à jour à chaque revue d'écoconception (docs/REVUE-ECOCONCEPTION.md).
  var PERF_BUDGET = [
    { critere: 'Poids par page', objectif: 'Moins de 500 Ko', reel: '≈ 17 Ko', statut: 'Respecté' },
    { critere: 'Requêtes par page', objectif: 'Moins de 15', reel: '6', statut: 'Respecté' },
    { critere: 'Temps d’affichage', objectif: 'Moins de 3 s en 3G', reel: 'Entre 1,5 et 2 s', statut: 'Respecté' },
    { critere: 'EcoIndex', objectif: 'A ou B', reel: 'A (92,98/100)', statut: 'Respecté' },
    { critere: 'Score RGESN', objectif: '—', reel: '89 %', statut: 'Mesuré' }
  ];

  function budgetSection() {
    var rows = PERF_BUDGET.map(function (r) {
      var ok = r.statut === 'Respecté';
      return el('tr', {}, [
        el('th', { scope: 'row', text: r.critere }),
        el('td', { text: r.objectif }),
        el('td', { text: r.reel }),
        el('td', { 'class': ok ? 'status ok' : 'status' }, [ok ? el('span', { 'aria-hidden': 'true', text: '✓ ' }) : null, document.createTextNode(r.statut)])
      ]);
    });
    return el('section', { 'aria-labelledby': 'h2-budget' }, [
      el('h2', { id: 'h2-budget', text: 'Budget de performance : objectif et réel' }),
      el('div', { 'class': 'table-wrap', role: 'region', 'aria-label': 'Comparaison du budget de performance et des mesures réelles', tabindex: '0' }, [
        el('table', { 'class': 'compare' }, [
          el('caption', { 'class': 'sr-only', text: 'Objectifs du budget de performance et valeurs réelles mesurées' }),
          el('thead', {}, [el('tr', {}, ['Critère', 'Objectif', 'Réel', 'Statut'].map(function (t) { return el('th', { scope: 'col', text: t }); }))]),
          el('tbody', {}, rows)])]),
      el('p', { 'class': 'note', text: 'Valeurs relevées par l’équipe : poids de la première visite avec npm run budget, requêtes et temps d’affichage en 3G avec les outils du navigateur, EcoIndex sur ecoindex.fr, score RGESN par auto-évaluation du référentiel.' })
    ]);
  }

  function renderImpact() {
    var me3 = ++token;
    var box = el('div', {});
    setView('Impact environnemental', [el('h1', { text: 'Impact environnemental' }),
      el('p', { 'class': 'lead', text: 'Ce que coûte l’utilisation de Repasse en émissions de CO2, calculé avec la bibliothèque CO2.js (modèle Sustainable Web Design).' }), box]);

    var v = thisVisit();
    var mine = v ? el('section', { 'aria-labelledby': 'h2-vis' }, [
      el('h2', { id: 'h2-vis', text: 'Votre visite en cours' }),
      el('p', { text: !v.available ? 'Votre navigateur ne fournit pas cette mesure.'
        : v.bytes ? v.requests + ' requêtes, ' + fmtKo(v.bytes) + ' transférés depuis l’ouverture de la page (mesure de votre navigateur).'
        : 'Rien n’a été transféré : tout vient du cache de votre appareil.' })]) : null;
    var budget = budgetSection();
    fill(box, [mine, budget, el('p', { 'class': 'note', text: 'Chargement des mesures du serveur…' })]);

    api('GET', '/api/impact?jours=7').then(function (r) {
      if (me3 !== token) return;
      if (!r.ok) throw new Error('http');
      var d = r.json;
      var kids = [mine, budget];
      if (!d.visites) {
        kids.push(el('p', { 'class': 'note', text: 'Pas encore de visite mesurée.' }));
      } else {
        kids.push(el('section', { 'aria-labelledby': 'h2-all' }, [
          el('h2', { id: 'h2-all', text: 'Toutes les visites (mesure du serveur)' }),
          el('dl', {}, [
            el('div', {}, [el('dt', { text: 'Coût moyen d’une visite' }), el('dd', { text: fmtG(d.co2_g_par_visite) + ' (' + fmtKo(d.octets_par_visite) + ')' })]),
            el('div', {}, [el('dt', { text: 'Visites mesurées' }), el('dd', { text: fmtNum(d.visites, { maximumFractionDigits: 0 }) })]),
            el('div', {}, [el('dt', { text: 'Total émis' }), el('dd', { text: fmtG(d.co2_g) })]),
            el('div', {}, [el('dt', { text: 'Hébergement' }), el('dd', { text: d.hebergement_vert ? 'Déclaré vert' : 'Non déclaré vert' })])
          ])]));
        var rows = d.jours.map(function (j) {
          return el('tr', {}, [el('th', { scope: 'row', text: j.jour }), el('td', { text: fmtNum(j.visites, { maximumFractionDigits: 0 }) }),
            el('td', { text: fmtKo(j.octets) }), el('td', { text: fmtG(j.co2_g) }), el('td', { text: fmtG(j.co2_g_par_visite) })]);
        });
        kids.push(el('section', { 'aria-labelledby': 'h2-days' }, [
          el('h2', { id: 'h2-days', text: 'Derniers jours' }),
          el('div', { 'class': 'table-wrap', role: 'region', 'aria-label': 'Visites, transfert et émissions par jour', tabindex: '0' }, [el('table', {}, [
            el('caption', { 'class': 'sr-only', text: 'Visites, transfert et émissions par jour' }),
            el('thead', {}, [el('tr', {}, ['Jour', 'Visites', 'Transfert', 'Total', 'Par visite'].map(function (t) { return el('th', { scope: 'col', text: t }); }))]),
            el('tbody', {}, rows)])])]));
      }
      kids.push(el('p', { 'class': 'note', text: 'Estimations d’un modèle, pas une mesure d’énergie. Les fichiers servis depuis le cache de l’appareil ne sont pas comptés : c’est justement l’économie recherchée. Objectifs : moins de 500 Ko et 15 requêtes par page.' }));
      fill(box, kids);
    }).catch(function (err) {
      if (me3 !== token) return;
      fill(box, [mine, budget, stateBox([err.message === 'http' ? 'Mesures indisponibles pour le moment.' : 'Vous êtes hors connexion : les mesures du serveur ne peuvent pas être affichées.'])]);
    });
  }

  // ---- routage par ancre ----
  var previous = null;
  function route() {
    var h = location.hash;
    var parts = h.split('?');
    var m;
    renderNav();
    if (parts[0] === '#impact') {
      previous = null;
      return renderImpact();
    }
    if (parts[0] === '#connexion' || parts[0] === '#inscription') {
      previous = null;
      return meP.then(parts[0] === '#connexion' ? renderLogin : renderRegister);
    }
    if (parts[0] === '#mes-annonces') {
      previous = null;
      return meP.then(function () {
        if (!me) { afterLogin = '#mes-annonces'; return go('#connexion'); }
        renderMine();
      });
    }
    if (parts[0] === '#publier') {
      previous = null;
      return meP.then(function () {
        if (!me) { afterLogin = '#publier'; return go('#connexion'); }
        renderPublish();
      });
    }
    if ((m = /^#annonce-(\d+)$/.exec(parts[0]))) {
      previous = null;
      renderDetail(m[1], parseState(parts[1]));
      return;
    }
    var st = (m = /^#page-(\d+)$/.exec(parts[0])) ? { cat: '', tri: 'recent', page: parseInt(m[1], 10) || 1 }
      : parseState(parts[0] === '#liste' ? parts[1] : '');
    // Changer de filtre ou de tri garde le focus sur le champ ; changer de page le ramène au titre.
    var keepFocus = !!previous && !!document.getElementById('filtres') && (previous.cat !== st.cat || previous.tri !== st.tri);
    previous = st;
    renderList(st, keepFocus);
  }
  window.addEventListener('hashchange', route);
  route();

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () { navigator.serviceWorker.register('/sw.js').catch(function () {}); });
  }
})();
