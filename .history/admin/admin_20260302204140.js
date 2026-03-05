(function () {
  'use strict';

  /* ===== CONFIG ===== */
  var API_URL = (function () {
    var h = window.location.hostname;
    if (h === 'localhost' || h === '127.0.0.1') return 'http://localhost:3000';
    return window.location.origin;
  })();

  var TOKEN_KEY = '_adm_tk';
  var currentMessageId = null;
  var messagesChart = null;
  var statusChart   = null;
  var searchTimeout = null;
  var currentFilter = 'all';
  var currentSort   = 'newest';

  /* ===== TOKEN ===== */
  function getToken() {
    try {
      return sessionStorage.getItem(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY) || null;
    } catch (e) { return null; }
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
    var opts = {
      method: method,
      headers: { 'Content-Type': 'application/json' }
    };

    var tok = getToken();
    if (tok) opts.headers['Authorization'] = 'Bearer ' + tok;
    if (body) opts.body = JSON.stringify(body);

    return fetch(API_URL + endpoint, opts)
      .then(function (r) {
        if (r.status === 401) { logout(); return Promise.reject(new Error('Session expirée.')); }
        return r.json().then(function (data) {
          return { status: r.status, data: data };
        });
      });
  }

  /* ===== AUTH ===== */
  function checkAuth() {
    if (!getToken()) {
      showLoginPage();
    } else {
      showDashboard();
    }
  }

  function showLoginPage() {
    document.getElementById('loginPage').style.display  = '';
    document.getElementById('dashboard').classList.add('hidden');
  }

  function showDashboard() {
    document.getElementById('loginPage').style.display = 'none';
    document.getElementById('dashboard').classList.remove('hidden');
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
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Connexion…';

      apiRequest('POST', '/api/admin/login', { email: email, password: password })
        .then(function (res) {
          if (res.status === 200 && res.data.token) {
            setToken(res.data.token, remember);
            showDashboard();
          } else {
            errEl.style.display = 'flex';
            errEl.querySelector('span').textContent = res.data.error || 'Identifiants incorrects.';
            document.getElementById('loginPage').querySelector('.login-card').classList.add('shake');
            setTimeout(function () {
              document.getElementById('loginPage').querySelector('.login-card').classList.remove('shake');
            }, 600);
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

  /* ===== NAVIGATION ===== */
  var pageTitles = {
    overview:  'Vue d\'ensemble',
    messages:  'Messages',
    analytics: 'Statistiques',
    settings:  'Paramètres'
  };

  document.querySelectorAll('.nav-item[data-page]').forEach(function (item) {
    item.addEventListener('click', function (e) {
      e.preventDefault();
      navigateTo(this.dataset.page);
    });
  });

  document.querySelectorAll('[data-page]').forEach(function (el) {
    if (el.tagName === 'A' && !el.classList.contains('nav-item')) {
      el.addEventListener('click', function (e) {
        e.preventDefault();
        navigateTo(this.dataset.page);
      });
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

  var menuToggle = document.getElementById('menuToggle');
  var sidebar    = document.querySelector('.sidebar');
  if (menuToggle && sidebar) {
    menuToggle.addEventListener('click', function () {
      sidebar.classList.toggle('active');
    });
  }

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
      container.innerHTML = '<div class="empty-state"><i class="fas fa-inbox"></i><h3>Aucun message</h3><p>Les messages du formulaire apparaîtront ici</p></div>';
      return;
    }

    container.innerHTML = messages.map(function (m) {
      return renderMessageItem(m, true);
    }).join('');

    container.querySelectorAll('.message-item').forEach(function (el) {
      el.addEventListener('click', function () { openMessage(parseInt(this.dataset.id)); });
    });
  }

  /* ===== MESSAGES ===== */
  function loadMessages() {
    var search = (document.getElementById('searchMessages') || {}).value || '';
    var filter = (document.getElementById('filterMessages') || {}).value || 'all';
    var sort   = (document.getElementById('sortMessages')   || {}).value || 'newest';

    currentFilter = filter;
    currentSort   = sort;

    var endpoint = '/api/admin/messages?limit=50&filter=' + (filter !== 'all' ? filter : '');

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
      container.innerHTML = '<div class="empty-state"><i class="fas fa-inbox"></i><h3>Aucun message</h3><p>Les messages apparaîtront ici</p></div>';
      return;
    }

    container.innerHTML = messages.map(function (m) {
      return renderMessageItem(m, false);
    }).join('');

    container.querySelectorAll('.message-item').forEach(function (el) {
      el.addEventListener('click', function (e) {
        if (e.target.closest('.btn-small')) return;
        openMessage(parseInt(this.dataset.id));
      });
    });

    container.querySelectorAll('[data-action="delete"]').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        deleteMessage(parseInt(this.dataset.id));
      });
    });

    container.querySelectorAll('[data-action="toggle-read"]').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        toggleRead(parseInt(this.dataset.id));
      });
    });
  }

  function renderMessageItem(m, preview) {
    var isUnread = !m.is_read;
    var date     = formatDate(m.created_at);
    var text     = (m.message || '').slice(0, 120);

    return '<div class="message-item ' + (isUnread ? 'unread' : '') + '" data-id="' + m.id + '">' +
      '<div class="message-header">' +
        '<span class="message-sender"><i class="fas fa-user"></i>' + esc(m.name) + '</span>' +
        '<span class="message-date"><i class="fas fa-clock"></i>' + date + '</span>' +
      '</div>' +
      '<div class="message-email"><i class="fas fa-envelope"></i>' + esc(m.email) + '</div>' +
      '<div class="message-preview">' + esc(text) + (m.message && m.message.length > 120 ? '…' : '') + '</div>' +
      (preview ? '' :
        '<div class="message-actions">' +
          '<button class="btn-small" data-action="toggle-read" data-id="' + m.id + '">' +
            '<i class="fas fa-' + (isUnread ? 'check' : 'envelope') + '"></i>' +
            (isUnread ? 'Marquer lu' : 'Marquer non lu') +
          '</button>' +
          '<button class="btn-small danger" data-action="delete" data-id="' + m.id + '">' +
            '<i class="fas fa-trash"></i>Supprimer' +
          '</button>' +
        '</div>'
      ) +
    '</div>';
  }

  function openMessage(id) {
    apiRequest('GET', '/api/admin/messages?limit=100')
      .then(function (res) {
        if (res.status !== 200) return;
        var msg = (res.data.messages || []).find(function (m) { return m.id === id; });
        if (!msg) return;

        currentMessageId = id;

        if (!msg.is_read) {
          apiRequest('PATCH', '/api/admin/messages/' + id + '/read')
            .then(function () { loadOverviewData(); loadMessages(); })
            .catch(console.error);
        }

        var body = document.getElementById('modalBody');
        if (body) {
          body.innerHTML =
            '<div class="modal-detail">' +
              field('fas fa-user',     'Nom',      msg.name) +
              field('fas fa-envelope', 'Email',    '<a href="mailto:' + esc(msg.email) + '">' + esc(msg.email) + '</a>') +
              (msg.phone ? field('fas fa-phone', 'Téléphone', msg.phone) : '') +
              field('fas fa-clock',    'Date',     formatDate(msg.created_at)) +
              field('fas fa-comment',  'Message',  esc(msg.message).replace(/\n/g, '<br>')) +
              field('fas fa-circle',   'Statut',   msg.is_read ? 'Lu' : 'Non lu') +
            '</div>';
        }

        document.getElementById('messageModal').classList.add('active');
      })
      .catch(console.error);
  }

  function field(icon, label, value) {
    return '<div class="modal-field">' +
      '<label><i class="' + icon + '"></i>' + label + '</label>' +
      '<div class="value">' + value + '</div>' +
    '</div>';
  }

  /* ===== MODAL ===== */
  function closeModal() {
    document.getElementById('messageModal').classList.remove('active');
    currentMessageId = null;
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
    if (!confirm('Supprimer ce message définitivement ?')) return;

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
  if (searchInput) {
    searchInput.addEventListener('input', function () {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(loadMessages, 300);
    });
  }

  var filterSelect = document.getElementById('filterMessages');
  if (filterSelect) filterSelect.addEventListener('change', loadMessages);

  var sortSelect = document.getElementById('sortMessages');
  if (sortSelect) sortSelect.addEventListener('change', loadMessages);

  /* ===== QUICK ACTIONS ===== */
  document.querySelectorAll('.action-card[data-action]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var action = this.dataset.action;

      if (action === 'export') exportMessages();
      if (action === 'mark-all-read') markAllRead();
      if (action === 'delete-all-read') deleteAllRead();
    });
  });

  function markAllRead() {
    if (!confirm('Marquer tous les messages comme lus ?')) return;
    apiRequest('PATCH', '/api/admin/messages/read-all')
      .then(function () { loadOverviewData(); loadMessages(); })
      .catch(console.error);
  }

  function deleteAllRead() {
    if (!confirm('Supprimer définitivement tous les messages lus ?')) return;
    apiRequest('DELETE', '/api/admin/messages?type=read')
      .then(function () { loadOverviewData(); loadMessages(); })
      .catch(console.error);
  }

  function exportMessages() {
    apiRequest('GET', '/api/admin/messages?limit=1000')
      .then(function (res) {
        if (res.status !== 200) return;
        var messages = res.data.messages || [];
        if (!messages.length) { alert('Aucun message à exporter.'); return; }

        var csv = 'ID,Nom,Email,Téléphone,Message,Lu,Date\n';
        messages.forEach(function (m) {
          csv += [m.id, csvCell(m.name), csvCell(m.email), csvCell(m.phone || ''),
                  csvCell(m.message), m.is_read ? 'Oui' : 'Non', m.created_at].join(',') + '\n';
        });

        var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        var url  = URL.createObjectURL(blob);
        var a    = document.createElement('a');
        a.href     = url;
        a.download = 'messages_' + new Date().toISOString().slice(0, 10) + '.csv';
        a.click();
        URL.revokeObjectURL(url);
      })
      .catch(console.error);
  }

  function csvCell(val) {
    return '"' + String(val || '').replace(/"/g, '""') + '"';
  }

  /* ===== ANALYTICS ===== */
  function loadAnalytics() {
    apiRequest('GET', '/api/admin/stats')
      .then(function (res) {
        if (res.status !== 200) return;
        var s = res.data.stats;

        renderCharts(s);

        var messages = s.total > 0 ? s : null;
        if (messages) {
          var daily = s.daily || [];
          if (daily.length > 0) {
            setText('firstMessageDate', formatDate(daily[0].date));
            setText('lastMessageDate',  formatDate(daily[daily.length - 1].date));
          } else {
            setText('firstMessageDate', '-');
            setText('lastMessageDate',  '-');
          }

          var days = daily.length || 1;
          var avg  = daily.reduce(function (acc, d) { return acc + parseInt(d.count); }, 0) / days;
          setText('avgMessagesPerDay', avg.toFixed(1) + ' / jour');
        }
      })
      .catch(console.error);
  }

  function renderCharts(s) {
    var daily  = s.daily || [];
    var labels = daily.map(function (d) { return formatDate(d.date, true); });
    var counts = daily.map(function (d) { return d.count; });

    var chartDefaults = {
      color: '#B4B8D4',
      borderColor: 'rgba(255,255,255,0.1)'
    };

    var ctx1 = document.getElementById('messagesChart');
    if (ctx1) {
      if (messagesChart) messagesChart.destroy();
      messagesChart = new Chart(ctx1, {
        type: 'line',
        data: {
          labels: labels,
          datasets: [{
            label: 'Messages',
            data: counts,
            borderColor: '#FF6B35',
            backgroundColor: 'rgba(255,107,53,0.1)',
            tension: 0.4,
            fill: true,
            pointBackgroundColor: '#FF6B35'
          }]
        },
        options: {
          responsive: true,
          plugins: { legend: { labels: { color: '#B4B8D4' } } },
          scales: {
            x: { ticks: { color: '#B4B8D4' }, grid: { color: 'rgba(255,255,255,0.05)' } },
            y: { ticks: { color: '#B4B8D4' }, grid: { color: 'rgba(255,255,255,0.05)' }, beginAtZero: true }
          }
        }
      });
    }

    var ctx2 = document.getElementById('statusChart');
    if (ctx2) {
      if (statusChart) statusChart.destroy();
      statusChart = new Chart(ctx2, {
        type: 'doughnut',
        data: {
          labels: ['Lus', 'Non lus'],
          datasets: [{
            data: [s.read || 0, s.unread || 0],
            backgroundColor: ['#10B981', '#FF6B35'],
            borderWidth: 0
          }]
        },
        options: {
          responsive: true,
          plugins: {
            legend: { labels: { color: '#B4B8D4' } }
          }
        }
      });
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

      if (next !== confirm) {
        msgEl.style.color = '#EF4444';
        msgEl.textContent = 'Les mots de passe ne correspondent pas.';
        return;
      }
      if (next.length < 8) {
        msgEl.style.color = '#EF4444';
        msgEl.textContent = 'Mot de passe trop court (8 caractères min).';
        return;
      }

      apiRequest('POST', '/api/admin/change-password', { current: current, next: next })
        .then(function (res) {
          if (res.status === 200) {
            msgEl.style.color = '#10B981';
            msgEl.textContent = 'Mot de passe modifié avec succès.';
            changePasswordForm.reset();
          } else {
            msgEl.style.color = '#EF4444';
            msgEl.textContent = res.data.error || 'Erreur.';
          }
        })
        .catch(function () {
          msgEl.style.color = '#EF4444';
          msgEl.textContent = 'Erreur réseau.';
        });
    });
  }

  var deleteAllBtn = document.getElementById('deleteAllMessages');
  if (deleteAllBtn) {
    deleteAllBtn.addEventListener('click', function () {
      if (!confirm('Supprimer TOUS les messages définitivement ? Cette action est irréversible.')) return;
      apiRequest('DELETE', '/api/admin/messages?type=all')
        .then(function () { loadOverviewData(); loadMessages(); })
        .catch(console.error);
    });
  }

  /* ===== UTILS ===== */
  function setText(id, val) {
    var el = document.getElementById(id);
    if (el) el.textContent = val;
  }

  function esc(str) {
    var d = document.createElement('div');
    d.textContent = String(str || '');
    return d.innerHTML;
  }

  function formatDate(dateStr, short) {
    if (!dateStr) return '-';
    var d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
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
      })
      .catch(console.error);
  }

  /* ===== INIT ===== */
  checkAuth();

})();