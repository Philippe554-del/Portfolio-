// ============================================================
//  client-tracker.js — À inclure dans TOUTES les pages
//  de ton site public (portfolio)
//  <script src="/client-tracker.js"></script>
// ============================================================

(function () {
  'use strict';

  const API = '/api/tracker'; // adapte si ton API est sur un autre domaine
  const page = window.location.pathname;
  const referrer = document.referrer;
  let tempsDepart = Date.now();
  let envoyé = false;

  // ── 1. Enregistrer la visite dès l'arrivée ────────────────
  function enregistrerVisite() {
    fetch(API + '/visite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ page, referrer }),
      keepalive: true
    }).catch(() => {});
  }

  // ── 2. Envoyer la durée au départ ─────────────────────────
  function enregistrerDuree() {
    if (envoyé) return;
    envoyé = true;
    const duree = Math.round((Date.now() - tempsDepart) / 1000);
    if (duree < 1) return;
    navigator.sendBeacon(API + '/duree',
      new Blob([JSON.stringify({ page, duree_sec: duree })],
               { type: 'application/json' })
    );
  }

  // ── 3. Tracker les clics sur éléments importants ──────────
  function trackerClics() {
    document.addEventListener('click', function (e) {
      const el = e.target.closest('[data-track]');
      if (!el) return;

      const typeAction = el.dataset.track;          // ex: "clic_projet"
      const cible      = el.dataset.trackCible || el.textContent?.trim().slice(0, 80) || '';

      fetch(API + '/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type_action: typeAction, cible, page }),
        keepalive: true
      }).catch(() => {});
    });
  }

  // ── 4. Tracker le scroll jusqu'en bas ─────────────────────
  function trackerScroll() {
    let scrollEnvoye = false;
    window.addEventListener('scroll', function () {
      if (scrollEnvoye) return;
      const pos = window.scrollY + window.innerHeight;
      const total = document.body.scrollHeight;
      if (pos / total > 0.85) {
        scrollEnvoye = true;
        fetch(API + '/action', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type_action: 'scroll_bas', cible: '85%', page }),
          keepalive: true
        }).catch(() => {});
      }
    }, { passive: true });
  }

  // ── 5. Événements de sortie ───────────────────────────────
  window.addEventListener('pagehide',         enregistrerDuree);
  window.addEventListener('beforeunload',     enregistrerDuree);
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') enregistrerDuree();
  });

  // ── Init ──────────────────────────────────────────────────
  enregistrerVisite();
  trackerClics();
  trackerScroll();

})();

// ============================================================
//  COMMENT UTILISER data-track dans ton HTML :
//
//  <a href="/projets/mon-projet" data-track="clic_projet" data-track-cible="Mon Projet">
//    Voir le projet
//  </a>
//
//  <button data-track="clic_contact">Me contacter</button>
//
//  <a href="https://github.com/..." data-track="clic_github" data-track-cible="GitHub">
//    GitHub
//  </a>
//
//  <a href="/cv.pdf" data-track="telechargement_cv">Télécharger CV</a>
// ============================================================