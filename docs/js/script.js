(function () {
  'use strict';

  document.addEventListener('dragstart', function (e) { e.preventDefault(); });
  document.addEventListener('contextmenu', function (e) { if (e.target.tagName === 'IMG') e.preventDefault(); });

  const API = (function () {
    const h = window.location.hostname;
    if (h === 'localhost' || h === '127.0.0.1') return 'http://localhost:3000';
    return 'https://portfolio-backend-uaf9.onrender.com';
  })();

  document.addEventListener('DOMContentLoaded', function () {

    /* ── NAVIGATION ────────────────────────────────────────────── */
    const entete       = document.getElementById('entete');
    const boutonMenu   = document.querySelector('.bouton-menu');
    const liensNav     = document.querySelector('.liens-nav');
    const boutonHaut   = document.querySelector('.retour-haut');
    const tousLiensNav = document.querySelectorAll('.liens-nav a');
    const formulaire   = document.getElementById('formulaireContact');

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
      var position = window.pageYOffset;
      if (entete) entete.classList.toggle('defile', position > 100);
      if (boutonHaut) boutonHaut.classList.toggle('visible', position > 300);
    }, { passive: true });

    if (boutonHaut) {
      boutonHaut.addEventListener('click', function () {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }

    /* ── LIEN ACTIF ──────────────────────────────────────────── */
    var sections = document.querySelectorAll('section[id]');
    function marquerLienActif() {
      var positionActuelle = window.pageYOffset;
      sections.forEach(function (section) {
        var debut = section.offsetTop - 120;
        var id = section.getAttribute('id');
        var lien = document.querySelector('.liens-nav a[href="#' + id + '"]');
        if (positionActuelle >= debut && positionActuelle < debut + section.offsetHeight) {
          tousLiensNav.forEach(function (l) { l.classList.remove('actif'); });
          if (lien) lien.classList.add('actif');
        }
      });
    }
    window.addEventListener('scroll', marquerLienActif, { passive: true });
    marquerLienActif();

    /* ── ANIMATIONS INTERSECTION ─────────────────────────────── */
    if (window.IntersectionObserver) {
      var observateur = new IntersectionObserver(function (entrees) {
        entrees.forEach(function (entree) {
          if (entree.isIntersecting) {
            entree.target.style.opacity = '1';
            entree.target.style.transform = 'translateY(0)';
            observateur.unobserve(entree.target);
          }
        });
      }, { threshold: 0.01, rootMargin: '0px 0px -50px' });

      document.querySelectorAll('.carte-competence, .carte-projet, .stat-item, .item-contact, .timeline-element, .carte-experience').forEach(function (el) {
        el.style.opacity = '0';
        el.style.transform = 'translateY(8px)';
        el.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
        observateur.observe(el);
      });
    }

    /* ── COMPTEURS STATS ─────────────────────────────────────── */
    if (window.IntersectionObserver) {
      var observateurStats = new IntersectionObserver(function (entrees) {
        entrees.forEach(function (entree) {
          if (!entree.isIntersecting) return;
          var chiffre = entree.target.querySelector('.stat-chiffre');
          if (!chiffre || entree.target.dataset.compteur) return;
          var valeur = chiffre.textContent || '';
          var nombre = parseInt(valeur.replace(/\D/g, ''), 10);
          if (isNaN(nombre) || nombre <= 0) return;
          entree.target.dataset.compteur = 'true';
          var compteur = 0, increment = nombre / 30;
          var intervalle = setInterval(function () {
            compteur += increment;
            if (compteur >= nombre) { compteur = nombre; clearInterval(intervalle); }
            chiffre.textContent = Math.floor(compteur) + '+';
          }, 40);
        });
      }, { threshold: 0.5 });
      document.querySelectorAll('.stat-item').forEach(function (s) { observateurStats.observe(s); });
    }

    /* ── CV ──────────────────────────────────────────────────── */
    var boutonTelecharger = document.querySelector('.bouton-telecharger-cv');
    if (boutonTelecharger) {
      boutonTelecharger.addEventListener('click', function () {
        afficherNotification('Téléchargement du CV en cours…', 'info');
      });
    }

    var boutonVoirCv = document.querySelector('.bouton-voir-cv');
    if (boutonVoirCv) {
      boutonVoirCv.addEventListener('click', function (e) {
        e.preventDefault();
        var lienCv = boutonVoirCv.getAttribute('href') || '/cv/CV_philippe_hountondji.pdf';
        window.open(lienCv, '_blank', 'noopener,noreferrer');
      });
    }

    /* ── FORMULAIRE CONTACT ──────────────────────────────────── */
    function nettoyerTexte(v, max) { return String(v || '').trim().slice(0, max || 2000); }
    function emailValide(e) { return /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/.test(e) && e.length <= 254; }
    function afficherErreurChamp(id, msg) { var el = document.getElementById(id); if (el) el.textContent = msg; }
    function effacerErreurs() {
      ['erreur-nom','erreur-email','erreur-telephone','erreur-message'].forEach(function(id) {
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
      setTimeout(function () { boite.classList.remove('visible'); setTimeout(function () { if (boite.parentNode) boite.parentNode.removeChild(boite); }, 300); }, 5000);
    }

    if (formulaire) {
      function lireDonneesEnvoi() { try { return JSON.parse(sessionStorage.getItem('_e') || '{}'); } catch (e) { return {}; } }
      function sauverDonneesEnvoi(d) { try { sessionStorage.setItem('_e', JSON.stringify(d)); } catch (e) {} }
      function limiteAtteinte() {
        var d = lireDonneesEnvoi(), maintenant = Date.now();
        if (maintenant < (d.bloqueJusqu || 0)) {
          afficherNotification('Trop de tentatives. Réessayez dans ' + Math.ceil(((d.bloqueJusqu || 0) - maintenant) / 1000) + 's.', 'erreur');
          return true;
        }
        if (maintenant - (d.premierEnvoi || 0) > 600000) { sauverDonneesEnvoi({ nb: 0, premierEnvoi: maintenant }); return false; }
        if ((d.nb || 0) >= 3) {
          sauverDonneesEnvoi({ nb: d.nb, premierEnvoi: d.premierEnvoi, bloqueJusqu: maintenant + 120000 });
          afficherNotification('Limite atteinte. Réessayez dans 2 minutes.', 'erreur');
          return true;
        }
        return false;
      }
      function incrementerNb() {
        var d = lireDonneesEnvoi(), maintenant = Date.now();
        sauverDonneesEnvoi({ nb: (d.nb||0)+1, premierEnvoi: d.premierEnvoi||maintenant, bloqueJusqu: d.bloqueJusqu||0 });
      }

      formulaire.addEventListener('submit', function (e) {
        e.preventDefault();
        effacerErreurs();
        var piegeBot = document.getElementById('champ-invisible');
        if (piegeBot && piegeBot.value) return;
        if (limiteAtteinte()) return;

        var nom     = nettoyerTexte(document.getElementById('nom').value, 100);
        var email   = nettoyerTexte(document.getElementById('email').value, 254);
        var tel     = nettoyerTexte(document.getElementById('telephone').value, 20);
        var message = nettoyerTexte(document.getElementById('message').value, 2000);

        var erreur = false;
        if (nom.length < 2)       { afficherErreurChamp('erreur-nom','Le nom doit contenir au moins 2 caractères.'); erreur = true; }
        if (!emailValide(email))  { afficherErreurChamp('erreur-email','Adresse email invalide.'); erreur = true; }
        if (tel && !/^\+?[0-9]{8,20}$/.test(tel)) { afficherErreurChamp('erreur-telephone','Numéro invalide.'); erreur = true; }
        if (message.length < 10)  { afficherErreurChamp('erreur-message','Le message doit contenir au moins 10 caractères.'); erreur = true; }
        if (erreur) return;

        var bouton = formulaire.querySelector('.bouton-envoyer');
        var texteOriginal = bouton.innerHTML;
        bouton.disabled = true;
        bouton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Envoi en cours…';

        fetch(API + '/api/contact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: nom, email: email, phone: tel, message: message })
        })
        .then(function (r) { return r.json().then(function (d) { return { statut: r.status, donnees: d }; }); })
        .then(function (resultat) {
          if (resultat.statut === 200 && resultat.donnees.success) {
            incrementerNb();
            afficherNotification('Message envoyé ! Je vous répondrai bientôt.', 'succes');
            formulaire.reset();
            bouton.innerHTML = '<i class="fas fa-check"></i> Envoyé !';
            bouton.style.background = '#10B981';
            setTimeout(function () { bouton.disabled = false; bouton.innerHTML = texteOriginal; bouton.style.background = ''; }, 3000);
          } else {
            afficherNotification(String(resultat.donnees.error || "Erreur lors de l'envoi.").slice(0,200), 'erreur');
            bouton.disabled = false; bouton.innerHTML = texteOriginal;
          }
        })
        .catch(function () {
          afficherNotification('Erreur réseau. Vérifiez votre connexion.', 'erreur');
          bouton.disabled = false; bouton.innerHTML = texteOriginal;
        });
      });
    }

    /* ══════════════════════════════════════════════════════════
       CHARGEMENT DYNAMIQUE DEPUIS L'API
    ══════════════════════════════════════════════════════════ */

    /**
     * PROJETS DYNAMIQUES
     * Charge les projets ajoutés via l'admin et les insère dans la grille
     */
    function chargerProjetsAPI() {
      fetch(API + '/api/projets')
        .then(function (r) { return r.json(); })
        .then(function (data) {
          if (!data.success || !data.projets || !data.projets.length) return;
          var grille = document.querySelector('.grille-projets');
          if (!grille) return;

          data.projets.forEach(function (p) {
            // Eviter doublons si rechargé
            if (document.getElementById('projet-dyn-' + p.id)) return;

            var statut = p.statut || 'termine';
            var enCours = statut === 'en-cours' || statut === 'prevu';
            var imgHtml = p.image_url
              ? `<img src="${escHtml(p.image_url)}" alt="${escHtml(p.titre)}" loading="lazy" onerror="this.src='images/projets-1.jpeg'">`
              : `<img src="images/projets-1.jpeg" alt="${escHtml(p.titre)}" loading="lazy">`;

            var techHtml = '';
            if (p.technologies) {
              techHtml = p.technologies.split(',').map(function (t) {
                return `<span>${escHtml(t.trim())}</span>`;
              }).join('');
            }

            var liensHtml = '';
            if (enCours) {
              liensHtml = `<div class="mention-en-cours"><i class="fas fa-hammer"></i> En développement — bientôt disponible</div>`;
            } else {
              if (p.lien_site) liensHtml += `<a href="${escHtml(p.lien_site)}" target="_blank" rel="noopener noreferrer" class="lien-projet"><i class="fas fa-external-link-alt"></i> Visiter le site</a>`;
              if (p.lien_github) liensHtml += `<a href="${escHtml(p.lien_github)}" target="_blank" rel="noopener noreferrer" class="lien-projet lien-github"><i class="fab fa-github"></i> GitHub</a>`;
            }

            var carte = document.createElement('div');
            carte.className = 'carte-projet' + (enCours ? ' projet-en-cours' : '');
            carte.id = 'projet-dyn-' + p.id;
            carte.innerHTML = `
              <div class="etiquette-projet${enCours ? ' etiquette-en-cours' : ''}">${escHtml(p.etiquette || 'Projet')}</div>
              <div class="image-projet">${imgHtml}</div>
              <div class="infos-projet">
                <h3>${escHtml(p.titre)}</h3>
                <p>${escHtml(p.description)}</p>
                ${techHtml ? `<div class="technologies">${techHtml}</div>` : ''}
                <div class="liens-projet">${liensHtml}</div>
              </div>`;

            grille.appendChild(carte);

            // Animer si IntersectionObserver actif
            if (window.IntersectionObserver) {
              carte.style.opacity = '0';
              carte.style.transform = 'translateY(8px)';
              carte.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
              var obs = new IntersectionObserver(function (entries) {
                entries.forEach(function (entry) {
                  if (entry.isIntersecting) { entry.target.style.opacity = '1'; entry.target.style.transform = 'translateY(0)'; obs.unobserve(entry.target); }
                });
              }, { threshold: 0.01 });
              obs.observe(carte);
            }
          });
        })
        .catch(function () {}); // silencieux si API hors ligne
    }

    /**
     * EXPÉRIENCES DYNAMIQUES
     */
    function chargerExperiencesAPI() {
      fetch(API + '/api/experiences')
        .then(function (r) { return r.json(); })
        .then(function (data) {
          if (!data.success || !data.experiences || !data.experiences.length) return;
          var grille = document.querySelector('.grille-experience');
          if (!grille) return;

          data.experiences.forEach(function (exp) {
            if (document.getElementById('exp-dyn-' + exp.id)) return;

            var statut = exp.statut || 'termine';
            var enCours = statut === 'en-cours';
            var prevu   = statut === 'prevu';
            var recherche = statut === 'recherche';

            var badgeHtml = '';
            if (recherche) badgeHtml = `<div class="badge-recherche"><span class="point-vert"></span> En recherche active</div>`;
            else if (prevu) badgeHtml = `<div class="badge-prevu"><span class="point-orange"></span> Prévu</div>`;

            var tagsHtml = '';
            if (exp.tags) {
              tagsHtml = `<div class="tags-competences">${exp.tags.split(',').map(function(t){return `<span>${escHtml(t.trim())}</span>`;}).join('')}</div>`;
            }

            var iconeClass = prevu ? 'icone-prevu' : (recherche ? '' : '');
            var iconeI = recherche ? 'fa-search' : prevu ? 'fa-clock' : 'fa-briefcase';

            var carte = document.createElement('div');
            carte.className = 'carte-experience' + (recherche ? ' recherche' : '') + (prevu ? ' prevu' : '');
            carte.id = 'exp-dyn-' + exp.id;
            carte.innerHTML = `
              ${badgeHtml}
              <div class="icone-experience ${iconeClass}"><i class="fas ${iconeI}"></i></div>
              <div class="contenu-experience">
                <h3>${escHtml(exp.titre)}</h3>
                ${exp.type_exp ? `<span class="type-experience"><i class="fas fa-briefcase"></i> ${escHtml(exp.type_exp)}</span>` : ''}
                ${exp.lieu ? `<span class="lieu-experience"><i class="fas fa-map-marker-alt"></i> ${escHtml(exp.lieu)}</span>` : ''}
                ${exp.date_debut ? `<span class="date-experience"><i class="fas fa-calendar-alt"></i> ${escHtml(exp.date_debut)}${exp.date_fin ? ' → ' + escHtml(exp.date_fin) : ''}</span>` : ''}
                ${exp.description ? `<p>${escHtml(exp.description)}</p>` : ''}
                ${tagsHtml}
              </div>`;

            grille.appendChild(carte);

            if (window.IntersectionObserver) {
              carte.style.opacity = '0';
              carte.style.transform = 'translateY(8px)';
              carte.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
              var obs = new IntersectionObserver(function (entries) {
                entries.forEach(function (entry) {
                  if (entry.isIntersecting) { entry.target.style.opacity = '1'; entry.target.style.transform = 'translateY(0)'; obs.unobserve(entry.target); }
                });
              }, { threshold: 0.01 });
              obs.observe(carte);
            }
          });
        })
        .catch(function () {});
    }

    /**
     * COMPÉTENCES DYNAMIQUES
     */
    function chargerCompetencesAPI() {
      fetch(API + '/api/competences')
        .then(function (r) { return r.json(); })
        .then(function (data) {
          if (!data.success || !data.competences || !data.competences.length) return;
          var grille = document.querySelector('.grille-competences');
          if (!grille) return;

          data.competences.forEach(function (c) {
            if (document.getElementById('comp-dyn-' + c.id)) return;

            var itemsHtml = '';
            if (c.items) {
              itemsHtml = c.items.split('\n').map(function (ligne) {
                var parts = ligne.split('|');
                var icone = parts[0] ? parts[0].trim() : 'fas fa-circle';
                var nom   = parts[1] ? parts[1].trim() : ligne.trim();
                return `<li><i class="${escHtml(icone)}"></i> <strong>${escHtml(nom)}</strong></li>`;
              }).join('');
            }

            var carte = document.createElement('div');
            carte.className = 'carte-competence';
            carte.id = 'comp-dyn-' + c.id;
            carte.innerHTML = `
              <div class="entete-competence">
                <div class="icone-competence" style="background:${escHtml(c.couleur||'var(--orange)')}">
                  <i class="${escHtml(c.icone||'fas fa-code')}"></i>
                </div>
                <h3>${escHtml(c.categorie)}</h3>
              </div>
              ${itemsHtml ? `<ul>${itemsHtml}</ul>` : ''}
              <div class="barre-niveau">
                <div class="barre-progression" style="position:relative;height:6px;background:rgba(255,255,255,0.1);border-radius:9999px;overflow:hidden;margin-bottom:0.5rem">
                  <div style="position:absolute;top:0;left:0;height:100%;width:${c.niveau||70}%;background:linear-gradient(135deg,#FF6B35,#F7931E);border-radius:9999px"></div>
                </div>
                <span>${escHtml(c.label_niveau || (c.niveau + '%'))}</span>
              </div>`;

            grille.appendChild(carte);

            if (window.IntersectionObserver) {
              carte.style.opacity = '0';
              carte.style.transform = 'translateY(8px)';
              carte.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
              var obs = new IntersectionObserver(function (entries) {
                entries.forEach(function (entry) {
                  if (entry.isIntersecting) { entry.target.style.opacity = '1'; entry.target.style.transform = 'translateY(0)'; obs.unobserve(entry.target); }
                });
              }, { threshold: 0.01 });
              obs.observe(carte);
            }
          });
        })
        .catch(function () {});
    }

    /* Lancer les 3 chargements dynamiques */
    chargerProjetsAPI();
    chargerExperiencesAPI();
    chargerCompetencesAPI();

    /* ── STYLES NOTIFICATIONS ────────────────────────────────── */
    if (!document.getElementById('styles-notif')) {
      var feuille = document.createElement('style');
      feuille.id = 'styles-notif';
      feuille.textContent = '.notification{position:fixed;top:-100px;right:20px;background:rgba(10,14,39,.97);color:#fff;padding:1rem 1.5rem;border-radius:12px;box-shadow:0 8px 32px rgba(0,0,0,.5);display:flex;align-items:center;gap:.75rem;z-index:10000;min-width:300px;max-width:500px;transition:transform .3s cubic-bezier(.4,0,.2,1);border:1px solid rgba(255,255,255,.1)}.notification.visible{transform:translateY(120px)}.notification-succes{border-left:4px solid #10B981}.notification-erreur{border-left:4px solid #EF4444}.notification-info{border-left:4px solid #00D9FF}.notification i{font-size:1.25rem}.notification-succes i{color:#10B981}.notification-erreur i{color:#EF4444}.notification-info i{color:#00D9FF}.notification span{flex:1;font-weight:500}.compteur-chars{font-size:.875rem;margin-top:.5rem;text-align:right}@media(max-width:768px){.notification{right:10px;left:10px;min-width:auto}}';
      document.head.appendChild(feuille);
    }

  });

  function escHtml(str) {
    return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }

})();