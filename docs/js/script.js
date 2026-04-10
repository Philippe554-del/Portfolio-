(function () {
  'use strict';

  /* Empêcher clic-droit sur images et drag */
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

  /* ═══════════════════════════════════════════
     CANVAS PARTICULES — toute la page (fixed)
  ═══════════════════════════════════════════ */
  (function () {
    var canvas = document.getElementById('particules-bg');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var W, H;
    var COUNT = window.innerWidth < 768 ? 30 : 60;
    var DIST_MAX = 130;
    var COULEURS = ['rgba(255,107,53,', 'rgba(0,217,255,', 'rgba(168,85,247,'];
    var points = [];
    var souris = { x: null, y: null };
    var raf;

    function resize() {
      W = canvas.width  = window.innerWidth;
      H = canvas.height = window.innerHeight;
    }

    function Point() {
      this.x  = Math.random() * W;
      this.y  = Math.random() * H;
      this.vx = (Math.random() - 0.5) * 0.38;
      this.vy = (Math.random() - 0.5) * 0.38;
      this.r  = Math.random() * 1.4 + 0.4;
      this.c  = COULEURS[Math.floor(Math.random() * COULEURS.length)];
    }

    function init() {
      points = [];
      for (var i = 0; i < COUNT; i++) points.push(new Point());
    }

    function dessiner() {
      ctx.clearRect(0, 0, W, H);

      /* Lignes entre points proches */
      for (var i = 0; i < points.length; i++) {
        for (var j = i + 1; j < points.length; j++) {
          var dx = points[i].x - points[j].x;
          var dy = points[i].y - points[j].y;
          var d = Math.sqrt(dx * dx + dy * dy);
          if (d < DIST_MAX) {
            ctx.beginPath();
            ctx.strokeStyle = points[i].c + ((1 - d / DIST_MAX) * 0.22) + ')';
            ctx.lineWidth = 0.5;
            ctx.moveTo(points[i].x, points[i].y);
            ctx.lineTo(points[j].x, points[j].y);
            ctx.stroke();
          }
        }
        /* Ligne vers souris */
        if (souris.x !== null) {
          var mx = points[i].x - souris.x;
          var my = points[i].y - souris.y;
          var md = Math.sqrt(mx * mx + my * my);
          if (md < 160) {
            ctx.beginPath();
            ctx.strokeStyle = 'rgba(255,107,53,' + ((1 - md / 160) * 0.35) + ')';
            ctx.lineWidth = 0.6;
            ctx.moveTo(points[i].x, points[i].y);
            ctx.lineTo(souris.x, souris.y);
            ctx.stroke();
          }
        }
      }

      /* Points */
      for (var k = 0; k < points.length; k++) {
        var p = points[k];
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.c + '0.65)';
        ctx.fill();
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > W) p.vx *= -1;
        if (p.y < 0 || p.y > H) p.vy *= -1;
      }

      raf = requestAnimationFrame(dessiner);
    }

    resize();
    init();
    dessiner();

    window.addEventListener('resize', function () {
      cancelAnimationFrame(raf);
      COUNT = window.innerWidth < 768 ? 30 : 60;
      resize(); init(); dessiner();
    });
    window.addEventListener('mousemove', function (e) {
      souris.x = e.clientX; souris.y = e.clientY;
    });
    window.addEventListener('mouseleave', function () { souris.x = null; souris.y = null; });
  })();

  /* ═══════════════════════════════════════════
     TYPEWRITER
  ═══════════════════════════════════════════ */
  (function () {
    var el = document.getElementById('typewriter');
    if (!el) return;

    var phrases = [
      'Développeur Web',
      'Développeur Full-Stack',
      'Administrateur Réseau',
      'Étudiant ENEAM L2',
      'Builder Béninois 🇧🇯'
    ];
    var pi = 0, ci = 0, efface = false, attente = 0;

    function tick() {
      var phrase = phrases[pi];
      if (!efface) {
        el.textContent = phrase.slice(0, ci + 1);
        ci++;
        if (ci === phrase.length) { efface = true; attente = 55; }
      } else {
        if (attente > 0) { attente--; setTimeout(tick, 40); return; }
        el.textContent = phrase.slice(0, ci - 1);
        ci--;
        if (ci === 0) { efface = false; pi = (pi + 1) % phrases.length; }
      }
      setTimeout(tick, efface ? 45 : 80);
    }
    setTimeout(tick, 1200);
  })();

  /* ═══════════════════════════════════════════
     DOM READY
  ═══════════════════════════════════════════ */
  document.addEventListener('DOMContentLoaded', function () {

    var barreNav   = document.getElementById('barre-nav');
    var btnBurger  = document.querySelector('.btn-burger');
    var navLiens   = document.querySelector('.nav-liens');
    var btnHaut    = document.getElementById('btn-haut');
    var tousLiens  = document.querySelectorAll('.nav-liens a');
    var formContact = document.getElementById('form-contact');

    /* ── Burger ── */
    if (btnBurger) {
      btnBurger.addEventListener('click', function (e) {
        e.preventDefault();
        btnBurger.classList.toggle('ouvert');
        navLiens.classList.toggle('ouvert');
      });
    }
    tousLiens.forEach(function (lien) {
      lien.addEventListener('click', function () {
        btnBurger && btnBurger.classList.remove('ouvert');
        navLiens  && navLiens.classList.remove('ouvert');
      });
    });
    window.addEventListener('resize', function () {
      if (window.innerWidth > 768) {
        btnBurger && btnBurger.classList.remove('ouvert');
        navLiens  && navLiens.classList.remove('ouvert');
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

    /* ── Scroll : nav + btn retour haut ── */
    window.addEventListener('scroll', function () {
      var pos = window.pageYOffset;
      if (barreNav)  barreNav.classList.toggle('scrolled', pos > 80);
      if (btnHaut)   btnHaut.classList.toggle('visible', pos > 300);
    }, { passive: true });

    if (btnHaut) {
      btnHaut.addEventListener('click', function () {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }

    /* ── Bouton scroll vers le bas ── */
    var btnScrollBas = document.getElementById('btn-scroll-bas');
    if (btnScrollBas) {
      btnScrollBas.addEventListener('click', function () {
        var cible = document.getElementById('qui-suis-je');
        if (cible) cible.scrollIntoView({ behavior: 'smooth' });
      });
    }

    /* ── Lien actif dans la nav ── */
    var sections = document.querySelectorAll('section[id]');
    function majLienActif() {
      var pos = window.pageYOffset;
      sections.forEach(function (section) {
        var debut = section.offsetTop - 130;
        var id = section.getAttribute('id');
        var lien = document.querySelector('.nav-liens a[href="#' + id + '"]');
        if (pos >= debut && pos < debut + section.offsetHeight) {
          tousLiens.forEach(function (l) { l.classList.remove('actif'); });
          if (lien) lien.classList.add('actif');
        }
      });
    }
    window.addEventListener('scroll', majLienActif, { passive: true });
    majLienActif();

    /* ── Animations au scroll (IntersectionObserver) ── */
    if (window.IntersectionObserver) {
      var obs = new IntersectionObserver(function (entrees) {
        entrees.forEach(function (e) {
          if (e.isIntersecting) {
            e.target.classList.add('visible');
            obs.unobserve(e.target);
          }
        });
      }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });

      document.querySelectorAll(
        '.bloc-competence, .carte-projet, .stat-bloc, .ligne-contact, .etape-parcours, .carte-exp'
      ).forEach(function (el) {
        el.classList.add('js-anim');
        obs.observe(el);
      });
    }

    /* ── Compteur chiffres stats ── */
    if (window.IntersectionObserver) {
      var obsStats = new IntersectionObserver(function (entrees) {
        entrees.forEach(function (e) {
          if (!e.isIntersecting) return;
          var el = e.target.querySelector('.stat-nb');
          if (!el || e.target.dataset.compte) return;
          var val = parseInt((el.textContent || '').replace(/\D/g, ''), 10);
          if (isNaN(val) || val <= 0) return;
          e.target.dataset.compte = '1';
          var c = 0, inc = val / 28;
          var iv = setInterval(function () {
            c += inc;
            if (c >= val) { c = val; clearInterval(iv); }
            el.textContent = Math.floor(c) + '+';
          }, 40);
        });
      }, { threshold: 0.5 });
      document.querySelectorAll('.stat-bloc').forEach(function (s) { obsStats.observe(s); });
    }

    /* ── CV ── */
    var btnTelecharger = document.querySelector('.cv-actions .btn-orange');
    if (btnTelecharger) {
      btnTelecharger.addEventListener('click', function () {
        afficherNotif('Téléchargement du CV en cours…', 'info');
      });
    }
    var btnVoirCv = document.querySelector('.btn-voir-cv');
    if (btnVoirCv) {
      btnVoirCv.addEventListener('click', function (e) {
        e.preventDefault();
        window.open(btnVoirCv.getAttribute('href') || '/cv/CV_philippe_hountondji.pdf', '_blank', 'noopener,noreferrer');
      });
    }

    /* ═══════════════════════════════════════════
       FORMULAIRE CONTACT
    ═══════════════════════════════════════════ */
    function nettoyer(v, max) { return String(v || '').trim().slice(0, max || 2000); }
    function emailOk(e) { return /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/.test(e) && e.length <= 254; }
    function setErr(id, msg) { var el = document.getElementById(id); if (el) el.textContent = msg; }
    function clearErrs() {
      ['erreur-nom','erreur-email','erreur-telephone','erreur-message'].forEach(function (id) {
        var el = document.getElementById(id); if (el) el.textContent = '';
      });
    }

    function afficherNotif(msg, type) {
      if (['succes','erreur','info'].indexOf(type) < 0) type = 'info';
      var div = document.createElement('div');
      div.className = 'notif notif-' + type;
      var icone = document.createElement('i');
      icone.className = 'fas ' + (type === 'succes' ? 'fa-check-circle' : type === 'erreur' ? 'fa-exclamation-circle' : 'fa-info-circle');
      var txt = document.createElement('span');
      txt.textContent = String(msg).slice(0, 200);
      div.appendChild(icone); div.appendChild(txt);
      document.body.appendChild(div);
      setTimeout(function () { div.classList.add('visible'); }, 10);
      setTimeout(function () {
        div.classList.remove('visible');
        setTimeout(function () { if (div.parentNode) div.parentNode.removeChild(div); }, 300);
      }, 5000);
    }

    /* Styles notifications injectés */
    if (!document.getElementById('notif-styles')) {
      var s = document.createElement('style');
      s.id = 'notif-styles';
      s.textContent = '.notif{position:fixed;top:-100px;right:16px;background:rgba(8,11,32,.97);color:#fff;padding:.9rem 1.4rem;border-radius:12px;box-shadow:0 8px 32px rgba(0,0,0,.6);display:flex;align-items:center;gap:.7rem;z-index:10000;min-width:280px;max-width:460px;transition:transform .3s cubic-bezier(.4,0,.2,1);border:1px solid rgba(255,255,255,.08)}.notif.visible{transform:translateY(116px)}.notif-succes{border-left:4px solid #10B981}.notif-erreur{border-left:4px solid #EF4444}.notif-info{border-left:4px solid #00D9FF}.notif i{font-size:1.15rem}.notif-succes i{color:#10B981}.notif-erreur i{color:#EF4444}.notif-info i{color:#00D9FF}.notif span{flex:1;font-weight:500;font-size:.9rem}@media(max-width:768px){.notif{right:10px;left:10px;min-width:auto}}';
      document.head.appendChild(s);
    }

    if (formContact) {
      function lireLimite() { try { return JSON.parse(sessionStorage.getItem('_ce') || '{}'); } catch(e) { return {}; } }
      function sauverLimite(d) { try { sessionStorage.setItem('_ce', JSON.stringify(d)); } catch(e) {} }
      function limiteOk() {
        var d = lireLimite(), now = Date.now();
        if (now < (d.bloque || 0)) {
          afficherNotif('Trop de tentatives. Réessayez dans ' + Math.ceil(((d.bloque || 0) - now) / 1000) + 's.', 'erreur');
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

        var erreur = false;
        if (nom.length < 2)      { setErr('erreur-nom',     'Le nom doit contenir au moins 2 caractères.'); erreur = true; }
        if (!emailOk(email))     { setErr('erreur-email',   'Adresse email invalide.'); erreur = true; }
        if (tel && !/^\+?[0-9]{8,20}$/.test(tel)) { setErr('erreur-telephone', 'Numéro invalide.'); erreur = true; }
        if (message.length < 10) { setErr('erreur-message', 'Le message doit contenir au moins 10 caractères.'); erreur = true; }
        if (erreur) return;

        var btn = formContact.querySelector('.btn-envoyer');
        var origHtml = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Envoi en cours…';

        fetch(API + '/api/contact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: nom, email: email, phone: tel, message: message })
        })
        .then(function (r) { return r.json().then(function (d) { return { status: r.status, data: d }; }); })
        .then(function (res) {
          if (res.status === 200 && res.data.success) {
            incrementLimite();
            afficherNotif('Message envoyé ! Je vous répondrai bientôt.', 'succes');
            formContact.reset();
            btn.innerHTML = '<i class="fas fa-check"></i> Envoyé !';
            btn.style.background = '#10B981';
            setTimeout(function () { btn.disabled = false; btn.innerHTML = origHtml; btn.style.background = ''; }, 3000);
          } else {
            afficherNotif(String(res.data.error || "Erreur lors de l'envoi.").slice(0, 200), 'erreur');
            btn.disabled = false; btn.innerHTML = origHtml;
          }
        })
        .catch(function () {
          afficherNotif('Erreur réseau. Vérifiez votre connexion.', 'erreur');
          btn.disabled = false; btn.innerHTML = origHtml;
        });
      });
    }

    /* ═══════════════════════════════════════════
       CHARGEMENT DYNAMIQUE DEPUIS L'API
    ═══════════════════════════════════════════ */
    function esc(str) {
      return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
    }
    function animerEl(el) {
      if (!window.IntersectionObserver) return;
      el.classList.add('js-anim');
      var o = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) { entry.target.classList.add('visible'); o.unobserve(entry.target); }
        });
      }, { threshold: 0.08 });
      o.observe(el);
    }

    /* Projets */
    function chargerProjets() {
      fetch(API + '/api/projets')
        .then(function (r) { return r.json(); })
        .then(function (data) {
          if (!data.success || !data.projets || !data.projets.length) return;
          var grille = document.querySelector('.grille-projets');
          if (!grille) return;
          data.projets.forEach(function (p) {
            if (document.getElementById('proj-' + p.id)) return;
            var wip = p.statut === 'en-cours' || p.statut === 'prevu';
            var img = p.image_url
              ? '<img src="' + esc(p.image_url) + '" alt="' + esc(p.titre) + '" loading="lazy" onerror="this.src=\'images/projets-1.jpeg\'">'
              : '<img src="images/projets-1.jpeg" alt="' + esc(p.titre) + '" loading="lazy">';
            var stack = p.technologies ? p.technologies.split(',').map(function (t) { return '<span>' + esc(t.trim()) + '</span>'; }).join('') : '';
            var liens = wip
              ? '<div class="wip-notice"><i class="fas fa-hammer"></i> En développement — bientôt disponible</div>'
              : (p.lien_site ? '<a href="' + esc(p.lien_site) + '" target="_blank" rel="noopener noreferrer" class="lien-demo"><i class="fas fa-external-link-alt"></i> Visiter le site</a>' : '')
                + (p.lien_github ? ' <a href="' + esc(p.lien_github) + '" target="_blank" rel="noopener noreferrer" class="lien-demo"><i class="fab fa-github"></i> GitHub</a>' : '');
            var el = document.createElement('div');
            el.className = 'carte-projet' + (wip ? ' projet-wip' : '');
            el.id = 'proj-' + p.id;
            el.innerHTML = '<div class="projet-label' + (wip ? ' label-wip' : '') + '">' + esc(p.etiquette || 'Projet') + '</div>'
              + '<div class="projet-visuel">' + img + '</div>'
              + '<div class="projet-info"><h3>' + esc(p.titre) + '</h3><p>' + esc(p.description) + '</p>'
              + (stack ? '<div class="projet-stack">' + stack + '</div>' : '')
              + '<div class="projet-liens">' + liens + '</div></div>';
            grille.appendChild(el);
            animerEl(el);
          });
        }).catch(function () {});
    }

    /* Expériences */
    function chargerExperiences() {
      fetch(API + '/api/experiences')
        .then(function (r) { return r.json(); })
        .then(function (data) {
          if (!data.success || !data.experiences || !data.experiences.length) return;
          var grille = document.querySelector('.grille-experience');
          if (!grille) return;
          data.experiences.forEach(function (exp) {
            if (document.getElementById('exp-' + exp.id)) return;
            var recherche = exp.statut === 'recherche';
            var tags = exp.tags ? '<div class="exp-tags">' + exp.tags.split(',').map(function (t) { return '<span>' + esc(t.trim()) + '</span>'; }).join('') + '</div>' : '';
            var el = document.createElement('div');
            el.className = 'carte-exp' + (recherche ? ' en-recherche' : '');
            el.id = 'exp-' + exp.id;
            el.innerHTML = (recherche ? '<div class="badge-recherche-stage"><span class="point-vert"></span> En recherche active</div>' : '')
              + '<div class="exp-icone"><i class="fas ' + (recherche ? 'fa-search' : 'fa-briefcase') + '"></i></div>'
              + '<div class="exp-detail"><h3>' + esc(exp.titre) + '</h3>'
              + (exp.type_exp ? '<span class="exp-type"><i class="fas fa-briefcase"></i> ' + esc(exp.type_exp) + '</span>' : '')
              + (exp.lieu     ? '<span class="exp-lieu"><i class="fas fa-map-marker-alt"></i> '  + esc(exp.lieu) + '</span>' : '')
              + (exp.date_debut ? '<span class="exp-date"><i class="fas fa-calendar-alt"></i> ' + esc(exp.date_debut) + (exp.date_fin ? ' → ' + esc(exp.date_fin) : '') + '</span>' : '')
              + (exp.description ? '<p>' + esc(exp.description) + '</p>' : '')
              + tags + '</div>';
            grille.appendChild(el);
            animerEl(el);
          });
        }).catch(function () {});
    }

    /* Compétences */
    function chargerCompetences() {
      fetch(API + '/api/competences')
        .then(function (r) { return r.json(); })
        .then(function (data) {
          if (!data.success || !data.competences || !data.competences.length) return;
          var grille = document.querySelector('.grille-competences');
          if (!grille) return;
          data.competences.forEach(function (c) {
            if (document.getElementById('comp-' + c.id)) return;
            var items = c.items ? '<ul class="competence-liste">' + c.items.split('\n').map(function (ligne) {
              var p = ligne.split('|');
              return '<li><i class="' + esc((p[0]||'fas fa-circle').trim()) + '"></i> <strong>' + esc((p[1]||ligne).trim()) + '</strong></li>';
            }).join('') + '</ul>' : '';
            var el = document.createElement('div');
            el.className = 'bloc-competence';
            el.id = 'comp-' + c.id;
            el.innerHTML = '<div class="competence-header"><div class="competence-icone" style="background:' + esc(c.couleur||'var(--orange)') + '"><i class="' + esc(c.icone||'fas fa-code') + '"></i></div><h3>' + esc(c.categorie) + '</h3></div>'
              + items
              + '<div class="niveau-barre"><div><div class="niveau-remplissage" style="width:' + (c.niveau||70) + '%"></div></div><span>' + esc(c.label_niveau || (c.niveau + '%')) + '</span></div>';
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