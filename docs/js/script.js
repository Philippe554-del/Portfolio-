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

  (function () {
    if (window.matchMedia('(pointer: coarse)').matches) return;
    var dot  = document.getElementById('curseur-perso');
    var ring = document.getElementById('curseur-anneau');
    if (!dot || !ring) return;

    var mx = 0, my = 0, rx = 0, ry = 0;

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
          var d  = Math.sqrt(dx * dx + dy * dy);
          if (d < DIST_MAX) {
            ctx.beginPath();
            ctx.strokeStyle = pts[i].c + ((1 - d / DIST_MAX) * 0.18) + ')';
            ctx.lineWidth = 0.5;
            ctx.moveTo(pts[i].x, pts[i].y);
            ctx.lineTo(pts[j].x, pts[j].y);
            ctx.stroke();
          }
        }
        if (souris.x !== null) {
          var mx2 = pts[i].x - souris.x;
          var my2 = pts[i].y - souris.y;
          var md  = Math.sqrt(mx2 * mx2 + my2 * my2);
          if (md < 150) {
            ctx.beginPath();
            ctx.strokeStyle = 'rgba(255,107,53,' + ((1 - md / 150) * 0.3) + ')';
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
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
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
    window.addEventListener('mousemove', function (e) { souris.x = e.clientX; souris.y = e.clientY; });
    window.addEventListener('mouseleave', function () { souris.x = null; souris.y = null; });
  })();

  (function () {
    var el = document.getElementById('tw-texte');
    if (!el) return;

    var phrases = [
      'Développeur Web Full-Stack',
      'Administrateur Réseau',
      'Builder Beninois',
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
      if (btnTop)   btnTop.classList.toggle('visible',   pos > 400);
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

    /* ── Reveal au scroll ── */
    if (window.IntersectionObserver) {
      var obsReveal = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) { e.target.classList.add('visible'); obsReveal.unobserve(e.target); }
        });
      }, { threshold: 0.07, rootMargin: '0px 0px -40px 0px' });

      document.querySelectorAll('.reveal-item, .timeline-etape, .valeur-item, .coordonnee-item, .stat-item').forEach(function (el) {
        obsReveal.observe(el);
      });

      /* Barres de compétences */
      var obsBarres = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (!e.isIntersecting) return;
          e.target.querySelectorAll('.competence-remplissage').forEach(function (barre) { barre.classList.add('anime'); });
          obsBarres.unobserve(e.target);
        });
      }, { threshold: 0.4 });

      document.querySelectorAll('.competence-card').forEach(function (card) { obsBarres.observe(card); });

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

      document.querySelectorAll('.stat-item, .chiffre-bloc').forEach(function (s) { obsStats.observe(s); });
    }

    /* ── Micro-interaction CV ── */
    var btnCV = document.querySelector('.cv-dl-btn');
    if (btnCV) btnCV.addEventListener('click', function () { afficherNotif('Téléchargement du CV en cours…', 'info'); });

    /* ── Glitch h1 ── */
    var nomH1 = document.querySelector('.nom-gradient');
    if (nomH1) nomH1.setAttribute('data-glitch', nomH1.textContent);

    function afficherNotif(msg, type) {
      if (['succes','erreur','info'].indexOf(type) < 0) type = 'info';
      var div = document.createElement('div');
      div.className = 'notif notif-' + type;
      var ic = { succes: 'fa-check-circle', erreur: 'fa-exclamation-circle', info: 'fa-info-circle' }[type];
      var icon = document.createElement('i');
      icon.className = 'fas ' + ic;
      var span = document.createElement('span');
      span.textContent = String(msg).slice(0, 200);
      div.appendChild(icon);
      div.appendChild(span);
      document.body.appendChild(div);
      setTimeout(function () { div.classList.add('visible'); }, 10);
      setTimeout(function () {
        div.classList.remove('visible');
        setTimeout(function () { if (div.parentNode) div.parentNode.removeChild(div); }, 400);
      }, 5000);
    }

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
      sauverLimite({ nb: (d.nb || 0) + 1, debut: d.debut || now, bloque: d.bloque || 0 });
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
        var codeEmail = document.getElementById('email-pays') ? document.getElementById('email-pays').value : '';
        var numBrut = nettoyer(document.getElementById('telephone').value, 20);
        var tel     = numBrut ? (codeEmail + numBrut).replace(/\s/g,'') : '';
        var message = nettoyer(document.getElementById('message').value, 2000);

        var err = false;
        if (nom.length < 2)      { setErr('erreur-nom',     'Nom trop court.'); err = true; }
        if (!emailValide(email)) { setErr('erreur-email',   'Email invalide.'); err = true; }
        if (tel && !/^[+]?[0-9 \-]{6,25}$/.test(tel)) { setErr('erreur-telephone', 'Numéro invalide.'); err = true; }
        if (message.length < 10) { setErr('erreur-message', 'Message trop court (min 10 caractères).'); err = true; }
        if (err) return;

        var btn = formContact.querySelector('.btn-envoyer');
        var origHTML = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> <span>Envoi...</span>';

        fetch(API + '/api/csrf-token')
          .then(function (r) { return r.json(); })
          .then(function (csrfData) {
            return fetch(API + '/api/contact', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfData.csrfToken },
              body: JSON.stringify({ name: nom, email: email, phone: tel, message: message })
            });
          })
          .then(function (r) { return r.json().then(function (d) { return { status: r.status, data: d }; }); })
          .then(function (res) {
            if (res.status === 200 && res.data.success) {
              incrementLimite();
              afficherNotif('Message envoyé ! Je vous répondrai sous 24h.', 'succes');
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

      var champEmail = document.getElementById('email');
      if (champEmail) {
        champEmail.addEventListener('blur', function () {
          if (champEmail.value && !emailValide(champEmail.value.trim())) setErr('erreur-email', 'Email invalide.');
          else setErr('erreur-email', '');
        });
      }
    }

    function esc(str) {
      return String(str || '')
        .replace(/&/g,'&amp;').replace(/</g,'&lt;')
        .replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
    }
    function isURLSafe(val) {
      if (!val) return false;
      return !/^(javascript|data|vbscript|file|blob|mailto):/i.test(String(val).trim());
    }
    function safeUrl(val, fallback) {
      var s = String(val || '').trim();
      return isURLSafe(s) ? s : (fallback || '');
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
            var el = document.createElement('div');
            el.className = 'projet-card' + (wip ? ' projet-wip' : '');
            el.id = 'proj-' + p.id;
            var imgWrapper = document.createElement('div');
            imgWrapper.className = 'projet-image-wrapper';
            var img = document.createElement('img');
            img.src = safeUrl(p.image_url, 'images/projets-1.jpeg');
            img.alt = esc(p.titre || 'Projet');
            img.loading = 'lazy';
            img.onerror = function() { this.src = 'images/projets-1.jpeg'; };
            var overlay = document.createElement('div');
            overlay.className = 'projet-image-overlay';
            var badge = document.createElement('div');
            badge.className = 'projet-label-badge' + (wip ? ' wip' : '');
            badge.textContent = esc(p.etiquette || 'Projet');
            imgWrapper.appendChild(img);
            imgWrapper.appendChild(overlay);
            imgWrapper.appendChild(badge);
            var infoBlog = document.createElement('div');
            infoBlog.className = 'projet-info-bloc';
            var infoTop = document.createElement('div');
            infoTop.className = 'projet-info-top';
            var titre = document.createElement('h3');
            titre.textContent = esc(p.titre || '');
            var statut = document.createElement('span');
            statut.className = 'projet-statut ' + (wip ? 'wip-statut' : 'live');
            if (wip) {
              var hammerIcon = document.createElement('i');
              hammerIcon.className = 'fas fa-hammer';
              statut.appendChild(hammerIcon);
              statut.appendChild(document.createTextNode(' En dev'));
            } else {
              var pulse = document.createElement('span');
              pulse.className = 'point-vert-pulse';
              statut.appendChild(pulse);
              statut.appendChild(document.createTextNode(' Live'));
            }
            infoTop.appendChild(titre);
            infoTop.appendChild(statut);
            var desc = document.createElement('p');
            desc.textContent = esc(p.description || '');
            infoBlog.appendChild(infoTop);
            infoBlog.appendChild(desc);
            if (p.technologies) {
              var stackDiv = document.createElement('div');
              stackDiv.className = 'projet-stack-tags';
              p.technologies.split(',').forEach(function(tech) {
                var span = document.createElement('span');
                span.textContent = esc(tech.trim());
                stackDiv.appendChild(span);
              });
              infoBlog.appendChild(stackDiv);
            }
            var btnDiv = document.createElement('div');
            btnDiv.className = 'projet-boutons';
            if (wip) {
              var wipMsg = document.createElement('div');
              wipMsg.className = 'wip-message';
              var clockIcon = document.createElement('i');
              clockIcon.className = 'fas fa-clock';
              wipMsg.appendChild(clockIcon);
              wipMsg.appendChild(document.createTextNode(' Bientôt disponible'));
              btnDiv.appendChild(wipMsg);
            } else {
              if (p.lien_site) {
                var linkA = document.createElement('a');
                linkA.href = safeUrl(p.lien_site, '#');
                linkA.target = '_blank'; linkA.rel = 'noopener';
                linkA.className = 'btn-demo';
                var linkIcon = document.createElement('i');
                linkIcon.className = 'fas fa-external-link-alt';
                linkA.appendChild(linkIcon);
                linkA.appendChild(document.createTextNode(' Voir le projet'));
                btnDiv.appendChild(linkA);
              }
              if (p.lien_github) {
                var ghA = document.createElement('a');
                ghA.href = safeUrl(p.lien_github, '#');
                ghA.target = '_blank'; ghA.rel = 'noopener';
                ghA.className = 'btn-github';
                var ghIcon = document.createElement('i');
                ghIcon.className = 'fab fa-github';
                ghA.appendChild(ghIcon);
                ghA.appendChild(document.createTextNode(' GitHub'));
                btnDiv.appendChild(ghA);
              }
            }
            infoBlog.appendChild(btnDiv);
            el.appendChild(imgWrapper);
            el.appendChild(infoBlog);
            grille.appendChild(el);
            animerEl(el);
          });
        }).catch(function () {});
    }

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
            var el = document.createElement('div');
            el.className = 'experience-card' + (recherche ? ' recherche-active' : '');
            el.id = 'exp-' + exp.id;
            if (recherche) {
              var header = document.createElement('div');
              header.className = 'exp-card-header';
              var badge = document.createElement('div');
              badge.className = 'exp-status-badge';
              var pulse = document.createElement('span');
              pulse.className = 'point-vert-pulse';
              badge.appendChild(pulse);
              badge.appendChild(document.createTextNode(' En recherche active'));
              header.appendChild(badge);
              el.appendChild(header);
            }
            var iconeDiv = document.createElement('div');
            iconeDiv.className = 'exp-card-icone' + (recherche ? ' recherche' : '');
            var icon = document.createElement('i');
            icon.className = 'fas ' + (recherche ? 'fa-search' : 'fa-briefcase');
            iconeDiv.appendChild(icon);
            el.appendChild(iconeDiv);
            var titre = document.createElement('h3');
            titre.textContent = esc(exp.titre || '');
            el.appendChild(titre);
            var meta = document.createElement('div');
            meta.className = 'exp-meta';
            if (exp.type_exp) { var ts = document.createElement('span'); var ti = document.createElement('i'); ti.className = 'fas fa-briefcase'; ts.appendChild(ti); ts.appendChild(document.createTextNode(' ' + esc(exp.type_exp))); meta.appendChild(ts); }
            if (exp.lieu) { var ls = document.createElement('span'); var li2 = document.createElement('i'); li2.className = 'fas fa-map-marker-alt'; ls.appendChild(li2); ls.appendChild(document.createTextNode(' ' + esc(exp.lieu))); meta.appendChild(ls); }
            if (exp.date_debut) { var ds = document.createElement('span'); var di = document.createElement('i'); di.className = 'fas fa-calendar-alt'; ds.appendChild(di); ds.appendChild(document.createTextNode(' ' + esc(exp.date_debut) + (exp.date_fin ? ' → ' + esc(exp.date_fin) : ''))); meta.appendChild(ds); }
            el.appendChild(meta);
            if (exp.description) { var desc = document.createElement('p'); desc.textContent = esc(exp.description); el.appendChild(desc); }
            if (exp.tags) { var tagsDiv = document.createElement('div'); tagsDiv.className = 'exp-tags'; exp.tags.split(',').forEach(function(tag) { var span = document.createElement('span'); span.textContent = esc(tag.trim()); tagsDiv.appendChild(span); }); el.appendChild(tagsDiv); }
            grille.appendChild(el);
            animerEl(el);
          });
        }).catch(function () {});
    }

    function chargerCompetences() {
      fetch(API + '/api/competences')
        .then(function (r) { return r.json(); })
        .then(function (data) {
          if (!data.success || !data.competences || !data.competences.length) return;
          var grille = document.querySelector('.competences-grille');
          if (!grille) return;
          data.competences.forEach(function (c) {
            if (document.getElementById('comp-' + c.id)) return;
            var el = document.createElement('div');
            el.className = 'competence-card';
            el.id = 'comp-' + c.id;
            var cardTop = document.createElement('div');
            cardTop.className = 'competence-card-top';
            var iconDiv = document.createElement('div');
            iconDiv.className = 'competence-icon';
            iconDiv.style.cssText = '--ic:' + esc(c.couleur || 'var(--orange)');
            var icon = document.createElement('i');
            icon.className = esc(c.icone || 'fas fa-code');
            iconDiv.appendChild(icon);
            var infos = document.createElement('div');
            var categorie = document.createElement('h3');
            categorie.textContent = esc(c.categorie || '');
            var niveau = document.createElement('span');
            niveau.className = 'competence-niveau-txt';
            niveau.textContent = esc(c.label_niveau || '');
            infos.appendChild(categorie);
            infos.appendChild(niveau);
            cardTop.appendChild(iconDiv);
            cardTop.appendChild(infos);
            el.appendChild(cardTop);
            if (c.items) {
              var ul = document.createElement('ul');
              ul.className = 'competence-items';
              c.items.split('\n').forEach(function(line) {
                if (!line.trim()) return;
                var parts = line.split('|');
                var liEl = document.createElement('li');
                var liIcon = document.createElement('i');
                liIcon.className = esc((parts[0] || 'fas fa-circle').trim());
                liEl.appendChild(liIcon);
                liEl.appendChild(document.createTextNode(' ' + esc((parts[1] || line).trim())));
                ul.appendChild(liEl);
              });
              el.appendChild(ul);
            }
            var barreWrapper = document.createElement('div');
            barreWrapper.className = 'competence-barre-wrapper';
            var barre = document.createElement('div');
            barre.className = 'competence-barre';
            var remplissage = document.createElement('div');
            remplissage.className = 'competence-remplissage';
            remplissage.style.cssText = '--pct:' + (c.niveau || 70) + '%';
            barre.appendChild(remplissage);
            var pct = document.createElement('span');
            pct.textContent = (c.niveau || 70) + '%';
            barreWrapper.appendChild(barre);
            barreWrapper.appendChild(pct);
            el.appendChild(barreWrapper);
            grille.appendChild(el);
            animerEl(el);
          });
        }).catch(function () {});
    }

    chargerProjets();
    chargerExperiences();
    chargerCompetences();

    contactOngletInit();

  }); /* fin DOMContentLoaded */


  /* Liste complète des pays avec indicatif téléphonique */
  var LISTE_PAYS = [
    ["🇧🇯", "Benin", "+229"],
    ["🇨🇮", "Cote d'Ivoire", "+225"],
    ["🇸🇳", "Senegal", "+221"],
    ["🇲🇱", "Mali", "+223"],
    ["🇧🇫", "Burkina Faso", "+226"],
    ["🇹🇬", "Togo", "+228"],
    ["🇳🇪", "Niger", "+227"],
    ["🇬🇳", "Guinee", "+224"],
    ["🇬🇼", "Guinee-Bissau", "+245"],
    ["🇬🇭", "Ghana", "+233"],
    ["🇳🇬", "Nigeria", "+234"],
    ["🇨🇲", "Cameroun", "+237"],
    ["🇨🇩", "Congo RDC", "+243"],
    ["🇨🇬", "Congo Brazzaville", "+242"],
    ["🇬🇦", "Gabon", "+241"],
    ["🇲🇷", "Mauritanie", "+222"],
    ["🇬🇲", "Gambie", "+220"],
    ["🇸🇱", "Sierra Leone", "+232"],
    ["🇱🇷", "Liberia", "+231"],
    ["🇲🇦", "Maroc", "+212"],
    ["🇩🇿", "Algerie", "+213"],
    ["🇹🇳", "Tunisie", "+216"],
    ["🇱🇾", "Libye", "+218"],
    ["🇪🇬", "Egypte", "+20"],
    ["🇸🇩", "Soudan", "+249"],
    ["🇪🇹", "Ethiopie", "+251"],
    ["🇰🇪", "Kenya", "+254"],
    ["🇺🇬", "Ouganda", "+256"],
    ["🇹🇿", "Tanzanie", "+255"],
    ["🇷🇼", "Rwanda", "+250"],
    ["🇧🇮", "Burundi", "+257"],
    ["🇸🇴", "Somalie", "+252"],
    ["🇩🇯", "Djibouti", "+253"],
    ["🇪🇷", "Erythree", "+291"],
    ["🇸🇨", "Seychelles", "+248"],
    ["🇲🇺", "Maurice", "+230"],
    ["🇲🇬", "Madagascar", "+261"],
    ["🇲🇿", "Mozambique", "+258"],
    ["🇿🇦", "Afrique du Sud", "+27"],
    ["🇿🇲", "Zambie", "+260"],
    ["🇿🇼", "Zimbabwe", "+263"],
    ["🇧🇼", "Botswana", "+267"],
    ["🇳🇦", "Namibie", "+264"],
    ["🇸🇿", "Eswatini", "+268"],
    ["🇱🇸", "Lesotho", "+266"],
    ["🇦🇴", "Angola", "+244"],
    ["🇨🇻", "Cap-Vert", "+238"],
    ["🇸🇹", "Sao Tome", "+239"],
    ["🇬🇶", "Guinee Equatoriale", "+240"],
    ["🇨🇫", "Centrafrique", "+236"],
    ["🇹🇩", "Tchad", "+235"],
    ["🇸🇸", "Soudan du Sud", "+211"],
    ["🇫🇷", "France", "+33"],
    ["🇧🇪", "Belgique", "+32"],
    ["🇨🇭", "Suisse", "+41"],
    ["🇱🇺", "Luxembourg", "+352"],
    ["🇩🇪", "Allemagne", "+49"],
    ["🇮🇹", "Italie", "+39"],
    ["🇪🇸", "Espagne", "+34"],
    ["🇵🇹", "Portugal", "+351"],
    ["🇬🇧", "Royaume-Uni", "+44"],
    ["🇮🇪", "Irlande", "+353"],
    ["🇳🇱", "Pays-Bas", "+31"],
    ["🇸🇪", "Suede", "+46"],
    ["🇳🇴", "Norvege", "+47"],
    ["🇩🇰", "Danemark", "+45"],
    ["🇫🇮", "Finlande", "+358"],
    ["🇵🇱", "Pologne", "+48"],
    ["🇷🇴", "Roumanie", "+40"],
    ["🇬🇷", "Grece", "+30"],
    ["🇷🇺", "Russie", "+7"],
    ["🇺🇦", "Ukraine", "+380"],
    ["🇺🇸", "Etats-Unis", "+1"],
    ["🇨🇦", "Canada", "+1"],
    ["🇲🇽", "Mexique", "+52"],
    ["🇧🇷", "Bresil", "+55"],
    ["🇦🇷", "Argentine", "+54"],
    ["🇨🇴", "Colombie", "+57"],
    ["🇵🇪", "Perou", "+51"],
    ["🇻🇪", "Venezuela", "+58"],
    ["🇨🇱", "Chili", "+56"],
    ["🇨🇳", "Chine", "+86"],
    ["🇯🇵", "Japon", "+81"],
    ["🇰🇷", "Coree du Sud", "+82"],
    ["🇮🇳", "Inde", "+91"],
    ["🇵🇰", "Pakistan", "+92"],
    ["🇧🇩", "Bangladesh", "+880"],
    ["🇮🇩", "Indonesie", "+62"],
    ["🇲🇾", "Malaisie", "+60"],
    ["🇹🇭", "Thailande", "+66"],
    ["🇻🇳", "Vietnam", "+84"],
    ["🇵🇭", "Philippines", "+63"],
    ["🇸🇬", "Singapour", "+65"],
    ["🇸🇦", "Arabie Saoudite", "+966"],
    ["🇦🇪", "Emirats Arabes Unis", "+971"],
    ["🇶🇦", "Qatar", "+974"],
    ["🇹🇷", "Turquie", "+90"],
    ["🇮🇱", "Israel", "+972"],
    ["🇮🇷", "Iran", "+98"],
    ["🇦🇺", "Australie", "+61"],
    ["🇳🇿", "Nouvelle-Zelande", "+64"]
  ];

  function contactOngletInit() {
    /* Remplir les selects des pays pour les deux onglets */
    ['wa-pays', 'email-pays'].forEach(function (selId) {
      var sel = document.getElementById(selId);
      if (!sel) return;
      LISTE_PAYS.forEach(function (p) {
        var opt = document.createElement('option');
        opt.value = p[2];
        opt.textContent = p[0] + ' ' + p[1] + '  ' + p[2];
        opt.title = p[1];
        sel.appendChild(opt);
      });
      sel.value = '+229';
    });
  }

  /* Basculer entre Email et WhatsApp */
  window.contactOnglet = function (onglet) {
    var estEmail = onglet === 'email';
    document.getElementById('contact-form-email').style.display    = estEmail ? 'block' : 'none';
    document.getElementById('contact-form-whatsapp').style.display = estEmail ? 'none'  : 'block';

    var btnEmail = document.getElementById('onglet-email-btn');
    var btnWA    = document.getElementById('onglet-whatsapp-btn');
    btnEmail.classList.toggle('actif', estEmail);
    btnWA.classList.toggle('actif', !estEmail);
  };

  /* Validation email */
  function emailOk(v) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  }

  /* Envoyer via WhatsApp */
  window.contactEnvoyerWA = function () {
    var API_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
      ? 'http://localhost:3000'
      : 'https://portfolio-backend-uaf9.onrender.com';

    var nom     = (document.getElementById('wa-nom').value     || '').trim();
    var code    = (document.getElementById('wa-pays').value    || '+229');
    var numero  = (document.getElementById('wa-numero').value  || '').trim();
    var email   = (document.getElementById('wa-email').value   || '').trim();
    var message = (document.getElementById('wa-message').value || '').trim();

    function setErrWA(id, msg) { var el = document.getElementById(id); if (el) el.textContent = msg; }
    function clearErrsWA() { ['erreur-wa-nom','erreur-wa-numero','erreur-wa-email','erreur-wa-message'].forEach(function(id){ setErrWA(id,''); }); }
    clearErrsWA();

    var err = false;
    if (!nom)              { setErrWA('erreur-wa-nom',     'Veuillez entrer votre nom.');    err = true; }
    if (email && !emailOk(email)) { setErrWA('erreur-wa-email', 'Email invalide.');          err = true; }
    if (message.length < 5){ setErrWA('erreur-wa-message', 'Message trop court.');           err = true; }
    if (err) return;

    var telComplet = '+2290158156930';
    var texte = 'Bonjour Philippe,%0aJe suis ' + encodeURIComponent(nom) + '.';
    if (email) texte += '%0aEmail : ' + encodeURIComponent(email);
    texte += '%0a%0a' + encodeURIComponent(message);

    window.open('https://wa.me/' + telComplet + '?text=' + texte, '_blank', 'noopener,noreferrer');

    /* Vider les champs */
    ['wa-nom','wa-numero','wa-email','wa-message'].forEach(function (id) {
      var el = document.getElementById(id); if (el) el.value = '';
    });
  };

})();