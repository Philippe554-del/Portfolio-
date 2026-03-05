(function () {
  'use strict';

  var API_URL = (function () {
    var h = window.location.hostname;
    if (h === 'localhost' || h === '127.0.0.1') return 'http://localhost:3000';
    return window.location.origin;
  })();

  var PORTFOLIO_URL = window.location.origin;
  var GMAIL_ADDRESS = 'hountondjiphilippe58@gmail.com';
  var TOKEN_KEY = '_adm_tk';
  var currentMessageId   = null;
  var currentMessageData = null;
  var messagesChart = null;
  var statusChart   = null;
  var searchTimeout = null;

  /* ================================================================
     TOKEN
  ================================================================ */
  function getToken() {
    try { return sessionStorage.getItem(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY) || null; }
    catch (e) { return null; }
  }
  function setToken(token, remember) {
    try {
      if (remember) { localStorage.setItem(TOKEN_KEY, token); sessionStorage.removeItem(TOKEN_KEY); }
      else          { sessionStorage.setItem(TOKEN_KEY, token); localStorage.removeItem(TOKEN_KEY); }
    } catch (e) {}
  }
  function clearToken() {
    try { sessionStorage.removeItem(TOKEN_KEY); localStorage.removeItem(TOKEN_KEY); } catch (e) {}
  }

  /* ================================================================
     API
  ================================================================ */
  function apiRequest(method, endpoint, body) {
    var opts = { method: method, headers: { 'Content-Type': 'application/json' } };
    var tok = getToken();
    if (tok)  opts.headers['Authorization'] = 'Bearer ' + tok;
    if (body) opts.body = JSON.stringify(body);
    return fetch(API_URL + endpoint, opts)
      .then(function (r) {
        if (r.status === 401) { logout(); return Promise.reject(new Error('Session expirée.')); }
        return r.json().then(function (data) { return { status: r.status, data: data }; });
      });
  }

  /* ================================================================
     NOTIFICATIONS (comme l'ancien)
  ================================================================ */
  function showNotification(message, type) {
    type = type || 'info';
    var notif = document.createElement('div');
    notif.className = 'notification notification-' + type;
    notif.innerHTML =
      '<i class="fas fa-' + (type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle') + '"></i>' +
      '<span>' + String(message).slice(0, 200) + '</span>';
    document.body.appendChild(notif);
    setTimeout(function () { notif.classList.add('show'); }, 10);
    setTimeout(function () {
      notif.classList.remove('show');
      setTimeout(function () { if (notif.parentNode) notif.parentNode.removeChild(notif); }, 300);
    }, 4000);
  }

  /* ================================================================
     AUTH
  ================================================================ */
  function checkAuth() {
    if (!getToken()) { showLoginPage(); } else { showDashboard(); }
  }

  function showLoginPage() {
    var loginPage = document.getElementById('loginPage');
    var dashboard = document.getElementById('dashboard');
    if (dashboard) { dashboard.style.display = 'none'; dashboard.classList.add('hidden'); }
    if (loginPage) {
      loginPage.style.cssText = 'display:flex;position:fixed;top:0;left:0;width:100%;height:100%;z-index:9999;background:var(--bg-primary,#0A0E27);';
    }
    if (messagesChart) { messagesChart.destroy(); messagesChart = null; }
    if (statusChart)   { statusChart.destroy();   statusChart   = null; }
  }

  function showDashboard() {
    var loginPage = document.getElementById('loginPage');
    var dashboard = document.getElementById('dashboard');
    if (loginPage) loginPage.style.display = 'none';
    if (dashboard) {
      dashboard.classList.remove('hidden');
      dashboard.style.display = 'flex';
      dashboard.style.zIndex  = '';
    }
    createBackToPortfolioButton();
    loadOverviewData();
    updateMessageCount();
    showNotification('Connexion réussie !', 'success');
  }

  function logout() {
    if (getToken()) { apiRequest('POST', '/api/admin/logout').catch(function () {}); }
    clearToken();
    showLoginPage();
    showNotification('Déconnexion réussie', 'info');
  }

  /* ================================================================
     BOUTON RETOUR AU PORTFOLIO (comme l'ancien)
  ================================================================ */
  function createBackToPortfolioButton() {
    var sidebarFooter = document.querySelector('.sidebar-footer');
    if (!sidebarFooter) return;
    if (document.getElementById('backToPortfolio')) return;

    var backButton = document.createElement('button');
    backButton.id = 'backToPortfolio';
    backButton.className = 'btn-back-portfolio';
    backButton.innerHTML = '<i class="fas fa-arrow-left"></i> <span>Retour au Portfolio</span>';
    backButton.addEventListener('click', function () {
      window.location.href = '../frontend/index.html';
    });

    var logoutBtn = document.getElementById('logoutBtn');
    sidebarFooter.insertBefore(backButton, logoutBtn);

    // Style du bouton
    if (!document.getElementById('_back_btn_style')) {
      var s = document.createElement('style');
      s.id = '_back_btn_style';
      s.textContent =
        '.btn-back-portfolio{width:100%;padding:0.875rem;background:rgba(102,126,234,0.1);border:1px solid rgba(102,126,234,0.3);' +
        'border-radius:12px;color:#667eea;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;' +
        'gap:0.75rem;transition:all 0.3s;font-size:0.95rem;margin-bottom:0.75rem;}' +
        '.btn-back-portfolio:hover{background:rgba(102,126,234,0.2);transform:translateY(-2px);}';
      document.head.appendChild(s);
    }
  }

  /* ================================================================
     LOGIN
  ================================================================ */
  var loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var email    = document.getElementById('adminEmail').value.trim();
      var password = document.getElementById('adminPassword').value;
      var remember = document.getElementById('rememberMe') ? document.getElementById('rememberMe').checked : false;
      var errEl    = document.getElementById('loginError');
      var btn      = loginForm.querySelector('.btn-login');

      errEl.style.display = 'none';
      btn.disabled = true;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Connexion...';

      apiRequest('POST', '/api/admin/login', { email: email, password: password })
        .then(function (res) {
          if (res.status === 200 && res.data.token) {
            setToken(res.data.token, remember);
            showDashboard();
          } else {
            errEl.style.display = 'flex';
            errEl.querySelector('span').textContent = res.data.error || 'Identifiants incorrects.';
            var card = document.querySelector('.login-card');
            if (card) { card.classList.add('shake'); setTimeout(function () { card.classList.remove('shake'); }, 600); }
          }
        })
        .catch(function (err) {
          errEl.style.display = 'flex';
          errEl.querySelector('span').textContent = err.message || 'Erreur réseau.';
        })
        .finally(function () {
          btn.disabled = false;
          btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Se connecter';
        });
    });
  }

  var logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) logoutBtn.addEventListener('click', logout);

  /* ================================================================
     NAVIGATION
  ================================================================ */
  var pageTitles = { overview: "Vue d'ensemble", messages: 'Messages', analytics: 'Statistiques', settings: 'Paramètres' };

  document.querySelectorAll('.nav-item[data-page]').forEach(function (item) {
    item.addEventListener('click', function (e) {
      e.preventDefault();
      navigateTo(this.dataset.page);
      closeSidebar();
    });
  });

  document.querySelectorAll('[data-page]').forEach(function (el) {
    if (el.tagName === 'A' && !el.classList.contains('nav-item')) {
      el.addEventListener('click', function (e) { e.preventDefault(); navigateTo(this.dataset.page); });
    }
  });

  function navigateTo(page) {
    document.querySelectorAll('.nav-item').forEach(function (i) { i.classList.remove('active'); });
    var navItem = document.querySelector('.nav-item[data-page="' + page + '"]');
    if (navItem) navItem.classList.add('active');

    document.querySelectorAll('.page').forEach(function (p) { p.classList.remove('active'); });
    var pageEl = document.getElementById(page + 'Page');
    if (pageEl) pageEl.classList.add('active');

    var titleEl = document.getElementById('pageTitle');
    if (titleEl) titleEl.textContent = pageTitles[page] || page;

    if (page === 'overview')  loadOverviewData();
    if (page === 'messages')  loadMessages();
    if (page === 'analytics') loadAnalytics();
  }

  /* ================================================================
     HAMBURGER MOBILE — CORRIGÉ (touchend + overlay)
  ================================================================ */
  var menuToggle     = document.getElementById('menuToggle');
  var sidebar        = document.querySelector('.sidebar');
  var sidebarOverlay = document.createElement('div');
  sidebarOverlay.id = '_sidebar_overlay';
  sidebarOverlay.style.cssText = 'display:none;position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.6);z-index:99;';
  document.body.appendChild(sidebarOverlay);

  function openSidebar() {
    if (sidebar) sidebar.classList.add('active');
    sidebarOverlay.style.display = 'block';
  }
  function closeSidebar() {
    if (sidebar) sidebar.classList.remove('active');
    sidebarOverlay.style.display = 'none';
  }

  var _menuTouchHandled = false;
  var _lastMenuToggle = 0;

  function toggleSidebar(e) {
    e.preventDefault(); e.stopPropagation();
    var now = Date.now();
    if (now - _lastMenuToggle < 400) return;
    _lastMenuToggle = now;
    sidebar && sidebar.classList.contains('active') ? closeSidebar() : openSidebar();
  }

  if (menuToggle) {
    menuToggle.addEventListener('touchend', function (e) {
      _menuTouchHandled = true;
      toggleSidebar(e);
      setTimeout(function () { _menuTouchHandled = false; }, 500);
    }, { passive: false });

    menuToggle.addEventListener('click', function (e) {
      if (_menuTouchHandled) return;
      toggleSidebar(e);
    });
  }
  sidebarOverlay.addEventListener('click', closeSidebar);

  /* ================================================================
     CLOCHE NOTIFICATIONS (comme l'ancien)
  ================================================================ */
  var notifBtn = document.getElementById('notificationsBtn');
  if (notifBtn) {
    notifBtn.addEventListener('click', function () {
      apiRequest('GET', '/api/admin/stats').then(function (res) {
        if (res.status !== 200) return;
        var unread = parseInt(res.data.stats.unread || 0, 10);
        if (unread === 0) {
          showNotification('Aucune nouvelle notification', 'info');
        } else {
          showNotification('Vous avez ' + unread + ' message(s) non lu(s)', 'info');
        }
      }).catch(function () {
        showNotification('Erreur lors du chargement', 'error');
      });
    });
  }

  /* ================================================================
     REFRESH
  ================================================================ */
  var refreshBtn = document.getElementById('refreshBtn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', function () {
      var icon = this.querySelector('i');
      if (icon) icon.classList.add('fa-spin');
      var active = document.querySelector('.page.active');
      if (active) {
        var page = active.id.replace('Page', '');
        if (page === 'overview')  loadOverviewData();
        if (page === 'messages')  loadMessages();
        if (page === 'analytics') loadAnalytics();
      }
      showNotification('Données rafraîchies', 'info');
      setTimeout(function () { if (icon) icon.classList.remove('fa-spin'); }, 1000);
    });
  }

  /* ================================================================
     PASSWORD TOGGLE
  ================================================================ */
  document.querySelectorAll('.toggle-password').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var input = this.previousElementSibling;
      if (!input) return;
      var isPass = input.type === 'password';
      input.type = isPass ? 'text' : 'password';
      this.querySelector('i').className = isPass ? 'fas fa-eye-slash' : 'fas fa-eye';
    });
  });

  /* ================================================================
     VUE D'ENSEMBLE
  ================================================================ */
  function loadOverviewData() {
    apiRequest('GET', '/api/admin/stats')
      .then(function (res) {
        if (res.status !== 200) return;
        var s = res.data.stats || {};
        setText('totalMessages',  s.total  || 0);
        setText('readMessages',   s.read   || 0);
        setText('unreadMessages', s.unread || 0);
        setText('todayMessages',  s.today  || 0);

        var badge = document.getElementById('messageCount');
        if (badge) {
          badge.textContent = (s.unread > 0) ? s.unread : '';
          badge.style.display = (s.unread > 0) ? 'inline-flex' : 'none';
        }
        loadRecentMessages();
      })
      .catch(function (err) { console.error('[overview]', err); });
  }

  function loadRecentMessages() {
    apiRequest('GET', '/api/admin/messages?limit=5')
      .then(function (res) {
        if (res.status !== 200) return;
        renderRecentMessages(res.data.messages || []);
      })
      .catch(function (err) { console.error('[recentMessages]', err); });
  }

  function renderRecentMessages(messages) {
    var container = document.getElementById('recentMessagesList');
    if (!container) return;
    if (!messages.length) {
      container.innerHTML = '<div class="empty-state"><i class="fas fa-inbox"></i><h3>Aucun message</h3><p>Les messages du formulaire apparaîtront ici</p></div>';
      return;
    }
    container.innerHTML = messages.map(function (m) { return renderMessageItem(m, true); }).join('');
    container.querySelectorAll('.message-item').forEach(function (el) {
      el.addEventListener('click', function () { openMessage(parseInt(this.dataset.id, 10)); });
    });
  }

  /* ================================================================
     PAGE MESSAGES
  ================================================================ */
  function loadMessages() {
    var search = (document.getElementById('searchMessages') || {}).value || '';
    var filter = (document.getElementById('filterMessages') || {}).value || 'all';
    var sort   = (document.getElementById('sortMessages')   || {}).value || 'newest';
    var qs     = '?limit=50' + (filter !== 'all' ? '&filter=' + encodeURIComponent(filter) : '');

    apiRequest('GET', '/api/admin/messages' + qs)
      .then(function (res) {
        if (res.status !== 200) return;
        var messages = res.data.messages || [];
        if (search) {
          var q = search.toLowerCase();
          messages = messages.filter(function (m) {
            return (m.name || '').toLowerCase().indexOf(q) !== -1 ||
                   (m.email || '').toLowerCase().indexOf(q) !== -1 ||
                   (m.message || '').toLowerCase().indexOf(q) !== -1;
          });
        }
        if (sort === 'oldest') messages = messages.slice().reverse();
        renderMessages(messages);
      })
      .catch(function (err) { console.error('[loadMessages]', err); });
  }

  function renderMessages(messages) {
    var container = document.getElementById('messagesList');
    if (!container) return;
    if (!messages.length) {
      container.innerHTML = '<div class="empty-state"><i class="fas fa-inbox"></i><h3>Aucun message</h3><p>Aucun message ne correspond à votre recherche</p></div>';
      return;
    }
    container.innerHTML = messages.map(function (m) { return renderMessageItem(m, false); }).join('');
    container.querySelectorAll('.message-item').forEach(function (el) {
      el.addEventListener('click', function (e) {
        if (e.target.closest('.btn-small')) return;
        openMessage(parseInt(this.dataset.id, 10));
      });
    });
    container.querySelectorAll('[data-action="delete"]').forEach(function (btn) {
      btn.addEventListener('click', function (e) { e.stopPropagation(); deleteMessage(parseInt(this.dataset.id, 10)); });
    });
    container.querySelectorAll('[data-action="toggle-read"]').forEach(function (btn) {
      btn.addEventListener('click', function (e) { e.stopPropagation(); toggleRead(parseInt(this.dataset.id, 10)); });
    });
  }

  function renderMessageItem(m, preview) {
    var isUnread = !m.is_read;
    var date     = formatDate(m.created_at);
    var text     = (m.message || '').slice(0, 100);
    return (
      '<div class="message-item ' + (isUnread ? 'unread' : '') + '" data-id="' + m.id + '">' +
        '<div class="message-header">' +
          '<span class="message-sender"><i class="fas fa-user"></i> ' + esc(m.name) +
            (isUnread ? '<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#FF6B35;margin-left:6px"></span>' : '') +
          '</span>' +
          '<span class="message-date"><i class="fas fa-clock"></i> ' + date + '</span>' +
        '</div>' +
        '<div class="message-email"><i class="fas fa-envelope"></i> ' + esc(m.email) + '</div>' +
        '<div class="message-preview">' + esc(text) + (m.message && m.message.length > 100 ? '…' : '') + '</div>' +
        (preview ? '' :
          '<div class="message-actions">' +
            '<button class="btn-small" data-action="toggle-read" data-id="' + m.id + '">' +
              '<i class="fas fa-' + (isUnread ? 'envelope-open' : 'envelope') + '"></i> ' + (isUnread ? 'Marquer lu' : 'Marquer non lu') +
            '</button>' +
            '<button class="btn-small danger" data-action="delete" data-id="' + m.id + '">' +
              '<i class="fas fa-trash"></i> Supprimer' +
            '</button>' +
          '</div>'
        ) +
      '</div>'
    );
  }

  /* ================================================================
     OUVRIR UN MESSAGE
  ================================================================ */
  function openMessage(id) {
    apiRequest('GET', '/api/admin/messages?limit=1000')
      .then(function (res) {
        if (res.status !== 200) return;
        var msg = (res.data.messages || []).find(function (m) { return m.id === id; });
        if (!msg) return;
        currentMessageId   = id;
        currentMessageData = msg;

        if (!msg.is_read) {
          apiRequest('PATCH', '/api/admin/messages/' + id + '/read')
            .then(function () { loadOverviewData(); loadMessages(); })
            .catch(console.error);
        }

        var body = document.getElementById('modalBody');
        if (!body) return;

        body.innerHTML =
          '<div class="modal-detail">' +
            field('fas fa-user',     'Nom',     esc(msg.name)) +
            field('fas fa-envelope', 'Email',   '<a href="mailto:' + esc(msg.email) + '" style="color:#00D9FF">' + esc(msg.email) + '</a>') +
            (msg.phone ? field('fas fa-phone', 'Tél', '<a href="tel:' + esc(msg.phone) + '" style="color:#00D9FF">' + esc(msg.phone) + '</a>') : '') +
            field('fas fa-clock',   'Date',    formatDate(msg.created_at)) +
            field('fas fa-comment', 'Message', '<div style="white-space:pre-wrap;line-height:1.6">' + esc(msg.message) + '</div>') +
            field('fas fa-circle',  'Statut',  msg.is_read ? '<span style="color:#10B981">Lu</span>' : '<span style="color:#FF6B35">Non lu</span>') +
            (msg.replied_at ? field('fas fa-reply', 'Répondu le', formatDate(msg.replied_at)) : '') +
          '</div>' +
          '<div id="replySection" style="margin-top:1.5rem;border-top:1px solid rgba(255,255,255,0.1);padding-top:1.5rem">' +
            '<h4 style="color:#FF6B35;margin-bottom:1rem;font-size:1rem;display:flex;align-items:center;gap:8px">' +
              '<i class="fas fa-reply"></i> Répondre à ' + esc(msg.name) +
            '</h4>' +
            '<div style="margin-bottom:0.75rem">' +
              '<label style="display:block;margin-bottom:4px;font-size:0.82rem;color:#B4B8D4;font-weight:600">Destinataire</label>' +
              '<input id="replyTo" type="email" value="' + esc(msg.email) + '" readonly style="width:100%;padding:0.65rem 0.75rem;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.1);border-radius:8px;color:#888;font-size:0.9rem;box-sizing:border-box;cursor:not-allowed">' +
            '</div>' +
            '<div style="margin-bottom:0.75rem">' +
              '<label style="display:block;margin-bottom:4px;font-size:0.82rem;color:#B4B8D4;font-weight:600">Sujet</label>' +
              '<input id="replySubject" type="text" value="Re : Message depuis mon portfolio — ' + esc(msg.name) + '" style="width:100%;padding:0.65rem 0.75rem;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:8px;color:#fff;font-size:0.9rem;box-sizing:border-box;outline:none">' +
            '</div>' +
            '<div style="margin-bottom:1rem">' +
              '<label style="display:block;margin-bottom:4px;font-size:0.82rem;color:#B4B8D4;font-weight:600">Votre réponse</label>' +
              '<textarea id="replyText" rows="9" style="width:100%;padding:0.75rem;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:8px;color:#fff;font-size:0.9rem;resize:vertical;font-family:inherit;box-sizing:border-box;outline:none;line-height:1.6">Bonjour ' + esc(msg.name) + ',\n\n\n\nCordialement,\nPhilippe Hountondji\n' + GMAIL_ADDRESS + '\n+229 01 58 15 69 30\n\n🌐 Mon portfolio : ' + PORTFOLIO_URL + '</textarea>' +
            '</div>' +
            '<div style="display:flex;align-items:center;gap:1rem;flex-wrap:wrap">' +
              '<button id="sendReplyBtn" style="padding:0.75rem 1.75rem;background:linear-gradient(135deg,#FF6B35,#F7931E);border:none;border-radius:8px;color:#fff;font-weight:700;cursor:pointer;display:flex;align-items:center;gap:8px;font-size:0.95rem">' +
                '<i class="fas fa-paper-plane"></i> Envoyer par email' +
              '</button>' +
              '<span id="replyStatus" style="font-size:0.9rem"></span>' +
            '</div>' +
          '</div>';

        document.getElementById('sendReplyBtn').addEventListener('click', function () { sendReply(msg); });
        document.getElementById('messageModal').classList.add('active');
      })
      .catch(function (err) { console.error('[openMessage]', err); });
  }

  /* ================================================================
     ENVOYER EMAIL
  ================================================================ */
  function sendReply(msg) {
    var to      = (document.getElementById('replyTo')      || {}).value || '';
    var subject = (document.getElementById('replySubject') || {}).value || '';
    var message = (document.getElementById('replyText')    || {}).value || '';
    var btn     = document.getElementById('sendReplyBtn');
    var status  = document.getElementById('replyStatus');

    if (!message.trim() || message.length < 10) {
      status.innerHTML = '<span style="color:#EF4444"><i class="fas fa-exclamation-circle"></i> Écrivez un message avant d\'envoyer.</span>';
      return;
    }
    btn.disabled = true;
    btn.style.opacity = '0.6';
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Envoi...';

    apiRequest('POST', '/api/admin/send-reply', { to: to, subject: subject, message: message, messageId: msg.id })
      .then(function (res) {
        if (res.status === 200 && res.data.success) {
          status.innerHTML = '<span style="color:#10B981"><i class="fas fa-check-circle"></i> Email envoyé !</span>';
          btn.innerHTML = '<i class="fas fa-check"></i> Envoyé !';
          btn.style.background = 'linear-gradient(135deg,#10B981,#059669)';
          btn.style.opacity = '1';
          showNotification('Email envoyé à ' + esc(to), 'success');
          loadOverviewData(); loadMessages();
        } else {
          status.innerHTML = '<span style="color:#EF4444"><i class="fas fa-times-circle"></i> ' + esc(res.data.error || 'Erreur.') + '</span>';
          btn.disabled = false; btn.style.opacity = '1';
          btn.innerHTML = '<i class="fas fa-paper-plane"></i> Envoyer par email';
        }
      })
      .catch(function () {
        status.innerHTML = '<span style="color:#EF4444">Erreur réseau.</span>';
        btn.disabled = false; btn.style.opacity = '1';
        btn.innerHTML = '<i class="fas fa-paper-plane"></i> Envoyer par email';
      });
  }

  function field(icon, label, value) {
    return '<div class="modal-field"><label><i class="' + icon + '"></i> ' + label + '</label><div class="value">' + value + '</div></div>';
  }

  /* ================================================================
     MODAL
  ================================================================ */
  function closeModal() {
    var modal = document.getElementById('messageModal');
    if (modal) modal.classList.remove('active');
    currentMessageId = null; currentMessageData = null;
  }

  var closeModalBtn    = document.getElementById('closeModal');
  var modalCloseBtn    = document.querySelector('.modal-close');
  var deleteMessageBtn = document.getElementById('deleteMessage');

  if (closeModalBtn)    closeModalBtn.addEventListener('click', closeModal);
  if (modalCloseBtn)    modalCloseBtn.addEventListener('click', closeModal);
  if (deleteMessageBtn) {
    deleteMessageBtn.addEventListener('click', function () {
      if (!currentMessageId) return;
      deleteMessage(currentMessageId, true);
    });
  }
  var modal = document.getElementById('messageModal');
  if (modal) modal.addEventListener('click', function (e) { if (e.target === this) closeModal(); });

  /* ================================================================
     CRUD MESSAGES
  ================================================================ */
  function toggleRead(id) {
    apiRequest('PATCH', '/api/admin/messages/' + id + '/read')
      .then(function () {
        showNotification('Statut mis à jour', 'success');
        loadMessages(); loadOverviewData();
      }).catch(console.error);
  }

  function deleteMessage(id, closeAfter) {
    if (!confirm('Supprimer ce message définitivement ?\n\nCette action est irréversible.')) return;
    apiRequest('DELETE', '/api/admin/messages/' + id)
      .then(function () {
        showNotification('Message supprimé', 'success');
        if (closeAfter) closeModal();
        loadMessages(); loadOverviewData();
      }).catch(console.error);
  }

  /* ================================================================
     RECHERCHE / FILTRE / TRI
  ================================================================ */
  var searchInput  = document.getElementById('searchMessages');
  var filterSelect = document.getElementById('filterMessages');
  var sortSelect   = document.getElementById('sortMessages');

  if (searchInput)  searchInput.addEventListener('input', function () { clearTimeout(searchTimeout); searchTimeout = setTimeout(loadMessages, 300); });
  if (filterSelect) filterSelect.addEventListener('change', loadMessages);
  if (sortSelect)   sortSelect.addEventListener('change', loadMessages);

  /* ================================================================
     ACTIONS RAPIDES
  ================================================================ */
  document.querySelectorAll('.action-card[data-action]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var action = this.dataset.action;
      if (action === 'export')          exportMessages();
      if (action === 'mark-all-read')   markAllRead();
      if (action === 'delete-all-read') deleteAllRead();
    });
  });

  function markAllRead() {
    if (!confirm('Marquer tous les messages comme lus ?')) return;
    apiRequest('PATCH', '/api/admin/messages/read-all')
      .then(function () { showNotification('Tous les messages marqués comme lus', 'success'); loadOverviewData(); loadMessages(); })
      .catch(console.error);
  }
  function deleteAllRead() {
    if (!confirm('Supprimer tous les messages lus ?\n\nIrréversible.')) return;
    apiRequest('DELETE', '/api/admin/messages?type=read')
      .then(function () { showNotification('Messages lus supprimés', 'success'); loadOverviewData(); loadMessages(); })
      .catch(console.error);
  }
  function exportMessages() {
    apiRequest('GET', '/api/admin/messages?limit=1000')
      .then(function (res) {
        if (res.status !== 200) return;
        var messages = res.data.messages || [];
        if (!messages.length) { showNotification('Aucun message à exporter.', 'info'); return; }
        var csv = 'ID,Nom,Email,Téléphone,Message,Lu,Date\n';
        messages.forEach(function (m) {
          csv += [m.id, csvCell(m.name), csvCell(m.email), csvCell(m.phone || ''), csvCell(m.message), m.is_read ? 'Oui' : 'Non', m.created_at].join(',') + '\n';
        });
        var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        var url  = URL.createObjectURL(blob);
        var a    = document.createElement('a');
        a.href = url;
        a.download = 'messages_' + new Date().toISOString().slice(0, 10) + '.csv';
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showNotification('Données exportées', 'success');
      }).catch(console.error);
  }
  function csvCell(val) { return '"' + String(val || '').replace(/"/g, '""') + '"'; }

  /* ================================================================
     STATISTIQUES — comme l'ancien (graphiques automatiques)
  ================================================================ */
  function loadAnalytics() {
    apiRequest('GET', '/api/admin/stats')
      .then(function (res) {
        if (res.status !== 200) { showNotification('Erreur lors du chargement des statistiques', 'error'); return; }
        var s = res.data.stats || {};

        // Infos détaillées
        var daily = s.daily || [];
        if (daily.length > 0) {
          setText('firstMessageDate', formatDate(daily[0].date));
          setText('lastMessageDate',  formatDate(daily[daily.length - 1].date));
          var totalWeek = daily.reduce(function (acc, d) { return acc + parseInt(d.count || 0, 10); }, 0);
          setText('avgMessagesPerDay', (totalWeek / daily.length).toFixed(1) + ' messages/jour');
        } else {
          setText('firstMessageDate', s.total > 0 ? '-' : 'Aucun message');
          setText('lastMessageDate',  s.total > 0 ? '-' : 'Aucun message');
          setText('avgMessagesPerDay', '0 messages/jour');
        }

        renderCharts(s);
      })
      .catch(function (err) { console.error('[analytics]', err); showNotification('Erreur réseau', 'error'); });
  }

  function renderCharts(s) {
    var daily  = s.daily || [];
    var labels = [];
    var counts = [];

    // Génère les 7 derniers jours comme l'ancien
    for (var i = 6; i >= 0; i--) {
      var d = new Date();
      d.setDate(d.getDate() - i);
      labels.push(d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }));
      var dateStr = d.toDateString();
      var found = daily.find(function (x) { return new Date(x.date).toDateString() === dateStr; });
      counts.push(found ? parseInt(found.count || 0, 10) : 0);
    }

    /* Graphique ligne */
    var ctx1 = document.getElementById('messagesChart');
    if (ctx1) {
      if (messagesChart) { messagesChart.destroy(); messagesChart = null; }
      try {
        messagesChart = new Chart(ctx1, {
          type: 'line',
          data: {
            labels: labels,
            datasets: [{
              label: 'Messages reçus',
              data: counts,
              borderColor: '#FF6B35',
              backgroundColor: 'rgba(255,107,53,0.1)',
              tension: 0.4,
              fill: true,
              pointBackgroundColor: '#FF6B35',
              pointBorderColor: '#fff',
              pointRadius: 5,
              pointHoverRadius: 7
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { labels: { color: '#B4B8D4' } } },
            scales: {
              y: { beginAtZero: true, ticks: { color: '#B4B8D4', stepSize: 1 }, grid: { color: 'rgba(255,255,255,0.1)' } },
              x: { ticks: { color: '#B4B8D4' }, grid: { color: 'rgba(255,255,255,0.1)' } }
            }
          }
        });
      } catch (e) { console.error('[Chart line]', e); }
    }

    /* Graphique donut */
    var ctx2       = document.getElementById('statusChart');
    var readCount  = parseInt(s.read   || 0, 10);
    var unreadCount = parseInt(s.unread || 0, 10);
    if (ctx2) {
      if (statusChart) { statusChart.destroy(); statusChart = null; }
      try {
        statusChart = new Chart(ctx2, {
          type: 'doughnut',
          data: {
            labels: ['Lus', 'Non lus'],
            datasets: [{
              data: [readCount, unreadCount],
              backgroundColor: ['#10B981', '#FF6B35'],
              borderWidth: 0
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { labels: { color: '#B4B8D4' } } },
            cutout: '60%'
          }
        });
      } catch (e) { console.error('[Chart donut]', e); }
    }
  }

  /* ================================================================
     PARAMÈTRES
  ================================================================ */
  var changePasswordForm = document.getElementById('changePasswordForm');
  if (changePasswordForm) {
    changePasswordForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var current = document.getElementById('currentPassword').value;
      var next    = document.getElementById('newPassword').value;
      var confirm = document.getElementById('confirmPassword').value;
      var msgEl   = document.getElementById('passwordMsg');

      if (next !== confirm) { msgEl.style.color = '#EF4444'; msgEl.textContent = 'Les mots de passe ne correspondent pas.'; return; }
      if (next.length < 12) { msgEl.style.color = '#EF4444'; msgEl.textContent = 'Mot de passe trop court (12 caractères min).'; return; }

      apiRequest('POST', '/api/admin/change-password', { current: current, next: next })
        .then(function (res) {
          if (res.status === 200) {
            msgEl.style.color = '#10B981';
            msgEl.textContent = 'Mot de passe modifié ! Reconnectez-vous.';
            changePasswordForm.reset();
            setTimeout(logout, 2000);
          } else {
            msgEl.style.color = '#EF4444';
            msgEl.textContent = res.data.error || 'Erreur.';
          }
        }).catch(function () { msgEl.style.color = '#EF4444'; msgEl.textContent = 'Erreur réseau.'; });
    });
  }

  var deleteAllBtn = document.getElementById('deleteAllMessages');
  if (deleteAllBtn) {
    deleteAllBtn.addEventListener('click', function () {
      if (!confirm('Supprimer TOUS les messages ?\n\nIrréversible.')) return;
      if (!confirm('Êtes-vous absolument sûr ?')) return;
      apiRequest('DELETE', '/api/admin/messages?type=all')
        .then(function () { showNotification('Tous les messages supprimés', 'success'); loadOverviewData(); loadMessages(); })
        .catch(console.error);
    });
  }

  /* ================================================================
     UTILITAIRES
  ================================================================ */
  function setText(id, val) { var el = document.getElementById(id); if (el) el.textContent = val; }

  function esc(str) {
    var d = document.createElement('div');
    d.textContent = String(str || '');
    return d.innerHTML;
  }

  function formatDate(dateStr) {
    if (!dateStr) return '-';
    var d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);
    var now = new Date();
    var diff = now - d;
    if (diff < 60000)    return 'À l\'instant';
    if (diff < 3600000)  return 'Il y a ' + Math.floor(diff / 60000) + ' min';
    if (diff < 86400000) return 'Il y a ' + Math.floor(diff / 3600000) + 'h';
    if (diff < 604800000) return 'Il y a ' + Math.floor(diff / 86400000) + ' jour(s)';
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  function updateMessageCount() {
    apiRequest('GET', '/api/admin/stats')
      .then(function (res) {
        if (res.status !== 200) return;
        var count = parseInt(res.data.stats.unread || 0, 10);
        var badge = document.getElementById('messageCount');
        if (badge) {
          badge.textContent   = count > 0 ? count : '';
          badge.style.display = count > 0 ? 'inline-flex' : 'none';
        }
      }).catch(console.error);
  }

  /* ================================================================
     STYLES NOTIFICATIONS
  ================================================================ */
  if (!document.getElementById('_notif_styles')) {
    var s = document.createElement('style');
    s.id = '_notif_styles';
    s.textContent =
      '.notification{position:fixed;top:-100px;right:20px;background:rgba(10,14,39,.97);color:#fff;padding:1rem 1.5rem;border-radius:12px;' +
      'box-shadow:0 8px 32px rgba(0,0,0,.5);display:flex;align-items:center;gap:.75rem;z-index:10000;' +
      'min-width:280px;max-width:450px;transition:transform .3s cubic-bezier(.4,0,.2,1);border:1px solid rgba(255,255,255,.1);}' +
      '.notification.show{transform:translateY(120px);}' +
      '.notification-success{border-left:4px solid #10B981;}' +
      '.notification-error{border-left:4px solid #EF4444;}' +
      '.notification-info{border-left:4px solid #00D9FF;}' +
      '.notification i{font-size:1.25rem;}' +
      '.notification-success i{color:#10B981;}' +
      '.notification-error i{color:#EF4444;}' +
      '.notification-info i{color:#00D9FF;}' +
      '.notification span{flex:1;font-weight:500;}' +
      '@media(max-width:768px){.notification{right:10px;left:10px;min-width:auto;}}';
    document.head.appendChild(s);
  }

  /* ================================================================
     INIT
  ================================================================ */
  checkAuth();

})();