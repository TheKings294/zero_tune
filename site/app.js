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
    nodes.forEach(function (n) { vue.appendChild(n); });
    var h1 = vue.querySelector('h1');
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
    var shell = document.getElementById('filtres');
    if (!shell) {
      setView(st.cat ? 'Annonces — ' + st.cat : 'Annonces', [
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

  // ---- routage par ancre ----
  var previous = null;
  function route() {
    var h = location.hash;
    var parts = h.split('?');
    var m;
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
