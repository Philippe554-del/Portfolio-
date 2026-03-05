(function () {
  'use strict';

  document.addEventListener('dragstart', function (e) { e.preventDefault(); });
  document.addEventListener('contextmenu', function (e) { if (e.target.tagName === 'IMG') e.preventDefault(); });

  document.addEventListener('DOMContentLoaded', function () {

    var API_URL = (function () {
      var h = window.location.hostname;
      if (h === 'localhost' || h === '127.0.0.1') return 'http://localhost:3000';
      return window.location.origin;
    })();

    var header        = document.querySelector('header');
    var hamburger     = document.querySelector('.hamburger');
    var navLinks      = document.querySelector('.nav-links');
    var backToTop     = document.querySelector('.back-to-top');
    var navLinksItems = document.querySelectorAll('.nav-links a');
    var contactForm   = document.getElementById('contactForm');

    /* ================================================================
       MENU MOBILE
    ================================================================ */
    var overlay = document.createElement('div');
    overlay.id = '_nav_overlay';
    overlay.style.cssText = 'display:none;position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.6);z-index:1000;';
    document.body.appendChild(overlay);

    // ✅ CORRECTION ANDROID : position:fixed + top négatif du scroll actuel
    // overflow:hidden seul ne bloque pas le scroll sur Android Chrome
    var _scrollYBeforeMenu = 0;

    function openMenu() {
      if (hamburger) hamburger.classList.add('active');
      if (navLinks)  navLinks.classList.add('active');
      overlay.style.display = 'block';
      // Mémorise la position de scroll puis fixe le body
      _scrollYBeforeMenu = window.pageYOffset || document.documentElement.scrollTop || 0;
      document.body.style.position   = 'fixed';
      document.body.style.top        = '-' + _scrollYBeforeMenu + 'px';
      document.body.style.left       = '0';
      document.body.style.right      = '0';
      document.body.style.overflowY  = 'scroll'; // évite le saut de largeur
    }

    function closeMenu() {
      if (hamburger) hamburger.classList.remove('active');
      if (navLinks)  navLinks.classList.remove('active');
      overlay.style.display = 'none';
      // Restaure le body et remet le scroll exactement où il était
      document.body.style.position  = '';
      document.body.style.top       = '';
      document.body.style.left      = '';
      document.body.style.right     = '';
      document.body.style.overflowY = '';
      window.scrollTo(0, _scrollYBeforeMenu);
    }

    overlay.addEventListener('click', closeMenu);

    var _touchHandled = false;
    var _lastToggle   = 0;

    function toggleMenu(e) {
      e.preventDefault();
      e.stopPropagation();
      var now = Date.now();
      if (now - _lastToggle < 400) return;
      _lastToggle = now;
      hamburger.classList.contains('active') ? closeMenu() : openMenu();
    }

    if (hamburger) {
      hamburger.addEventListener('touchend', function (e) {
        _touchHandled = true;
        toggleMenu(e);
        setTimeout(function () { _touchHandled = false; }, 500);
      }, { passive: false });

      hamburger.addEventListener('click', function (e) {
        if (_touchHandled) return;
        toggleMenu(e);
      });
    }

    window.addEventListener('resize', function () { if (window.innerWidth > 768) closeMenu(); });

    /* ================================================================
       SCROLL VERS SECTION — CORRIGÉ POUR ANDROID
    ================================================================ */
    function scrollToSection(targetId) {
      if (!targetId || !/^[a-zA-Z0-9_-]+$/.test(targetId)) return;
      var target = document.getElementById(targetId);
      if (!target) return;

      var headerH = header ? header.getBoundingClientRect().height : 70;

      // ✅ CORRECTION CLÉ ANDROID : quand body est position:fixed (menu ouvert),
      // window.pageYOffset = 0. On utilise _scrollYBeforeMenu pour recalculer.
      var bodyIsFixed = document.body.style.position === 'fixed';
      var currentScroll = bodyIsFixed
        ? _scrollYBeforeMenu
        : (window.pageYOffset || document.documentElement.scrollTop || 0);
      var targetTop = target.getBoundingClientRect().top + currentScroll - headerH - 10;

      try {
        window.scrollTo({ top: targetTop, behavior: 'smooth' });
      } catch (e) {
        window.scrollTo(0, targetTop);
      }

      // Fallback Android : certains WebViews ignorent window.scrollTo
      setTimeout(function () {
        var cur = window.pageYOffset
               || document.documentElement.scrollTop
               || document.body.scrollTop
               || 0;
        if (Math.abs(cur - targetTop) > 60) {
          document.documentElement.scrollTop = targetTop;
          document.body.scrollTop = targetTop;
        }
      }, 150);
    }

    // LIENS DU MENU MOBILE
    function bindMenuLinks() {
      if (!navLinks) return;
      navLinks.querySelectorAll('a[href^="#"]').forEach(function (link) {
        var newLink = link.cloneNode(true);
        link.parentNode.replaceChild(newLink, link);

        var _linkTouchHandled = false;

        function handleNavLink(e) {
          var href = newLink.getAttribute('href');
          if (!href || href === '#') return;
          var targetId = href.slice(1);
          if (!document.getElementById(targetId)) return;

          e.preventDefault();
          e.stopPropagation();

          var idToScrollTo = targetId;
          var isMenuOpen   = navLinks.classList.contains('active');

          if (isMenuOpen) {
            closeMenu();
            setTimeout(function () {
              scrollToSection(idToScrollTo);
            }, 320);
          } else {
            scrollToSection(idToScrollTo);
          }
        }

        newLink.addEventListener('touchend', function (e) {
          _linkTouchHandled = true;
          handleNavLink(e);
          setTimeout(function () { _linkTouchHandled = false; }, 600);
        }, { passive: false });

        newLink.addEventListener('click', function (e) {
          if (_linkTouchHandled) return;
          handleNavLink(e);
        });
      });
    }

    bindMenuLinks();

    // Listener général pour les liens hors menu (footer, hero, etc.)
    document.addEventListener('click', function (e) {
      var link = e.target.closest('a[href^="#"]');
      if (!link) return;
      if (navLinks && navLinks.contains(link)) return;

      var href = link.getAttribute('href');
      if (!href || href === '#') return;
      var targetId = href.slice(1);
      if (!document.getElementById(targetId)) return;

      e.preventDefault();
      scrollToSection(targetId);
    });

    /* ================================================================
       SCROLL HEADER + BACK TO TOP
    ================================================================ */
    window.addEventListener('scroll', function () {
      var s = window.pageYOffset;
      if (header)    header.classList.toggle('scrolled', s > 100);
      if (backToTop) backToTop.classList.toggle('visible', s > 300);
    }, { passive: true });

    if (backToTop) {
      backToTop.addEventListener('click', function () {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }

    /* ================================================================
       ACTIVE NAV LINK AU SCROLL
    ================================================================ */
    var sections = document.querySelectorAll('section[id]');

    function activateNavLink() {
      var scrollY = window.pageYOffset;
      sections.forEach(function (section) {
        var top = section.offsetTop - 120;
        var id  = section.getAttribute('id');
        var safeId = CSS && CSS.escape ? CSS.escape(id) : id.replace(/([^\w-])/g, '\\$1');
        var lnk = document.querySelector('.nav-links a[href="#' + safeId + '"]');
        if (scrollY >= top && scrollY < top + section.offsetHeight) {
          navLinksItems.forEach(function (i) { i.classList.remove('active'); });
          if (lnk) lnk.classList.add('active');
        }
      });
    }
    window.addEventListener('scroll', activateNavLink, { passive: true });

    /* ================================================================
       ANIMATIONS AU SCROLL
    ================================================================ */
    if (window.IntersectionObserver) {
      var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.style.opacity   = '1';
            entry.target.style.transform = 'translateY(0)';
            observer.unobserve(entry.target);
          }
        });
      }, { threshold: 0.01, rootMargin: '0px 0px -50px' });

      document.querySelectorAll('.skill-category, .projet-card, .stat, .contact-method').forEach(function (el) {
        el.style.opacity    = '0';
        el.style.transform  = 'translateY(8px)';
        el.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
        observer.observe(el);
      });

      var cvObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.style.opacity   = '1';
            entry.target.style.transform = 'translateY(0)';
            cvObserver.unobserve(entry.target);
          }
        });
      }, { threshold: 0.05 });

      document.querySelectorAll('.cv-center').forEach(function (el) {
        el.style.opacity    = '0';
        el.style.transform  = 'translateY(20px)';
        el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
        cvObserver.observe(el);
      });
    }

    /* ================================================================
       COMPTEUR STATS ANIMÉ
    ================================================================ */
    if (window.IntersectionObserver) {
      var statsObs = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          var el = entry.target.querySelector('.stat-number');
          if (!el || entry.target.dataset.animated) return;
          var text = el.textContent || '';
          var num  = parseInt(text.replace(/\D/g, ''), 10);
          if (isNaN(num) || num <= 0) return;
          entry.target.dataset.animated = 'true';
          var cur = 0, inc = num / 30, isPct = text.indexOf('%') !== -1;
          var t = setInterval(function () {
            cur += inc;
            if (cur >= num) { cur = num; clearInterval(t); }
            el.textContent = isPct ? Math.floor(cur) + '%' : Math.floor(cur) + '+';
          }, 40);
        });
      }, { threshold: 0.5 });
      document.querySelectorAll('.stat').forEach(function (s) { statsObs.observe(s); });
    }

    /* ================================================================
       CV — BOUTONS
    ================================================================ */
    var cvDownloadBtn = document.querySelector('.btn-cv-download');
    if (cvDownloadBtn) {
      cvDownloadBtn.addEventListener('click', function () {
        showNotification('Téléchargement du CV en cours…', 'info');
      });
    }

    var cvViewBtn = document.querySelector('.btn-cv-view');
    if (cvViewBtn) {
      cvViewBtn.addEventListener('click', function (e) {
        e.preventDefault();
        var href = cvViewBtn.getAttribute('href') || '/cv/CV_philippe_hountondji.pdf';
        if (/^https?:\/\//i.test(href) && href.indexOf(window.location.origin) !== 0) return;
        if (href.charAt(0) !== '/') href = '/' + href;
        window.open(href, '_blank', 'noopener,noreferrer');
      });
    }

    /* ================================================================
       UTILITAIRES
    ================================================================ */
    function sanitizeInput(input, maxLen) {
      maxLen = maxLen || 2000;
      return String(input || '').trim().slice(0, maxLen);
    }

    function isValidEmail(email) {
      return /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/.test(email)
        && email.length <= 254
        && email.indexOf('..') === -1;
    }

    function showFieldError(id, msg) {
      var el = document.getElementById(id);
      if (el) el.textContent = msg;
    }

    function clearFieldErrors() {
      ['error-name', 'error-email', 'error-phone', 'error-message'].forEach(function (id) {
        var el = document.getElementById(id);
        if (el) el.textContent = '';
      });
    }

    function showNotification(message, type) {
      if (['success', 'error', 'info'].indexOf(type) === -1) type = 'info';
      var box  = document.createElement('div');
      box.className = 'notification notification-' + type;
      var icon = document.createElement('i');
      icon.className = 'fas ' + (type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle');
      var txt  = document.createElement('span');
      txt.textContent = String(message).slice(0, 200);
      box.appendChild(icon);
      box.appendChild(txt);
      document.body.appendChild(box);
      setTimeout(function () { box.classList.add('show'); }, 10);
      setTimeout(function () {
        box.classList.remove('show');
        setTimeout(function () { if (box.parentNode) box.parentNode.removeChild(box); }, 300);
      }, 5000);
    }

    /* ================================================================
       FORMULAIRE DE CONTACT
    ================================================================ */
    if (contactForm) {
      var honeypot = document.createElement('input');
      honeypot.type = 'text'; honeypot.name = 'website';
      honeypot.style.cssText = 'position:absolute;left:-9999px;opacity:0;height:0;width:0;pointer-events:none;';
      honeypot.tabIndex = -1; honeypot.autocomplete = 'off';
      honeypot.setAttribute('aria-hidden', 'true');
      contactForm.appendChild(honeypot);

      function getSubmitData() { try { return JSON.parse(sessionStorage.getItem('_sf') || '{}'); } catch (e) { return {}; } }
      function setSubmitData(d) { try { sessionStorage.setItem('_sf', JSON.stringify(d)); } catch (e) {} }
      function isRateLimited() {
        var d = getSubmitData(), now = Date.now();
        if (now < (d.lockUntil || 0)) {
          showNotification('Trop de tentatives. Réessayez dans ' + Math.ceil(((d.lockUntil || 0) - now) / 1000) + 's.', 'error');
          return true;
        }
        if (now - (d.firstAt || 0) > 600000) { setSubmitData({ count: 0, firstAt: now }); return false; }
        if ((d.count || 0) >= 3) { setSubmitData({ count: d.count, firstAt: d.firstAt, lockUntil: now + 120000 }); showNotification('Limite atteinte. Réessayez dans 2 minutes.', 'error'); return true; }
        return false;
      }
      function incrementCount() { var d = getSubmitData(), now = Date.now(); setSubmitData({ count: (d.count || 0) + 1, firstAt: d.firstAt || now, lockUntil: d.lockUntil || 0 }); }

      contactForm.addEventListener('submit', function (e) {
        e.preventDefault();
        clearFieldErrors();
        if (honeypot.value) return;
        if (isRateLimited()) return;

        var name    = sanitizeInput(document.getElementById('name').value,    100);
        var email   = sanitizeInput(document.getElementById('email').value,   254);
        var phone   = sanitizeInput(document.getElementById('phone').value,    20);
        var message = sanitizeInput(document.getElementById('message').value, 2000);

        var hasErr = false;
        if (name.length < 2)      { showFieldError('error-name',    'Le nom doit contenir au moins 2 caractères.'); hasErr = true; }
        if (!isValidEmail(email)) { showFieldError('error-email',   'Adresse email invalide.'); hasErr = true; }
        if (phone && !/^\+?[0-9]{8,20}$/.test(phone)) { showFieldError('error-phone', 'Numéro invalide (8–20 chiffres).'); hasErr = true; }
        if (message.length < 10)  { showFieldError('error-message', 'Le message doit contenir au moins 10 caractères.'); hasErr = true; }
        if (hasErr) return;

        var btn  = contactForm.querySelector('.btn-submit');
        var orig = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Envoi en cours…';

        fetch(API_URL + '/api/contact', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: name, email: email, phone: phone, message: message })
        })
        .then(function (r) { return r.json().then(function (d) { return { status: r.status, data: d }; }); })
        .then(function (result) {
          if (result.status === 200 && result.data.success) {
            incrementCount();
            showNotification('Message envoyé ! Je vous répondrai bientôt.', 'success');
            contactForm.reset();
            btn.innerHTML = '<i class="fas fa-check"></i> Envoyé !';
            btn.style.background = '#10B981';
            setTimeout(function () { btn.disabled = false; btn.innerHTML = orig; btn.style.background = ''; }, 3000);
          } else {
            showNotification(String(result.data.error || "Erreur lors de l'envoi.").slice(0, 200), 'error');
            btn.disabled = false; btn.innerHTML = orig;
          }
        })
        .catch(function () {
          showNotification('Erreur réseau. Vérifiez votre connexion.', 'error');
          btn.disabled = false; btn.innerHTML = orig;
        });
      });

      var nameInput = document.getElementById('name');
      if (nameInput) nameInput.addEventListener('blur', function () { this.style.borderColor = (this.value.trim().length > 0 && this.value.trim().length < 2) ? '#EF4444' : ''; });

      var emailInput = document.getElementById('email');
      if (emailInput) emailInput.addEventListener('blur', function () { this.style.borderColor = (this.value.trim() && !isValidEmail(this.value.trim())) ? '#EF4444' : ''; });

      var messageInput = document.getElementById('message');
      if (messageInput) {
        messageInput.addEventListener('input', function () {
          var len = this.value.length, maxLen = 2000;
          var counter = this.parentElement.querySelector('.char-counter');
          if (!counter) { counter = document.createElement('div'); counter.className = 'char-counter'; this.parentElement.appendChild(counter); }
          counter.textContent = len + ' / ' + maxLen + ' caractères';
          counter.style.color = len > maxLen ? '#EF4444' : len > maxLen * 0.9 ? '#F59E0B' : '#6B7280';
          this.style.borderColor = len > maxLen ? '#EF4444' : '';
        });
      }
    }

    /* ================================================================
       NEWSLETTER
    ================================================================ */
    var newsletterForm = document.querySelector('.newsletter-form');
    if (newsletterForm) {
      var nlSent = false;
      newsletterForm.addEventListener('submit', function (e) {
        e.preventDefault();
        if (nlSent) { showNotification('Vous êtes déjà inscrit(e). Merci !', 'info'); return; }
        var inp = newsletterForm.querySelector('input[type="email"]');
        var em  = sanitizeInput(inp.value, 254);
        if (!em || !isValidEmail(em)) { showNotification('Veuillez entrer une adresse email valide.', 'error'); return; }
        var btn = newsletterForm.querySelector('button'), orig = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>'; btn.disabled = true;
        setTimeout(function () { showNotification('Inscription réussie ! Merci.', 'success'); inp.value = ''; btn.innerHTML = orig; btn.disabled = false; nlSent = true; }, 1000);
      });
    }

    /* ================================================================
       STYLES NOTIFICATION
    ================================================================ */
    activateNavLink();

    if (!document.getElementById('_notif_styles')) {
      var s = document.createElement('style');
      s.id = '_notif_styles';
      s.textContent = [
        '.notification{position:fixed;top:-100px;right:20px;background:rgba(10,14,39,.97);color:#fff;padding:1rem 1.5rem;border-radius:12px;',
        'box-shadow:0 8px 32px rgba(0,0,0,.5);display:flex;align-items:center;gap:.75rem;z-index:10000;',
        'min-width:300px;max-width:500px;transition:transform .3s cubic-bezier(.4,0,.2,1);border:1px solid rgba(255,255,255,.1);}',
        '.notification.show{transform:translateY(120px);}',
        '.notification-success{border-left:4px solid #10B981;}',
        '.notification-error{border-left:4px solid #EF4444;}',
        '.notification-info{border-left:4px solid #00D9FF;}',
        '.notification i{font-size:1.25rem;}',
        '.notification-success i{color:#10B981;}',
        '.notification-error i{color:#EF4444;}',
        '.notification-info i{color:#00D9FF;}',
        '.notification span{flex:1;font-weight:500;}',
        '.char-counter{font-size:.875rem;margin-top:.5rem;text-align:right;}',
        '@media(max-width:768px){.notification{right:10px;left:10px;min-width:auto;}}'
      ].join('');
      document.head.appendChild(s);
    }

  });
})();