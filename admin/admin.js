(function () {
  'use strict';

  const API = (function () {
    const h = window.location.hostname;
    if (h === 'localhost' || h === '127.0.0.1') return 'http://localhost:3000';
    return 'https://portfolio-backend-uaf9.onrender.com';
  })();

  let TOKEN = localStorage.getItem('admin_token') || sessionStorage.getItem('admin_token');
  let messageActuel = null;
  let graphiqueMessages = null;
  let graphiqueStatuts  = null;

  /* ── REQUÊTE avec timeout 70s (Render free tier dort ~50s) ── */
  function req(method, url, body) {
    const opts = {
      method,
      headers: { 'Content-Type': 'application/json', ...(TOKEN ? { Authorization: 'Bearer ' + TOKEN } : {}) }
    };
    if (body) opts.body = JSON.stringify(body);
    return new Promise(function (resolve, reject) {
      const timer = setTimeout(function () {
        reject(new Error('Le serveur Render est en veille. Attendez 30-60 secondes puis réessayez.'));
      }, 70000);
      fetch(API + url, opts)
        .then(function (r) { return r.json(); })
        .then(function (data) { clearTimeout(timer); resolve(data); })
        .catch(function (err) { clearTimeout(timer); reject(err); });
    });
  }

  function verifierServeur() {
    fetch(API + '/api/health')
      .then(function () { masquerBanniere(); })
      .catch(function () { afficherBanniere(); });
  }

  function afficherBanniere() {
    const b = document.getElementById('barre-serveur');
    if (b) b.style.display = 'flex';
  }
  function masquerBanniere() {
    const b = document.getElementById('barre-serveur');
    if (b) b.style.display = 'none';
  }

  /* ── TOAST ── */
  function toast(msg, type) {
    type = type || 'info';
    const box = document.createElement('div');
    box.className = 'toast toast-' + type;
    const icons = { succes: 'fa-check-circle', erreur: 'fa-exclamation-circle', info: 'fa-info-circle', avert: 'fa-exclamation-triangle' };
    box.innerHTML = '<i class="fas ' + (icons[type] || 'fa-info-circle') + '"></i><span>' + escHtml(String(msg).slice(0, 300)) + '</span>';
    document.body.appendChild(box);
    setTimeout(function () { box.classList.add('visible'); }, 10);
    setTimeout(function () { box.classList.remove('visible'); setTimeout(function () { box.remove(); }, 300); }, type === 'erreur' ? 8000 : 4000);
  }

  function escHtml(s) {
    return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }
  function formaterDate(d) { return d ? new Date(d).toLocaleDateString('fr-FR',{day:'2-digit',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit'}) : '—'; }
  function formaterDateCourte(d) { return d ? new Date(d).toLocaleDateString('fr-FR',{day:'2-digit',month:'short',year:'numeric'}) : '—'; }
  function val(id) { const el = document.getElementById(id); return el ? el.value : ''; }

  /* ── UPLOAD IMAGE ── */
  function imageVersBase64(fichier) {
    return new Promise(function (resolve, reject) {
      if (!fichier.type.startsWith('image/')) return reject(new Error('Fichier non-image'));
      if (fichier.size > 5 * 1024 * 1024) return reject(new Error('Image trop lourde (max 5 Mo)'));
      const r = new FileReader();
      r.onload = function (e) { resolve(e.target.result); };
      r.onerror = function () { reject(new Error('Lecture échouée')); };
      r.readAsDataURL(fichier);
    });
  }

  function htmlUpload(idInput, idPreview) {
    return '<div class="upload-photo-zone" id="zone-' + idInput + '">' +
      '<input type="file" id="' + idInput + '" accept="image/*" style="display:none">' +
      '<div class="upload-declencheur" onclick="document.getElementById(\'' + idInput + '\').click()">' +
        '<i class="fas fa-camera"></i><span>Choisir une photo</span><small>JPG, PNG, WebP — max 5 Mo</small>' +
      '</div>' +
      '<div class="upload-apercu" id="' + idPreview + '" style="display:none">' +
        '<img id="img-' + idPreview + '" src="" alt="Aperçu">' +
        '<button type="button" class="suppr-apercu" onclick="clearApercu(\'' + idInput + '\',\'' + idPreview + '\')">' +
          '<i class="fas fa-times"></i>' +
        '</button>' +
      '</div>' +
    '</div>';
  }

  window.clearApercu = function (idInput, idPreview) {
    const inp = document.getElementById(idInput);
    if (inp) inp.value = '';
    const prev = document.getElementById(idPreview);
    if (prev) prev.style.display = 'none';
    const zone = document.getElementById('zone-' + idInput);
    if (zone) zone.querySelector('.upload-declencheur').style.display = 'flex';
  };

  function bindUpload(idInput, idPreview) {
    const inp = document.getElementById(idInput);
    if (!inp) return;
    inp.addEventListener('change', async function () {
      const f = this.files[0];
      if (!f) return;
      try {
        const b64 = await imageVersBase64(f);
        document.getElementById('img-' + idPreview).src = b64;
        document.getElementById(idPreview).style.display = 'block';
        const zone = document.getElementById('zone-' + idInput);
        if (zone) zone.querySelector('.upload-declencheur').style.display = 'none';
      } catch (e) { toast(e.message, 'erreur'); }
    });
  }

  /* ── HELPERS FORM ── */
  function htmlChamp(label, type, id, valeur, max) {
    return '<div class="champ-form">' +
      '<label>' + escHtml(label) + '</label>' +
      '<input type="' + type + '" id="' + id + '" value="' + escHtml(String(valeur || '')) + '"' + (max ? ' maxlength="' + max + '"' : '') + '>' +
    '</div>';
  }
  function htmlTextarea(label, id, valeur, max, pleine) {
    return '<div class="champ-form' + (pleine ? ' pleine-largeur' : '') + '">' +
      '<label>' + escHtml(label) + '</label>' +
      '<textarea id="' + id + '" rows="3" maxlength="' + (max||1000) + '">' + escHtml(valeur || '') + '</textarea>' +
    '</div>';
  }
  function htmlSelect(label, id, opts, actif) {
    return '<div class="champ-form"><label>' + escHtml(label) + '</label><select id="' + id + '">' +
      opts.map(function(o){ return '<option value="' + o[0] + '"' + (o[0]===actif?' selected':'') + '>' + o[1] + '</option>'; }).join('') +
    '</select></div>';
  }

  /* ── MODALE GÉNÉRIQUE ── */
  function ouvrirModale(titre, corps, boutons) {
    let m = document.getElementById('mg');
    if (!m) {
      m = document.createElement('div'); m.id = 'mg'; m.className = 'fenetre-modale';
      m.innerHTML = '<div class="contenu-modale">' +
        '<div class="entete-modale"><h3><i class="fas fa-edit"></i> <span id="mg-t"></span></h3>' +
        '<button class="bouton-fermer-modale" onclick="document.getElementById(\'mg\').classList.remove(\'active\')">&times;</button></div>' +
        '<div class="corps-modale" id="mg-c"></div>' +
        '<div class="pied-modale" id="mg-p"></div>' +
      '</div>';
      document.body.appendChild(m);
    }
    document.getElementById('mg-t').textContent = titre;
    document.getElementById('mg-c').innerHTML = corps;
    const pied = document.getElementById('mg-p');
    pied.innerHTML = '';
    const btnFermer = document.createElement('button');
    btnFermer.className = 'bouton-secondaire';
    btnFermer.innerHTML = '<i class="fas fa-times"></i> Fermer';
    btnFermer.onclick = function () { m.classList.remove('active'); };
    pied.appendChild(btnFermer);
    if (boutons) boutons.forEach(function (b) {
      const btn = document.createElement('button');
      btn.className = b.classe || 'bouton-principal';
      btn.innerHTML = b.html;
      btn.onclick = b.fn;
      pied.appendChild(btn);
    });
    m.classList.add('active');
  }

  /* ══════════════════════════════════════════════════════════════
     INIT
  ══════════════════════════════════════════════════════════════ */
  function init() {
    injecterStyles();
    injecterBanniereServeur();
    if (TOKEN) { afficherTableau(); }
    else {
      document.getElementById('page-connexion').style.display = 'flex';
      document.getElementById('tableau-bord').classList.add('masque');
    }
    bindConnexion();
    bindNavigation();
    bindDeconnexion();
    bindActions();
  }

  function injecterBanniereServeur() {
    if (document.getElementById('barre-serveur')) return;
    const b = document.createElement('div');
    b.id = 'barre-serveur';
    b.style.cssText = 'display:none;position:fixed;top:0;left:0;right:0;z-index:9999;background:#F59E0B;color:#000;padding:10px 20px;text-align:center;font-weight:600;font-size:.9rem;align-items:center;justify-content:center;gap:10px';
    b.innerHTML = '<i class="fas fa-moon"></i> Serveur Render en veille — patientez 30 à 60 secondes puis réessayez.' +
      '<button onclick="verifierServeurBtn()" style="margin-left:12px;background:rgba(0,0,0,.2);border:none;border-radius:6px;padding:4px 10px;cursor:pointer;font-weight:700">🔄 Réessayer</button>' +
      '<button onclick="this.parentElement.style.display=\'none\'" style="margin-left:6px;background:rgba(0,0,0,.2);border:none;border-radius:6px;padding:4px 10px;cursor:pointer;font-weight:700">✕</button>';
    document.body.prepend(b);
  }

  window.verifierServeurBtn = function () {
    toast('Vérification du serveur…', 'info');
    fetch(API + '/api/health')
      .then(function () { masquerBanniere(); toast('✅ Serveur en ligne !', 'succes'); })
      .catch(function () { toast('⚠️ Serveur toujours hors ligne, patientez encore…', 'avert'); });
  };

  /* ── CONNEXION ── */
  function bindConnexion() {
    const form = document.getElementById('formulaire-connexion');
    const btnVoir = document.querySelector('.bouton-voir-mdp');
    const champMdp = document.getElementById('champ-motdepasse');
    if (btnVoir && champMdp) {
      btnVoir.addEventListener('click', function () {
        const v = champMdp.type === 'password';
        champMdp.type = v ? 'text' : 'password';
        btnVoir.querySelector('i').className = v ? 'fas fa-eye-slash' : 'fas fa-eye';
      });
    }
    if (!form) return;
    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      const email = document.getElementById('champ-email').value.trim();
      const mdp   = document.getElementById('champ-motdepasse').value;
      const btnC  = form.querySelector('.bouton-connexion');
      const errDiv = document.getElementById('erreur-connexion');
      btnC.disabled = true;
      btnC.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Connexion…';
      errDiv.style.display = 'none';
      try {
        const data = await req('POST', '/api/admin/login', { email, password: mdp });
        if (data.success && data.token) {
          TOKEN = data.token;
          const souvenir = document.getElementById('se-souvenir');
          if (souvenir && souvenir.checked) localStorage.setItem('admin_token', TOKEN);
          else sessionStorage.setItem('admin_token', TOKEN);
          afficherTableau();
        } else {
          errDiv.style.display = 'flex';
          errDiv.querySelector('span').textContent = data.error || 'Identifiants incorrects';
          form.classList.add('secouer'); setTimeout(function () { form.classList.remove('secouer'); }, 500);
        }
      } catch (err) {
        errDiv.style.display = 'flex';
        errDiv.querySelector('span').textContent = err.message;
        afficherBanniere();
      } finally {
        btnC.disabled = false;
        btnC.innerHTML = '<i class="fas fa-sign-in-alt"></i> Se connecter';
      }
    });
  }

  function afficherTableau() {
    document.getElementById('page-connexion').style.display = 'none';
    document.getElementById('tableau-bord').classList.remove('masque');
    verifierServeur();
    chargerDonnees('vue-ensemble');
    chargerStatsRapides();
  }

  function bindDeconnexion() {
    const btn = document.getElementById('btn-deconnexion');
    if (!btn) return;
    btn.addEventListener('click', async function () {
      try { await req('POST', '/api/admin/logout'); } catch {}
      TOKEN = null; localStorage.removeItem('admin_token'); sessionStorage.removeItem('admin_token'); location.reload();
    });
  }

  /* ── NAVIGATION ── */
  function bindNavigation() {
    document.querySelectorAll('.element-nav').forEach(function (el) {
      el.addEventListener('click', function (e) {
        e.preventDefault();
        const page = el.dataset.page;
        document.querySelectorAll('.element-nav').forEach(function (n) { n.classList.remove('actif'); });
        el.classList.add('actif');
        document.querySelectorAll('.page').forEach(function (p) { p.classList.remove('active'); });
        const pEl = document.getElementById('page-' + page);
        if (pEl) pEl.classList.add('active');
        const tEl = document.getElementById('titre-page');
        if (tEl) tEl.textContent = el.querySelector('span').textContent;
        if (window.innerWidth <= 992) { const b = document.querySelector('.barre-laterale'); if (b) b.classList.remove('ouverte'); }
        chargerDonnees(page);
      });
    });
    document.querySelectorAll('[data-page]').forEach(function (el) {
      if (el.classList.contains('element-nav')) return;
      el.addEventListener('click', function (e) {
        e.preventDefault();
        const n = document.querySelector('.element-nav[data-page="' + el.dataset.page + '"]');
        if (n) n.click();
      });
    });
    const btnMenu = document.getElementById('btn-menu');
    if (btnMenu) btnMenu.addEventListener('click', function () { document.querySelector('.barre-laterale').classList.toggle('ouverte'); });
    const btnActu = document.getElementById('btn-actualiser');
    if (btnActu) btnActu.addEventListener('click', function () {
      const p = document.querySelector('.page.active');
      if (p) chargerDonnees(p.id.replace('page-', ''));
      chargerStatsRapides(); verifierServeur();
    });
  }

  function chargerDonnees(page) {
    switch (page) {
      case 'vue-ensemble':  chargerVueEnsemble(); break;
      case 'messages':      chargerMessages(); break;
      case 'projets':       chargerProjets(); break;
      case 'experiences':   chargerExperiences(); break;
      case 'competences':   chargerCompetences(); break;
      case 'statistiques':  chargerStatistiques(); break;
      case 'parametres':    bindParametres(); break;
    }
  }

  /* ── STATS RAPIDES ── */
  async function chargerStatsRapides() {
    try {
      const d = await req('GET', '/api/admin/stats');
      if (d.success) {
        const nb = document.getElementById('nb-messages');
        if (nb) nb.textContent = d.stats.unread;
      }
    } catch {}
  }

  /* ── VUE D'ENSEMBLE ── */
  async function chargerVueEnsemble() {
    try {
      const d = await req('GET', '/api/admin/stats');
      if (d.success) {
        document.getElementById('total-messages').textContent   = d.stats.total;
        document.getElementById('messages-lus').textContent     = d.stats.read;
        document.getElementById('messages-non-lus').textContent = d.stats.unread;
        document.getElementById('messages-aujourd-hui').textContent = d.stats.today;
        document.getElementById('nb-messages').textContent = d.stats.unread;
      }
    } catch {}
    try {
      const d = await req('GET', '/api/admin/messages?limit=5');
      const cont = document.getElementById('liste-messages-recents');
      if (!cont) return;
      if (!d.messages || !d.messages.length) { cont.innerHTML = htmlVide('fa-inbox', 'Aucun message', 'Les messages apparaîtront ici'); return; }
      cont.innerHTML = d.messages.map(renderMsg).join('');
      cont.querySelectorAll('.element-message').forEach(function (el) { el.addEventListener('click', function () { ouvrirMessage(parseInt(el.dataset.id)); }); });
    } catch {}
  }

  /* ── MESSAGES ── */
  let pageMsgs = 1, filtreMsgs = 'all';

  async function chargerMessages() {
    const cont = document.getElementById('liste-messages');
    if (!cont) return;
    cont.innerHTML = '<div class="chargement"><i class="fas fa-spinner fa-spin"></i> Chargement…</div>';
    try {
      const d = await req('GET', '/api/admin/messages?page=' + pageMsgs + '&limit=20&filter=' + filtreMsgs);
      if (!d.messages || !d.messages.length) { cont.innerHTML = htmlVide('fa-inbox', 'Aucun message', 'Aucun message à afficher'); return; }
      const rech = (document.getElementById('recherche-messages') || {value:''}).value.toLowerCase();
      let msgs = d.messages;
      if (rech) msgs = msgs.filter(function (m) { return (m.name+m.email+m.message).toLowerCase().includes(rech); });
      cont.innerHTML = msgs.map(renderMsg).join('');
      cont.querySelectorAll('.element-message').forEach(function (el) { el.addEventListener('click', function () { ouvrirMessage(parseInt(el.dataset.id)); }); });
    } catch (err) { cont.innerHTML = htmlErreur(err.message); }
  }

  function renderMsg(m) {
    const nl = !m.is_read;
    return '<div class="element-message ' + (nl?'non-lu':'') + '" data-id="' + m.id + '">' +
      '<div class="entete-message"><span class="nom-expediteur"><i class="fas fa-user-circle"></i>' + escHtml(m.name) + '</span>' +
      '<span class="date-message"><i class="fas fa-clock"></i>' + formaterDateCourte(m.created_at) + '</span></div>' +
      '<div class="email-expediteur"><i class="fas fa-envelope"></i>' + escHtml(m.email) + '</div>' +
      '<div class="apercu-texte">' + escHtml(m.message) + '</div>' +
      '<div class="boutons-message">' +
        '<button class="bouton-petit" onclick="event.stopPropagation();toggleLu(' + m.id + ')"><i class="fas fa-' + (nl?'envelope-open':'envelope') + '"></i> ' + (nl?'Marquer lu':'Non lu') + '</button>' +
        '<button class="bouton-petit rouge" onclick="event.stopPropagation();supprimerMessage(' + m.id + ')"><i class="fas fa-trash"></i> Supprimer</button>' +
        (m.replied_at ? '<span class="badge-repondu"><i class="fas fa-reply"></i> Répondu</span>' : '') +
      '</div></div>';
  }

  async function ouvrirMessage(id) {
    try {
      const d = await req('GET', '/api/admin/messages?limit=100');
      const msg = d.messages && d.messages.find(function (m) { return m.id === id; });
      if (!msg) return;
      messageActuel = msg;
      document.getElementById('corps-modale').innerHTML =
        '<div class="detail-message">' +
        '<div class="champ-message"><label><i class="fas fa-user"></i> Expéditeur</label><div class="valeur">' + escHtml(msg.name) + '</div></div>' +
        '<div class="champ-message"><label><i class="fas fa-envelope"></i> Email</label><div class="valeur"><a href="mailto:' + escHtml(msg.email) + '" style="color:var(--orange)">' + escHtml(msg.email) + '</a></div></div>' +
        (msg.phone ? '<div class="champ-message"><label><i class="fas fa-phone"></i> Tél</label><div class="valeur">' + escHtml(msg.phone) + '</div></div>' : '') +
        '<div class="champ-message"><label><i class="fas fa-calendar"></i> Date</label><div class="valeur">' + formaterDate(msg.created_at) + '</div></div>' +
        '<div class="champ-message"><label><i class="fas fa-comment"></i> Message</label><div class="valeur" style="white-space:pre-wrap">' + escHtml(msg.message) + '</div></div>' +
        '<div class="champ-message"><label><i class="fas fa-reply-all"></i> Répondre</label>' +
        '<textarea id="texte-reponse" placeholder="Votre réponse…" style="width:100%;min-height:90px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:8px;color:#fff;padding:.75rem;font-family:inherit;resize:vertical;margin-top:6px"></textarea>' +
        '<button class="bouton-principal" style="margin-top:8px" onclick="envoyerReponse(' + msg.id + ',\'' + escHtml(msg.email) + '\')"><i class="fas fa-paper-plane"></i> Envoyer</button></div>' +
        '</div>';
      document.getElementById('fenetre-message').classList.add('active');
      if (!msg.is_read) req('PATCH', '/api/admin/messages/' + id + '/read').catch(function(){});
    } catch (err) { toast(err.message, 'erreur'); }
  }

  window.toggleLu = async function (id) {
    try { await req('PATCH', '/api/admin/messages/' + id + '/read'); chargerMessages(); chargerStatsRapides(); }
    catch (err) { toast(err.message, 'erreur'); }
  };
  window.supprimerMessage = async function (id) {
    if (!confirm('Supprimer ce message ?')) return;
    try { await req('DELETE', '/api/admin/messages/' + id); toast('Message supprimé', 'succes'); chargerMessages(); chargerStatsRapides(); }
    catch (err) { toast(err.message, 'erreur'); }
  };
  window.envoyerReponse = async function (id, email) {
    const t = document.getElementById('texte-reponse');
    if (!t || !t.value.trim()) return toast('Écrivez une réponse', 'avert');
    try {
      const d = await req('POST', '/api/admin/send-reply', { to: email, subject: 'Réponse — Philippe Hountondji', message: t.value.trim(), messageId: id });
      if (d.success) { toast('Réponse envoyée !', 'succes'); document.getElementById('fenetre-message').classList.remove('active'); chargerMessages(); }
      else toast(d.error, 'erreur');
    } catch (err) { toast(err.message, 'erreur'); }
  };

  const btnFM = document.getElementById('btn-fermer-modale');
  if (btnFM) btnFM.addEventListener('click', function () { document.getElementById('fenetre-message').classList.remove('active'); });
  const btnFX = document.querySelector('.bouton-fermer-modale');
  if (btnFX) btnFX.addEventListener('click', function () { document.getElementById('fenetre-message').classList.remove('active'); });
  const btnSM = document.getElementById('btn-supprimer-message');
  if (btnSM) btnSM.addEventListener('click', function () { if (messageActuel) window.supprimerMessage(messageActuel.id); document.getElementById('fenetre-message').classList.remove('active'); });

  const filtreEl = document.getElementById('filtre-messages');
  if (filtreEl) filtreEl.addEventListener('change', function () { filtreMsgs = this.value; pageMsgs = 1; chargerMessages(); });
  let rtimer;
  const rechEl = document.getElementById('recherche-messages');
  if (rechEl) rechEl.addEventListener('input', function () { clearTimeout(rtimer); rtimer = setTimeout(chargerMessages, 300); });

  /* ══════════════════════════════════════════════════════════════
     DONNÉES STATIQUES (portfolio HTML)
  ══════════════════════════════════════════════════════════════ */
  const PS = [ // Projets statiques
    { id:'ps1', titre:'Plateforme VBG', description:'Plateforme 100% anonyme et sécurisée permettant aux femmes de partager des témoignages sur les violences basées sur le genre.', technologies:'HTML/CSS, Node.js', lien_site:'https://vbg-production.up.railway.app', lien_github:'https://github.com/Philippe554-del', etiquette:'Social', statut:'termine', isS:true },
    { id:'ps2', titre:'Mon Portfolio', description:'Portfolio professionnel interactif avec animations, formulaire de contact sécurisé, design responsive et SEO optimisé.', technologies:'HTML/CSS, JavaScript', lien_site:'https://philippe554-del.github.io/Portfolio-/', lien_github:'https://github.com/Philippe554-del/Portfolio-', etiquette:'Portfolio', statut:'termine', isS:true },
    { id:'ps3', titre:'Dashboard Administratif', description:'Plateforme de gestion complète avec visualisation de données en temps réel, authentification et tableau de bord responsive.', technologies:'React, Node.js, MongoDB', etiquette:'En cours', statut:'en-cours', isS:true },
    { id:'ps4', titre:'Simulation Réseau Entreprise', description:'Modélisation complète d\'un réseau d\'entreprise avec routeurs, switches, VLANs et politiques de sécurité avancées.', technologies:'Cisco, Sécurité, Topologie', etiquette:'En cours', statut:'en-cours', isS:true },
    { id:'ps5', titre:'Système de Gestion API', description:'API RESTful complète avec documentation Swagger, authentification JWT, rate limiting et logs détaillés.', technologies:'Python, FastAPI, PostgreSQL', etiquette:'En cours', statut:'en-cours', isS:true }
  ];
  const ES = [ // Expériences statiques
    { id:'es1', titre:'Stage de Licence 2', type_exp:'Stage académique — L2', entreprise:'En recherche active', lieu:'Bénin', date_debut:'2025', date_fin:'En cours', description:'Recherche active d\'un stage en développement web ou administration réseau.', tags:'Développement Web, Administration Réseau, Support IT', statut:'recherche', isS:true },
    { id:'es2', titre:'Stage de Licence 3', type_exp:'Stage académique — L3', entreprise:'À définir', lieu:'Bénin', date_debut:'2026', date_fin:'Prévu', description:'Stage prévu en troisième année de licence.', tags:'Full-Stack, Réseaux, Gestion de projet', statut:'prevu', isS:true },
    { id:'es3', titre:'Stage Professionnel', type_exp:'Stage de fin d\'études', entreprise:'À définir', lieu:'Bénin / International', date_debut:'2027', date_fin:'Prévu', description:'Stage professionnel de fin d\'études.', tags:'Professionnel, Fin d\'études, Emploi', statut:'prevu', isS:true },
    { id:'es4', titre:'Développeur Web — Projets Personnels', type_exp:'Projet personnel', entreprise:'Indépendant', lieu:'Porto-Novo, Bénin', date_debut:'2022', date_fin:'Présent', description:'Développement de plusieurs applications web en autonomie, dont une plateforme VBG déployée sur Railway.', tags:'HTML/CSS, JavaScript, Node.js, Déploiement', statut:'en-cours', isS:true }
  ];
  const CS = [ // Compétences statiques
    { id:'cs1', categorie:'Développement Web', icone:'fas fa-code', couleur:'linear-gradient(135deg,#667eea,#764ba2)', niveau:75, label_niveau:'Avancé — 75%', items:'fab fa-python | Python\nfab fa-html5 | HTML5\nfab fa-css3-alt | CSS3\nfab fa-js | JavaScript\nfab fa-node-js | Node.js\nfas fa-database | Bases de données', isS:true },
    { id:'cs2', categorie:'Réseaux & Infrastructure', icone:'fas fa-network-wired', couleur:'linear-gradient(135deg,#f093fb,#f5576c)', niveau:60, label_niveau:'Intermédiaire — 60%', items:'fas fa-wifi | Configuration réseaux\nfas fa-server | Gestion de serveurs\nfas fa-shield-alt | Sécurité réseau\nfas fa-chart-line | Supervision\nfas fa-cloud | Cloud', isS:true },
    { id:'cs3', categorie:'Maintenance & Support', icone:'fas fa-laptop-medical', couleur:'linear-gradient(135deg,#4facfe,#00f2fe)', niveau:80, label_niveau:'Avancé — 80%', items:'fas fa-search | Diagnostic hardware/software\nfas fa-cogs | Installation systèmes\nfas fa-tools | Maintenance préventive\nfas fa-headset | Support utilisateurs\nfas fa-bolt | Optimisation performance', isS:true }
  ];

  /* ══════════════════════════════════════════════════════════════
     PROJETS
  ══════════════════════════════════════════════════════════════ */
  async function chargerProjets() {
    // Injecter upload photo
    if (!document.getElementById('upload-projet-img')) {
      const el = document.getElementById('projet-image');
      if (el) {
        const p = el.closest('.champ-form');
        if (p) { p.innerHTML = '<label>Photo du projet</label>' + htmlUpload('upload-projet-img','apercu-projet-img'); bindUpload('upload-projet-img','apercu-projet-img'); }
      }
    }
    const liste = document.getElementById('liste-projets');
    if (!liste) return;
    liste.innerHTML = '<div class="chargement-liste"><i class="fas fa-spinner fa-spin"></i> Chargement…</div>';
    try {
      const d = await req('GET', '/api/admin/projets');
      const tous = PS.concat(d.projets || []);
      const nb = document.getElementById('nb-projets'); if (nb) nb.textContent = tous.length;
      liste.innerHTML = tous.length ? tous.map(renderProjet).join('') : htmlVide('fa-folder-open','Aucun projet','');
      bindListe('liste-projets', 'projet');
    } catch (err) { liste.innerHTML = htmlErreur(err.message); }

    const form = document.getElementById('form-ajout-projet');
    if (form && !form.dataset.bound) {
      form.dataset.bound = '1';
      form.addEventListener('submit', async function (e) {
        e.preventDefault();
        const btn = document.getElementById('btn-ajouter-projet');
        btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Ajout…';
        let image_url = '';
        const fi = document.getElementById('upload-projet-img');
        if (fi && fi.files[0]) { try { image_url = await imageVersBase64(fi.files[0]); } catch(e2) { toast(e2.message,'erreur'); btn.disabled=false; btn.innerHTML='<i class="fas fa-plus"></i> Ajouter le projet'; return; } }
        const body = { titre:document.getElementById('projet-titre').value, description:document.getElementById('projet-description').value, technologies:document.getElementById('projet-technologies').value, lien_site:document.getElementById('projet-lien-site').value, lien_github:document.getElementById('projet-lien-github').value, image_url, etiquette:document.getElementById('projet-etiquette').value||'Projet', statut:document.getElementById('projet-statut').value, ordre:parseInt(document.getElementById('projet-ordre').value)||0 };
        try {
          const d = await req('POST', '/api/admin/projets', body);
          if (d.success) { toast('✅ Projet ajouté !','succes'); form.reset(); window.clearApercu('upload-projet-img','apercu-projet-img'); chargerProjets(); }
          else toast(d.error||'Erreur','erreur');
        } catch (err2) { toast(err2.message,'erreur'); afficherBanniere(); }
        finally { btn.disabled=false; btn.innerHTML='<i class="fas fa-plus"></i> Ajouter le projet'; }
      });
    }
  }

  function renderProjet(p) {
    const bl = {termine:'badge-termine','en-cours':'badge-en-cours',prevu:'badge-prevu'};
    const tl = {termine:'Terminé','en-cours':'En cours',prevu:'Prévu'};
    const img = p.image_url ? '<img src="'+escHtml(p.image_url)+'" style="width:64px;height:48px;object-fit:cover;border-radius:8px;margin-right:12px;flex-shrink:0">' : '';
    const tags = p.technologies ? p.technologies.split(',').map(function(t){return '<span class="tag-petit">'+escHtml(t.trim())+'</span>';}).join('') : '';
    const lien = p.lien_site ? '<div class="element-liste-meta" style="margin-top:4px"><a href="'+escHtml(p.lien_site)+'" target="_blank" style="color:var(--orange);font-size:.78rem"><i class="fas fa-external-link-alt"></i> '+escHtml(p.lien_site.slice(0,50))+'</a></div>' : '';
    return '<div class="element-liste" data-id="'+p.id+'">' +
      img +
      '<div class="element-liste-info">' +
        '<div class="element-liste-titre">' + escHtml(p.titre) +
          '<span class="badge-element '+(bl[p.statut]||'')+'">'+( tl[p.statut]||p.statut)+'</span>' +
          (p.isS ? badgeHTML('<span style="background:rgba(99,102,241,.15);color:#818CF8">Portfolio HTML</span>') : badgeHTML('<span style="background:rgba(16,185,129,.15);color:#10B981">Base de données</span>')) +
        '</div>' +
        '<div class="element-liste-meta">'+escHtml((p.description||'').slice(0,100))+((p.description||'').length>100?'…':'')+'</div>' +
        (tags?'<div class="element-liste-tags">'+tags+'</div>':'') + lien +
      '</div>' +
      '<div style="display:flex;gap:6px;flex-shrink:0">' +
        (!p.isS ? '<button class="bouton-modifier-element" data-id="'+p.id+'" data-type="projet"><i class="fas fa-edit"></i> Modifier</button>' : '') +
        '<button class="bouton-supprimer-element" data-id="'+p.id+'" data-statique="'+(p.isS?1:0)+'" data-type="projet">' +
          '<i class="fas fa-'+(p.isS?'info-circle':'trash')+'"></i> '+(p.isS?'Info':'Supprimer') +
        '</button>' +
      '</div>' +
    '</div>';
  }

  /* ══════════════════════════════════════════════════════════════
     EXPÉRIENCES
  ══════════════════════════════════════════════════════════════ */
  async function chargerExperiences() {
    const liste = document.getElementById('liste-experiences');
    if (!liste) return;
    liste.innerHTML = '<div class="chargement-liste"><i class="fas fa-spinner fa-spin"></i> Chargement…</div>';
    try {
      const d = await req('GET', '/api/admin/experiences');
      const tous = ES.concat(d.experiences || []);
      const nb = document.getElementById('nb-experiences'); if (nb) nb.textContent = tous.length;
      liste.innerHTML = tous.length ? tous.map(renderExp).join('') : htmlVide('fa-briefcase','Aucune expérience','');
      bindListe('liste-experiences','experience');
    } catch (err) { liste.innerHTML = htmlErreur(err.message); }

    const form = document.getElementById('form-ajout-experience');
    if (form && !form.dataset.bound) {
      form.dataset.bound = '1';
      form.addEventListener('submit', async function (e) {
        e.preventDefault();
        const btn = document.getElementById('btn-ajouter-experience');
        btn.disabled=true; btn.innerHTML='<i class="fas fa-spinner fa-spin"></i> Ajout…';
        const body = { titre:document.getElementById('exp-titre').value, type_exp:document.getElementById('exp-type').value, entreprise:document.getElementById('exp-entreprise').value, lieu:document.getElementById('exp-lieu').value, date_debut:document.getElementById('exp-date-debut').value, date_fin:document.getElementById('exp-date-fin').value, description:document.getElementById('exp-description').value, tags:document.getElementById('exp-tags').value, statut:document.getElementById('exp-statut').value, ordre:parseInt(document.getElementById('exp-ordre').value)||0 };
        try {
          const d = await req('POST', '/api/admin/experiences', body);
          if (d.success) { toast('✅ Expérience ajoutée !','succes'); form.reset(); chargerExperiences(); }
          else toast(d.error,'erreur');
        } catch (err2) { toast(err2.message,'erreur'); afficherBanniere(); }
        finally { btn.disabled=false; btn.innerHTML='<i class="fas fa-plus"></i> Ajouter l\'expérience'; }
      });
    }
  }

  function renderExp(exp) {
    const bl={termine:'badge-termine','en-cours':'badge-en-cours',prevu:'badge-prevu',recherche:'badge-recherche'};
    const tl={termine:'Terminé','en-cours':'En cours',prevu:'Prévu',recherche:'En recherche'};
    const tags = exp.tags ? exp.tags.split(',').map(function(t){return '<span class="tag-petit">'+escHtml(t.trim())+'</span>';}).join('') : '';
    return '<div class="element-liste" data-id="'+exp.id+'">' +
      '<div class="element-liste-info">' +
        '<div class="element-liste-titre">'+escHtml(exp.titre)+
          '<span class="badge-element '+(bl[exp.statut]||'')+'">'+(tl[exp.statut]||exp.statut)+'</span>'+
          (exp.isS?badgeHTML('<span style="background:rgba(99,102,241,.15);color:#818CF8">Portfolio HTML</span>'):badgeHTML('<span style="background:rgba(16,185,129,.15);color:#10B981">Base de données</span>'))+
        '</div>'+
        '<div class="element-liste-meta">'+escHtml(exp.entreprise||'')+(exp.lieu?' · '+escHtml(exp.lieu):'')+(exp.date_debut?' · '+escHtml(exp.date_debut):'')+(exp.date_fin?' → '+escHtml(exp.date_fin):'')+'</div>'+
        (tags?'<div class="element-liste-tags">'+tags+'</div>':'')+
      '</div>'+
      '<div style="display:flex;gap:6px;flex-shrink:0">'+
        (!exp.isS?'<button class="bouton-modifier-element" data-id="'+exp.id+'" data-type="experience"><i class="fas fa-edit"></i> Modifier</button>':'')+
        '<button class="bouton-supprimer-element" data-id="'+exp.id+'" data-statique="'+(exp.isS?1:0)+'" data-type="experience">'+
          '<i class="fas fa-'+(exp.isS?'info-circle':'trash')+'"></i> '+(exp.isS?'Info':'Supprimer')+
        '</button>'+
      '</div>'+
    '</div>';
  }

  /* ══════════════════════════════════════════════════════════════
     COMPÉTENCES
  ══════════════════════════════════════════════════════════════ */
  async function chargerCompetences() {
    const liste = document.getElementById('liste-competences');
    if (!liste) return;
    liste.innerHTML = '<div class="chargement-liste"><i class="fas fa-spinner fa-spin"></i> Chargement…</div>';
    try {
      const d = await req('GET', '/api/admin/competences');
      const tous = CS.concat(d.competences || []);
      const nb = document.getElementById('nb-competences'); if (nb) nb.textContent = tous.length;
      liste.innerHTML = tous.length ? tous.map(renderComp).join('') : htmlVide('fa-star','Aucune compétence','');
      bindListe('liste-competences','competence');
    } catch (err) { liste.innerHTML = htmlErreur(err.message); }

    const form = document.getElementById('form-ajout-competence');
    if (form && !form.dataset.bound) {
      form.dataset.bound = '1';
      form.addEventListener('submit', async function (e) {
        e.preventDefault();
        const btn = document.getElementById('btn-ajouter-competence');
        btn.disabled=true; btn.innerHTML='<i class="fas fa-spinner fa-spin"></i> Ajout…';
        const body = { categorie:document.getElementById('comp-categorie').value, icone:document.getElementById('comp-icone').value, couleur:document.getElementById('comp-couleur').value, niveau:parseInt(document.getElementById('comp-niveau').value)||70, label_niveau:document.getElementById('comp-label-niveau').value, items:document.getElementById('comp-items').value, ordre:parseInt(document.getElementById('comp-ordre').value)||0 };
        try {
          const d = await req('POST', '/api/admin/competences', body);
          if (d.success) { toast('✅ Catégorie ajoutée !','succes'); form.reset(); chargerCompetences(); }
          else toast(d.error,'erreur');
        } catch (err2) { toast(err2.message,'erreur'); afficherBanniere(); }
        finally { btn.disabled=false; btn.innerHTML='<i class="fas fa-plus"></i> Ajouter la catégorie'; }
      });
    }
  }

  function renderComp(c) {
    return '<div class="element-liste" data-id="'+c.id+'">' +
      '<div class="element-liste-info">' +
        '<div class="element-liste-titre">' +
          '<span style="display:inline-flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:8px;background:'+escHtml(c.couleur||'#FF6B35')+';flex-shrink:0">'+
            '<i class="'+escHtml(c.icone||'fas fa-code')+'" style="color:white;font-size:.85rem"></i></span> '+
          escHtml(c.categorie)+
          (c.isS?badgeHTML('<span style="background:rgba(99,102,241,.15);color:#818CF8">Portfolio HTML</span>'):badgeHTML('<span style="background:rgba(16,185,129,.15);color:#10B981">Base de données</span>'))+
        '</div>'+
        '<div class="barre-niveau-mini"><div class="barre-fond"><div class="barre-rempli" style="width:'+(c.niveau||0)+'%"></div></div><span>'+escHtml(c.label_niveau||c.niveau+'%')+'</span></div>'+
        (c.items?'<div class="element-liste-tags">'+c.items.split('\n').slice(0,4).map(function(l){const p=l.split('|');return '<span class="tag-petit">'+escHtml((p[1]||l).trim())+'</span>';}).join('')+'</div>':'')+
      '</div>'+
      '<div style="display:flex;gap:6px;flex-shrink:0">'+
        (!c.isS?'<button class="bouton-modifier-element" data-id="'+c.id+'" data-type="competence"><i class="fas fa-edit"></i> Modifier</button>':'')+
        '<button class="bouton-supprimer-element" data-id="'+c.id+'" data-statique="'+(c.isS?1:0)+'" data-type="competence">'+
          '<i class="fas fa-'+(c.isS?'info-circle':'trash')+'"></i> '+(c.isS?'Info':'Supprimer')+
        '</button>'+
      '</div>'+
    '</div>';
  }

  /* ══════════════════════════════════════════════════════════════
     BIND BOUTONS (Supprimer + Modifier)
  ══════════════════════════════════════════════════════════════ */
  const ROUTES = { projet:'/api/admin/projets/', experience:'/api/admin/experiences/', competence:'/api/admin/competences/' };
  const PAGES  = { projet:'projets', experience:'experiences', competence:'competences' };

  function bindListe(idListe, type) {
    const liste = document.getElementById(idListe);
    if (!liste) return;

    liste.querySelectorAll('.bouton-supprimer-element').forEach(function (btn) {
      btn.addEventListener('click', async function () {
        if (btn.dataset.statique === '1') {
          toast('Cet élément est dans votre index.html (Portfolio HTML). Pour le retirer du site, modifiez directement le fichier index.html sur GitHub.', 'avert');
          return;
        }
        if (!confirm('Supprimer cet élément définitivement ?')) return;
        try {
          await req('DELETE', ROUTES[type] + btn.dataset.id);
          toast('✅ Supprimé', 'succes');
          chargerDonnees(PAGES[type]);
        } catch (err) { toast(err.message, 'erreur'); }
      });
    });

    liste.querySelectorAll('.bouton-modifier-element').forEach(function (btn) {
      btn.addEventListener('click', function () { ouvrirModifier(btn.dataset.id, type); });
    });
  }

  /* ── MODALE MODIFIER ── */
  async function ouvrirModifier(id, type) {
    let item = null;
    try {
      const d = await req('GET', ROUTES[type].replace(/\/$/, ''));
      const liste = d.projets || d.experiences || d.competences || [];
      item = liste.find(function (el) { return String(el.id) === String(id); });
    } catch (err) { toast(err.message, 'erreur'); return; }
    if (!item) { toast('Élément introuvable', 'erreur'); return; }

    let corps = '<div class="grille-champs-modif">';
    if (type === 'projet') {
      corps +=
        htmlChamp('Titre *','text','m-titre',item.titre,200) +
        htmlChamp('Étiquette','text','m-etiquette',item.etiquette,100) +
        htmlTextarea('Description *','m-description',item.description,1000,true) +
        htmlChamp('Technologies','text','m-technologies',item.technologies,500) +
        htmlSelect('Statut','m-statut',[['termine','Terminé'],['en-cours','En cours'],['prevu','Prévu']],item.statut) +
        htmlChamp('Lien du site','url','m-lien-site',item.lien_site||'',500) +
        htmlChamp('Lien GitHub','url','m-lien-github',item.lien_github||'',500) +
        htmlChamp('Ordre','number','m-ordre',item.ordre||0,null) +
        '<div class="champ-form" style="grid-column:1/-1"><label>Photo du projet</label>' +
        (item.image_url ? '<div style="margin-bottom:8px"><img src="'+escHtml(item.image_url)+'" style="height:80px;border-radius:8px;object-fit:cover"><small style="display:block;color:#6B7280;margin-top:4px">Choisir une nouvelle photo pour remplacer</small></div>' : '') +
        htmlUpload('upload-modif-img','apercu-modif-img') +
        '<input type="hidden" id="m-img-actuelle" value="'+escHtml(item.image_url||'')+'"></div>';
    } else if (type === 'experience') {
      corps +=
        htmlChamp('Titre *','text','m-titre',item.titre,200) +
        htmlChamp('Type','text','m-type-exp',item.type_exp||'',100) +
        htmlChamp('Entreprise','text','m-entreprise',item.entreprise||'',200) +
        htmlChamp('Lieu','text','m-lieu',item.lieu||'',200) +
        htmlChamp('Date de début','text','m-date-debut',item.date_debut||'',100) +
        htmlChamp('Date de fin','text','m-date-fin',item.date_fin||'',100) +
        htmlTextarea('Description','m-description',item.description||'',1000,true) +
        htmlChamp('Tags (virgules)','text','m-tags',item.tags||'',500) +
        htmlSelect('Statut','m-statut',[['termine','Terminé'],['en-cours','En cours'],['prevu','Prévu'],['recherche','En recherche']],item.statut) +
        htmlChamp('Ordre','number','m-ordre',item.ordre||0,null);
    } else if (type === 'competence') {
      corps +=
        htmlChamp('Catégorie *','text','m-categorie',item.categorie,200) +
        htmlChamp('Icône FontAwesome','text','m-icone',item.icone||'fas fa-code',100) +
        htmlChamp('Couleur gradient','text','m-couleur',item.couleur||'',200) +
        htmlChamp('Niveau (0-100)','number','m-niveau',item.niveau||70,null) +
        htmlChamp('Libellé niveau','text','m-label-niveau',item.label_niveau||'',100) +
        htmlChamp('Ordre','number','m-ordre',item.ordre||0,null) +
        htmlTextarea('Compétences (icone | Nom, une par ligne)','m-items',item.items||'',1000,true);
    }
    corps += '</div>';

    const titres = { projet:'Modifier le projet', experience:"Modifier l'expérience", competence:'Modifier la compétence' };
    ouvrirModale(titres[type], corps, [{
      html: '<i class="fas fa-save"></i> Enregistrer',
      classe: 'bouton-principal',
      fn: async function () { await sauvegarder(id, type); }
    }]);

    if (type === 'projet') bindUpload('upload-modif-img','apercu-modif-img');
  }

  async function sauvegarder(id, type) {
    const btnS = document.querySelector('#mg .bouton-principal');
    if (btnS) { btnS.disabled=true; btnS.innerHTML='<i class="fas fa-spinner fa-spin"></i> Enregistrement…'; }
    try {
      let body = {}, url = ROUTES[type] + id;
      if (type === 'projet') {
        let image_url = val('m-img-actuelle');
        const fi = document.getElementById('upload-modif-img');
        if (fi && fi.files[0]) image_url = await imageVersBase64(fi.files[0]);
        body = { titre:val('m-titre'), etiquette:val('m-etiquette'), description:val('m-description'), technologies:val('m-technologies'), statut:val('m-statut'), lien_site:val('m-lien-site'), lien_github:val('m-lien-github'), image_url, ordre:parseInt(val('m-ordre'))||0 };
      } else if (type === 'experience') {
        body = { titre:val('m-titre'), type_exp:val('m-type-exp'), entreprise:val('m-entreprise'), lieu:val('m-lieu'), date_debut:val('m-date-debut'), date_fin:val('m-date-fin'), description:val('m-description'), tags:val('m-tags'), statut:val('m-statut'), ordre:parseInt(val('m-ordre'))||0 };
      } else if (type === 'competence') {
        body = { categorie:val('m-categorie'), icone:val('m-icone'), couleur:val('m-couleur'), niveau:parseInt(val('m-niveau'))||70, label_niveau:val('m-label-niveau'), items:val('m-items'), ordre:parseInt(val('m-ordre'))||0 };
      }
      const d = await req('PATCH', url, body);
      if (d.success) {
        toast('✅ Modifications enregistrées !','succes');
        document.getElementById('mg').classList.remove('active');
        chargerDonnees(PAGES[type]);
      } else toast(d.error||'Erreur','erreur');
    } catch (err) { toast(err.message,'erreur'); }
    finally { if (btnS) { btnS.disabled=false; btnS.innerHTML='<i class="fas fa-save"></i> Enregistrer'; } }
  }

  /* ══════════════════════════════════════════════════════════════
     STATISTIQUES
  ══════════════════════════════════════════════════════════════ */
  async function chargerStatistiques() {
    try {
      const d = await req('GET', '/api/admin/stats');
      if (!d.success) return;
      const s = d.stats;
      const p = document.getElementById('date-premier-message'); if (p) p.textContent = s.daily&&s.daily.length ? formaterDateCourte(s.daily[0].date) : '—';
      const dr = document.getElementById('date-dernier-message'); if (dr) dr.textContent = s.daily&&s.daily.length ? formaterDateCourte(s.daily[s.daily.length-1].date) : '—';
      const moy = document.getElementById('moyenne-par-jour'); if (moy) moy.textContent = (s.total/Math.max(s.daily?s.daily.length:1,1)).toFixed(1)+' msg/jour';

      const ctxM = document.getElementById('graphique-messages');
      if (ctxM && ctxM.getContext) {
        if (graphiqueMessages) graphiqueMessages.destroy();
        graphiqueMessages = new Chart(ctxM.getContext('2d'), { type:'line', data:{ labels:(s.daily||[]).map(function(r){return new Date(r.date).toLocaleDateString('fr-FR',{day:'2-digit',month:'short'});}), datasets:[{label:'Messages',data:(s.daily||[]).map(function(r){return r.count;}),borderColor:'#FF6B35',backgroundColor:'rgba(255,107,53,0.1)',tension:0.4,fill:true,pointBackgroundColor:'#FF6B35',pointRadius:4}]}, options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{labels:{color:'#B4B8D4'}}},scales:{x:{ticks:{color:'#B4B8D4'},grid:{color:'rgba(255,255,255,.05)'}},y:{ticks:{color:'#B4B8D4'},grid:{color:'rgba(255,255,255,.05)'},beginAtZero:true}}} });
      }
      const ctxS = document.getElementById('graphique-statuts');
      if (ctxS && ctxS.getContext) {
        if (graphiqueStatuts) graphiqueStatuts.destroy();
        graphiqueStatuts = new Chart(ctxS.getContext('2d'), { type:'doughnut', data:{labels:['Lus','Non lus','Répondus'],datasets:[{data:[s.read,s.unread,s.replied],backgroundColor:['#10B981','#EF4444','#FF6B35']}]}, options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{labels:{color:'#B4B8D4'}}}} });
      }
    } catch {}
  }

  /* ══════════════════════════════════════════════════════════════
     PARAMÈTRES
  ══════════════════════════════════════════════════════════════ */
  function bindParametres() {
    const form = document.getElementById('formulaire-mdp');
    if (!form || form.dataset.bound) return;
    form.dataset.bound = '1';
    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      const cur = document.getElementById('mdp-actuel').value;
      const nxt = document.getElementById('nouveau-mdp').value;
      const cnf = document.getElementById('confirmer-mdp').value;
      const msg = document.getElementById('message-mdp');
      if (nxt !== cnf) { msg.textContent='❌ Mots de passe différents'; msg.style.color='#EF4444'; return; }
      if (nxt.length < 12) { msg.textContent='❌ Minimum 12 caractères'; msg.style.color='#EF4444'; return; }
      try {
        const d = await req('POST','/api/admin/change-password',{current:cur,next:nxt});
        if (d.success) { msg.textContent='✅ Mot de passe modifié. Reconnexion…'; msg.style.color='#10B981'; setTimeout(function(){TOKEN=null;localStorage.removeItem('admin_token');sessionStorage.removeItem('admin_token');location.reload();},2000); }
        else { msg.textContent='❌ '+(d.error||'Erreur'); msg.style.color='#EF4444'; }
      } catch (err) { msg.textContent='❌ '+err.message; msg.style.color='#EF4444'; }
    });
  }

  /* ══════════════════════════════════════════════════════════════
     ACTIONS RAPIDES
  ══════════════════════════════════════════════════════════════ */
  function bindActions() {
    document.querySelectorAll('.carte-action').forEach(function (btn) {
      btn.addEventListener('click', async function () {
        const a = btn.dataset.action;
        if (a === 'exporter') exporterMessages();
        else if (a === 'supprimer-lus') {
          if (!confirm('Supprimer tous les messages lus ?')) return;
          try { await req('DELETE','/api/admin/messages?type=read'); toast('Messages lus supprimés','succes'); chargerVueEnsemble(); chargerStatsRapides(); } catch(err){toast(err.message,'erreur');}
        } else if (a === 'tout-marquer-lu') {
          try { await req('PATCH','/api/admin/messages/read-all'); toast('Tous marqués comme lus','succes'); chargerVueEnsemble(); chargerStatsRapides(); } catch(err){toast(err.message,'erreur');}
        }
      });
    });
    const btnST = document.getElementById('btn-supprimer-tout');
    if (btnST) btnST.addEventListener('click', async function () {
      if (!confirm('Supprimer TOUS les messages ? Irréversible.')) return;
      try { await req('DELETE','/api/admin/messages?type=all'); toast('Tous les messages supprimés','succes'); chargerVueEnsemble(); chargerStatsRapides(); } catch(err){toast(err.message,'erreur');}
    });
  }

  async function exporterMessages() {
    try {
      const d = await req('GET','/api/admin/messages?limit=200');
      if (!d.messages||!d.messages.length) return toast('Aucun message','avert');
      const csv = ['ID,Nom,Email,Tél,Message,Lu,Date'].concat(d.messages.map(function(m){ return m.id+',"'+(m.name||'').replace(/"/g,'""')+'","'+m.email+'","'+(m.phone||'')+'","'+(m.message||'').replace(/"/g,'""').replace(/\n/g,' ')+'",'+( m.is_read?'Oui':'Non')+',"'+formaterDate(m.created_at)+'"'; })).join('\n');
      const a = document.createElement('a'); a.href=URL.createObjectURL(new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8;'})); a.download='messages_'+new Date().toISOString().slice(0,10)+'.csv'; a.click();
      toast('Export CSV réussi','succes');
    } catch(err){toast(err.message,'erreur');}
  }

  /* ── HELPERS HTML ── */
  function badgeHTML(inner) { return inner; }
  function htmlVide(icone, titre, desc) {
    return '<div class="etat-vide-liste"><i class="fas '+icone+'"></i><p>'+escHtml(titre)+'</p>'+(desc?'<p style="font-size:.8rem">'+escHtml(desc)+'</p>':'')+'</div>';
  }
  function htmlErreur(msg) {
    return '<div class="etat-vide-liste"><i class="fas fa-exclamation-triangle" style="color:#F59E0B"></i>' +
      '<p style="color:#F59E0B">Erreur de chargement</p>' +
      '<p style="font-size:.82rem;margin-top:6px">'+escHtml(msg)+'</p>' +
      '<p style="font-size:.8rem;margin-top:8px;color:#F59E0B">⚠️ Le serveur Render est peut-être en veille.<br>Attendez 30-60 secondes puis cliquez sur <strong>Actualiser</strong>.</p>' +
      '<button onclick="document.getElementById(\'btn-actualiser\').click()" style="margin-top:12px;padding:8px 16px;background:#FF6B35;border:none;border-radius:8px;color:#fff;font-weight:600;cursor:pointer"><i class="fas fa-sync-alt"></i> Actualiser maintenant</button>' +
    '</div>';
  }

  /* ══════════════════════════════════════════════════════════════
     STYLES INJECTÉS
  ══════════════════════════════════════════════════════════════ */
  function injecterStyles() {
    if (document.getElementById('ajs')) return;
    const s = document.createElement('style'); s.id = 'ajs';
    s.textContent = `
      .toast{position:fixed;top:-100px;right:20px;background:rgba(10,14,39,.97);color:#fff;padding:1rem 1.5rem;border-radius:12px;box-shadow:0 8px 32px rgba(0,0,0,.5);display:flex;align-items:center;gap:.75rem;z-index:10000;min-width:280px;max-width:500px;transition:transform .3s cubic-bezier(.4,0,.2,1);border:1px solid rgba(255,255,255,.1);font-size:.9rem}
      .toast.visible{transform:translateY(120px)}
      .toast-succes{border-left:4px solid #10B981}.toast-succes i{color:#10B981}
      .toast-erreur{border-left:4px solid #EF4444}.toast-erreur i{color:#EF4444}
      .toast-info{border-left:4px solid #00D9FF}.toast-info i{color:#00D9FF}
      .toast-avert{border-left:4px solid #F59E0B}.toast-avert i{color:#F59E0B}
      @media(max-width:768px){.toast{right:10px;left:10px;min-width:auto}}

      .badge-repondu{display:inline-flex;align-items:center;gap:4px;font-size:.75rem;background:rgba(16,185,129,.15);color:#10B981;padding:3px 8px;border-radius:20px;font-weight:600}

      .upload-photo-zone{width:100%}
      .upload-declencheur{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;padding:1.5rem;background:rgba(255,255,255,.03);border:2px dashed rgba(255,255,255,.15);border-radius:12px;cursor:pointer;transition:all .2s;text-align:center}
      .upload-declencheur:hover{border-color:#FF6B35;background:rgba(255,107,53,.05)}
      .upload-declencheur i{font-size:1.75rem;color:#FF6B35}
      .upload-declencheur span{font-size:.9rem;color:#fff;font-weight:600}
      .upload-declencheur small{font-size:.75rem;color:#6B7280}
      .upload-apercu{position:relative;display:inline-block;border-radius:12px;max-width:200px}
      .upload-apercu img{width:100%;height:120px;object-fit:cover;border-radius:12px;display:block}
      .suppr-apercu{position:absolute;top:6px;right:6px;background:rgba(239,68,68,.9);border:none;border-radius:50%;width:26px;height:26px;display:flex;align-items:center;justify-content:center;cursor:pointer;color:#fff;font-size:.8rem}

      .bouton-modifier-element{padding:.45rem .75rem;background:rgba(59,130,246,.1);border:1px solid rgba(59,130,246,.2);border-radius:8px;color:#60A5FA;cursor:pointer;font-size:.82rem;display:flex;align-items:center;gap:5px;transition:background .2s;white-space:nowrap;flex-shrink:0}
      .bouton-modifier-element:hover{background:rgba(59,130,246,.2)}

      /* Modale modifier */
      #mg .grille-champs-modif{display:grid;grid-template-columns:1fr 1fr;gap:1rem}
      #mg .champ-form{display:flex;flex-direction:column;gap:6px}
      #mg .champ-form label{font-size:.8rem;color:#B4B8D4;font-weight:600;text-transform:uppercase;letter-spacing:.05em}
      #mg .champ-form input,#mg .champ-form textarea,#mg .champ-form select{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:8px;color:#fff;font-size:.9rem;padding:.65rem .85rem;outline:none;transition:border-color .2s;font-family:inherit;width:100%;box-sizing:border-box}
      #mg .champ-form input:focus,#mg .champ-form textarea:focus,#mg .champ-form select:focus{border-color:#FF6B35}
      #mg .champ-form textarea{resize:vertical;min-height:80px}
      #mg .champ-form select option{background:#16192F}
      #mg .champ-form[style*="1/-1"]{grid-column:1/-1}
      @media(max-width:600px){#mg .grille-champs-modif{grid-template-columns:1fr}}
    `;
    document.head.appendChild(s);
  }

  /* ══════════════════════════════════════════════════════════════
     DÉMARRAGE
  ══════════════════════════════════════════════════════════════ */
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

})();