(function () {
  'use strict';

  if (typeof Chart === 'undefined') {
    var scriptGraphique = document.createElement('script');
    scriptGraphique.src = 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.0/chart.umd.min.js';
    document.head.appendChild(scriptGraphique);
  }

  var urlApi          = 'https://portfolio-backend-uaf9.onrender.com';
  var urlPortfolio    = 'https://philippe554-del.github.io/Portfolio-/';
  var emailAdmin      = 'hountondjiphilippe58@gmail.com';
  var cleToken        = '_adm_tk';

  var idMessageActuel   = null;
  var donneesMessageActuel = null;
  var graphiqueMessages = null;
  var graphiqueStatuts  = null;
  var timerRecherche    = null;

  function lireToken() {
    try { return sessionStorage.getItem(cleToken) || localStorage.getItem(cleToken) || null; }
    catch (e) { return null; }
  }

  function sauverToken(token, seRappeler) {
    try {
      if (seRappeler) { localStorage.setItem(cleToken, token); sessionStorage.removeItem(cleToken); }
      else            { sessionStorage.setItem(cleToken, token); localStorage.removeItem(cleToken); }
    } catch (e) {}
  }

  function supprimerToken() {
    try { sessionStorage.removeItem(cleToken); localStorage.removeItem(cleToken); } catch (e) {}
  }

  function requeteApi(methode, chemin, corps) {
    var options = { method: methode, headers: { 'Content-Type': 'application/json' } };
    var tok = lireToken();
    if (tok)   options.headers['Authorization'] = 'Bearer ' + tok;
    if (corps) options.body = JSON.stringify(corps);
    return fetch(urlApi + chemin, options)
      .then(function (reponse) {
        if (reponse.status === 401) { deconnecter(); return Promise.reject(new Error('Session expirée.')); }
        return reponse.json().then(function (donnees) { return { statut: reponse.status, donnees: donnees }; });
      })
      .catch(function (err) { return Promise.reject(err); });
  }

  function afficherNotification(texte, type) {
    type = type || 'info';
    var boite = document.createElement('div');
    boite.className = 'notif-flottante notif-' + type;
    boite.innerHTML =
      '<i class="fas fa-' + (type === 'succes' ? 'check-circle' : type === 'erreur' ? 'exclamation-circle' : 'info-circle') + '"></i>' +
      '<span>' + echapper(String(texte).slice(0, 200)) + '</span>';
    document.body.appendChild(boite);
    setTimeout(function () { boite.classList.add('visible'); }, 10);
    setTimeout(function () {
      boite.classList.remove('visible');
      setTimeout(function () { if (boite.parentNode) boite.parentNode.removeChild(boite); }, 300);
    }, 4000);
  }

  function verifierSession() {
    if (!lireToken()) { afficherPageConnexion(); } else { afficherTableauBord(); }
  }

  function afficherPageConnexion() {
    var pageConnexion = document.getElementById('page-connexion');
    var tableauBord   = document.getElementById('tableau-bord');
    if (tableauBord) { tableauBord.style.display = 'none'; tableauBord.classList.add('masque'); }
    if (pageConnexion) {
      pageConnexion.style.cssText = 'display:flex;position:fixed;top:0;left:0;width:100%;height:100%;z-index:9999;background:var(--fond-principal,#0A0E27);';
    }
    if (graphiqueMessages) { graphiqueMessages.destroy(); graphiqueMessages = null; }
    if (graphiqueStatuts)  { graphiqueStatuts.destroy();  graphiqueStatuts  = null; }
  }

  function afficherTableauBord() {
    var pageConnexion = document.getElementById('page-connexion');
    var tableauBord   = document.getElementById('tableau-bord');
    if (pageConnexion) pageConnexion.style.display = 'none';
    if (tableauBord) {
      tableauBord.classList.remove('masque');
      tableauBord.style.display = 'flex';
      tableauBord.style.zIndex  = '';
    }
    ajouterBoutonPortfolio();
    setTimeout(function () {
      chargerDonneesAccueil();
      actualiserCompteur();
    }, 100);
    afficherNotification('Connexion réussie !', 'succes');
  }

  function deconnecter() {
    if (lireToken()) { requeteApi('POST', '/api/admin/logout').catch(function () {}); }
    supprimerToken();
    afficherPageConnexion();
    afficherNotification('Déconnexion réussie', 'info');
  }

  function ajouterBoutonPortfolio() {
    var piedBarre = document.querySelector('.pied-barre');
    if (!piedBarre) return;
    if (document.getElementById('lien-portfolio')) return;

    var bouton = document.createElement('button');
    bouton.id        = 'lien-portfolio';
    bouton.className = 'bouton-retour-portfolio';
    bouton.innerHTML = '<i class="fas fa-arrow-left"></i> <span>Retour au Portfolio</span>';
    bouton.addEventListener('click', function () { window.location.href = urlPortfolio; });

    var btnDeconnexion = document.getElementById('btn-deconnexion');
    piedBarre.insertBefore(bouton, btnDeconnexion);
  }

  var formulaireConnexion = document.getElementById('formulaire-connexion');
  if (formulaireConnexion) {
    formulaireConnexion.addEventListener('submit', function (e) {
      e.preventDefault();
      var email     = document.getElementById('champ-email').value.trim();
      var motdepasse = document.getElementById('champ-motdepasse').value;
      var seRappeler = document.getElementById('se-souvenir') ? document.getElementById('se-souvenir').checked : false;
      var erreurEl  = document.getElementById('erreur-connexion');
      var bouton    = formulaireConnexion.querySelector('.bouton-connexion');

      if (!email || !motdepasse) { return; }

      erreurEl.style.display = 'none';
      bouton.disabled = true;
      bouton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Connexion...';

      requeteApi('POST', '/api/admin/login', { email: email, password: motdepasse })
        .then(function (res) {
          if (res.statut === 200 && res.donnees.token) {
            sauverToken(res.donnees.token, seRappeler);
            afficherTableauBord();
          } else {
            erreurEl.style.display = 'flex';
            erreurEl.querySelector('span').textContent = res.donnees.error || 'Identifiants incorrects.';
            var carte = document.querySelector('.carte-connexion');
            if (carte) { carte.classList.add('secouer'); setTimeout(function () { carte.classList.remove('secouer'); }, 600); }
          }
        })
        .catch(function (err) {
          erreurEl.style.display = 'flex';
          erreurEl.querySelector('span').textContent = err.message || 'Erreur réseau.';
        })
        .finally(function () {
          bouton.disabled = false;
          bouton.innerHTML = '<i class="fas fa-sign-in-alt"></i> Se connecter';
        });
    });
  }

  var btnDeconnexion = document.getElementById('btn-deconnexion');
  if (btnDeconnexion) btnDeconnexion.addEventListener('click', deconnecter);

  var titresPages = {
    'vue-ensemble': "Vue d'ensemble",
    'messages':     'Messages',
    'statistiques': 'Statistiques',
    'parametres':   'Paramètres'
  };

  document.querySelectorAll('.element-nav[data-page]').forEach(function (element) {
    var touchUtilise = false;
    element.addEventListener('touchend', function (e) {
      e.preventDefault();
      touchUtilise = true;
      var page = this.dataset.page;
      fermerBarreLaterale();
      setTimeout(function () { allerVers(page); touchUtilise = false; }, 50);
    }, { passive: false });
    element.addEventListener('click', function (e) {
      e.preventDefault();
      if (touchUtilise) return;
      fermerBarreLaterale();
      allerVers(this.dataset.page);
    });
  });

  document.querySelectorAll('[data-page]').forEach(function (el) {
    if (el.tagName === 'A' && !el.classList.contains('element-nav')) {
      el.addEventListener('click', function (e) { e.preventDefault(); allerVers(this.dataset.page); });
    }
  });

  function allerVers(page) {
    document.querySelectorAll('.element-nav').forEach(function (el) { el.classList.remove('actif'); });
    var elementNav = document.querySelector('.element-nav[data-page="' + page + '"]');
    if (elementNav) elementNav.classList.add('actif');

    document.querySelectorAll('.page').forEach(function (p) { p.classList.remove('active'); });
    var pageEl = document.getElementById('page-' + page);
    if (pageEl) pageEl.classList.add('active');

    var titrePage = document.getElementById('titre-page');
    if (titrePage) titrePage.textContent = titresPages[page] || page;

    if (page === 'vue-ensemble') chargerDonneesAccueil();
    if (page === 'messages')     chargerMessages();
    if (page === 'statistiques') chargerStatistiques();
  }

  var btnMenu         = document.getElementById('btn-menu');
  var barreLaterale   = document.querySelector('.barre-laterale');
  var fondOverlay     = document.getElementById('fond-overlay');

  if (!fondOverlay) {
    fondOverlay = document.createElement('div');
    fondOverlay.id = 'fond-overlay';
    fondOverlay.style.cssText = 'display:none;position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.6);z-index:98;cursor:pointer;';
    document.body.appendChild(fondOverlay);
  }

  function ouvrirBarreLaterale()  { if (barreLaterale) barreLaterale.classList.add('ouverte'); fondOverlay.style.display = 'block'; }
  function fermerBarreLaterale()  { if (barreLaterale) barreLaterale.classList.remove('ouverte'); fondOverlay.style.display = 'none'; }

  var dernierClic = 0;
  function gererMenuBurger(e) {
    e.preventDefault();
    e.stopPropagation();
    var maintenant = Date.now();
    if (maintenant - dernierClic < 300) return;
    dernierClic = maintenant;
    if (barreLaterale && barreLaterale.classList.contains('ouverte')) { fermerBarreLaterale(); } else { ouvrirBarreLaterale(); }
  }

  if (btnMenu) {
    btnMenu.addEventListener('touchstart', function (e) { e.preventDefault(); }, { passive: false });
    btnMenu.addEventListener('touchend',   function (e) { gererMenuBurger(e); }, { passive: false });
    btnMenu.addEventListener('click',      function (e) { gererMenuBurger(e); });
  }

  fondOverlay.addEventListener('click', fermerBarreLaterale);
  fondOverlay.addEventListener('touchend', function (e) { e.preventDefault(); fermerBarreLaterale(); }, { passive: false });

  var btnNotifications = document.getElementById('btn-notifications');
  if (btnNotifications) {
    btnNotifications.addEventListener('click', function () {
      requeteApi('GET', '/api/admin/stats').then(function (res) {
        if (res.statut !== 200) return;
        var nonLus = parseInt(res.donnees.stats.unread || 0, 10);
        afficherNotification(nonLus === 0 ? 'Aucune nouvelle notification' : 'Vous avez ' + nonLus + ' message(s) non lu(s)', 'info');
      }).catch(function () { afficherNotification('Erreur lors du chargement', 'erreur'); });
    });
  }

  var btnActualiser = document.getElementById('btn-actualiser');
  if (btnActualiser) {
    btnActualiser.addEventListener('click', function () {
      var icone = this.querySelector('i');
      if (icone) icone.classList.add('fa-spin');
      var pageActive = document.querySelector('.page.active');
      if (pageActive) {
        var page = pageActive.id.replace('page-', '');
        if (page === 'vue-ensemble') chargerDonneesAccueil();
        if (page === 'messages')     chargerMessages();
        if (page === 'statistiques') chargerStatistiques();
      }
      afficherNotification('Données rafraîchies', 'info');
      setTimeout(function () { if (icone) icone.classList.remove('fa-spin'); }, 1000);
    });
  }

  document.querySelectorAll('.bouton-voir-mdp').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var champ = this.previousElementSibling;
      if (!champ) return;
      var estMdp = champ.type === 'password';
      champ.type = estMdp ? 'text' : 'password';
      this.querySelector('i').className = estMdp ? 'fas fa-eye-slash' : 'fas fa-eye';
    });
  });

  function chargerDonneesAccueil() {
    if (!lireToken()) return;
    requeteApi('GET', '/api/admin/stats')
      .then(function (res) {
        if (res.statut !== 200) { afficherNotification('Erreur chargement stats', 'erreur'); return; }
        var s = res.donnees.stats || {};
        definirTexte('total-messages',         s.total  || 0);
        definirTexte('messages-lus',           s.read   || 0);
        definirTexte('messages-non-lus',       s.unread || 0);
        definirTexte('messages-aujourd-hui',   s.today  || 0);

        var compteur = document.getElementById('nb-messages');
        if (compteur) {
          compteur.textContent   = s.unread > 0 ? s.unread : '';
          compteur.style.display = s.unread > 0 ? 'inline-flex' : 'none';
        }
        chargerMessagesRecents();
      })
      .catch(function (err) { afficherNotification('Erreur réseau: ' + err.message, 'erreur'); });
  }

  function chargerMessagesRecents() {
    requeteApi('GET', '/api/admin/messages?limit=5')
      .then(function (res) {
        if (res.statut !== 200) return;
        afficherMessagesRecents(res.donnees.messages || []);
      })
      .catch(function (err) { console.error(err); });
  }

  function afficherMessagesRecents(messages) {
    var conteneur = document.getElementById('liste-messages-recents');
    if (!conteneur) return;
    if (!messages.length) {
      conteneur.innerHTML = '<div class="etat-vide"><i class="fas fa-inbox"></i><h3>Aucun message</h3><p>Les messages du formulaire apparaîtront ici</p></div>';
      return;
    }
    conteneur.innerHTML = messages.map(function (m) { return construireElementMessage(m, true); }).join('');
    conteneur.querySelectorAll('.element-message').forEach(function (el) {
      el.addEventListener('click', function () { ouvrirMessage(parseInt(this.dataset.id, 10)); });
    });
  }

  function chargerMessages() {
    var recherche = (document.getElementById('recherche-messages') || {}).value || '';
    var filtre    = (document.getElementById('filtre-messages')    || {}).value || 'all';
    var tri       = (document.getElementById('tri-messages')       || {}).value || 'newest';
    var params    = '?limit=50' + (filtre !== 'all' ? '&filter=' + encodeURIComponent(filtre) : '');

    requeteApi('GET', '/api/admin/messages' + params)
      .then(function (res) {
        if (res.statut !== 200) return;
        var messages = res.donnees.messages || [];
        if (recherche) {
          var motCle = recherche.toLowerCase();
          messages = messages.filter(function (m) {
            return (m.name    || '').toLowerCase().indexOf(motCle) !== -1 ||
                   (m.email   || '').toLowerCase().indexOf(motCle) !== -1 ||
                   (m.message || '').toLowerCase().indexOf(motCle) !== -1;
          });
        }
        if (tri === 'oldest') messages = messages.slice().reverse();
        afficherMessages(messages);
      })
      .catch(function (err) { console.error(err); });
  }

  function afficherMessages(messages) {
    var conteneur = document.getElementById('liste-messages');
    if (!conteneur) return;
    if (!messages.length) {
      conteneur.innerHTML = '<div class="etat-vide"><i class="fas fa-inbox"></i><h3>Aucun message</h3><p>Aucun message ne correspond à votre recherche</p></div>';
      return;
    }
    conteneur.innerHTML = messages.map(function (m) { return construireElementMessage(m, false); }).join('');
    conteneur.querySelectorAll('.element-message').forEach(function (el) {
      el.addEventListener('click', function (e) {
        if (e.target.closest('.bouton-petit')) return;
        ouvrirMessage(parseInt(this.dataset.id, 10));
      });
    });
    conteneur.querySelectorAll('[data-action="supprimer"]').forEach(function (btn) {
      btn.addEventListener('click', function (e) { e.stopPropagation(); supprimerMessage(parseInt(this.dataset.id, 10)); });
    });
    conteneur.querySelectorAll('[data-action="basculer-lu"]').forEach(function (btn) {
      btn.addEventListener('click', function (e) { e.stopPropagation(); basculerLu(parseInt(this.dataset.id, 10)); });
    });
  }

  function construireElementMessage(m, apercu) {
    var nonLu = !m.is_read;
    var date  = formaterDate(m.created_at);
    var texte = (m.message || '').slice(0, 100);
    return (
      '<div class="element-message ' + (nonLu ? 'non-lu' : '') + '" data-id="' + m.id + '">' +
        '<div class="entete-message">' +
          '<span class="nom-expediteur"><i class="fas fa-user"></i> ' + echapper(m.name) +
            (nonLu ? '<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#FF6B35;margin-left:6px"></span>' : '') +
          '</span>' +
          '<span class="date-message"><i class="fas fa-clock"></i> ' + date + '</span>' +
        '</div>' +
        '<div class="email-expediteur"><i class="fas fa-envelope"></i> ' + echapper(m.email) + '</div>' +
        '<div class="apercu-texte">' + echapper(texte) + (m.message && m.message.length > 100 ? '…' : '') + '</div>' +
        (apercu ? '' :
          '<div class="boutons-message">' +
            '<button class="bouton-petit" data-action="basculer-lu" data-id="' + m.id + '">' +
              '<i class="fas fa-' + (nonLu ? 'envelope-open' : 'envelope') + '"></i> ' + (nonLu ? 'Marquer lu' : 'Marquer non lu') +
            '</button>' +
            '<button class="bouton-petit rouge" data-action="supprimer" data-id="' + m.id + '">' +
              '<i class="fas fa-trash"></i> Supprimer' +
            '</button>' +
          '</div>'
        ) +
      '</div>'
    );
  }

  function ouvrirMessage(id) {
    requeteApi('GET', '/api/admin/messages?limit=1000')
      .then(function (res) {
        if (res.statut !== 200) return;
        var msg = (res.donnees.messages || []).find(function (m) { return m.id === id; });
        if (!msg) return;
        idMessageActuel       = id;
        donneesMessageActuel  = msg;

        if (!msg.is_read) {
          requeteApi('PATCH', '/api/admin/messages/' + id + '/read')
            .then(function () { chargerDonneesAccueil(); chargerMessages(); })
            .catch(console.error);
        }

        var corps = document.getElementById('corps-modale');
        if (!corps) return;

        corps.innerHTML =
          '<div class="detail-message">' +
            lignDetail('fas fa-user',     'Nom',     echapper(msg.name)) +
            lignDetail('fas fa-envelope', 'Email',   '<a href="mailto:' + echapper(msg.email) + '" style="color:#00D9FF">' + echapper(msg.email) + '</a>') +
            (msg.phone ? lignDetail('fas fa-phone', 'Tél', '<a href="tel:' + echapper(msg.phone) + '" style="color:#00D9FF">' + echapper(msg.phone) + '</a>') : '') +
            lignDetail('fas fa-clock',   'Date',    formaterDate(msg.created_at)) +
            lignDetail('fas fa-comment', 'Message', '<div style="white-space:pre-wrap;line-height:1.6">' + echapper(msg.message) + '</div>') +
            lignDetail('fas fa-circle',  'Statut',  msg.is_read ? '<span style="color:#10B981">Lu</span>' : '<span style="color:#FF6B35">Non lu</span>') +
            (msg.replied_at ? lignDetail('fas fa-reply', 'Répondu le', formaterDate(msg.replied_at)) : '') +
          '</div>' +
          '<div id="section-reponse" style="margin-top:1.5rem;border-top:1px solid rgba(255,255,255,0.1);padding-top:1.5rem">' +
            '<h4 style="color:#FF6B35;margin-bottom:1rem;font-size:1rem;display:flex;align-items:center;gap:8px">' +
              '<i class="fas fa-reply"></i> Répondre à ' + echapper(msg.name) +
            '</h4>' +
            '<div style="margin-bottom:0.75rem">' +
              '<label style="display:block;margin-bottom:4px;font-size:0.82rem;color:#B4B8D4;font-weight:600">Destinataire</label>' +
              '<input id="champ-destinataire" type="email" value="' + echapper(msg.email) + '" readonly style="width:100%;padding:0.65rem 0.75rem;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.1);border-radius:8px;color:#888;font-size:0.9rem;box-sizing:border-box;cursor:not-allowed">' +
            '</div>' +
            '<div style="margin-bottom:0.75rem">' +
              '<label style="display:block;margin-bottom:4px;font-size:0.82rem;color:#B4B8D4;font-weight:600">Sujet</label>' +
              '<input id="champ-sujet" type="text" value="Re : Message depuis mon portfolio — ' + echapper(msg.name) + '" style="width:100%;padding:0.65rem 0.75rem;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:8px;color:#fff;font-size:0.9rem;box-sizing:border-box;outline:none">' +
            '</div>' +
            '<div style="margin-bottom:1rem">' +
              '<label style="display:block;margin-bottom:4px;font-size:0.82rem;color:#B4B8D4;font-weight:600">Votre réponse</label>' +
              '<textarea id="champ-reponse" rows="9" style="width:100%;padding:0.75rem;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:8px;color:#fff;font-size:0.9rem;resize:vertical;font-family:inherit;box-sizing:border-box;outline:none;line-height:1.6">Bonjour ' + echapper(msg.name) + ',\n\n\n\nCordialement,\nPhilippe Hountondji\n' + emailAdmin + '\n+229 01 58 15 69 30\n\nMon portfolio : ' + urlPortfolio + '</textarea>' +
            '</div>' +
            '<div style="display:flex;align-items:center;gap:1rem;flex-wrap:wrap">' +
              '<button id="btn-envoyer-reponse" style="padding:0.75rem 1.75rem;background:linear-gradient(135deg,#FF6B35,#F7931E);border:none;border-radius:8px;color:#fff;font-weight:700;cursor:pointer;display:flex;align-items:center;gap:8px;font-size:0.95rem">' +
                '<i class="fas fa-paper-plane"></i> Envoyer par email' +
              '</button>' +
              '<span id="statut-reponse" style="font-size:0.9rem"></span>' +
            '</div>' +
          '</div>';

        document.getElementById('btn-envoyer-reponse').addEventListener('click', function () { envoyerReponse(msg); });
        document.getElementById('fenetre-message').classList.add('active');
      })
      .catch(function (err) { console.error(err); });
  }

  function envoyerReponse(msg) {
    var destinataire = (document.getElementById('champ-destinataire') || {}).value || '';
    var sujet        = (document.getElementById('champ-sujet')        || {}).value || '';
    var reponse      = (document.getElementById('champ-reponse')      || {}).value || '';
    var bouton       = document.getElementById('btn-envoyer-reponse');
    var statut       = document.getElementById('statut-reponse');

    if (!reponse.trim() || reponse.length < 10) {
      statut.innerHTML = '<span style="color:#EF4444"><i class="fas fa-exclamation-circle"></i> Écrivez un message avant d\'envoyer.</span>';
      return;
    }
    bouton.disabled     = true;
    bouton.style.opacity = '0.6';
    bouton.innerHTML    = '<i class="fas fa-spinner fa-spin"></i> Envoi...';

    requeteApi('POST', '/api/admin/send-reply', { to: destinataire, subject: sujet, message: reponse, messageId: msg.id })
      .then(function (res) {
        if (res.statut === 200 && res.donnees.success) {
          statut.innerHTML      = '<span style="color:#10B981"><i class="fas fa-check-circle"></i> Email envoyé !</span>';
          bouton.innerHTML      = '<i class="fas fa-check"></i> Envoyé !';
          bouton.style.background  = 'linear-gradient(135deg,#10B981,#059669)';
          bouton.style.opacity     = '1';
          afficherNotification('Email envoyé à ' + echapper(destinataire), 'succes');
          chargerDonneesAccueil(); chargerMessages();
        } else {
          statut.innerHTML    = '<span style="color:#EF4444"><i class="fas fa-times-circle"></i> ' + echapper(res.donnees.error || 'Erreur.') + '</span>';
          bouton.disabled     = false;
          bouton.style.opacity = '1';
          bouton.innerHTML    = '<i class="fas fa-paper-plane"></i> Envoyer par email';
        }
      })
      .catch(function () {
        statut.innerHTML    = '<span style="color:#EF4444">Erreur réseau.</span>';
        bouton.disabled     = false;
        bouton.style.opacity = '1';
        bouton.innerHTML    = '<i class="fas fa-paper-plane"></i> Envoyer par email';
      });
  }

  function lignDetail(icone, libelle, valeur) {
    return '<div class="champ-message"><label><i class="' + icone + '"></i> ' + libelle + '</label><div class="valeur">' + valeur + '</div></div>';
  }

  function fermerModale() {
    var modale = document.getElementById('fenetre-message');
    if (modale) modale.classList.remove('active');
    idMessageActuel = null; donneesMessageActuel = null;
  }

  var btnFermerModale1 = document.getElementById('btn-fermer-modale');
  var btnFermerModale2 = document.querySelector('.bouton-fermer-modale');
  var btnSupprimerMsg  = document.getElementById('btn-supprimer-message');

  if (btnFermerModale1) btnFermerModale1.addEventListener('click', fermerModale);
  if (btnFermerModale2) btnFermerModale2.addEventListener('click', fermerModale);
  if (btnSupprimerMsg) {
    btnSupprimerMsg.addEventListener('click', function () {
      if (!idMessageActuel) return;
      supprimerMessage(idMessageActuel, true);
    });
  }

  var fenetre = document.getElementById('fenetre-message');
  if (fenetre) fenetre.addEventListener('click', function (e) { if (e.target === this) fermerModale(); });

  function basculerLu(id) {
    requeteApi('PATCH', '/api/admin/messages/' + id + '/read')
      .then(function () { afficherNotification('Statut mis à jour', 'succes'); chargerMessages(); chargerDonneesAccueil(); })
      .catch(console.error);
  }

  function supprimerMessage(id, fermerApres) {
    confirmerAction('Supprimer ce message définitivement ?<br><br><strong style="color:#EF4444">Cette action est irréversible.</strong>', function () {
      requeteApi('DELETE', '/api/admin/messages/' + id)
        .then(function () {
          afficherNotification('Message supprimé', 'succes');
          if (fermerApres) fermerModale();
          chargerMessages(); chargerDonneesAccueil();
        }).catch(console.error);
    });
  }

  var champRecherche = document.getElementById('recherche-messages');
  var selectFiltre   = document.getElementById('filtre-messages');
  var selectTri      = document.getElementById('tri-messages');

  if (champRecherche) champRecherche.addEventListener('input', function () { clearTimeout(timerRecherche); timerRecherche = setTimeout(chargerMessages, 300); });
  if (selectFiltre)   selectFiltre.addEventListener('change', chargerMessages);
  if (selectTri)      selectTri.addEventListener('change', chargerMessages);

  document.querySelectorAll('.carte-action[data-action]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var action = this.dataset.action;
      if (action === 'exporter')          exporterMessages();
      if (action === 'tout-marquer-lu')   toutMarquerLu();
      if (action === 'supprimer-lus')     supprimerLus();
    });
  });

  function toutMarquerLu() {
    if (!confirm('Marquer tous les messages comme lus ?')) return;
    requeteApi('PATCH', '/api/admin/messages/read-all')
      .then(function () { afficherNotification('Tous les messages marqués comme lus', 'succes'); chargerDonneesAccueil(); chargerMessages(); })
      .catch(console.error);
  }

  function supprimerLus() {
    if (!confirm('Supprimer tous les messages lus ?\n\nIrréversible.')) return;
    requeteApi('DELETE', '/api/admin/messages?type=read')
      .then(function () { afficherNotification('Messages lus supprimés', 'succes'); chargerDonneesAccueil(); chargerMessages(); })
      .catch(console.error);
  }

  function exporterMessages() {
    requeteApi('GET', '/api/admin/messages?limit=1000')
      .then(function (res) {
        if (res.statut !== 200) return;
        var messages = res.donnees.messages || [];
        if (!messages.length) { afficherNotification('Aucun message à exporter.', 'info'); return; }
        var csv = 'ID,Nom,Email,Téléphone,Message,Lu,Date\n';
        messages.forEach(function (m) {
          csv += [m.id, celluleCsv(m.name), celluleCsv(m.email), celluleCsv(m.phone || ''), celluleCsv(m.message), m.is_read ? 'Oui' : 'Non', m.created_at].join(',') + '\n';
        });
        var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        var url  = URL.createObjectURL(blob);
        var lien = document.createElement('a');
        lien.href     = url;
        lien.download = 'messages_' + new Date().toISOString().slice(0, 10) + '.csv';
        document.body.appendChild(lien); lien.click(); document.body.removeChild(lien);
        URL.revokeObjectURL(url);
        afficherNotification('Données exportées', 'succes');
      }).catch(console.error);
  }

  function celluleCsv(val) { return '"' + String(val || '').replace(/"/g, '""') + '"'; }

  function chargerStatistiques() {
    if (!lireToken()) { afficherNotification('Session expirée, reconnectez-vous', 'erreur'); return; }
    requeteApi('GET', '/api/admin/stats')
      .then(function (res) {
        if (res.statut !== 200) { afficherNotification('Erreur stats', 'erreur'); return; }
        var s      = res.donnees.stats || {};
        var parJour = s.daily || [];
        if (parJour.length > 0) {
          definirTexte('date-premier-message', formaterDate(parJour[0].date));
          definirTexte('date-dernier-message',  formaterDate(parJour[parJour.length - 1].date));
          var totalSemaine = parJour.reduce(function (acc, d) { return acc + parseInt(d.count || 0, 10); }, 0);
          definirTexte('moyenne-par-jour', (totalSemaine / parJour.length).toFixed(1) + ' messages/jour');
        } else {
          definirTexte('date-premier-message', s.total > 0 ? '-' : 'Aucun message');
          definirTexte('date-dernier-message',  s.total > 0 ? '-' : 'Aucun message');
          definirTexte('moyenne-par-jour', '0 messages/jour');
        }
        construireGraphiques(s);
      })
      .catch(function () { afficherNotification('Erreur réseau', 'erreur'); });
  }

  function construireGraphiques(s) {
    var parJour  = s.daily || [];
    var etiquettes = [];
    var valeurs    = [];

    for (var i = 6; i >= 0; i--) {
      var jour = new Date();
      jour.setDate(jour.getDate() - i);
      etiquettes.push(jour.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }));
      var jourStr = jour.toDateString();
      var trouve  = parJour.find(function (x) { return new Date(x.date).toDateString() === jourStr; });
      valeurs.push(trouve ? parseInt(trouve.count || 0, 10) : 0);
    }

    var canvas1 = document.getElementById('graphique-messages');
    if (canvas1) {
      if (graphiqueMessages) { graphiqueMessages.destroy(); graphiqueMessages = null; }
      try {
        graphiqueMessages = new Chart(canvas1, {
          type: 'line',
          data: {
            labels: etiquettes,
            datasets: [{
              label: 'Messages reçus',
              data: valeurs,
              borderColor: '#FF6B35',
              backgroundColor: 'rgba(255,107,53,0.1)',
              tension: 0.4, fill: true,
              pointBackgroundColor: '#FF6B35',
              pointBorderColor: '#fff',
              pointRadius: 5, pointHoverRadius: 7
            }]
          },
          options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { labels: { color: '#B4B8D4' } } },
            scales: {
              y: { beginAtZero: true, ticks: { color: '#B4B8D4', stepSize: 1 }, grid: { color: 'rgba(255,255,255,0.1)' } },
              x: { ticks: { color: '#B4B8D4' }, grid: { color: 'rgba(255,255,255,0.1)' } }
            }
          }
        });
      } catch (e) { console.error(e); }
    }

    var canvas2    = document.getElementById('graphique-statuts');
    var nbLus      = parseInt(s.read   || 0, 10);
    var nbNonLus   = parseInt(s.unread || 0, 10);
    if (canvas2) {
      if (graphiqueStatuts) { graphiqueStatuts.destroy(); graphiqueStatuts = null; }
      try {
        graphiqueStatuts = new Chart(canvas2, {
          type: 'doughnut',
          data: {
            labels: ['Lus', 'Non lus'],
            datasets: [{ data: [nbLus, nbNonLus], backgroundColor: ['#10B981', '#FF6B35'], borderWidth: 0 }]
          },
          options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { labels: { color: '#B4B8D4' } } },
            cutout: '60%'
          }
        });
      } catch (e) { console.error(e); }
    }
  }

  var formulaireMdp = document.getElementById('formulaire-mdp');
  if (formulaireMdp) {
    formulaireMdp.addEventListener('submit', function (e) {
      e.preventDefault();
      var actuel    = document.getElementById('mdp-actuel').value;
      var nouveau   = document.getElementById('nouveau-mdp').value;
      var confirmer = document.getElementById('confirmer-mdp').value;
      var msgEl     = document.getElementById('message-mdp');

      if (nouveau !== confirmer) { msgEl.style.color = '#EF4444'; msgEl.textContent = 'Les mots de passe ne correspondent pas.'; return; }
      if (nouveau.length < 12)  { msgEl.style.color = '#EF4444'; msgEl.textContent = 'Mot de passe trop court (12 caractères min).'; return; }

      requeteApi('POST', '/api/admin/change-password', { current: actuel, next: nouveau })
        .then(function (res) {
          if (res.statut === 200) {
            msgEl.style.color = '#10B981';
            msgEl.textContent = 'Mot de passe modifié ! Reconnectez-vous.';
            formulaireMdp.reset();
            setTimeout(deconnecter, 2000);
          } else {
            msgEl.style.color = '#EF4444';
            msgEl.textContent = res.donnees.error || 'Erreur.';
          }
        }).catch(function () { msgEl.style.color = '#EF4444'; msgEl.textContent = 'Erreur réseau.'; });
    });
  }

  var btnSupprimerTout = document.getElementById('btn-supprimer-tout');
  if (btnSupprimerTout) {
    btnSupprimerTout.addEventListener('click', function () {
      if (!confirm('Supprimer TOUS les messages ?\n\nIrréversible.')) return;
      if (!confirm('Êtes-vous absolument sûr ?')) return;
      requeteApi('DELETE', '/api/admin/messages?type=all')
        .then(function () { afficherNotification('Tous les messages supprimés', 'succes'); chargerDonneesAccueil(); chargerMessages(); })
        .catch(console.error);
    });
  }

  function definirTexte(id, valeur) { var el = document.getElementById(id); if (el) el.textContent = valeur; }

  function echapper(str) {
    var div = document.createElement('div');
    div.textContent = String(str || '');
    return div.innerHTML;
  }

  function formaterDate(dateStr) {
    if (!dateStr) return '-';
    var d    = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);
    var maintenant = new Date();
    var diff       = maintenant - d;
    if (diff < 60000)     return 'À l\'instant';
    if (diff < 3600000)   return 'Il y a ' + Math.floor(diff / 60000) + ' min';
    if (diff < 86400000)  return 'Il y a ' + Math.floor(diff / 3600000) + 'h';
    if (diff < 604800000) return 'Il y a ' + Math.floor(diff / 86400000) + ' jour(s)';
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  function actualiserCompteur() {
    requeteApi('GET', '/api/admin/stats')
      .then(function (res) {
        if (res.statut !== 200) return;
        var nb       = parseInt(res.donnees.stats.unread || 0, 10);
        var compteur = document.getElementById('nb-messages');
        if (compteur) { compteur.textContent = nb > 0 ? nb : ''; compteur.style.display = nb > 0 ? 'inline-flex' : 'none'; }
      }).catch(console.error);
  }

  if (!document.getElementById('styles-notif')) {
    var feuille = document.createElement('style');
    feuille.id = 'styles-notif';
    feuille.textContent = '.notif-flottante{position:fixed;top:-100px;right:20px;background:rgba(10,14,39,.97);color:#fff;padding:1rem 1.5rem;border-radius:12px;box-shadow:0 8px 32px rgba(0,0,0,.5);display:flex;align-items:center;gap:.75rem;z-index:10000;min-width:280px;max-width:450px;transition:transform .3s cubic-bezier(.4,0,.2,1);border:1px solid rgba(255,255,255,.1)}.notif-flottante.visible{transform:translateY(120px)}.notif-succes{border-left:4px solid #10B981}.notif-erreur{border-left:4px solid #EF4444}.notif-info{border-left:4px solid #00D9FF}.notif-flottante i{font-size:1.25rem}.notif-succes i{color:#10B981}.notif-erreur i{color:#EF4444}.notif-info i{color:#00D9FF}.notif-flottante span{flex:1;font-weight:500}@media(max-width:768px){.notif-flottante{right:10px;left:10px;min-width:auto}}';
    document.head.appendChild(feuille);
  }

  function confirmerAction(message, auConfirmer) {
    var fond = document.createElement('div');
    fond.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(10,14,39,0.95);z-index:99999;display:flex;align-items:center;justify-content:center;padding:1rem;box-sizing:border-box;';
    fond.innerHTML =
      '<div style="background:#16192F;border:1px solid rgba(255,255,255,0.1);border-radius:16px;padding:2rem;max-width:420px;width:100%;box-shadow:0 16px 48px rgba(0,0,0,0.6);">' +
        '<div style="display:flex;align-items:center;gap:12px;margin-bottom:1.25rem;">' +
          '<div style="width:44px;height:44px;background:rgba(239,68,68,0.15);border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;">' +
            '<i class="fas fa-exclamation-triangle" style="color:#EF4444;font-size:1.25rem;"></i>' +
          '</div>' +
          '<h3 style="margin:0;font-size:1.1rem;color:#fff;">Confirmation</h3>' +
        '</div>' +
        '<p style="color:#B4B8D4;margin:0 0 1.75rem 0;line-height:1.6;font-size:0.95rem;">' + message + '</p>' +
        '<div style="display:flex;gap:0.75rem;justify-content:flex-end;">' +
          '<button id="btn-annuler-confirm" style="padding:0.75rem 1.5rem;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.15);border-radius:10px;color:#B4B8D4;font-weight:600;cursor:pointer;font-size:0.9rem;">Annuler</button>' +
          '<button id="btn-ok-confirm"     style="padding:0.75rem 1.5rem;background:linear-gradient(135deg,#EF4444,#DC2626);border:none;border-radius:10px;color:#fff;font-weight:700;cursor:pointer;font-size:0.9rem;">Supprimer</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(fond);
    fond.querySelector('#btn-annuler-confirm').addEventListener('click', function () { document.body.removeChild(fond); });
    fond.querySelector('#btn-ok-confirm').addEventListener('click',     function () { document.body.removeChild(fond); auConfirmer(); });
    fond.addEventListener('click', function (e) { if (e.target === fond) document.body.removeChild(fond); });
  }

  if (window.innerWidth <= 992) { fermerBarreLaterale(); }
  verifierSession();

})();