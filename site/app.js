(function () {
  'use strict';

  var TTL = 5 * 60 * 1000;
  var vue = document.getElementById('vue');
  var lastPage = 1;

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

  function show(title, nodes) {
    document.title = title + ' — Repasse';
    vue.textContent = '';
    nodes.forEach(function (n) { vue.appendChild(n); });
    var h1 = vue.querySelector('h1');
    if (h1) { h1.setAttribute('tabindex', '-1'); h1.focus(); }
    window.scrollTo(0, 0);
  }

  function stateBox(h1Text, lines, action) {
    var box = el('div', { 'class': 'state', role: 'alert' }, lines.map(function (t) { return el('p', { text: t }); }));
    if (action) box.appendChild(action);
    return [el('h1', { text: h1Text }), box];
  }

  // ---- cache navigateur (localStorage, 5 min) ----
  function readCache(page) {
    try { return JSON.parse(localStorage.getItem('rp:list:' + page)); } catch (e) { return null; }
  }
  function writeCache(page, data) {
    try { localStorage.setItem('rp:list:' + page, JSON.stringify({ t: Date.now(), data: data })); } catch (e) { /* quota ou mode privé */ }
  }

  function getList(page) {
    var hit = readCache(page);
    if (hit && Date.now() - hit.t < TTL) return Promise.resolve({ data: hit.data, source: 'cache' });
    return fetch('/api/annonces?page=' + page).then(function (res) {
      if (!res.ok) throw new Error('http');
      return res.json();
    }).then(function (data) {
      writeCache(page, data);
      return { data: data, source: 'reseau' };
    }, function (err) {
      if (err.message === 'http') throw err;
      if (hit) return { data: hit.data, source: 'hors-ligne' };
      throw new Error('offline');
    });
  }

  // ---- écran liste ----
  function pagerLink(label, hidden, page, current) {
    var a = el('a', { 'class': 'btn', href: '#page-' + page }, [document.createTextNode(label)]);
    if (hidden) a.appendChild(el('span', { 'class': 'sr-only', text: hidden }));
    if (current) { a.setAttribute('aria-current', 'page'); a.setAttribute('aria-label', 'Page ' + page); }
    return a;
  }

  function pager(data) {
    var items = [];
    var prev = data.page > 1 ? pagerLink('‹ Précédent', ' : page précédente', data.page - 1)
      : el('span', { 'class': 'btn', 'aria-disabled': 'true', text: '‹ Précédent' });
    items.push(prev);
    for (var i = 1; i <= data.pages; i++) {
      var a = pagerLink(String(i), '', i, i === data.page);
      if (i !== data.page) a.setAttribute('aria-label', 'Page ' + i);
      items.push(a);
    }
    items.push(data.page < data.pages ? pagerLink('Suivant ›', ' : page suivante', data.page + 1)
      : el('span', { 'class': 'btn', 'aria-disabled': 'true', text: 'Suivant ›' }));
    return el('nav', { 'class': 'pager', 'aria-label': 'Pagination des annonces' },
      [el('ul', {}, items.map(function (n) { return el('li', {}, [n]); }))]);
  }

  var NOTES = {
    reseau: 'Liste chargée depuis le réseau.',
    cache: 'Liste chargée depuis le cache — aucune nouvelle requête.',
    'hors-ligne': 'Hors connexion — dernière liste enregistrée.'
  };

  function renderList(page) {
    lastPage = page;
    getList(page).then(function (r) {
      var d = r.data;
      lastPage = d.page;
      if (!d.total) {
        show('Annonces', stateBox('Annonces du lycée', ['Aucune annonce en ligne pour le moment.', 'Revenez plus tard.']));
        return;
      }
      var cards = d.items.map(function (a) {
        return el('li', {}, [el('a', { 'class': 'card', href: '#annonce-' + a.id }, [
          el('h3', { text: a.titre }),
          el('span', { 'class': 'meta' }, [
            priceNode(a.prix_cents),
            el('span', {}, [el('span', { 'class': 'sr-only', text: 'Catégorie : ' }), document.createTextNode(a.categorie)]),
            el('span', { text: relDate(a.created_at) })
          ])
        ])]);
      });
      var count = d.total + (d.total > 1 ? ' annonces' : ' annonce') + ' · page ' + d.page + ' sur ' + d.pages;
      show(d.page > 1 ? 'Annonces, page ' + d.page : 'Annonces', [
        el('h1', { text: 'Annonces du lycée' }),
        el('p', { 'class': 'lead', text: 'Matériel donné ou vendu entre élèves. Consultation libre, sans compte.' }),
        el('h2', { role: 'status', text: count }),
        el('ul', { 'class': 'cards' }, cards),
        d.pages > 1 ? pager(d) : null,
        el('p', { 'class': 'note', text: NOTES[r.source] })
      ]);
    }).catch(function (err) {
      var offline = err.message === 'offline';
      show('Annonces', stateBox('Annonces du lycée', [offline
        ? "Vous êtes hors connexion et la liste n'a jamais été chargée."
        : 'Service indisponible, réessayez plus tard.'],
      el('button', { 'class': 'btn', type: 'button', text: 'Réessayer' })));
      vue.querySelector('button').addEventListener('click', route);
    });
  }

  // ---- écran détail ----
  function backLink() {
    return el('p', {}, [el('a', { 'class': 'back', href: '#page-' + lastPage }, [document.createTextNode('← Retour aux annonces')])]);
  }

  function renderDetail(id) {
    fetch('/api/annonces/' + id).then(function (res) {
      if (res.status === 404) return null;
      if (!res.ok) throw new Error('http');
      return res.json();
    }).then(function (a) {
      if (!a) {
        var nodes = stateBox('Annonce introuvable', ["Cette annonce n'existe plus ou a été clôturée."]);
        nodes.unshift(backLink());
        show('Annonce introuvable', nodes);
        return;
      }
      show(a.titre, [
        backLink(),
        el('article', {}, [
          el('h1', { text: a.titre }),
          el('dl', {}, [
            el('div', {}, [el('dt', { text: 'Prix' }), el('dd', {}, [priceNode(a.prix_cents)])]),
            el('div', {}, [el('dt', { text: 'Catégorie' }), el('dd', { text: a.categorie })]),
            el('div', {}, [el('dt', { text: 'Publiée' }), el('dd', { text: relDate(a.created_at) })]),
            el('div', {}, [el('dt', { text: 'Proposée par' }), el('dd', { text: a.vendeur })])
          ]),
          el('h2', { text: 'Description' }),
          el('p', { 'class': 'desc', text: a.description })
        ])
      ]);
    }).catch(function (err) {
      var offline = !(err && err.message === 'http');
      show('Annonce', stateBox('Annonce indisponible', [offline
        ? 'Vous êtes hors connexion. Cette annonce n’a pas été enregistrée sur votre appareil.'
        : 'Service indisponible, réessayez plus tard.']));
      vue.insertBefore(backLink(), vue.firstChild);
    });
  }

  // ---- routage par ancre ----
  function route() {
    var h = location.hash;
    var m;
    if ((m = /^#annonce-(\d+)$/.exec(h))) renderDetail(m[1]);
    else if ((m = /^#page-(\d+)$/.exec(h))) renderList(Math.max(1, parseInt(m[1], 10)));
    else renderList(1);
  }
  window.addEventListener('hashchange', route);
  route();

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () { navigator.serviceWorker.register('/sw.js').catch(function () {}); });
  }
})();
