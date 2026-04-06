(function () {
  'use strict';

  /* ══════════════════════════════════════════════════════════════
     CONFIGURATION
  ══════════════════════════════════════════════════════════════ */
  const API = (function () {
    const h = window.location.hostname;
    if (h === 'localhost' || h === '127.0.0.1') return 'http://localhost:3000';
    return 'https://portfolio-backend-uaf9.onrender.com';
  })();

  let TOKEN = localStorage.getItem('admin_token') || sessionStorage.getItem('admin_token');
  let messageActuel = null;
  let graphiqueMessages = null;
  let graphiqueStatuts  = null;

  /* ══════════════════════════════════════════════════════════════
     HELPERS
  ══════════════════════════════════════════════════════════════ */
  function req(method, url, body) {
    const opts = {
      method,
      headers: { 'Content-Type': 'application/json', ...(TOKEN ? { Authorization: 'Bearer ' + TOKEN } : {}) }
    };
    if (body) opts.body = JSON.stringify(body);
    return fetch(API + url, opts).then(r => r.json());
  }

  function toast(msg, type = 'info') {
    const box = document.createElement('div');
    box.className = 'toast toast-' + type;
    const icons = { succes: 'fa-check-circle', erreur: 'fa-exclamation-circle', info: 'fa-info-circle', avert: 'fa-exclamation-triangle' };
    box.innerHTML = `<i class="fas ${icons[type] || icons.info}"></i><span>${String(msg).slice(0, 200)}</span>`;
    document.body.appendChild(box);
    setTimeout(() => box.classList.add('visible'), 10);
    setTimeout(() => { box.classList.remove('visible'); setTimeout(() => box.remove(), 300); }, 4000);
  }

  function formaterDate(d) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  function formaterDateCourte(d) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  /* ══════════════════════════════════════════════════════════════
     UPLOAD IMAGE → BASE64
  ══════════════════════════════════════════════════════════════ */
  function imageVersBase64(fichier) {
    return new Promise((resolve, reject) => {
      if (!fichier.type.startsWith('image/')) return reject(new Error('Fichier non-image'));
      if (fichier.size > 5 * 1024 * 1024) return reject(new Error('Image trop lourde (max 5 Mo)'));
      const reader = new FileReader();
      reader.onload = e => resolve(e.target.result);
      reader.onerror = () => reject(new Error('Lecture échouée'));
      reader.readAsDataURL(fichier);
    });
  }

  function creerChampPhoto(idInput, idPreview) {
    return `
      <div class="upload-photo-zone" id="zone-${idInput}">
        <input type="file" id="${idInput}" accept="image/*" style="display:none">
        <div class="upload-declencheur" onclick="document.getElementById('${idInput}').click()">
          <i class="fas fa-camera"></i>
          <span>Choisir une photo</span>
          <small>JPG, PNG, WebP — max 5 Mo</small>
        </div>
        <div class="upload-apercu" id="${idPreview}" style="display:none">
          <img id="img-${idPreview}" src="" alt="Aperçu">
          <button type="button" class="suppr-apercu" onclick="supprimerApercu('${idInput}','${idPreview}')">
            <i class="fas fa-times"></i>
          </button>
        </div>
      </div>`;
  }

  window.supprimerApercu = function (idInput, idPreview) {
    document.getElementById(idInput).value = '';
    document.getElementById(idPreview).style.display = 'none';
    document.getElementById('zone-' + idInput).querySelector('.upload-declencheur').style.display = 'flex';
  };

  function bindUpload(idInput, idPreview) {
    const inp = document.getElementById(idInput);
    if (!inp) return;
    inp.addEventListener('change', async function () {
      const f = this.files[0];
      if (!f) return;
      try {
        const b64 = await imageVersBase64(f);
        const prev = document.getElementById(idPreview);
        document.getElementById('img-' + idPreview).src = b64;
        prev.style.display = 'block';
        document.getElementById('zone-' + idInput).querySelector('.upload-declencheur').style.display = 'none';
      } catch (e) { toast(e.message, 'erreur'); }
    });
  }

  /* ══════════════════════════════════════════════════════════════
     CONNEXION / SESSION
  ══════════════════════════════════════════════════════════════ */
  function init() {
    if (TOKEN) {
      afficherTableau();
    } else {
      document.getElementById('page-connexion').style.display = 'flex';
      document.getElementById('tableau-bord').classList.add('masque');
    }
    bindConnexion();
    bindNavigation();
    bindDeconnexion();
    bindActions();
    injecterStyles();
  }

  function bindConnexion() {
    const form = document.getElementById('formulaire-connexion');
    const btnVoir = document.querySelector('.bouton-voir-mdp');
    const champMdp = document.getElementById('champ-motdepasse');

    if (btnVoir) {
      btnVoir.addEventListener('click', () => {
        const estMdp = champMdp.type === 'password';
        champMdp.type = estMdp ? 'text' : 'password';
        btnVoir.querySelector('i').className = estMdp ? 'fas fa-eye-slash' : 'fas fa-eye';
      });
    }

    if (!form) return;
    form.addEventListener('submit', async e => {
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
          if (document.getElementById('se-souvenir')?.checked) {
            localStorage.setItem('admin_token', TOKEN);
          } else {
            sessionStorage.setItem('admin_token', TOKEN);
          }
          afficherTableau();
        } else {
          errDiv.style.display = 'flex';
          errDiv.querySelector('span').textContent = data.error || 'Identifiants incorrects';
          form.classList.add('secouer');
          setTimeout(() => form.classList.remove('secouer'), 500);
        }
      } catch {
        errDiv.style.display = 'flex';
        errDiv.querySelector('span').textContent = 'Erreur réseau.';
      } finally {
        btnC.disabled = false;
        btnC.innerHTML = '<i class="fas fa-sign-in-alt"></i> Se connecter';
      }
    });
  }

  function afficherTableau() {
    document.getElementById('page-connexion').style.display = 'none';
    document.getElementById('tableau-bord').classList.remove('masque');
    chargerDonnees('vue-ensemble');
    chargerStatsRapides();
  }

  function bindDeconnexion() {
    document.getElementById('btn-deconnexion')?.addEventListener('click', async () => {
      try { await req('POST', '/api/admin/logout'); } catch {}
      TOKEN = null;
      localStorage.removeItem('admin_token');
      sessionStorage.removeItem('admin_token');
      location.reload();
    });
  }

  /* ══════════════════════════════════════════════════════════════
     NAVIGATION
  ══════════════════════════════════════════════════════════════ */
  function bindNavigation() {
    document.querySelectorAll('.element-nav').forEach(el => {
      el.addEventListener('click', e => {
        e.preventDefault();
        const page = el.dataset.page;
        document.querySelectorAll('.element-nav').forEach(n => n.classList.remove('actif'));
        el.classList.add('actif');
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        document.getElementById('page-' + page)?.classList.add('active');
        document.getElementById('titre-page').textContent = el.querySelector('span').textContent;
        fermerBarreLatAuMobile();
        chargerDonnees(page);
      });
    });

    document.querySelectorAll('[data-page]').forEach(el => {
      if (el.classList.contains('element-nav')) return;
      el.addEventListener('click', e => {
        e.preventDefault();
        const page = el.dataset.page;
        document.querySelector(`.element-nav[data-page="${page}"]`)?.click();
      });
    });

    document.getElementById('btn-menu')?.addEventListener('click', () => {
      document.querySelector('.barre-laterale')?.classList.toggle('ouverte');
    });

    document.getElementById('btn-actualiser')?.addEventListener('click', () => {
      const pageActive = document.querySelector('.page.active')?.id.replace('page-', '');
      if (pageActive) chargerDonnees(pageActive);
      chargerStatsRapides();
    });
  }

  function fermerBarreLatAuMobile() {
    if (window.innerWidth <= 992) {
      document.querySelector('.barre-laterale')?.classList.remove('ouverte');
    }
  }

  /* ══════════════════════════════════════════════════════════════
     CHARGEMENT DES DONNÉES PAR PAGE
  ══════════════════════════════════════════════════════════════ */
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

  /* ══════════════════════════════════════════════════════════════
     STATS RAPIDES (badge non-lus)
  ══════════════════════════════════════════════════════════════ */
  async function chargerStatsRapides() {
    try {
      const d = await req('GET', '/api/admin/stats');
      if (d.success) {
        const nb = document.getElementById('nb-messages');
        if (nb) nb.textContent = d.stats.unread;
        const ptNotif = document.querySelector('.point-notif');
        if (ptNotif) ptNotif.style.display = d.stats.unread > 0 ? 'block' : 'none';
      }
    } catch {}
  }

  /* ══════════════════════════════════════════════════════════════
     VUE D'ENSEMBLE
  ══════════════════════════════════════════════════════════════ */
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
      if (!d.messages?.length) {
        cont.innerHTML = `<div class="etat-vide"><i class="fas fa-inbox"></i><h3>Aucun message</h3><p>Les messages apparaîtront ici</p></div>`;
        return;
      }
      cont.innerHTML = d.messages.map(renderMessageElement).join('');
      cont.querySelectorAll('.element-message').forEach(el => {
        el.addEventListener('click', () => ouvrirMessage(parseInt(el.dataset.id)));
      });
    } catch {}
  }

  /* ══════════════════════════════════════════════════════════════
     MESSAGES
  ══════════════════════════════════════════════════════════════ */
  let pageMessages = 1;
  let filtreMessages = 'all';

  async function chargerMessages() {
    const cont = document.getElementById('liste-messages');
    if (!cont) return;
    cont.innerHTML = `<div class="chargement"><i class="fas fa-spinner fa-spin"></i> Chargement…</div>`;
    try {
      const d = await req('GET', `/api/admin/messages?page=${pageMessages}&limit=20&filter=${filtreMessages}`);
      if (!d.messages?.length) {
        cont.innerHTML = `<div class="etat-vide"><i class="fas fa-inbox"></i><h3>Aucun message</h3><p>Aucun message à afficher</p></div>`;
        return;
      }
      const recherche = document.getElementById('recherche-messages')?.value.toLowerCase() || '';
      let msgs = d.messages;
      if (recherche) {
        msgs = msgs.filter(m =>
          m.name.toLowerCase().includes(recherche) ||
          m.email.toLowerCase().includes(recherche) ||
          m.message.toLowerCase().includes(recherche)
        );
      }
      cont.innerHTML = msgs.map(renderMessageElement).join('');
      cont.querySelectorAll('.element-message').forEach(el => {
        el.addEventListener('click', () => ouvrirMessage(parseInt(el.dataset.id)));
      });
    } catch { cont.innerHTML = `<div class="etat-vide"><i class="fas fa-exclamation-triangle"></i><h3>Erreur</h3><p>Impossible de charger les messages</p></div>`; }
  }

  function renderMessageElement(m) {
    const nonLu = !m.is_read;
    return `
      <div class="element-message ${nonLu ? 'non-lu' : ''}" data-id="${m.id}">
        <div class="entete-message">
          <span class="nom-expediteur"><i class="fas fa-user-circle"></i>${escHtml(m.name)}</span>
          <span class="date-message"><i class="fas fa-clock"></i>${formaterDateCourte(m.created_at)}</span>
        </div>
        <div class="email-expediteur"><i class="fas fa-envelope"></i>${escHtml(m.email)}</div>
        <div class="apercu-texte">${escHtml(m.message)}</div>
        <div class="boutons-message">
          <button class="bouton-petit" onclick="event.stopPropagation();toggleLu(${m.id},this)">
            <i class="fas fa-${nonLu ? 'envelope-open' : 'envelope'}"></i> ${nonLu ? 'Marquer lu' : 'Marquer non lu'}
          </button>
          <button class="bouton-petit rouge" onclick="event.stopPropagation();supprimerMessage(${m.id})">
            <i class="fas fa-trash"></i> Supprimer
          </button>
          ${m.replied_at ? '<span class="badge-repondu"><i class="fas fa-reply"></i> Répondu</span>' : ''}
        </div>
      </div>`;
  }

  async function ouvrirMessage(id) {
    try {
      const d = await req('GET', `/api/admin/messages?limit=100`);
      const msg = d.messages?.find(m => m.id === id);
      if (!msg) return;
      messageActuel = msg;
      const corps = document.getElementById('corps-modale');
      corps.innerHTML = `
        <div class="detail-message">
          <div class="champ-message"><label><i class="fas fa-user"></i> Expéditeur</label><div class="valeur">${escHtml(msg.name)}</div></div>
          <div class="champ-message"><label><i class="fas fa-envelope"></i> Email</label><div class="valeur"><a href="mailto:${escHtml(msg.email)}" style="color:var(--orange)">${escHtml(msg.email)}</a></div></div>
          ${msg.phone ? `<div class="champ-message"><label><i class="fas fa-phone"></i> Téléphone</label><div class="valeur">${escHtml(msg.phone)}</div></div>` : ''}
          <div class="champ-message"><label><i class="fas fa-calendar"></i> Date</label><div class="valeur">${formaterDate(msg.created_at)}</div></div>
          <div class="champ-message"><label><i class="fas fa-comment"></i> Message</label><div class="valeur" style="white-space:pre-wrap">${escHtml(msg.message)}</div></div>
          ${msg.replied_at ? `<div class="champ-message"><label><i class="fas fa-reply"></i> Répondu le</label><div class="valeur">${formaterDate(msg.replied_at)}</div></div>` : ''}
          <div class="champ-message">
            <label><i class="fas fa-reply-all"></i> Répondre par email</label>
            <textarea id="texte-reponse" placeholder="Votre réponse…" style="width:100%;min-height:100px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:8px;color:#fff;padding:0.75rem;font-family:inherit;resize:vertical"></textarea>
            <button class="bouton-principal" style="margin-top:8px" onclick="envoyerReponse(${msg.id},'${escHtml(msg.email)}')">
              <i class="fas fa-paper-plane"></i> Envoyer la réponse
            </button>
          </div>
        </div>`;
      document.getElementById('fenetre-message').classList.add('active');
      if (!msg.is_read) await req('PATCH', `/api/admin/messages/${id}/read`);
    } catch {}
  }

  window.toggleLu = async function (id, btn) {
    try {
      await req('PATCH', `/api/admin/messages/${id}/read`);
      chargerMessages();
      chargerStatsRapides();
    } catch { toast('Erreur', 'erreur'); }
  };

  window.supprimerMessage = async function (id) {
    if (!confirm('Supprimer ce message ?')) return;
    try {
      await req('DELETE', `/api/admin/messages/${id}`);
      toast('Message supprimé', 'succes');
      chargerMessages();
      chargerStatsRapides();
    } catch { toast('Erreur', 'erreur'); }
  };

  window.envoyerReponse = async function (id, email) {
    const texte = document.getElementById('texte-reponse')?.value.trim();
    if (!texte) return toast('Écrivez une réponse', 'avert');
    try {
      const d = await req('POST', '/api/admin/send-reply', {
        to: email,
        subject: 'Réponse à votre message — Philippe Hountondji',
        message: texte,
        messageId: id
      });
      if (d.success) { toast('Réponse envoyée !', 'succes'); fermerModale(); chargerMessages(); }
      else toast(d.error, 'erreur');
    } catch { toast('Erreur réseau', 'erreur'); }
  };

  function fermerModale() {
    document.getElementById('fenetre-message')?.classList.remove('active');
  }

  document.getElementById('btn-fermer-modale')?.addEventListener('click', fermerModale);
  document.querySelector('.bouton-fermer-modale')?.addEventListener('click', fermerModale);
  document.getElementById('btn-supprimer-message')?.addEventListener('click', () => {
    if (messageActuel) supprimerMessage(messageActuel.id);
    fermerModale();
  });

  document.getElementById('filtre-messages')?.addEventListener('change', function () {
    filtreMessages = this.value; pageMessages = 1; chargerMessages();
  });

  let rechercheTimer;
  document.getElementById('recherche-messages')?.addEventListener('input', () => {
    clearTimeout(rechercheTimer);
    rechercheTimer = setTimeout(chargerMessages, 300);
  });

  /* ══════════════════════════════════════════════════════════════
     PROJETS
  ══════════════════════════════════════════════════════════════ */

  // Projets statiques déjà présents sur le portfolio (à afficher dans l'admin)
  const PROJETS_STATIQUES = [
    {
      id: 'static-1',
      titre: 'Plateforme VBG',
      description: 'Plateforme 100% anonyme et sécurisée permettant aux femmes de partager des témoignages sur les violences basées sur le genre.',
      technologies: 'HTML/CSS, Node.js',
      lien_site: 'https://vbg-production.up.railway.app',
      lien_github: 'https://github.com/Philippe554-del',
      etiquette: 'Social',
      statut: 'termine',
      isStatique: true
    },
    {
      id: 'static-2',
      titre: 'Mon Portfolio',
      description: 'Portfolio professionnel interactif avec animations, formulaire de contact sécurisé, design responsive et SEO optimisé.',
      technologies: 'HTML/CSS, JavaScript',
      lien_site: 'https://philippe554-del.github.io/Portfolio-/',
      lien_github: 'https://github.com/Philippe554-del/Portfolio-',
      etiquette: 'Portfolio',
      statut: 'termine',
      isStatique: true
    },
    {
      id: 'static-3',
      titre: 'Dashboard Administratif',
      description: 'Plateforme de gestion complète avec visualisation de données en temps réel, authentification et tableau de bord responsive.',
      technologies: 'React, Node.js, MongoDB',
      etiquette: 'En cours',
      statut: 'en-cours',
      isStatique: true
    },
    {
      id: 'static-4',
      titre: 'Simulation Réseau Entreprise',
      description: 'Modélisation complète d\'un réseau d\'entreprise avec routeurs, switches, VLANs et politiques de sécurité.',
      technologies: 'Cisco, Sécurité, Topologie',
      etiquette: 'En cours',
      statut: 'en-cours',
      isStatique: true
    },
    {
      id: 'static-5',
      titre: 'Système de Gestion API',
      description: 'API RESTful complète avec documentation Swagger, authentification JWT, rate limiting et logs détaillés.',
      technologies: 'Python, FastAPI, PostgreSQL',
      etiquette: 'En cours',
      statut: 'en-cours',
      isStatique: true
    }
  ];

  async function chargerProjets() {
    // Injecter le champ upload photo dans le formulaire
    const zoneUpload = document.getElementById('zone-upload-projet');
    if (!zoneUpload) {
      const champImg = document.querySelector('#form-ajout-projet .champ-form:has(#projet-image)') ||
                       document.getElementById('projet-image')?.closest('.champ-form');
      if (champImg) {
        champImg.querySelector('label').textContent = 'Photo du projet';
        champImg.innerHTML = `<label>Photo du projet</label>${creerChampPhoto('upload-projet-img', 'apercu-projet-img')}`;
        bindUpload('upload-projet-img', 'apercu-projet-img');
      }
    }

    const liste = document.getElementById('liste-projets');
    if (!liste) return;
    liste.innerHTML = `<div class="chargement-liste"><i class="fas fa-spinner fa-spin"></i> Chargement…</div>`;

    try {
      const d = await req('GET', '/api/admin/projets');
      const projetsDB = d.projets || [];
      const tous = [...PROJETS_STATIQUES, ...projetsDB];

      document.getElementById('nb-projets').textContent = tous.length;

      if (!tous.length) {
        liste.innerHTML = `<div class="etat-vide-liste"><i class="fas fa-folder-open"></i><p>Aucun projet enregistré</p></div>`;
        return;
      }
      liste.innerHTML = tous.map(p => renderProjetElement(p)).join('');

      liste.querySelectorAll('.bouton-supprimer-element').forEach(btn => {
        btn.addEventListener('click', async () => {
          const id = btn.dataset.id;
          const isStatique = btn.dataset.statique === '1';
          if (isStatique) return toast('Les projets du portfolio HTML ne peuvent pas être supprimés ici. Modifiez directement index.html.', 'avert');
          if (!confirm('Supprimer ce projet ?')) return;
          try {
            await req('DELETE', `/api/admin/projets/${id}`);
            toast('Projet supprimé', 'succes');
            chargerProjets();
          } catch { toast('Erreur', 'erreur'); }
        });
      });
    } catch {
      liste.innerHTML = `<div class="etat-vide-liste"><i class="fas fa-exclamation-triangle"></i><p>Erreur de chargement</p></div>`;
    }

    // Bind formulaire ajout projet
    const form = document.getElementById('form-ajout-projet');
    if (form && !form.dataset.bound) {
      form.dataset.bound = '1';
      form.addEventListener('submit', async e => {
        e.preventDefault();
        const btn = document.getElementById('btn-ajouter-projet');
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Ajout…';

        // Récupérer image base64
        let image_url = '';
        const fileInp = document.getElementById('upload-projet-img');
        if (fileInp?.files[0]) {
          try { image_url = await imageVersBase64(fileInp.files[0]); }
          catch (e) { toast(e.message, 'erreur'); btn.disabled = false; btn.innerHTML = '<i class="fas fa-plus"></i> Ajouter le projet'; return; }
        }

        const body = {
          titre:        document.getElementById('projet-titre').value,
          description:  document.getElementById('projet-description').value,
          technologies: document.getElementById('projet-technologies').value,
          lien_site:    document.getElementById('projet-lien-site').value,
          lien_github:  document.getElementById('projet-lien-github').value,
          image_url,
          etiquette:    document.getElementById('projet-etiquette').value || 'Projet',
          statut:       document.getElementById('projet-statut').value,
          ordre:        parseInt(document.getElementById('projet-ordre').value) || 0
        };

        try {
          const d = await req('POST', '/api/admin/projets', body);
          if (d.success) {
            toast('Projet ajouté avec succès !', 'succes');
            form.reset();
            supprimerApercu('upload-projet-img', 'apercu-projet-img');
            chargerProjets();
          } else toast(d.error, 'erreur');
        } catch { toast('Erreur réseau', 'erreur'); }
        finally { btn.disabled = false; btn.innerHTML = '<i class="fas fa-plus"></i> Ajouter le projet'; }
      });
    }
  }

  function renderProjetElement(p) {
    const badgeClass = { 'termine': 'badge-termine', 'en-cours': 'badge-en-cours', 'prevu': 'badge-prevu' };
    const badges = { 'termine': 'Terminé', 'en-cours': 'En cours', 'prevu': 'Prévu' };
    const isStatique = !!p.isStatique;
    const imgHtml = p.image_url ? `<img src="${p.image_url}" alt="${escHtml(p.titre)}" style="width:64px;height:48px;object-fit:cover;border-radius:8px;margin-right:12px;flex-shrink:0">` : '';

    return `
      <div class="element-liste">
        ${imgHtml}
        <div class="element-liste-info">
          <div class="element-liste-titre">
            ${escHtml(p.titre)}
            <span class="badge-element ${badgeClass[p.statut] || ''}">${badges[p.statut] || p.statut}</span>
            ${isStatique ? '<span class="badge-element" style="background:rgba(99,102,241,0.15);color:#818CF8">Portfolio HTML</span>' : '<span class="badge-element" style="background:rgba(16,185,129,0.15);color:#10B981">Base de données</span>'}
          </div>
          <div class="element-liste-meta">${escHtml(p.description || '').slice(0, 100)}${(p.description||'').length > 100 ? '…' : ''}</div>
          ${p.technologies ? `<div class="element-liste-tags">${p.technologies.split(',').map(t => `<span class="tag-petit">${escHtml(t.trim())}</span>`).join('')}</div>` : ''}
          ${p.lien_site ? `<div class="element-liste-meta" style="margin-top:4px"><a href="${escHtml(p.lien_site)}" target="_blank" style="color:var(--orange);font-size:0.78rem"><i class="fas fa-external-link-alt"></i> ${escHtml(p.lien_site).slice(0,50)}</a></div>` : ''}
        </div>
        <button class="bouton-supprimer-element" data-id="${p.id}" data-statique="${isStatique ? 1 : 0}">
          <i class="fas fa-trash"></i> ${isStatique ? 'Info' : 'Supprimer'}
        </button>
      </div>`;
  }

  /* ══════════════════════════════════════════════════════════════
     EXPÉRIENCES
  ══════════════════════════════════════════════════════════════ */

  const EXPERIENCES_STATIQUES = [
    {
      id: 'static-exp-1',
      titre: 'Stage de Licence 2',
      type_exp: 'Stage académique — L2',
      entreprise: 'En recherche active',
      lieu: 'Bénin',
      date_debut: '2025',
      date_fin: 'En cours',
      description: 'Recherche active d\'un stage en développement web ou administration réseau. Disponible pour toute entreprise souhaitant accueillir un étudiant motivé.',
      tags: 'Développement Web, Administration Réseau, Support IT',
      statut: 'recherche',
      isStatique: true
    },
    {
      id: 'static-exp-2',
      titre: 'Stage de Licence 3',
      type_exp: 'Stage académique — L3',
      entreprise: 'À définir',
      lieu: 'Bénin',
      date_debut: '2026',
      date_fin: 'Prévu',
      description: 'Stage prévu en troisième année de licence. Consolidation des acquis théoriques par une expérience pratique en entreprise.',
      tags: 'Full-Stack, Réseaux, Gestion de projet',
      statut: 'prevu',
      isStatique: true
    },
    {
      id: 'static-exp-3',
      titre: 'Stage Professionnel',
      type_exp: 'Stage de fin d\'études',
      entreprise: 'À définir',
      lieu: 'Bénin / International',
      date_debut: '2027',
      date_fin: 'Prévu',
      description: 'Stage professionnel de fin d\'études prévu après la validation de la licence.',
      tags: 'Professionnel, Fin d\'études, Emploi',
      statut: 'prevu',
      isStatique: true
    },
    {
      id: 'static-exp-4',
      titre: 'Développeur Web — Projets Personnels',
      type_exp: 'Projet personnel',
      entreprise: 'Indépendant',
      lieu: 'Porto-Novo, Bénin',
      date_debut: '2022',
      date_fin: 'Présent',
      description: 'Développement de plusieurs applications web en autonomie, dont une plateforme sociale sécurisée pour les témoignages de violences basées sur le genre, déployée en production sur Railway.',
      tags: 'HTML/CSS, JavaScript, Node.js, Déploiement',
      statut: 'en-cours',
      isStatique: true
    }
  ];

  async function chargerExperiences() {
    const liste = document.getElementById('liste-experiences');
    if (!liste) return;
    liste.innerHTML = `<div class="chargement-liste"><i class="fas fa-spinner fa-spin"></i> Chargement…</div>`;

    try {
      const d = await req('GET', '/api/admin/experiences');
      const expDB = d.experiences || [];
      const tous = [...EXPERIENCES_STATIQUES, ...expDB];

      document.getElementById('nb-experiences').textContent = tous.length;

      if (!tous.length) {
        liste.innerHTML = `<div class="etat-vide-liste"><i class="fas fa-briefcase"></i><p>Aucune expérience enregistrée</p></div>`;
        return;
      }
      liste.innerHTML = tous.map(exp => renderExpElement(exp)).join('');

      liste.querySelectorAll('.bouton-supprimer-element').forEach(btn => {
        btn.addEventListener('click', async () => {
          if (btn.dataset.statique === '1') return toast('Expérience du portfolio HTML — modifiez index.html directement.', 'avert');
          if (!confirm('Supprimer cette expérience ?')) return;
          try {
            await req('DELETE', `/api/admin/experiences/${btn.dataset.id}`);
            toast('Expérience supprimée', 'succes');
            chargerExperiences();
          } catch { toast('Erreur', 'erreur'); }
        });
      });
    } catch {
      liste.innerHTML = `<div class="etat-vide-liste"><i class="fas fa-exclamation-triangle"></i><p>Erreur de chargement</p></div>`;
    }

    const form = document.getElementById('form-ajout-experience');
    if (form && !form.dataset.bound) {
      form.dataset.bound = '1';
      form.addEventListener('submit', async e => {
        e.preventDefault();
        const btn = document.getElementById('btn-ajouter-experience');
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Ajout…';
        const body = {
          titre:        document.getElementById('exp-titre').value,
          type_exp:     document.getElementById('exp-type').value,
          entreprise:   document.getElementById('exp-entreprise').value,
          lieu:         document.getElementById('exp-lieu').value,
          date_debut:   document.getElementById('exp-date-debut').value,
          date_fin:     document.getElementById('exp-date-fin').value,
          description:  document.getElementById('exp-description').value,
          tags:         document.getElementById('exp-tags').value,
          statut:       document.getElementById('exp-statut').value,
          ordre:        parseInt(document.getElementById('exp-ordre').value) || 0
        };
        try {
          const d = await req('POST', '/api/admin/experiences', body);
          if (d.success) { toast('Expérience ajoutée !', 'succes'); form.reset(); chargerExperiences(); }
          else toast(d.error, 'erreur');
        } catch { toast('Erreur réseau', 'erreur'); }
        finally { btn.disabled = false; btn.innerHTML = '<i class="fas fa-plus"></i> Ajouter l\'expérience'; }
      });
    }
  }

  function renderExpElement(exp) {
    const isStatique = !!exp.isStatique;
    const badgeClass = { 'termine': 'badge-termine', 'en-cours': 'badge-en-cours', 'prevu': 'badge-prevu', 'recherche': 'badge-recherche' };
    const badges = { 'termine': 'Terminé', 'en-cours': 'En cours', 'prevu': 'Prévu', 'recherche': 'En recherche' };
    const tags = exp.tags ? exp.tags.split(',').map(t => `<span class="tag-petit">${escHtml(t.trim())}</span>`).join('') : '';
    return `
      <div class="element-liste">
        <div class="element-liste-info">
          <div class="element-liste-titre">
            ${escHtml(exp.titre)}
            <span class="badge-element ${badgeClass[exp.statut] || ''}">${badges[exp.statut] || exp.statut}</span>
            ${isStatique ? '<span class="badge-element" style="background:rgba(99,102,241,0.15);color:#818CF8">Portfolio HTML</span>' : '<span class="badge-element" style="background:rgba(16,185,129,0.15);color:#10B981">Base de données</span>'}
          </div>
          <div class="element-liste-meta">${escHtml(exp.entreprise || '')} ${exp.lieu ? '· ' + escHtml(exp.lieu) : ''} ${exp.date_debut ? '· ' + escHtml(exp.date_debut) : ''} ${exp.date_fin ? '→ ' + escHtml(exp.date_fin) : ''}</div>
          ${tags ? `<div class="element-liste-tags">${tags}</div>` : ''}
        </div>
        <button class="bouton-supprimer-element" data-id="${exp.id}" data-statique="${isStatique ? 1 : 0}">
          <i class="fas fa-trash"></i> ${isStatique ? 'Info' : 'Supprimer'}
        </button>
      </div>`;
  }

  /* ══════════════════════════════════════════════════════════════
     COMPÉTENCES
  ══════════════════════════════════════════════════════════════ */

  const COMPETENCES_STATIQUES = [
    {
      id: 'static-comp-1',
      categorie: 'Développement Web',
      icone: 'fas fa-code',
      couleur: 'linear-gradient(135deg,#667eea,#764ba2)',
      niveau: 75,
      label_niveau: 'Avancé — 75%',
      items: 'fab fa-python | Python\nfab fa-html5 | HTML5\nfab fa-css3-alt | CSS3\nfab fa-js | JavaScript\nfab fa-node-js | Node.js\nfas fa-database | Bases de données',
      isStatique: true
    },
    {
      id: 'static-comp-2',
      categorie: 'Réseaux & Infrastructure',
      icone: 'fas fa-network-wired',
      couleur: 'linear-gradient(135deg,#f093fb,#f5576c)',
      niveau: 60,
      label_niveau: 'Intermédiaire — 60%',
      items: 'fas fa-wifi | Configuration réseaux\nfas fa-server | Gestion de serveurs\nfas fa-shield-alt | Sécurité réseau',
      isStatique: true
    },
    {
      id: 'static-comp-3',
      categorie: 'Maintenance & Support',
      icone: 'fas fa-laptop-medical',
      couleur: 'linear-gradient(135deg,#4facfe,#00f2fe)',
      niveau: 80,
      label_niveau: 'Avancé — 80%',
      items: 'fas fa-search | Diagnostic hardware/software\nfas fa-cogs | Installation systèmes\nfas fa-headset | Support utilisateurs',
      isStatique: true
    }
  ];

  async function chargerCompetences() {
    const liste = document.getElementById('liste-competences');
    if (!liste) return;
    liste.innerHTML = `<div class="chargement-liste"><i class="fas fa-spinner fa-spin"></i> Chargement…</div>`;

    try {
      const d = await req('GET', '/api/admin/competences');
      const compDB = d.competences || [];
      const tous = [...COMPETENCES_STATIQUES, ...compDB];

      document.getElementById('nb-competences').textContent = tous.length;

      if (!tous.length) {
        liste.innerHTML = `<div class="etat-vide-liste"><i class="fas fa-star"></i><p>Aucune compétence enregistrée</p></div>`;
        return;
      }
      liste.innerHTML = tous.map(c => renderCompElement(c)).join('');

      liste.querySelectorAll('.bouton-supprimer-element').forEach(btn => {
        btn.addEventListener('click', async () => {
          if (btn.dataset.statique === '1') return toast('Compétence du portfolio HTML — modifiez index.html directement.', 'avert');
          if (!confirm('Supprimer cette catégorie de compétences ?')) return;
          try {
            await req('DELETE', `/api/admin/competences/${btn.dataset.id}`);
            toast('Compétence supprimée', 'succes');
            chargerCompetences();
          } catch { toast('Erreur', 'erreur'); }
        });
      });
    } catch {
      liste.innerHTML = `<div class="etat-vide-liste"><i class="fas fa-exclamation-triangle"></i><p>Erreur de chargement</p></div>`;
    }

    const form = document.getElementById('form-ajout-competence');
    if (form && !form.dataset.bound) {
      form.dataset.bound = '1';
      form.addEventListener('submit', async e => {
        e.preventDefault();
        const btn = document.getElementById('btn-ajouter-competence');
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Ajout…';
        const body = {
          categorie:    document.getElementById('comp-categorie').value,
          icone:        document.getElementById('comp-icone').value,
          couleur:      document.getElementById('comp-couleur').value,
          niveau:       parseInt(document.getElementById('comp-niveau').value) || 70,
          label_niveau: document.getElementById('comp-label-niveau').value,
          items:        document.getElementById('comp-items').value,
          ordre:        parseInt(document.getElementById('comp-ordre').value) || 0
        };
        try {
          const d = await req('POST', '/api/admin/competences', body);
          if (d.success) { toast('Catégorie ajoutée !', 'succes'); form.reset(); chargerCompetences(); }
          else toast(d.error, 'erreur');
        } catch { toast('Erreur réseau', 'erreur'); }
        finally { btn.disabled = false; btn.innerHTML = '<i class="fas fa-plus"></i> Ajouter la catégorie'; }
      });
    }
  }

  function renderCompElement(c) {
    const isStatique = !!c.isStatique;
    return `
      <div class="element-liste">
        <div class="element-liste-info">
          <div class="element-liste-titre">
            <span style="display:inline-flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:8px;background:${c.couleur || 'var(--orange)'};flex-shrink:0">
              <i class="${c.icone || 'fas fa-code'}" style="color:white;font-size:0.85rem"></i>
            </span>
            ${escHtml(c.categorie)}
            ${isStatique ? '<span class="badge-element" style="background:rgba(99,102,241,0.15);color:#818CF8">Portfolio HTML</span>' : '<span class="badge-element" style="background:rgba(16,185,129,0.15);color:#10B981">Base de données</span>'}
          </div>
          <div class="barre-niveau-mini">
            <div class="barre-fond"><div class="barre-rempli" style="width:${c.niveau || 0}%"></div></div>
            <span>${escHtml(c.label_niveau || c.niveau + '%')}</span>
          </div>
          ${c.items ? `<div class="element-liste-tags">${c.items.split('\n').slice(0,4).map(it => { const p = it.split('|'); return `<span class="tag-petit">${escHtml((p[1]||it).trim())}</span>`; }).join('')}</div>` : ''}
        </div>
        <button class="bouton-supprimer-element" data-id="${c.id}" data-statique="${isStatique ? 1 : 0}">
          <i class="fas fa-trash"></i> ${isStatique ? 'Info' : 'Supprimer'}
        </button>
      </div>`;
  }

  /* ══════════════════════════════════════════════════════════════
     STATISTIQUES
  ══════════════════════════════════════════════════════════════ */
  async function chargerStatistiques() {
    try {
      const d = await req('GET', '/api/admin/stats');
      if (!d.success) return;
      const s = d.stats;

      // Infos détaillées
      document.getElementById('date-premier-message').textContent = s.daily?.length ? formaterDateCourte(s.daily[0].date) : '—';
      document.getElementById('date-dernier-message').textContent = s.daily?.length ? formaterDateCourte(s.daily[s.daily.length - 1].date) : '—';
      const jours = s.daily?.length || 1;
      document.getElementById('moyenne-par-jour').textContent = (s.total / jours).toFixed(1) + ' msg/jour';

      // Graphique messages par jour
      const ctxM = document.getElementById('graphique-messages')?.getContext('2d');
      if (ctxM) {
        if (graphiqueMessages) graphiqueMessages.destroy();
        const labels = (s.daily || []).map(r => new Date(r.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }));
        const values = (s.daily || []).map(r => r.count);
        graphiqueMessages = new Chart(ctxM, {
          type: 'line',
          data: {
            labels,
            datasets: [{ label: 'Messages', data: values, borderColor: '#FF6B35', backgroundColor: 'rgba(255,107,53,0.1)', tension: 0.4, fill: true, pointBackgroundColor: '#FF6B35', pointRadius: 4 }]
          },
          options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: '#B4B8D4' } } }, scales: { x: { ticks: { color: '#B4B8D4' }, grid: { color: 'rgba(255,255,255,0.05)' } }, y: { ticks: { color: '#B4B8D4' }, grid: { color: 'rgba(255,255,255,0.05)' }, beginAtZero: true } } }
        });
      }

      // Graphique statuts
      const ctxS = document.getElementById('graphique-statuts')?.getContext('2d');
      if (ctxS) {
        if (graphiqueStatuts) graphiqueStatuts.destroy();
        graphiqueStatuts = new Chart(ctxS, {
          type: 'doughnut',
          data: {
            labels: ['Lus', 'Non lus', 'Répondus'],
            datasets: [{ data: [s.read, s.unread, s.replied], backgroundColor: ['#10B981', '#EF4444', '#FF6B35'] }]
          },
          options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: '#B4B8D4' } } } }
        });
      }
    } catch {}
  }

  /* ══════════════════════════════════════════════════════════════
     PARAMÈTRES
  ══════════════════════════════════════════════════════════════ */
  function bindParametres() {
    const form = document.getElementById('formulaire-mdp');
    if (form && !form.dataset.bound) {
      form.dataset.bound = '1';
      form.addEventListener('submit', async e => {
        e.preventDefault();
        const current = document.getElementById('mdp-actuel').value;
        const next    = document.getElementById('nouveau-mdp').value;
        const confirm2 = document.getElementById('confirmer-mdp').value;
        const msg = document.getElementById('message-mdp');

        if (next !== confirm2) { msg.textContent = '❌ Les mots de passe ne correspondent pas.'; msg.style.color = '#EF4444'; return; }
        if (next.length < 12) { msg.textContent = '❌ Minimum 12 caractères.'; msg.style.color = '#EF4444'; return; }

        try {
          const d = await req('POST', '/api/admin/change-password', { current, next });
          if (d.success) {
            msg.textContent = '✅ Mot de passe modifié. Reconnexion…';
            msg.style.color = '#10B981';
            setTimeout(() => { TOKEN = null; localStorage.removeItem('admin_token'); sessionStorage.removeItem('admin_token'); location.reload(); }, 2000);
          } else { msg.textContent = '❌ ' + d.error; msg.style.color = '#EF4444'; }
        } catch { msg.textContent = '❌ Erreur réseau'; msg.style.color = '#EF4444'; }
      });
    }
  }

  /* ══════════════════════════════════════════════════════════════
     ACTIONS RAPIDES
  ══════════════════════════════════════════════════════════════ */
  function bindActions() {
    document.querySelectorAll('.carte-action').forEach(btn => {
      btn.addEventListener('click', async () => {
        const action = btn.dataset.action;
        if (action === 'exporter') exporterMessages();
        else if (action === 'supprimer-lus') {
          if (!confirm('Supprimer tous les messages lus ?')) return;
          try { await req('DELETE', '/api/admin/messages?type=read'); toast('Messages lus supprimés', 'succes'); chargerVueEnsemble(); chargerStatsRapides(); }
          catch { toast('Erreur', 'erreur'); }
        } else if (action === 'tout-marquer-lu') {
          try { await req('PATCH', '/api/admin/messages/read-all'); toast('Tous marqués comme lus', 'succes'); chargerVueEnsemble(); chargerStatsRapides(); }
          catch { toast('Erreur', 'erreur'); }
        }
      });
    });

    document.getElementById('btn-supprimer-tout')?.addEventListener('click', async () => {
      if (!confirm('ATTENTION : Supprimer TOUS les messages ? Cette action est irréversible.')) return;
      try { await req('DELETE', '/api/admin/messages?type=all'); toast('Tous les messages supprimés', 'succes'); chargerVueEnsemble(); chargerStatsRapides(); }
      catch { toast('Erreur', 'erreur'); }
    });
  }

  async function exporterMessages() {
    try {
      const d = await req('GET', '/api/admin/messages?limit=200');
      if (!d.messages?.length) return toast('Aucun message à exporter', 'avert');
      const csv = ['ID,Nom,Email,Téléphone,Message,Lu,Date']
        .concat(d.messages.map(m =>
          `${m.id},"${(m.name||'').replace(/"/g,'""')}","${m.email}","${m.phone||''}","${(m.message||'').replace(/"/g,'""').replace(/\n/g,' ')}",${m.is_read ? 'Oui' : 'Non'},"${formaterDate(m.created_at)}"`
        )).join('\n');
      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'messages_' + new Date().toISOString().slice(0,10) + '.csv';
      a.click();
      toast('Export CSV réussi', 'succes');
    } catch { toast('Erreur export', 'erreur'); }
  }

  /* ══════════════════════════════════════════════════════════════
     UTILITAIRES
  ══════════════════════════════════════════════════════════════ */
  function escHtml(str) {
    return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }

  /* ══════════════════════════════════════════════════════════════
     STYLES INJECTÉS
  ══════════════════════════════════════════════════════════════ */
  function injecterStyles() {
    if (document.getElementById('admin-js-styles')) return;
    const s = document.createElement('style');
    s.id = 'admin-js-styles';
    s.textContent = `
      /* TOASTS */
      .toast{position:fixed;top:-100px;right:20px;background:rgba(10,14,39,.97);color:#fff;padding:1rem 1.5rem;border-radius:12px;box-shadow:0 8px 32px rgba(0,0,0,.5);display:flex;align-items:center;gap:.75rem;z-index:10000;min-width:280px;max-width:480px;transition:transform .3s cubic-bezier(.4,0,.2,1);border:1px solid rgba(255,255,255,.1);font-size:.9rem}
      .toast.visible{transform:translateY(120px)}
      .toast-succes{border-left:4px solid #10B981}.toast-succes i{color:#10B981}
      .toast-erreur{border-left:4px solid #EF4444}.toast-erreur i{color:#EF4444}
      .toast-info{border-left:4px solid #00D9FF}.toast-info i{color:#00D9FF}
      .toast-avert{border-left:4px solid #F59E0B}.toast-avert i{color:#F59E0B}
      @media(max-width:768px){.toast{right:10px;left:10px;min-width:auto}}

      /* BADGE RÉPONDU */
      .badge-repondu{display:inline-flex;align-items:center;gap:4px;font-size:.75rem;background:rgba(16,185,129,.15);color:#10B981;padding:3px 8px;border-radius:20px;font-weight:600}

      /* UPLOAD PHOTO */
      .upload-photo-zone{width:100%}
      .upload-declencheur{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;padding:1.5rem;background:rgba(255,255,255,.03);border:2px dashed rgba(255,255,255,.15);border-radius:12px;cursor:pointer;transition:all .2s;text-align:center}
      .upload-declencheur:hover{border-color:#FF6B35;background:rgba(255,107,53,.05)}
      .upload-declencheur i{font-size:1.75rem;color:#FF6B35}
      .upload-declencheur span{font-size:.9rem;color:#fff;font-weight:600}
      .upload-declencheur small{font-size:.75rem;color:#6B7280}
      .upload-apercu{position:relative;display:inline-block;border-radius:12px;overflow:hidden;max-width:200px}
      .upload-apercu img{width:100%;height:120px;object-fit:cover;border-radius:12px;display:block}
      .suppr-apercu{position:absolute;top:6px;right:6px;background:rgba(239,68,68,.9);border:none;border-radius:50%;width:26px;height:26px;display:flex;align-items:center;justify-content:center;cursor:pointer;color:#fff;font-size:.8rem}
      .suppr-apercu:hover{background:#EF4444}
    `;
    document.head.appendChild(s);
  }

  /* ══════════════════════════════════════════════════════════════
     DÉMARRAGE
  ══════════════════════════════════════════════════════════════ */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();