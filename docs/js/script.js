(function () {
  'use strict';

  document.addEventListener('dragstart', function (e) { e.preventDefault(); });
  document.addEventListener('contextmenu', function (e) { if (e.target.tagName === 'IMG') e.preventDefault(); });

  document.addEventListener('DOMContentLoaded', function () {

    var urlApi = (function () {
      var hote = window.location.hostname;
      if (hote === 'localhost' || hote === '127.0.0.1') return 'http://localhost:3000';
      return 'https://portfolio-backend-uaf9.onrender.com';
    })();

    var entete         = document.getElementById('entete');
    var boutonMenu     = document.querySelector('.bouton-menu');
    var liensNav       = document.querySelector('.liens-nav');
    var boutonHaut     = document.querySelector('.retour-haut');
    var tousLiensNav   = document.querySelectorAll('.liens-nav a');
    var formulaire     = document.getElementById('formulaireContact');

    if (boutonMenu) {
      boutonMenu.addEventListener('click', function (e) {
        e.preventDefault();
        boutonMenu.classList.toggle('ouvert');
        liensNav.classList.toggle('ouvert');
      });
    }

    tousLiensNav.forEach(function (lien) {
      lien.addEventListener('click', function () {
        boutonMenu.classList.remove('ouvert');
        liensNav.classList.remove('ouvert');
      });
    });

    window.addEventListener('resize', function () {
      if (window.innerWidth > 768) {
        if (boutonMenu) boutonMenu.classList.remove('ouvert');
        if (liensNav) liensNav.classList.remove('ouvert');
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

      var observateurCv = new IntersectionObserver(function (entrees) {
        entrees.forEach(function (entree) {
          if (entree.isIntersecting) {
            entree.target.style.opacity = '1';
            entree.target.style.transform = 'translateY(0)';
            observateurCv.unobserve(entree.target);
          }
        });
      }, { threshold: 0.05 });

      document.querySelectorAll('.bloc-cv').forEach(function (el) {
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
        el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
        observateurCv.observe(el);
      });
    }

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
        if (/^https?:\/\//i.test(lienCv) && lienCv.indexOf(window.location.origin) !== 0) return;
        if (lienCv.charAt(0) !== '/') lienCv = '/' + lienCv;
        window.open(lienCv, '_blank', 'noopener,noreferrer');
      });
    }

    function nettoyerTexte(valeur, longueurMax) {
      longueurMax = longueurMax || 2000;
      return String(valeur || '').trim().slice(0, longueurMax);
    }

    function emailValide(email) {
      return /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/.test(email)
        && email.length <= 254
        && email.indexOf('..') === -1;
    }

    function afficherErreurChamp(id, message) {
      var el = document.getElementById(id);
      if (el) el.textContent = message;
    }

    function effacerErreurs() {
      ['erreur-nom', 'erreur-email', 'erreur-telephone', 'erreur-message'].forEach(function (id) {
        var el = document.getElementById(id);
        if (el) el.textContent = '';
      });
    }

    function afficherNotification(message, type) {
      if (['succes', 'erreur', 'info'].indexOf(type) === -1) type = 'info';
      var boite = document.createElement('div');
      boite.className = 'notification notification-' + type;
      var icone = document.createElement('i');
      icone.className = 'fas ' + (type === 'succes' ? 'fa-check-circle' : type === 'erreur' ? 'fa-exclamation-circle' : 'fa-info-circle');
      var texte = document.createElement('span');
      texte.textContent = String(message).slice(0, 200);
      boite.appendChild(icone);
      boite.appendChild(texte);
      document.body.appendChild(boite);
      setTimeout(function () { boite.classList.add('visible'); }, 10);
      setTimeout(function () {
        boite.classList.remove('visible');
        setTimeout(function () { if (boite.parentNode) boite.parentNode.removeChild(boite); }, 300);
      }, 5000);
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
        sauverDonneesEnvoi({ nb: (d.nb || 0) + 1, premierEnvoi: d.premierEnvoi || maintenant, bloqueJusqu: d.bloqueJusqu || 0 });
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
        if (nom.length < 2)       { afficherErreurChamp('erreur-nom',       'Le nom doit contenir au moins 2 caractères.'); erreur = true; }
        if (!emailValide(email))  { afficherErreurChamp('erreur-email',     'Adresse email invalide.'); erreur = true; }
        if (tel && !/^\+?[0-9]{8,20}$/.test(tel)) { afficherErreurChamp('erreur-telephone', 'Numéro invalide (8–20 chiffres).'); erreur = true; }
        if (message.length < 10)  { afficherErreurChamp('erreur-message',   'Le message doit contenir au moins 10 caractères.'); erreur = true; }
        if (erreur) return;

        var bouton = formulaire.querySelector('.bouton-envoyer');
        var texteOriginal = bouton.innerHTML;
        bouton.disabled = true;
        bouton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Envoi en cours…';

        fetch(urlApi + '/api/contact', {
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
            afficherNotification(String(resultat.donnees.error || "Erreur lors de l'envoi.").slice(0, 200), 'erreur');
            bouton.disabled = false;
            bouton.innerHTML = texteOriginal;
          }
        })
        .catch(function () {
          afficherNotification('Erreur réseau. Vérifiez votre connexion.', 'erreur');
          bouton.disabled = false;
          bouton.innerHTML = texteOriginal;
        });
      });

      var champNom = document.getElementById('nom');
      if (champNom) {
        champNom.addEventListener('blur', function () {
          this.style.borderColor = (this.value.trim().length > 0 && this.value.trim().length < 2) ? '#EF4444' : '';
        });
      }

      var champEmail = document.getElementById('email');
      if (champEmail) {
        champEmail.addEventListener('blur', function () {
          this.style.borderColor = (this.value.trim() && !emailValide(this.value.trim())) ? '#EF4444' : '';
        });
      }

      var champMessage = document.getElementById('message');
      if (champMessage) {
        champMessage.addEventListener('input', function () {
          var longueur = this.value.length;
          var max = 2000;
          var compteur = this.parentElement.querySelector('.compteur-chars');
          if (!compteur) {
            compteur = document.createElement('div');
            compteur.className = 'compteur-chars';
            this.parentElement.appendChild(compteur);
          }
          compteur.textContent = longueur + ' / ' + max + ' caractères';
          compteur.style.color = longueur > max ? '#EF4444' : longueur > max * 0.9 ? '#F59E0B' : '#6B7280';
          this.style.borderColor = longueur > max ? '#EF4444' : '';
        });
      }
    }

    marquerLienActif();

    if (!document.getElementById('styles-notif')) {
      var feuille = document.createElement('style');
      feuille.id = 'styles-notif';
      feuille.textContent = '.notification{position:fixed;top:-100px;right:20px;background:rgba(10,14,39,.97);color:#fff;padding:1rem 1.5rem;border-radius:12px;box-shadow:0 8px 32px rgba(0,0,0,.5);display:flex;align-items:center;gap:.75rem;z-index:10000;min-width:300px;max-width:500px;transition:transform .3s cubic-bezier(.4,0,.2,1);border:1px solid rgba(255,255,255,.1)}.notification.visible{transform:translateY(120px)}.notification-succes{border-left:4px solid #10B981}.notification-erreur{border-left:4px solid #EF4444}.notification-info{border-left:4px solid #00D9FF}.notification i{font-size:1.25rem}.notification-succes i{color:#10B981}.notification-erreur i{color:#EF4444}.notification-info i{color:#00D9FF}.notification span{flex:1;font-weight:500}.compteur-chars{font-size:.875rem;margin-top:.5rem;text-align:right}@media(max-width:768px){.notification{right:10px;left:10px;min-width:auto}}';
      document.head.appendChild(feuille);
    }

  });
})();