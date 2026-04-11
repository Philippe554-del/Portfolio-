(function () {
  'use strict';

  const API = 'https://portfolio-backend-uaf9.onrender.com/api/tracker';
  const page = window.location.pathname;
  const referrer = document.referrer;
  let tempsDepart = Date.now();
  let envoyé = false;

  function enregistrerVisite() {
    fetch(API + '/visite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ page, referrer }),
      keepalive: true
    }).catch(() => {});
  }

  function enregistrerDuree() {
    if (envoyé) return;
    envoyé = true;
    const duree = Math.round((Date.now() - tempsDepart) / 1000);
    if (duree < 1) return;
    navigator.sendBeacon(API + '/duree',
      new Blob([JSON.stringify({ page, duree_sec: duree })], { type: 'application/json' })
    );
  }

  function trackerClics() {
    document.addEventListener('click', function (e) {
      const el = e.target.closest('[data-track]');
      if (!el) return;
      const typeAction = el.dataset.track;
      const cible = el.dataset.trackCible || el.textContent?.trim().slice(0, 80) || '';
      fetch(API + '/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type_action: typeAction, cible, page }),
        keepalive: true
      }).catch(() => {});
    });
  }

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

  window.addEventListener('pagehide', enregistrerDuree);
  window.addEventListener('beforeunload', enregistrerDuree);
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') enregistrerDuree();
  });

  enregistrerVisite();
  trackerClics();
  trackerScroll();

})();