(function () {
  'use strict';

  var API_URL = (function () {
    var h = window.location.hostname;
    if (h === 'localhost' || h === '127.0.0.1') return 'http://localhost:3000';
    return window.location.origin;
  })();

  var TOKEN_KEY = '_adm_tk';
  var currentMessageId   = null;
  var currentMessageData = null;
  var messagesChart = null;
  var statusChart   = null;
  var searchTimeout = null;

  /* ===== TOKEN ===== */
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

  /* ===== API ===== */
  function apiRequest(method, endpoint, body) {
    var opts = { method: method, headers: { 'Content-Type': 'application/json' } };
    var tok = getToken();
    if (tok)  opts.headers['Authorization'] = 'Bearer ' + tok;
    if (body) opts.body = JSON.stringify(body);
    return fetch(API_URL + endpoint, opts)
      .then(function (r) {
        if (r.status === 401) { logout(); return Promise.reject(new Error('Session expiree.')); }
        return r.json().then(function (data) { return { status: r.status, data: data }; });
      });
  }

  /* ===== AUTH ===== */
  function checkAuth() {
    if (!getToken()) { showLoginPage(); } else { showDashboard(); }
  }
  function showLoginPage() {
    document.getElementById('loginPage').style.display = 'flex';
    var dash = document.getElementById('dashboard');
    dash.classList.add('hidden');
    dash.style.removeProperty('display');
  }
  function showDashboard() {
    document.getElementById('loginPage').style.display = 'none';
    var dash = document.getElementById('dashboard');
    dash.classList.remove('hidden');
    dash.style.display = 'flex';
    loadOverviewData();
    updateMessageCount();
  }
  function logout() {
    clearToken();
    showLoginPage();
    if (messagesChart) { messagesChart.destroy(); messagesChart = null; }
    if (statusChart)   { statusChart.destroy();   statusChart   = null; }
  }

  /* ===== LOGIN ===== */
  var loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var email    = document.getElementById('adminEmail').value.trim();
      var password = document.getElementById('adminPassword').value;
      var remember = document.getElementById('rememberMe').checked;
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
            document.getElementById('loginPage').querySelector('.login-card').classList.add('shake');
            setTimeout(function () { document.getElementById('loginPage').querySelector('.login-card').classList.remove('shake'); }, 600);
          }
        })
        .catch(function (err) {
          errEl.style.display = 'flex';
          errEl.querySelector('span').textContent = err.message || 'Erreur reseau.';
        })
        .finally(function () {
          btn.disabled = false;
          btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Se connecter';
        });
    });
  }

  var logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) logoutBtn.addEventListener('click', logout);

  /* ===== NAVIGATION ===== */
  var pageTitles = { overview: "Vue d'ensemble", messages: 'Messages', analytics: 'Statistiques', settings: 'Parametres' };

  document.querySelectorAll('.nav-item[data-page]').forEach(function (item) {
    item.addEventListener('click', function (e) { e.preventDefault(); navigateTo(this.dataset.page); closeSidebar(); });
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
    if (page === 'messages')  loadMessages();
    if (page === 'analytics') loadAnalytics();
    if (page === 'overview')  loadOverviewData();
  }

  /* ===== HAMBURGER MOBILE ===== */
  var menuToggle = document.getElementById('menuToggle');
  var sidebar    = document.querySelector('.sidebar');

  var sidebarOverlay = document.createElement('div');
  sidebarOverlay.id = '_sidebar_overlay';
  sidebarOverlay.style.cssText = 'display:none;position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.6);z-index:99;';
  document.body.appendChild(sidebarOverlay);

  function openSidebar() {
    if (sidebar) sidebar.classList.add('active');
    sidebarOverlay.style.display = 'block';
    document.body.style.overflow = 'hidden';
  }
  function closeSidebar() {
    if (sidebar) sidebar.classList.remove('active');
    sidebarOverlay.style.display = 'none';
    document.body.style.overflow = '';
  }

  if (menuToggle) {
    menuToggle.addEventListener('click', function (e) {
      e.stopPropagation();
      if (sidebar && sidebar.classList.contains('active')) { closeSidebar(); } else { openSidebar(); }
    });
    menuToggle.addEventListener('touchend', function (e) {
      e.preventDefault(); e.stopPropagation();
      if (sidebar && sidebar.classList.contains('active')) { closeSidebar(); } else { openSidebar(); }
    });
  }
  sidebarOverlay.addEventListener('click', closeSidebar);
  sidebarOverlay.addEventListener('touchend', function (e) { e.preventDefault(); closeSidebar(); });

  /* ===== REFRESH ===== */
  var refreshBtn = document.getElementById('refreshBtn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', function () {
      var active = document.querySelector('.page.active');
      if (!active) return;
      var page = active.id.replace('Page', '');
      if (page === 'overview')  loadOverviewData();
      if (page === 'messages')  loadMessages();
      if (page === 'analytics') loadAnalytics();
    });
  }

  /* ===== PASSWORD TOGGLE ===== */
  document.querySelectorAll('.toggle-password').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var input = this.previousElementSibling;
      if (!input) return;
      var isPass = input.type === 'password';
      input.type = isPass ? 'text' : 'password';
      this.querySelector('i').className = isPass ? 'fas fa-eye-slash' : 'fas fa-eye';
    });
  });

  /* ===== OVERVIEW ===== */
  function loadOverviewData() {
    apiRequest('GET', '/api/admin/stats')
      .then(function (res) {
        if (res.status !== 200) return;
        var s = res.data.stats;
        setText('totalMessages',  s.total);
        setText('readMessages',   s.read);
        setText('unreadMessages', s.unread);
        setText('todayMessages',  s.today);
        setText('messageCount',   s.unread || '');
        loadRecentMessages();
      })
      .catch(console.error);
  }

  function loadRecentMessages() {
    apiRequest('GET', '/api/admin/messages?limit=5')
      .then(function (res) {
        if (res.status !== 200) return;
        renderRecentMessages(res.data.messages || []);
      })
      .catch(console.error);
  }

  function renderRecentMessages(messages) {
    var container = document.getElementById('recentMessagesList');
    if (!container) return;
    if (!messages.length) {
      container.innerHTML = '<div class="empty-state"><i class="fas fa-inbox"></i><h3>Aucun message</h3><p>Les messages apparaitront ici</p></div>';
      return;
    }
    container.innerHTML = messages.map(function (m) { return renderMessageItem(m, true); }).join('');
    container.querySelectorAll('.message-item').forEach(function (el) {
      el.addEventListener('click', function () { openMessage(parseInt(this.dataset.id)); });
    });
  }

  /* ===== MESSAGES ===== */
  function loadMessages() {
    var search = (document.getElementById('searchMessages') || {}).value || '';
    var filter = (document.getElementById('filterMessages') || {}).value || 'all';
    var sort   = (document.getElementById('sortMessages')   || {}).value || 'newest';
    var endpoint = '/api/admin/messages?limit=50' + (filter !== 'all' ? '&filter=' + filter : '');
    apiRequest('GET', endpoint)
      .then(function (res) {
        if (res.status !== 200) return;
        var messages = res.data.messages || [];
        if (search) {
          var q = search.toLowerCase();
          messages = messages.filter(function (m) {
            return (m.name || '').toLowerCase().includes(q) ||
                   (m.email || '').toLowerCase().includes(q) ||
                   (m.message || '').toLowerCase().includes(q);
          });
        }
        if (sort === 'oldest') messages = messages.slice().reverse();
        renderMessages(messages);
      })
      .catch(console.error);
  }

  function renderMessages(messages) {
    var container = document.getElementById('messagesList');
    if (!container) return;
    if (!messages.length) {
      container.innerHTML = '<div class="empty-state"><i class="fas fa-inbox"></i><h3>Aucun message</h3></div>';
      return;
    }
    container.innerHTML = messages.map(function (m) { return renderMessageItem(m, false); }).join('');
    container.querySelectorAll('.message-item').forEach(function (el) {
      el.addEventListener('click', function (e) {
        if (e.target.closest('.btn-small')) return;
        openMessage(parseInt(this.dataset.id));
      });
    });
    container.querySelectorAll('[data-action="delete"]').forEach(function (btn) {
      btn.addEventListener('click', function (e) { e.stopPropagation(); deleteMessage(parseInt(this.dataset.id)); });
    });
    container.querySelectorAll('[data-action="toggle-read"]').forEach(function (btn) {
      btn.addEventListener('click', function (e) { e.stopPropagation(); toggleRead(parseInt(this.dataset.id)); });
    });
  }

  function renderMessageItem(m, preview) {
    var isUnread = !m.is_read;
    var date = formatDate(m.created_at);
    var text = (m.message || '').slice(0, 120);
    return '<div class="message-item ' + (isUnread ? 'unread' : '') + '" data-id="' + m.id + '">' +
      '<div class="message-header">' +
        '<span class="message-sender"><i class="fas fa-user"></i> ' + esc(m.name) + '</span>' +
        '<span class="message-date"><i class="fas fa-clock"></i> ' + date + '</span>' +
      '</div>' +
      '<div class="message-email"><i class="fas fa-envelope"></i> ' + esc(m.email) + '</div>' +
      '<div class="message-preview">' + esc(text) + (m.message && m.message.length > 120 ? '...' : '') + '</div>' +
      (preview ? '' :
        '<div class="message-actions">' +
          '<button class="btn-small" data-action="toggle-read" data-id="' + m.id + '">' +
            '<i class="fas fa-' + (isUnread ? 'check' : 'envelope') + '"></i> ' + (isUnread ? 'Marquer lu' : 'Marquer non lu') +
          '</button>' +
          '<button class="btn-small danger" data-action="delete" data-id="' + m.id + '">' +
            '<i class="fas fa-trash"></i> Supprimer' +
          '</button>' +
        '</div>'
      ) +
    '</div>';
  }

  /* ===== OUVRIR MESSAGE ===== */
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
        if (body) {
          body.innerHTML =
            /* Infos du message */
            '<div class="modal-detail">' +
              field('fas fa-user',    'Nom',      esc(msg.name)) +
              field('fas fa-envelope','Email',    '<a href="mailto:' + esc(msg.email) + '" style="color:#00D9FF">' + esc(msg.email) + '</a>') +
              (msg.phone ? field('fas fa-phone','Tel', '<a href="tel:' + esc(msg.phone) + '" style="color:#00D9FF">' + esc(msg.phone) + '</a>') : '') +
              field('fas fa-clock',  'Date',     formatDate(msg.created_at)) +
              field('fas fa-comment','Message',  '<div style="white-space:pre-wrap;line-height:1.6">' + esc(msg.message) + '</div>') +
              field('fas fa-circle', 'Statut',   msg.is_read ? '<span style="color:#10B981">Lu</span>' : '<span style="color:#FF6B35">Non lu</span>') +
              (msg.replied_at ? field('fas fa-reply','Repondu le', formatDate(msg.replied_at)) : '') +
            '</div>' +

            /* Formulaire de reponse */
            '<div id="replySection" style="margin-top:1.5rem;border-top:1px solid rgba(255,255,255,0.1);padding-top:1.5rem">' +
              '<h4 style="color:#FF6B35;margin-bottom:1rem;font-size:1rem;display:flex;align-items:center;gap:8px">' +
                '<i class="fas fa-reply"></i> Repondre a ' + esc(msg.name) +
              '</h4>' +

              '<div style="margin-bottom:0.75rem">' +
                '<label style="display:block;margin-bottom:4px;font-size:0.82rem;color:#B4B8D4;font-weight:600">Destinataire</label>' +
                '<input id="replyTo" type="email" value="' + esc(msg.email) + '" readonly ' +
                  'style="width:100%;padding:0.65rem 0.75rem;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.1);border-radius:8px;color:#888;font-size:0.9rem;box-sizing:border-box;cursor:not-allowed">' +
              '</div>' +

              '<div style="margin-bottom:0.75rem">' +
                '<label style="display:block;margin-bottom:4px;font-size:0.82rem;color:#B4B8D4;font-weight:600">Sujet</label>' +
                '<input id="replySubject" type="text" value="Re: Message depuis mon portfolio - ' + esc(msg.name) + '" ' +
                  'style="width:100%;padding:0.65rem 0.75rem;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:8px;color:#fff;font-size:0.9rem;box-sizing:border-box;outline:none" ' +
                  'onfocus="this.style.borderColor=\'#FF6B35\'" onblur="this.style.borderColor=\'rgba(255,255,255,0.1)\'">' +
              '</div>' +

              '<div style="margin-bottom:1rem">' +
                '<label style="display:block;margin-bottom:4px;font-size:0.82rem;color:#B4B8D4;font-weight:600">Votre reponse</label>' +
                '<textarea id="replyText" rows="7" ' +
                  'style="width:100%;padding:0.75rem;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:8px;color:#fff;font-size:0.9rem;resize:vertical;font-family:inherit;box-sizing:border-box;outline:none;line-height:1.6" ' +
                  'onfocus="this.style.borderColor=\'#FF6B35\'" onblur="this.style.borderColor=\'rgba(255,255,255,0.1)\'">Bonjour ' + esc(msg.name) + ',\n\n\n\nCordialement,\nPhilippe Hountondji\nhountondjiphilippe58@gmail.com\n+229 01 58 15 69 30</textarea>' +
              '</div>' +

              '<div style="display:flex;align-items:center;gap:1rem;flex-wrap:wrap">' +
                '<button id="sendReplyBtn" ' +
                  'style="padding:0.75rem 1.75rem;background:linear-gradient(135deg,#FF6B35,#F7931E);border:none;border-radius:8px;color:#fff;font-weight:700;cursor:pointer;display:flex;align-items:center;gap:8px;font-size:0.95rem;transition:opacity 0.2s">' +
                  '<i class="fas fa-paper-plane"></i> Envoyer par email' +
                '</button>' +
                '<span id="replyStatus" style="font-size:0.9rem"></span>' +
              '</div>' +
            '</div>';

          document.getElementById('sendReplyBtn').addEventListener('click', function () {
            sendReply(msg);
          });
        }

        document.getElementById('messageModal').classList.add('active');
      })
      .catch(console.error);
  }

  /* ===== ENVOYER EMAIL ===== */
  function sendReply(msg) {
    var to      = (document.getElementById('replyTo')      || {}).value || '';
    var subject = (document.getElementById('replySubject') || {}).value || '';
    var message = (document.getElementById('replyText')    || {}).value || '';
    var btn     = document.getElementById('sendReplyBtn');
    var status  = document.getElementById('replyStatus');

    if (!message.trim() || message.length < 10) {
      status.innerHTML = '<span style="color:#EF4444"><i class="fas fa-exclamation-circle"></i> Ecrivez un message avant d\'envoyer.</span>';
      return;
    }

    btn.disabled = true;
    btn.style.opacity = '0.6';
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Envoi en cours...';
    status.innerHTML = '';

    apiRequest('POST', '/api/admin/send-reply', {
      to:        to,
      subject:   subject,
      message:   message,
      messageId: msg.id
    })
    .then(function (res) {
      if (res.status === 200 && res.data.success) {
        status.innerHTML = '<span style="color:#10B981"><i class="fas fa-check-circle"></i> Email envoye avec succes a ' + esc(to) + ' !</span>';
        btn.innerHTML = '<i class="fas fa-check"></i> Envoye !';
        btn.style.background = 'linear-gradient(135deg,#10B981,#059669)';
        btn.style.opacity = '1';
        loadOverviewData();
        loadMessages();
      } else {
        status.innerHTML = '<span style="color:#EF4444"><i class="fas fa-times-circle"></i> ' + esc(res.data.error || 'Erreur inconnue.') + '</span>';
        btn.disabled = false;
        btn.style.opacity = '1';
        btn.innerHTML = '<i class="fas fa-paper-plane"></i> Envoyer par email';
      }
    })
    .catch(function () {
      status.innerHTML = '<span style="color:#EF4444"><i class="fas fa-times-circle"></i> Erreur reseau. Verifiez la connexion.</span>';
      btn.disabled = false;
      btn.style.opacity = '1';
      btn.innerHTML = '<i class="fas fa-paper-plane"></i> Envoyer par email';
    });
  }

  function field(icon, label, value) {
    return '<div class="modal-field">' +
      '<label><i class="' + icon + '"></i> ' + label + '</label>' +
      '<div class="value">' + value + '</div>' +
    '</div>';
  }

  /* ===== MODAL ===== */
  function closeModal() {
    document.getElementById('messageModal').classList.remove('active');
    currentMessageId   = null;
    currentMessageData = null;
  }

  var closeModalBtn = document.getElementById('closeModal');
  if (closeModalBtn) closeModalBtn.addEventListener('click', closeModal);
  var modalCloseBtn = document.querySelector('.modal-close');
  if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeModal);
  var deleteMessageBtn = document.getElementById('deleteMessage');
  if (deleteMessageBtn) {
    deleteMessageBtn.addEventListener('click', function () {
      if (!currentMessageId) return;
      deleteMessage(currentMessageId, true);
    });
  }
  document.getElementById('messageModal').addEventListener('click', function (e) {
    if (e.target === this) closeModal();
  });

  /* ===== CRUD ===== */
  function toggleRead(id) {
    apiRequest('PATCH', '/api/admin/messages/' + id + '/read')
      .then(function () { loadMessages(); loadOverviewData(); })
      .catch(console.error);
  }
  function deleteMessage(id, closeAfter) {
    if (!confirm('Supprimer ce message definitievement ?\n\nCette action est irreversible.')) return;
    apiRequest('DELETE', '/api/admin/messages/' + id)
      .then(function () {
        if (closeAfter) closeModal();
        loadMessages();
        loadOverviewData();
      })
      .catch(console.error);
  }

  /* ===== SEARCH / FILTER ===== */
  var searchInput = document.getElementById('searchMessages');
  if (searchInput) { searchInput.addEventListener('input', function () { clearTimeout(searchTimeout); searchTimeout = setTimeout(loadMessages, 300); }); }
  var filterSelect = document.getElementById('filterMessages');
  if (filterSelect) filterSelect.addEventListener('change', loadMessages);
  var sortSelect = document.getElementById('sortMessages');
  if (sortSelect) sortSelect.addEventListener('change', loadMessages);

  /* ===== QUICK ACTIONS ===== */
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
    apiRequest('PATCH', '/api/admin/messages/read-all').then(function () { loadOverviewData(); loadMessages(); }).catch(console.error);
  }
  function deleteAllRead() {
    if (!confirm('Supprimer tous les messages lus ?\n\nIrreversible.')) return;
    apiRequest('DELETE', '/api/admin/messages?type=read').then(function () { loadOverviewData(); loadMessages(); }).catch(console.error);
  }
  function exportMessages() {
    apiRequest('GET', '/api/admin/messages?limit=1000')
      .then(function (res) {
        if (res.status !== 200) return;
        var messages = res.data.messages || [];
        if (!messages.length) { alert('Aucun message a exporter.'); return; }
        var csv = 'ID,Nom,Email,Telephone,Message,Lu,Date\n';
        messages.forEach(function (m) {
          csv += [m.id, csvCell(m.name), csvCell(m.email), csvCell(m.phone || ''), csvCell(m.message), m.is_read ? 'Oui' : 'Non', m.created_at].join(',') + '\n';
        });
        var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        var url  = URL.createObjectURL(blob);
        var a    = document.createElement('a');
        a.href = url; a.download = 'messages_' + new Date().toISOString().slice(0, 10) + '.csv';
        a.click(); URL.revokeObjectURL(url);
      }).catch(console.error);
  }
  function csvCell(val) { return '"' + String(val || '').replace(/"/g, '""') + '"'; }

  /* ===== ANALYTICS ===== */
  function loadAnalytics() {
    apiRequest('GET', '/api/admin/stats')
      .then(function (res) {
        if (res.status !== 200) {
          console.error('Stats API error:', res.status, res.data);
          return;
        }
        var s = res.data.stats;
        if (!s) { console.error('No stats in response'); return; }
        renderCharts(s);
        var daily = s.daily || [];
        setText('firstMessageDate', daily.length > 0 ? formatDate(daily[0].date) : '-');
        setText('lastMessageDate',  daily.length > 0 ? formatDate(daily[daily.length - 1].date) : '-');
        var total = daily.reduce(function (acc, d) { return acc + parseInt(d.count || 0); }, 0);
        var days  = daily.length || 1;
        setText('avgMessagesPerDay', (total / days).toFixed(1) + ' / jour');
      })
      .catch(function(err) { console.error('loadAnalytics error:', err); });
  }

  function renderCharts(s) {
    var daily  = s.daily || [];
    var labels = daily.map(function (d) { return formatDate(d.date, true); });
    var counts = daily.map(function (d) { return parseInt(d.count || 0); });

    // Si pas de donnees sur 7 jours, afficher le total global
    if (labels.length === 0) {
      labels = ["Aujourd'hui"];
      counts = [parseInt(s.total || 0)];
    }

    // Graphique messages par jour
    var ctx1 = document.getElementById('messagesChart');
    if (ctx1) {
      if (messagesChart) { messagesChart.destroy(); messagesChart = null; }
      try {
        messagesChart = new Chart(ctx1, {
          type: 'line',
          data: {
            labels: labels,
            datasets: [{
              label: 'Messages recus',
              data: counts,
              borderColor: '#FF6B35',
              backgroundColor: 'rgba(255,107,53,0.15)',
              tension: 0.4,
              fill: true,
              pointBackgroundColor: '#FF6B35',
              pointBorderColor: '#fff',
              pointRadius: 6,
              pointHoverRadius: 8
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { labels: { color: '#B4B8D4', font: { size: 13 } } } },
            scales: {
              x: { ticks: { color: '#B4B8D4' }, grid: { color: 'rgba(255,255,255,0.05)' } },
              y: { ticks: { color: '#B4B8D4', stepSize: 1, precision: 0 }, grid: { color: 'rgba(255,255,255,0.05)' }, beginAtZero: true, min: 0 }
            }
          }
        });
      } catch(e) { console.error('Chart1 error:', e); }
    }

    // Graphique statuts
    var ctx2 = document.getElementById('statusChart');
    if (ctx2) {
      if (statusChart) { statusChart.destroy(); statusChart = null; }
      var readCount   = parseInt(s.read   || 0);
      var unreadCount = parseInt(s.unread || 0);
      try {
        statusChart = new Chart(ctx2, {
          type: 'doughnut',
          data: {
            labels: ['Lus (' + readCount + ')', 'Non lus (' + unreadCount + ')'],
            datasets: [{
              data: [readCount, unreadCount],
              backgroundColor: ['#10B981', '#FF6B35'],
              borderColor: ['#0A0E27', '#0A0E27'],
              borderWidth: 3
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { labels: { color: '#B4B8D4', font: { size: 13 }, padding: 20 } }
            },
            cutout: '65%'
          }
        });
      } catch(e) { console.error('Chart2 error:', e); }
    }
  }

  /* ===== SETTINGS ===== */
  var changePasswordForm = document.getElementById('changePasswordForm');
  if (changePasswordForm) {
    changePasswordForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var current = document.getElementById('currentPassword').value;
      var next    = document.getElementById('newPassword').value;
      var confirm = document.getElementById('confirmPassword').value;
      var msgEl   = document.getElementById('passwordMsg');
      if (next !== confirm) { msgEl.style.color = '#EF4444'; msgEl.textContent = 'Les mots de passe ne correspondent pas.'; return; }
      if (next.length < 8)  { msgEl.style.color = '#EF4444'; msgEl.textContent = 'Mot de passe trop court (8 min).'; return; }
      apiRequest('POST', '/api/admin/change-password', { current: current, next: next })
        .then(function (res) {
          if (res.status === 200) { msgEl.style.color = '#10B981'; msgEl.textContent = 'Mot de passe modifie avec succes !'; changePasswordForm.reset(); }
          else { msgEl.style.color = '#EF4444'; msgEl.textContent = res.data.error || 'Erreur.'; }
        }).catch(function () { msgEl.style.color = '#EF4444'; msgEl.textContent = 'Erreur reseau.'; });
    });
  }

  var deleteAllBtn = document.getElementById('deleteAllMessages');
  if (deleteAllBtn) {
    deleteAllBtn.addEventListener('click', function () {
      if (!confirm('Supprimer TOUS les messages ?\n\nIrreversible.')) return;
      apiRequest('DELETE', '/api/admin/messages?type=all').then(function () { loadOverviewData(); loadMessages(); }).catch(console.error);
    });
  }

  /* ===== UTILS ===== */
  function setText(id, val) { var el = document.getElementById(id); if (el) el.textContent = val; }
  function esc(str) { var d = document.createElement('div'); d.textContent = String(str || ''); return d.innerHTML; }
  function formatDate(dateStr, short) {
    if (!dateStr) return '-';
    var d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);
    if (short) return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }
  function updateMessageCount() {
    apiRequest('GET', '/api/admin/stats')
      .then(function (res) {
        if (res.status !== 200) return;
        var count = res.data.stats.unread || 0;
        var badge = document.getElementById('messageCount');
        if (badge) badge.textContent = count > 0 ? count : '';
      }).catch(console.error);
  }

  /* ===== INIT ===== */
  checkAuth();

})();