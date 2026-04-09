(function () {
  'use strict';

  document.addEventListener('dragstart', function (e) { e.preventDefault(); });
  document.addEventListener('contextmenu', function (e) { if (e.target.tagName === 'IMG') e.preventDefault(); });

  const API = (function () {
    const h = window.location.hostname;
    if (h === 'localhost' || h === '127.0.0.1') return 'http://localhost:3000';
    return 'https://portfolio-backend-uaf9.onrender.com';
  })();

  /* ═══════════════════════════════════════════════════
     HERO — CANVAS PARTICULES
  ═══════════════════════════════════════════════════ */
  (function () {
    var canvas = document.getElementById('hero-canvas');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var W, H, particles = [];
    var mouse = { x: null, y: null };
    var COUNT = window.innerWidth < 768 ? 35 : 65;
    var MAX_DIST = 120;
    var COLORS = ['rgba(255,107,53,', 'rgba(0,217,255,', 'rgba(168,85,247,'];

    function resize() {
      var rect = canvas.parentElement.getBoundingClientRect();
      W = canvas.width  = rect.width;
      H = canvas.height = rect.height;
    }

    function Particle() {
      this.x     = Math.random() * W;
      this.y     = Math.random() * H;
      this.vx    = (Math.random() - 0.5) * 0.4;
      this.vy    = (Math.random() - 0.5) * 0.4;
      this.r     = Math.random() * 1.5 + 0.5;
      this.color = COLORS[Math.floor(Math.random() * COLORS.length)];
    }

    function init() {
      particles = [];
      for (var i = 0; i < COUNT; i++) particles.push(new Particle());
    }

    function draw() {
      ctx.clearRect(0, 0, W, H);

      for (var i = 0; i < particles.length; i++) {
        for (var j = i + 1; j < particles.length; j++) {
          var dx = particles[i].x - particles[j].x;
          var dy = particles[i].y - particles[j].y;
          var dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < MAX_DIST) {
            ctx.beginPath();
            ctx.strokeStyle = particles[i].color + ((1 - dist / MAX_DIST) * 0.25) + ')';
            ctx.lineWidth = 0.5;
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
        if (mouse.x !== null) {
          var mdx = particles[i].x - mouse.x;
          var mdy = particles[i].y - mouse.y;
          var md  = Math.sqrt(mdx * mdx + mdy * mdy);
          if (md < 150) {
            ctx.beginPath();
            ctx.strokeStyle = 'rgba(255,107,53,' + ((1 - md / 150) * 0.4) + ')';
            ctx.lineWidth = 0.7;
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(mouse.x, mouse.y);
            ctx.stroke();
          }
        }
      }

      for (var k = 0; k < particles.length; k++) {
        var p = particles[k];
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.color + '0.7)';
        ctx.fill();
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > W) p.vx *= -1;
        if (p.y < 0 || p.y > H) p.vy *= -1;
      }

      requestAnimationFrame(draw);
    }

    resize();
    init();
    draw();

    window.addEventListener('resize', function () { resize(); init(); });

    var hero = canvas.parentElement;
    hero.addEventListener('mousemove', function (e) {
      var rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
    });
    hero.addEventListener('mouseleave', function () { mouse.x = null; mouse.y = null; });
  })();

  /* ═══════════════════════════════════════════════════
     HERO — TYPEWRITER
  ═══════════════════════════════════════════════════ */
  (function () {
    var el = document.getElementById('typewriter-text');
    if (!el) return;

    var phrases = [
      'Développeur Web',
      'Développeur Full-Stack',
      'Administrateur Réseau',
      'Étudiant ENEAM L2',
      'Builder Béninois 🇧🇯'
    ];

    var pi = 0, ci = 0, deleting = false, wait = 0;

    function tick() {
      var phrase = phrases[pi];
      if (!deleting) {
        el.textContent = phrase.slice(0, ci + 1);
        ci++;
        if (ci === phrase.length) { deleting = true; wait = 55; }
      } else {
        if (wait > 0) { wait--; setTimeout(tick, 40); return; }
        el.textContent = phrase.slice(0, ci - 1);
        ci--;
        if (ci === 0) { deleting = false; pi = (pi + 1) % phrases.length; }
      }
      setTimeout(tick, deleting ? 45 : 80);
    }

    setTimeout(tick, 1200);
  })();

  /* ═══════════════════════════════════════════════════
     HERO — SCROLL INDICATOR
  ═══════════════════════════════════════════════════ */
  (function () {
    var btn = document.getElementById('hero-scroll-btn');
    if (!btn) return;
    btn.addEventListener('click', function () {
      var cible = document.getElementById('apropos');
      if (cible) cible.scrollIntoView({ behavior: 'smooth' });
    });
  })();

  /* ═══════════════════════════════════════════════════
     NAVIGATION
  ═══════════════════════════════════════════════════ */
  document.addEventListener('DOMContentLoaded', function () {

    var entete       = document.getElementById('entete');
    var boutonMenu   = document.querySelector('.bouton-menu');
    var liensNav     = document.querySelector('.liens-nav');
    var boutonHaut   = document.querySelector('.retour-haut');
    var tousLiensNav = document.querySelectorAll('.liens-nav a');
    var formulaire   = document.getElementById('formulaireContact');

    if (boutonMenu) {
      boutonMenu.addEventListener('click', function (e) {
        e.preventDefault();
        boutonMenu.classList.toggle('ouvert');
        liensNav.classList.toggle('ouvert');
      });
    }

    tousLiensNav.forEach(function (lien) {
      lien.addEventListener('click', function () {
        boutonMenu && boutonMenu.classList.remove('ouvert');
        liensNav && liensNav.classList.remove('ouvert');
      });
    });

    window.addEventListener('resize', function () {
      if (window.innerWidth > 768) {
        boutonMenu && boutonMenu.classList.remove('ouvert');
        liensNav && liensNav.classList.remove('ouvert');
      }
    });

    document.addEventListener('click', function (e) {
      var lien = e.target.closest('a[href^="#"]');
      if (!lien) return;
      var cible = lien.getAttribute('href');
      if (!cible || cible === '#') return;
      var section = document.getElementById(cible.slice(1));
      if (!section) return;
      e.preventDefault();
      section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    window.addEventListener('scroll', function () {
      var pos = window.pageYOffset;
      if (entete)    entete.classList.toggle('defile', pos > 100);
      if (boutonHaut) boutonHaut.classList.toggle('visible', pos > 300);
    }, { passive: true });

    if (boutonHaut) {
      boutonHaut.addEventListener('click', function () {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }

    /* ── LIEN ACTIF ──────────────────────────────── */
    var sections = document.querySelectorAll('section[id]');
    function marquerLienActif() {
      var pos = window.pageYOffset;
      sections.forEach(function (section) {
        var debut = section.offsetTop - 120;
        var id    = section.getAttribute('id');
        var lien  = document.querySelector('.liens-nav a[href="#' + id + '"]');
        if (pos >= debut && pos < debut + section.offsetHeight) {
          tousLiensNav.forEach(function (l) { l.classList.remove('actif'); });
          if (lien) lien.classList.add('actif');
        }
      });
    }
    window.addEventListener('scroll', marquerLienActif, { passive: true });
    marquerLienActif();

    /* ── ANIMATIONS INTERSECTION ─────────────────── */
    if (window.IntersectionObserver) {
      var obs = new IntersectionObserver(function (entrees) {
        entrees.forEach(function (e) {
          if (e.isIntersecting) {
            e.target.style.opacity = '1';
            e.target.style.transform = 'translateY(0)';
            obs.unobserve(e.target);
          }
        });
      }, { threshold: 0.01, rootMargin: '0px 0px -50px' });

      document.querySelectorAll(
        '.carte-competence, .carte-projet, .stat-item, .item-contact, .timeline-element, .carte-experience'
      ).forEach(function (el) {
        el.style.opacity = '0';
        el.style.transform = 'translateY(8px)';
        el.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
        obs.observe(el);
      });
    }

    /* ── COMPTEURS STATS ─────────────────────────── */
    if (window.IntersectionObserver) {
      var obsStats = new IntersectionObserver(function (entrees) {
        entrees.forEach(function (e) {
          if (!e.isIntersecting) return;
          var chiffre = e.target.querySelector('.stat-chiffre');
          if (!chiffre || e.target.dataset.compteur) return;
          var val   = chiffre.textContent || '';
          var nb    = parseInt(val.replace(/\D/g, ''), 10);
          if (isNaN(nb) || nb <= 0) return;
          e.target.dataset.compteur = 'true';
          var c = 0, inc = nb / 30;
          var iv = setInterval(function () {
            c += inc;
            if (c >= nb) { c = nb; clearInterval(iv); }
            chiffre.textContent = Math.floor(c) + '+';
          }, 40);
        });
      }, { threshold: 0.5 });
      document.querySelectorAll('.stat-item').forEach(function (s) { obsStats.observe(s); });
    }

    /* ── CV ──────────────────────────────────────── */
    var btnTelecharger = document.querySelector('.bouton-telecharger-cv');
    if (btnTelecharger) {
      btnTelecharger.addEventListener('click', function () {
        afficherNotification('Téléchargement du CV en cours…', 'info');
      });
    }
    var btnVoirCv = document.querySelector('.bouton-voir-cv');
    if (btnVoirCv) {
      btnVoirCv.addEventListener('click', function (e) {
        e.preventDefault();
        window.open(btnVoirCv.getAttribute('href') || '/cv/CV_philippe_hountondji.pdf', '_blank', 'noopener,noreferrer');
      });
    }

    /* ── FORMULAIRE CONTACT ──────────────────────── */
    function nettoyerTexte(v, max) { return String(v || '').trim().slice(0, max || 2000); }
    function emailValide(e) { return /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/.test(e) && e.length <= 254; }
    function afficherErreurChamp(id, msg) { var el = document.getElementById(id); if (el) el.textContent = msg; }
    function effacerErreurs() {
      ['erreur-nom','erreur-email','erreur-telephone','erreur-message'].forEach(function (id) {
        var el = document.getElementById(id); if (el) el.textContent = '';
      });
    }

    function afficherNotification(message, type) {
      if (['succes','erreur','info'].indexOf(type) === -1) type = 'info';
      var boite = document.createElement('div');
      boite.className = 'notification notification-' + type;
      var icone = document.createElement('i');
      icone.className = 'fas ' + (type === 'succes' ? 'fa-check-circle' : type === 'erreur' ? 'fa-exclamation-circle' : 'fa-info-circle');
      var texte = document.createElement('span');
      texte.textContent = String(message).slice(0, 200);
      boite.appendChild(icone); boite.appendChild(texte);
      document.body.appendChild(boite);
      setTimeout(function () { boite.classList.add('visible'); }, 10);
      setTimeout(function () {
        boite.classList.remove('visible');
        setTimeout(function () { if (boite.parentNode) boite.parentNode.removeChild(boite); }, 300);
      }, 5000);
    }

    if (formulaire) {
      function lireDonnees() { try { return JSON.parse(sessionStorage.getItem('_e') || '{}'); } catch (e) { return {}; } }
      function sauverDonnees(d) { try { sessionStorage.setItem('_e', JSON.stringify(d)); } catch (e) {} }
      function limiteAtteinte() {
        var d = lireDonnees(), now = Date.now();
        if (now < (d.bloqueJusqu || 0)) {
          afficherNotification('Trop de tentatives. Réessayez dans ' + Math.ceil(((d.bloqueJusqu || 0) - now) / 1000) + 's.', 'erreur');
          return true;
        }
        if (now - (d.premierEnvoi || 0) > 600000) { sauverDonnees({ nb: 0, premierEnvoi: now }); return false; }
        if ((d.nb || 0) >= 3) {
          sauverDonnees({ nb: d.nb, premierEnvoi: d.premierEnvoi, bloqueJusqu: now + 120000 });
          afficherNotification('Limite atteinte. Réessayez dans 2 minutes.', 'erreur');
          return true;
        }
        return false;
      }
      function incrementerNb() {
        var d = lireDonnees(), now = Date.now();
        sauverDonnees({ nb: (d.nb||0)+1, premierEnvoi: d.premierEnvoi||now, bloqueJusqu: d.bloqueJusqu||0 });
      }

      formulaire.addEventListener('submit', function (e) {
        e.preventDefault();
        effacerErreurs();
        var piege = document.getElementById('champ-invisible');
        if (piege && piege.value) return;
        if (limiteAtteinte()) return;

        var nom     = nettoyerTexte(document.getElementById('nom').value, 100);
        var email   = nettoyerTexte(document.getElementById('email').value, 254);
        var tel     = nettoyerTexte(document.getElementById('telephone').value, 20);
        var message = nettoyerTexte(document.getElementById('message').value, 2000);

        var err = false;
        if (nom.length < 2)      { afficherErreurChamp('erreur-nom','Le nom doit contenir au moins 2 caractères.'); err = true; }
        if (!emailValide(email)) { afficherErreurChamp('erreur-email','Adresse email invalide.'); err = true; }
        if (tel && !/^\+?[0-9]{8,20}$/.test(tel)) { afficherErreurChamp('erreur-telephone','Numéro invalide.'); err = true; }
        if (message.length < 10) { afficherErreurChamp('erreur-message','Le message doit contenir au moins 10 caractères.'); err = true; }
        if (err) return;

        var bouton = formulaire.querySelector('.bouton-envoyer');
        var texteOrig = bouton.innerHTML;
        bouton.disabled = true;
        bouton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Envoi en cours…';

        fetch(API + '/api/contact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: nom, email: email, phone: tel, message: message })
        })
        .then(function (r) { return r.json().then(function (d) { return { statut: r.status, donnees: d }; }); })
        .then(function (res) {
          if (res.statut === 200 && res.donnees.success) {
            incrementerNb();
            afficherNotification('Message envoyé ! Je vous répondrai bientôt.', 'succes');
            formulaire.reset();
            bouton.innerHTML = '<i class="fas fa-check"></i> Envoyé !';
            bouton.style.background = '#10B981';
            setTimeout(function () { bouton.disabled = false; bouton.innerHTML = texteOrig; bouton.style.background = ''; }, 3000);
          } else {
            afficherNotification(String(res.donnees.error || "Erreur lors de l'envoi.").slice(0,200), 'erreur');
            bouton.disabled = false; bouton.innerHTML = texteOrig;
          }
        })
        .catch(function () {
          afficherNotification('Erreur réseau. Vérifiez votre connexion.', 'erreur');
          bouton.disabled = false; bouton.innerHTML = texteOrig;
        });
      });
    }

    /* ═══════════════════════════════════════════════
       CHARGEMENT DYNAMIQUE API
    ═══════════════════════════════════════════════ */
    function animerCarte(carte) {
      if (!window.IntersectionObserver) return;
      carte.style.opacity = '0';
      carte.style.transform = 'translateY(8px)';
      carte.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
      var o = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
            o.unobserve(entry.target);
          }
        });
      }, { threshold: 0.01 });
      o.observe(carte);
    }

    function escHtml(str) {
      return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
    }

    function chargerProjetsAPI() {
      fetch(API + '/api/projets')
        .then(function (r) { return r.json(); })
        .then(function (data) {
          if (!data.success || !data.projets || !data.projets.length) return;
          var grille = document.querySelector('.grille-projets');
          if (!grille) return;
          data.projets.forEach(function (p) {
            if (document.getElementById('projet-dyn-' + p.id)) return;
            var enCours = p.statut === 'en-cours' || p.statut === 'prevu';
            var imgHtml = p.image_url
              ? '<img src="' + escHtml(p.image_url) + '" alt="' + escHtml(p.titre) + '" loading="lazy" onerror="this.src=\'images/projets-1.jpeg\'">'
              : '<img src="images/projets-1.jpeg" alt="' + escHtml(p.titre) + '" loading="lazy">';
            var techHtml = p.technologies ? p.technologies.split(',').map(function (t) { return '<span>' + escHtml(t.trim()) + '</span>'; }).join('') : '';
            var liensHtml = enCours
              ? '<div class="mention-en-cours"><i class="fas fa-hammer"></i> En développement — bientôt disponible</div>'
              : (p.lien_site ? '<a href="' + escHtml(p.lien_site) + '" target="_blank" rel="noopener noreferrer" class="lien-projet"><i class="fas fa-external-link-alt"></i> Visiter le site</a>' : '')
                + (p.lien_github ? '<a href="' + escHtml(p.lien_github) + '" target="_blank" rel="noopener noreferrer" class="lien-projet lien-github"><i class="fab fa-github"></i> GitHub</a>' : '');
            var carte = document.createElement('div');
            carte.className = 'carte-projet' + (enCours ? ' projet-en-cours' : '');
            carte.id = 'projet-dyn-' + p.id;
            carte.innerHTML = '<div class="etiquette-projet' + (enCours ? ' etiquette-en-cours' : '') + '">' + escHtml(p.etiquette || 'Projet') + '</div>'
              + '<div class="image-projet">' + imgHtml + '</div>'
              + '<div class="infos-projet"><h3>' + escHtml(p.titre) + '</h3><p>' + escHtml(p.description) + '</p>'
              + (techHtml ? '<div class="technologies">' + techHtml + '</div>' : '')
              + '<div class="liens-projet">' + liensHtml + '</div></div>';
            grille.appendChild(carte);
            animerCarte(carte);
          });
        })
        .catch(function () {});
    }

    function chargerExperiencesAPI() {
      fetch(API + '/api/experiences')
        .then(function (r) { return r.json(); })
        .then(function (data) {
          if (!data.success || !data.experiences || !data.experiences.length) return;
          var grille = document.querySelector('.grille-experience');
          if (!grille) return;
          data.experiences.forEach(function (exp) {
            if (document.getElementById('exp-dyn-' + exp.id)) return;
            var recherche = exp.statut === 'recherche';
            var prevu     = exp.statut === 'prevu';
            var badgeHtml = recherche
              ? '<div class="badge-recherche"><span class="point-vert"></span> En recherche active</div>'
              : prevu ? '<div class="badge-prevu"><span class="point-orange"></span> Prévu</div>' : '';
            var tagsHtml = exp.tags
              ? '<div class="tags-competences">' + exp.tags.split(',').map(function (t) { return '<span>' + escHtml(t.trim()) + '</span>'; }).join('') + '</div>'
              : '';
            var carte = document.createElement('div');
            carte.className = 'carte-experience' + (recherche ? ' recherche' : '') + (prevu ? ' prevu' : '');
            carte.id = 'exp-dyn-' + exp.id;
            carte.innerHTML = badgeHtml
              + '<div class="icone-experience"><i class="fas ' + (recherche ? 'fa-search' : prevu ? 'fa-clock' : 'fa-briefcase') + '"></i></div>'
              + '<div class="contenu-experience"><h3>' + escHtml(exp.titre) + '</h3>'
              + (exp.type_exp ? '<span class="type-experience"><i class="fas fa-briefcase"></i> ' + escHtml(exp.type_exp) + '</span>' : '')
              + (exp.lieu ? '<span class="lieu-experience"><i class="fas fa-map-marker-alt"></i> ' + escHtml(exp.lieu) + '</span>' : '')
              + (exp.date_debut ? '<span class="date-experience"><i class="fas fa-calendar-alt"></i> ' + escHtml(exp.date_debut) + (exp.date_fin ? ' → ' + escHtml(exp.date_fin) : '') + '</span>' : '')
              + (exp.description ? '<p>' + escHtml(exp.description) + '</p>' : '')
              + tagsHtml + '</div>';
            grille.appendChild(carte);
            animerCarte(carte);
          });
        })
        .catch(function () {});
    }

    function chargerCompetencesAPI() {
      fetch(API + '/api/competences')
        .then(function (r) { return r.json(); })
        .then(function (data) {
          if (!data.success || !data.competences || !data.competences.length) return;
          var grille = document.querySelector('.grille-competences');
          if (!grille) return;
          data.competences.forEach(function (c) {
            if (document.getElementById('comp-dyn-' + c.id)) return;
            var itemsHtml = c.items ? c.items.split('\n').map(function (ligne) {
              var parts = ligne.split('|');
              var icone = parts[0] ? parts[0].trim() : 'fas fa-circle';
              var nom   = parts[1] ? parts[1].trim() : ligne.trim();
              return '<li><i class="' + escHtml(icone) + '"></i> <strong>' + escHtml(nom) + '</strong></li>';
            }).join('') : '';
            var carte = document.createElement('div');
            carte.className = 'carte-competence';
            carte.id = 'comp-dyn-' + c.id;
            carte.innerHTML = '<div class="entete-competence"><div class="icone-competence" style="background:' + escHtml(c.couleur || 'var(--orange)') + '"><i class="' + escHtml(c.icone || 'fas fa-code') + '"></i></div><h3>' + escHtml(c.categorie) + '</h3></div>'
              + (itemsHtml ? '<ul>' + itemsHtml + '</ul>' : '')
              + '<div class="barre-niveau"><div class="barre-progression" style="position:relative;height:6px;background:rgba(255,255,255,0.1);border-radius:9999px;overflow:hidden;margin-bottom:0.5rem"><div style="position:absolute;top:0;left:0;height:100%;width:' + (c.niveau || 70) + '%;background:linear-gradient(135deg,#FF6B35,#F7931E);border-radius:9999px"></div></div><span>' + escHtml(c.label_niveau || (c.niveau + '%')) + '</span></div>';
            grille.appendChild(carte);
            animerCarte(carte);
          });
        })
        .catch(function () {});
    }

    chargerProjetsAPI();
    chargerExperiencesAPI();
    chargerCompetencesAPI();

    /* ── STYLES NOTIFICATIONS ─────────────────────── */
    if (!document.getElementById('styles-notif')) {
      var feuille = document.createElement('style');
      feuille.id = 'styles-notif';
      feuille.textContent = '.notification{position:fixed;top:-100px;right:20px;background:rgba(10,14,39,.97);color:#fff;padding:1rem 1.5rem;border-radius:12px;box-shadow:0 8px 32px rgba(0,0,0,.5);display:flex;align-items:center;gap:.75rem;z-index:10000;min-width:300px;max-width:500px;transition:transform .3s cubic-bezier(.4,0,.2,1);border:1px solid rgba(255,255,255,.1)}.notification.visible{transform:translateY(120px)}.notification-succes{border-left:4px solid #10B981}.notification-erreur{border-left:4px solid #EF4444}.notification-info{border-left:4px solid #00D9FF}.notification i{font-size:1.25rem}.notification-succes i{color:#10B981}.notification-erreur i{color:#EF4444}.notification-info i{color:#00D9FF}.notification span{flex:1;font-weight:500}@media(max-width:768px){.notification{right:10px;left:10px;min-width:auto}}';
      document.head.appendChild(feuille);
    }

  }); // fin DOMContentLoaded

  function escHtml(str) {
    return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }

})();