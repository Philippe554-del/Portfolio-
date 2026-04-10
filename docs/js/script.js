(function () {
  'use strict';

  /* Empêcher clic-droit sur images */
  document.addEventListener('dragstart', function (e) { e.preventDefault(); });
  document.addEventListener('contextmenu', function (e) {
    if (e.target.tagName === 'IMG') e.preventDefault();
  });

  /* URL API selon environnement */
  var API = (function () {
    var h = window.location.hostname;
    return (h === 'localhost' || h === '127.0.0.1')
      ? 'http://localhost:3000'
      : 'https://portfolio-backend-uaf9.onrender.com';
  })();

  /* ═══════════════════════════════════════
     CURSEUR PERSONNALISÉ
  ═══════════════════════════════════════ */
  (function () {
    if (window.matchMedia('(pointer: coarse)').matches) return;
    var dot   = document.getElementById('curseur-perso');
    var ring  = document.getElementById('curseur-anneau');
    if (!dot || !ring) return;

    var mx = 0, my = 0;
    var rx = 0, ry = 0;

    window.addEventListener('mousemove', function (e) {
      mx = e.clientX; my = e.clientY;
      dot.style.left = mx + 'px';
      dot.style.top  = my + 'px';
    });

    function smoothRing() {
      rx += (mx - rx) * 0.12;
      ry += (my - ry) * 0.12;
      ring.style.left = rx + 'px';
      ring.style.top  = ry + 'px';
      requestAnimationFrame(smoothRing);
    }
    smoothRing();

    /* Effets survol */
    document.querySelectorAll('a, button, .projet-card, .competence-card, .coordonnee-item').forEach(function (el) {
      el.addEventListener('mouseenter', function () {
        ring.style.width  = '52px';
        ring.style.height = '52px';
        ring.style.borderColor = 'rgba(255,107,53,0.8)';
      });
      el.addEventListener('mouseleave', function () {
        ring.style.width  = '32px';
        ring.style.height = '32px';
        ring.style.borderColor = 'rgba(255,107,53,0.5)';
      });
    });
  })();

  /* ═══════════════════════════════════════
     CANVAS PARTICULES
  ═══════════════════════════════════════ */
  (function () {
    var canvas = document.getElementById('particules-bg');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var W, H;
    var COUNT = window.innerWidth < 768 ? 25 : 55;
    var DIST_MAX = 120;
    var COULEURS = ['rgba(255,107,53,', 'rgba(0,217,255,', 'rgba(168,85,247,'];
    var pts = [];
    var souris = { x: null, y: null };
    var raf;

    function resize() {
      W = canvas.width  = window.innerWidth;
      H = canvas.height = window.innerHeight;
    }

    function Point() {
      this.x  = Math.random() * W;
      this.y  = Math.random() * H;
      this.vx = (Math.random() - 0.5) * 0.32;
      this.vy = (Math.random() - 0.5) * 0.32;
      this.r  = Math.random() * 1.3 + 0.3;
      this.c  = COULEURS[Math.floor(Math.random() * COULEURS.length)];
    }

    function init() {
      pts = [];
      for (var i = 0; i < COUNT; i++) pts.push(new Point());
    }

    function draw() {
      ctx.clearRect(0, 0, W, H);

      for (var i = 0; i < pts.length; i++) {
        for (var j = i + 1; j < pts.length; j++) {
          var dx = pts[i].x - pts[j].x;
          var dy = pts[i].y - pts[j].y;
          var d = Math.sqrt(dx*dx + dy*dy);
          if (d < DIST_MAX) {
            ctx.beginPath();
            ctx.strokeStyle = pts[i].c + ((1 - d/DIST_MAX) * 0.18) + ')';
            ctx.lineWidth = 0.5;
            ctx.moveTo(pts[i].x, pts[i].y);
            ctx.lineTo(pts[j].x, pts[j].y);
            ctx.stroke();
          }
        }
        if (souris.x !== null) {
          var mx2 = pts[i].x - souris.x;
          var my2 = pts[i].y - souris.y;
          var md = Math.sqrt(mx2*mx2 + my2*my2);
          if (md < 150) {
            ctx.beginPath();
            ctx.strokeStyle = 'rgba(255,107,53,' + ((1 - md/150) * 0.3) + ')';
            ctx.lineWidth = 0.6;
            ctx.moveTo(pts[i].x, pts[i].y);
            ctx.lineTo(souris.x, souris.y);
            ctx.stroke();
          }
        }
      }

      for (var k = 0; k < pts.length; k++) {
        var p = pts[k];
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI*2);
        ctx.fillStyle = p.c + '0.6)';
        ctx.fill();
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > W) p.vx *= -1;
        if (p.y < 0 || p.y > H) p.vy *= -1;
      }

      raf = requestAnimationFrame(draw);
    }

    resize(); init(); draw();

    window.addEventListener('resize', function () {
      cancelAnimationFrame(raf);
      COUNT = window.innerWidth < 768 ? 25 : 55;
      resize(); init(); draw();
    });
    window.addEventListener('mousemove', function (e) {
      souris.x = e.clientX; souris.y = e.clientY;
    });
    window.addEventListener('mouseleave', function () { souris.x = null; souris.y = null; });
  })();

  /* ═══════════════════════════════════════
     TYPEWRITER
  ═══════════════════════════════════════ */
  (function () {
    var el = document.getElementById('tw-texte');
    if (!el) return;

    var phrases = [
      'Développeur Web Full-Stack',
      'Administrateur Réseau',
      'Builder Béninois 🇧🇯',
      'Étudiant ENEAM L2',
      'Problem Solver'
    ];

    var pi = 0, ci = 0, efface = false, pause = 0;

    function tick() {
      var phrase = phrases[pi];
      if (!efface) {
        el.textContent = phrase.slice(0, ci + 1);
        ci++;
        if (ci === phrase.length) { efface = true; pause = 60; }
      } else {
        if (pause > 0) { pause--; setTimeout(tick, 35); return; }
        el.textContent = phrase.slice(0, ci - 1);
        ci--;
        if (ci === 0) { efface = false; pi = (pi + 1) % phrases.length; }
      }
      setTimeout(tick, efface ? 40 : 75);
    }
    setTimeout(tick, 1400);
  })();

  /* ═══════════════════════════════════════
     DOM READY
  ═══════════════════════════════════════ */
  document.addEventListener('DOMContentLoaded', function () {

    var siteNav    = document.getElementById('site-nav');
    var burgerBtn  = document.querySelector('.burger-btn');
    var listeNav   = document.querySelector('.liste-nav');
    var btnTop     = document.getElementById('btn-top');
    var tousLiens  = document.querySelectorAll('.liste-nav a');
    var formContact = document.getElementById('form-contact');

    /* ── Burger ── */
    if (burgerBtn) {
      burgerBtn.addEventListener('click', function (e) {
        e.preventDefault();
        burgerBtn.classList.toggle('ouvert');
        listeNav.classList.toggle('ouvert');
      });
    }
    tousLiens.forEach(function (a) {
      a.addEventListener('click', function () {
        burgerBtn && burgerBtn.classList.remove('ouvert');
        listeNav  && listeNav.classList.remove('ouvert');
      });
    });
    window.addEventListener('resize', function () {
      if (window.innerWidth > 768) {
        burgerBtn && burgerBtn.classList.remove('ouvert');
        listeNav  && listeNav.classList.remove('ouvert');
      }
    });

    /* Fermer menu en cliquant à l'extérieur */
    document.addEventListener('click', function (e) {
      if (listeNav && listeNav.classList.contains('ouvert')) {
        if (!listeNav.contains(e.target) && !burgerBtn.contains(e.target)) {
          burgerBtn.classList.remove('ouvert');
          listeNav.classList.remove('ouvert');
        }
      }
    });

    /* ── Smooth scroll ── */
    document.addEventListener('click', function (e) {
      var lien = e.target.closest('a[href^="#"]');
      if (!lien) return;
      var cible = lien.getAttribute('href');
      if (!cible || cible === '#') return;
      var el = document.getElementById(cible.slice(1));
      if (!el) return;
      e.preventDefault();
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    /* ── Scroll events ── */
    window.addEventListener('scroll', function () {
      var pos = window.pageYOffset;
      if (siteNav)  siteNav.classList.toggle('scrolled', pos > 80);
      if (btnTop)   btnTop.classList.toggle('visible', pos > 400);
    }, { passive: true });

    if (btnTop) {
      btnTop.addEventListener('click', function () {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }

    /* ── Scroll indicateur ── */
    var scrollInd = document.getElementById('scroll-indicateur');
    if (scrollInd) {
      scrollInd.addEventListener('click', function () {
        var cible = document.getElementById('a-propos');
        if (cible) cible.scrollIntoView({ behavior: 'smooth' });
      });
    }

    /* ── Lien actif navigation ── */
    var sections = document.querySelectorAll('section[id]');
    function majNavActive() {
      var pos = window.pageYOffset;
      sections.forEach(function (section) {
        var debut = section.offsetTop - 140;
        var id    = section.getAttribute('id');
        var lien  = document.querySelector('.liste-nav a[href="#' + id + '"]');
        if (pos >= debut && pos < debut + section.offsetHeight) {
          tousLiens.forEach(function (l) { l.classList.remove('actif'); });
          if (lien) lien.classList.add('actif');
        }
      });
    }
    window.addEventListener('scroll', majNavActive, { passive: true });
    majNavActive();

    /* ── Reveal au scroll (IntersectionObserver) ── */
    if (window.IntersectionObserver) {
      /* Éléments reveal-item */
      var obsReveal = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) {
            e.target.classList.add('visible');
            obsReveal.unobserve(e.target);
          }
        });
      }, { threshold: 0.07, rootMargin: '0px 0px -40px 0px' });

      document.querySelectorAll('.reveal-item, .timeline-etape, .valeur-item, .coordonnee-item, .stat-item').forEach(function (el) {
        obsReveal.observe(el);
      });

      /* Barres de compétences */
      var obsBarres = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (!e.isIntersecting) return;
          e.target.querySelectorAll('.competence-remplissage').forEach(function (barre) {
            barre.classList.add('anime');
          });
          obsBarres.unobserve(e.target);
        });
      }, { threshold: 0.4 });

      document.querySelectorAll('.competence-card').forEach(function (card) {
        obsBarres.observe(card);
      });

      /* Compteur stats */
      var obsStats = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (!e.isIntersecting) return;
          var el = e.target.querySelector('.stat-gros-nb, .stat-nb, .chiffre-nb');
          if (!el || e.target.dataset.compte) return;
          var val = parseInt((el.textContent || '').replace(/\D/g, ''), 10);
          if (isNaN(val) || val <= 0) return;
          e.target.dataset.compte = '1';
          var c = 0, inc = val / 30;
          var iv = setInterval(function () {
            c += inc;
            if (c >= val) { c = val; clearInterval(iv); }
            el.textContent = Math.floor(c) + '+';
          }, 35);
        });
      }, { threshold: 0.5 });

      document.querySelectorAll('.stat-item, .chiffre-bloc').forEach(function (s) {
        obsStats.observe(s);
      });
    }

    /* ── Micro-interaction bouton CV télécharger ── */
    var btnCV = document.querySelector('.cv-dl-btn');
    if (btnCV) {
      btnCV.addEventListener('click', function () {
        afficherNotif('Téléchargement du CV en cours…', 'info');
      });
    }
    var btnVoirCV = document.querySelector('.btn-secondaire[href*="cv"]');
    if (btnVoirCV) {
      btnVoirCV.addEventListener('click', function (e) {
        e.preventDefault();
        window.open(btnVoirCV.getAttribute('href'), '_blank', 'noopener,noreferrer');
      });
    }

    /* ── Titre h1 glitch sur survol ── */
    var nomH1 = document.querySelector('.nom-gradient');
    if (nomH1) {
      nomH1.setAttribute('data-glitch', nomH1.textContent);
    }

    /* ═══════════════════════════════════════
       NOTIFICATIONS
    ═══════════════════════════════════════ */
    function afficherNotif(msg, type) {
      if (['succes','erreur','info'].indexOf(type) < 0) type = 'info';
      var div = document.createElement('div');
      div.className = 'notif notif-' + type;
      var ic = { succes: 'fa-check-circle', erreur: 'fa-exclamation-circle', info: 'fa-info-circle' }[type];
      div.innerHTML = '<i class="fas ' + ic + '"></i><span>' + String(msg).slice(0, 200) + '</span>';
      document.body.appendChild(div);
      setTimeout(function () { div.classList.add('visible'); }, 10);
      setTimeout(function () {
        div.classList.remove('visible');
        setTimeout(function () { if (div.parentNode) div.parentNode.removeChild(div); }, 400);
      }, 5000);
    }

    /* ═══════════════════════════════════════
       FORMULAIRE CONTACT
    ═══════════════════════════════════════ */
    function nettoyer(v, max) { return String(v || '').trim().slice(0, max || 2000); }
    function emailValide(e) { return /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/.test(e) && e.length <= 254; }
    function setErr(id, msg) { var el = document.getElementById(id); if (el) el.textContent = msg; }
    function clearErrs() {
      ['erreur-nom','erreur-email','erreur-telephone','erreur-message'].forEach(function (id) {
        var el = document.getElementById(id); if (el) el.textContent = '';
      });
    }

    function lireLimite() { try { return JSON.parse(sessionStorage.getItem('_ce') || '{}'); } catch(e) { return {}; } }
    function sauverLimite(d) { try { sessionStorage.setItem('_ce', JSON.stringify(d)); } catch(e) {} }
    function limiteOk() {
      var d = lireLimite(), now = Date.now();
      if (now < (d.bloque || 0)) {
        afficherNotif('Trop de tentatives. Réessayez dans ' + Math.ceil(((d.bloque||0)-now)/1000) + 's.', 'erreur');
        return false;
      }
      if (now - (d.debut || 0) > 600000) { sauverLimite({ nb: 0, debut: now }); return true; }
      if ((d.nb || 0) >= 3) {
        sauverLimite({ nb: d.nb, debut: d.debut, bloque: now + 120000 });
        afficherNotif('Limite atteinte. Réessayez dans 2 minutes.', 'erreur');
        return false;
      }
      return true;
    }
    function incrementLimite() {
      var d = lireLimite(), now = Date.now();
      sauverLimite({ nb: (d.nb||0)+1, debut: d.debut||now, bloque: d.bloque||0 });
    }

    if (formContact) {
      formContact.addEventListener('submit', function (e) {
        e.preventDefault();
        clearErrs();
        var piege = document.getElementById('champ-piege');
        if (piege && piege.value) return;
        if (!limiteOk()) return;

        var nom     = nettoyer(document.getElementById('nom').value, 100);
        var email   = nettoyer(document.getElementById('email').value, 254);
        var tel     = nettoyer(document.getElementById('telephone').value, 20);
        var message = nettoyer(document.getElementById('message').value, 2000);

        var err = false;
        if (nom.length < 2)      { setErr('erreur-nom',     'Nom trop court.'); err = true; }
        if (!emailValide(email)) { setErr('erreur-email',   'Email invalide.'); err = true; }
        if (tel && !/^\+?[0-9]{8,20}$/.test(tel)) { setErr('erreur-telephone', 'Numéro invalide.'); err = true; }
        if (message.length < 10) { setErr('erreur-message', 'Message trop court (min 10 caractères).'); err = true; }
        if (err) return;

        var btn = formContact.querySelector('.btn-envoyer');
        var origHTML = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> <span>Envoi...</span>';

        fetch(API + '/api/contact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: nom, email: email, phone: tel, message: message })
        })
        .then(function (r) { return r.json().then(function (d) { return { status: r.status, data: d }; }); })
        .then(function (res) {
          if (res.status === 200 && res.data.success) {
            incrementLimite();
            afficherNotif('Message envoyé ! Je vous répondrai sous 24h 🙌', 'succes');
            formContact.reset();
            btn.innerHTML = '<i class="fas fa-check"></i> <span>Envoyé !</span>';
            btn.style.background = 'linear-gradient(135deg, #10B981, #059669)';
            setTimeout(function () { btn.disabled = false; btn.innerHTML = origHTML; btn.style.background = ''; }, 3000);
          } else {
            afficherNotif(String(res.data.error || "Erreur lors de l'envoi.").slice(0, 200), 'erreur');
            btn.disabled = false; btn.innerHTML = origHTML;
          }
        })
        .catch(function () {
          afficherNotif('Erreur réseau. Vérifiez votre connexion.', 'erreur');
          btn.disabled = false; btn.innerHTML = origHTML;
        });
      });

      /* Validation en temps réel */
      var champEmail = document.getElementById('email');
      if (champEmail) {
        champEmail.addEventListener('blur', function () {
          if (champEmail.value && !emailValide(champEmail.value.trim())) {
            setErr('erreur-email', 'Email invalide.');
          } else {
            setErr('erreur-email', '');
          }
        });
      }
    }

    /* ═══════════════════════════════════════
       CHARGEMENT DYNAMIQUE API
    ═══════════════════════════════════════ */
    function esc(str) {
      return String(str || '')
        .replace(/&/g,'&amp;').replace(/</g,'&lt;')
        .replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
    }
    function animerEl(el) {
      if (!window.IntersectionObserver) return;
      el.classList.add('reveal-item');
      var o = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) { e.target.classList.add('visible'); o.unobserve(e.target); }
        });
      }, { threshold: 0.07 });
      o.observe(el);
    }

    /* Projets depuis API */
    function chargerProjets() {
      fetch(API + '/api/projets')
        .then(function (r) { return r.json(); })
        .then(function (data) {
          if (!data.success || !data.projets || !data.projets.length) return;
          var grille = document.querySelector('.projets-grille');
          if (!grille) return;
          data.projets.forEach(function (p) {
            if (document.getElementById('proj-' + p.id)) return;
            var wip = p.statut === 'en-cours' || p.statut === 'prevu';
            var img = '<img src="' + esc(p.image_url || 'images/projets-1.jpeg') + '" alt="' + esc(p.titre) + '" loading="lazy" onerror="this.src=\'images/projets-1.jpeg\'">';
            var stack = p.technologies
              ? p.technologies.split(',').map(function (t) { return '<span>' + esc(t.trim()) + '</span>'; }).join('')
              : '';
            var boutons = wip
              ? '<div class="wip-message"><i class="fas fa-clock"></i> Bientôt disponible</div>'
              : '<a href="' + esc(p.lien_site || '#') + '" target="_blank" rel="noopener" class="btn-demo"><i class="fas fa-external-link-alt"></i> Voir le projet</a>'
                + (p.lien_github ? '<a href="' + esc(p.lien_github) + '" target="_blank" rel="noopener" class="btn-github"><i class="fab fa-github"></i> GitHub</a>' : '');

            var el = document.createElement('div');
            el.className = 'projet-card' + (wip ? ' projet-wip' : '');
            el.id = 'proj-' + p.id;
            el.innerHTML =
              '<div class="projet-image-wrapper">' + img +
              '<div class="projet-image-overlay"></div>' +
              '<div class="projet-label-badge' + (wip ? ' wip' : '') + '">' + esc(p.etiquette || 'Projet') + '</div></div>' +
              '<div class="projet-info-bloc">' +
              '<div class="projet-info-top"><h3>' + esc(p.titre) + '</h3>' +
              '<span class="projet-statut ' + (wip ? 'wip-statut' : 'live') + '">' +
              (wip ? '<i class="fas fa-hammer"></i> En dev' : '<span class="point-vert-pulse"></span> Live') +
              '</span></div>' +
              '<p>' + esc(p.description) + '</p>' +
              (stack ? '<div class="projet-stack-tags">' + stack + '</div>' : '') +
              '<div class="projet-boutons">' + boutons + '</div></div>';
            grille.appendChild(el);
            animerEl(el);
          });
        }).catch(function () {});
    }

    /* Expériences depuis API */
    function chargerExperiences() {
      fetch(API + '/api/experiences')
        .then(function (r) { return r.json(); })
        .then(function (data) {
          if (!data.success || !data.experiences || !data.experiences.length) return;
          var grille = document.querySelector('.experience-grille');
          if (!grille) return;
          data.experiences.forEach(function (exp) {
            if (document.getElementById('exp-' + exp.id)) return;
            var recherche = exp.statut === 'recherche';
            var tags = exp.tags
              ? '<div class="exp-tags">' + exp.tags.split(',').map(function (t) { return '<span>' + esc(t.trim()) + '</span>'; }).join('') + '</div>'
              : '';
            var el = document.createElement('div');
            el.className = 'experience-card' + (recherche ? ' recherche-active' : '');
            el.id = 'exp-' + exp.id;
            el.innerHTML =
              (recherche ? '<div class="exp-card-header"><div class="exp-status-badge"><span class="point-vert-pulse"></span> En recherche active</div></div>' : '') +
              '<div class="exp-card-icone' + (recherche ? ' recherche' : '') + '"><i class="fas ' + (recherche ? 'fa-search' : 'fa-briefcase') + '"></i></div>' +
              '<h3>' + esc(exp.titre) + '</h3>' +
              '<div class="exp-meta">' +
              (exp.type_exp   ? '<span><i class="fas fa-briefcase"></i> '       + esc(exp.type_exp) + '</span>' : '') +
              (exp.lieu       ? '<span><i class="fas fa-map-marker-alt"></i> '  + esc(exp.lieu) + '</span>' : '') +
              (exp.date_debut ? '<span><i class="fas fa-calendar-alt"></i> '    + esc(exp.date_debut) + (exp.date_fin ? ' → ' + esc(exp.date_fin) : '') + '</span>' : '') +
              '</div>' +
              (exp.description ? '<p>' + esc(exp.description) + '</p>' : '') +
              tags;
            grille.appendChild(el);
            animerEl(el);
          });
        }).catch(function () {});
    }

    /* Compétences depuis API */
    function chargerCompetences() {
      fetch(API + '/api/competences')
        .then(function (r) { return r.json(); })
        .then(function (data) {
          if (!data.success || !data.competences || !data.competences.length) return;
          var grille = document.querySelector('.competences-grille');
          if (!grille) return;
          data.competences.forEach(function (c) {
            if (document.getElementById('comp-' + c.id)) return;
            var items = c.items
              ? '<ul class="competence-items">' + c.items.split('\n').map(function (l) {
                  var p = l.split('|');
                  return '<li><i class="' + esc((p[0]||'fas fa-circle').trim()) + '"></i> ' + esc((p[1]||l).trim()) + '</li>';
                }).join('') + '</ul>'
              : '';
            var el = document.createElement('div');
            el.className = 'competence-card';
            el.id = 'comp-' + c.id;
            el.innerHTML =
              '<div class="competence-card-top"><div class="competence-icon" style="--ic:' + esc(c.couleur || 'var(--orange)') + '"><i class="' + esc(c.icone || 'fas fa-code') + '"></i></div>' +
              '<div><h3>' + esc(c.categorie) + '</h3><span class="competence-niveau-txt">' + esc(c.label_niveau || '') + '</span></div></div>' +
              items +
              '<div class="competence-barre-wrapper"><div class="competence-barre"><div class="competence-remplissage" style="--pct:' + (c.niveau||70) + '%"></div></div><span>' + (c.niveau||70) + '%</span></div>';
            grille.appendChild(el);
            animerEl(el);
          });
        }).catch(function () {});
    }

    chargerProjets();
    chargerExperiences();
    chargerCompetences();

  }); /* fin DOMContentLoaded */

})();