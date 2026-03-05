(function () {
  'use strict';

  document.addEventListener('dragstart', function (e) { e.preventDefault(); });
  document.addEventListener('contextmenu', function (e) {
    if (e.target.tagName === 'IMG') e.preventDefault();
  });

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

    /* =====================================================
       CORRECTION 1 : Menu à DROITE, fond plein (sans flou)
    ===================================================== */
    var mobileMenuStyle = document.createElement('style');
    mobileMenuStyle.id  = '_mobile_menu_fix';
    mobileMenuStyle.textContent = [
      '@media (max-width: 768px) {',
      '  .nav-links {',
      '    position: fixed !important;',
      '    top: 0 !important;',
      '    right: -100% !important;',
      '    left: auto !important;',
      '    width: 280px !important;',
      '    max-width: 85vw !important;',
      '    height: 100vh !important;',
      '    background: #0a0e27 !important;',
      '    backdrop-filter: none !important;',
      '    -webkit-backdrop-filter: none !important;',
      '    display: flex !important;',
      '    flex-direction: column !important;',
      '    justify-content: center !important;',
      '    align-items: flex-start !important;',
      '    padding: 2rem 1.5rem !important;',
      '    gap: 0 !important;',
      '    z-index: 1001 !important;',
      '    transition: right 0.3s ease !important;',
      '    transform: none !important;',
      '    box-shadow: -4px 0 40px rgba(0,0,0,0.7) !important;',
      '    border-left: 1px solid rgba(255,255,255,0.08) !important;',
      '    list-style: none !important;',
      '    margin: 0 !important;',
      '  }',
      '  .nav-links.active {',
      '    right: 0 !important;',
      '    transform: none !important;',
      '  }',
      '  .nav-links li { width: 100%; }',
      '  .nav-links a {',
      '    display: block !important;',
      '    padding: 1rem 0.5rem !important;',
      '    font-size: 1rem !important;',
      '    font-weight: 600 !important;',
      '    letter-spacing: 0.1em !important;',
      '    color: #fff !important;',
      '    text-decoration: none !important;',
      '    border-bottom: 1px solid rgba(255,255,255,0.07) !important;',
      '    transition: color 0.2s, padding-left 0.2s !important;',
      '    text-transform: uppercase !important;',
      '  }',
      '  .nav-links a:hover,',
      '  .nav-links a.active {',
      '    color: #f97316 !important;',
      '    padding-left: 0.75rem !important;',
      '  }',
      '}'
    ].join('\n');
    document.head.appendChild(mobileMenuStyle);

    /* ===== Overlay ===== */
    var overlay = document.createElement('div');
    overlay.id = '_nav_overlay';
    overlay.style.cssText = [
      'display:none',
      'position:fixed',
      'top:0',
      'left:0',
      'width:100%',
      'height:100%',
      'background:rgba(0,0,0,0.6)',
      'z-index:1000',
      'backdrop-filter:none',
      '-webkit-backdrop-filter:none'
    ].join(';');
    document.body.appendChild(overlay);

    function openMenu() {
      if (hamburger) hamburger.classList.add('active');
      if (navLinks)  navLinks.classList.add('active');
      overlay.style.display = 'block';
      document.body.style.overflow = 'hidden';
    }

    function closeMenu() {
      if (hamburger) hamburger.classList.remove('active');
      if (navLinks)  navLinks.classList.remove('active');
      overlay.style.display = 'none';
      document.body.style.overflow = '';
    }

    overlay.addEventListener('click', closeMenu);

    /* ===== CORRECTION 2 : Anti double-déclenchement touch+click ===== */
    var _menuLastToggle = 0;

    function toggleMenu(e) {
      e.preventDefault();
      e.stopPropagation();
      var now = Date.now();
      if (now - _menuLastToggle < 400) return;
      _menuLastToggle = now;
      if (hamburger && hamburger.classList.contains('active')) {
        closeMenu();
      } else {
        openMenu();
      }
    }

    if (hamburger) {
      hamburger.addEventListener('touchstart', toggleMenu, { passive: false });
      hamburger.addEventListener('click', toggleMenu);
    }

    /* =====================================================
       CORRECTION 3 : Clic sur lien => scroll vers section
    ===================================================== */
    navLinksItems.forEach(function (link) {
      link.addEventListener('click', function (e) {
        var href = link.getAttribute('href');
        if (href && href.charAt(0) === '#') {
          e.preventDefault();
          closeMenu();
          var targetId = href.slice(1);
          var target   = document.getElementById(targetId);
          if (target) {
            setTimeout(function () {
              var headerH = header ? header.offsetHeight : 70;
              var top = target.getBoundingClientRect().top + window.pageYOffset - headerH;
              window.scrollTo({ top: top, behavior: 'smooth' });
            }, 320);
          }
        } else {
          closeMenu();
        }
      });
    });

    /* Fermer si on passe en mode desktop */
    window.addEventListener('resize', function () {
      if (window.innerWidth > 768) closeMenu();
    });

    /* ===== Utilitaires ===== */
    function sanitizeInput(input, maxLen) {
      maxLen = maxLen || 2000;
      var raw = String(input).trim().slice(0, maxLen * 2);
      var div = document.createElement('div');
      div.textContent = raw;
      return div.textContent.slice(0, maxLen);
    }

    function isValidEmail(email) {
      return /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/.test(email)
        && email.length <= 254
        && !email.includes('..');
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
      var types = { success: true, error: true, info: true };
      type = types[type] ? type : 'info';
      var box = document.createElement('div');
      box.className = 'notification notification-' + type;
      var icon = document.createElement('i');
      icon.className = 'fas ' + (
        type === 'success' ? 'fa-check-circle' :
        type === 'error'   ? 'fa-exclamation-circle' : 'fa-info-circle'
      );
      var txt = document.createElement('span');
      txt.textContent = String(message).slice(0, 200);
      box.appendChild(icon);
      box.appendChild(txt);
      document.body.appendChild(box);
      setTimeout(function () { box.classList.add('show'); }, 10);
      setTimeout(function () {
        box.classList.remove('show');
        setTimeout(function () { box.remove(); }, 300);
      }, 5000);
    }

    /* ===== Scroll header ===== */
    window.addEventListener('scroll', function () {
      var s = window.pageYOffset;
      if (header)    header.classList.toggle('scrolled', s > 100);
      if (backToTop) backToTop.classList.toggle('visible', s > 300);
    });

    if (backToTop) {
      backToTop.addEventListener('click', function () {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }

    /* ===== Active nav link au scroll ===== */
    var sections = document.querySelectorAll('section[id]');

    function escapeSel(str) {
      return str.replace(/([^\w-])/g, '\\$1');
    }

    function activateNavLink() {
      var scrollY = window.pageYOffset;
      sections.forEach(function (section) {
        var top = section.offsetTop - 120;
        var id  = section.getAttribute('id');
        var lnk = document.querySelector('.nav-links a[href="#' + escapeSel(id) + '"]');
        if (scrollY >= top && scrollY < top + section.offsetHeight) {
          navLinksItems.forEach(function (i) { i.classList.remove('active'); });
          if (lnk) lnk.classList.add('active');
        }
      });
    }
    window.addEventListener('scroll', activateNavLink);

    /* ===== Scroll animations ===== */
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          requestAnimationFrame(function () {
            entry.target.style.opacity   = '1';
            entry.target.style.transform = 'translateY(0)';
          });
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.01, rootMargin: '0px 0px -50px' });

    document.querySelectorAll('.skill-category, .projet-card, .stat, .contact-method').forEach(function (el) {
      el.style.opacity    = '0';
      el.style.transform  = 'translateY(5px)';
      el.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
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

    /* ===== Compteur stats ===== */
    var statsObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target.querySelector('.stat-number');
        if (!el || entry.target.dataset.animated) return;
        var text = el.textContent || '';
        var num  = parseInt(text.replace(/\D/g, ''), 10);
        if (isNaN(num) || num <= 0) return;
        entry.target.dataset.animated = 'true';
        var cur = 0, inc = num / 30;
        var isPct = text.indexOf('%') !== -1;
        var t = setInterval(function () {
          cur += inc;
          if (cur >= num) { cur = num; clearInterval(t); }
          el.textContent = isPct ? Math.floor(cur) + '%' : Math.floor(cur) + '+';
        }, 40);
      });
    }, { threshold: 0.5 });
    document.querySelectorAll('.stat').forEach(function (s) { statsObserver.observe(s); });

    /* ===== CV download ===== */
    var cvDownloadBtn = document.querySelector('.btn-cv-download');
    if (cvDownloadBtn) {
      cvDownloadBtn.addEventListener('click', function () {
        showNotification('Téléchargement du CV en cours…', 'info');
      });
    }

    /* =====================================================
       CORRECTION 4 : CV "Consulter en ligne" — ouvre dans
       un nouvel onglet sans déclencher le téléchargement
    ===================================================== */
    var cvViewBtn = document.querySelector('.btn-cv-view');
    if (cvViewBtn) {
      cvViewBtn.addEventListener('click', function (e) {
        e.preventDefault();
        var href = cvViewBtn.getAttribute('href');
        if (href) {
          window.open(href, '_blank', 'noopener,noreferrer');
        }
      });
    }

    /* ===== Formulaire de contact ===== */
    if (contactForm) {
      var honeypot = document.createElement('input');
      honeypot.type = 'text'; honeypot.name = 'website';
      honeypot.style.cssText = 'position:absolute;left:-9999px;opacity:0;height:0;width:0;';
      honeypot.tabIndex = -1; honeypot.autocomplete = 'off';
      honeypot.setAttribute('aria-hidden', 'true');
      contactForm.appendChild(honeypot);

      function getSubmitData() {
        try { return JSON.parse(sessionStorage.getItem('_sf') || '{}'); } catch (e) { return {}; }
      }
      function setSubmitData(data) {
        try { sessionStorage.setItem('_sf', JSON.stringify(data)); } catch (e) {}
      }
      function isRateLimited() {
        var data = getSubmitData(), now = Date.now();
        var count = data.count || 0, lockUntil = data.lockUntil || 0;
        if (now < lockUntil) {
          showNotification('Trop de tentatives. Réessayez dans ' + Math.ceil((lockUntil - now) / 1000) + 's.', 'error');
          return true;
        }
        if (now - (data.firstAt || 0) > 600000) { setSubmitData({ count: 0, firstAt: now }); return false; }
        if (count >= 3) {
          setSubmitData({ count: count, firstAt: data.firstAt, lockUntil: now + 120000 });
          showNotification('Limite atteinte. Réessayez dans 2 minutes.', 'error');
          return true;
        }
        return false;
      }
      function incrementCount() {
        var data = getSubmitData(), now = Date.now();
        setSubmitData({ count: (data.count || 0) + 1, firstAt: data.firstAt || now, lockUntil: data.lockUntil || 0 });
      }

      contactForm.addEventListener('submit', function (e) {
        e.preventDefault();
        clearFieldErrors();
        if (honeypot.value) return;
        if (isRateLimited()) return;
        var name    = sanitizeInput(document.getElementById('name').value,    100);
        var email   = sanitizeInput(document.getElementById('email').value,   254);
        var phone   = sanitizeInput(document.getElementById('phone').value,    20);
        var message = sanitizeInput(document.getElementById('message').value, 2000);
        var hasError = false;
        if (name.length < 2)      { showFieldError('error-name',    'Le nom doit contenir au moins 2 caractères.'); hasError = true; }
        if (!isValidEmail(email)) { showFieldError('error-email',   'Adresse email invalide.'); hasError = true; }
        if (phone && !/^\+?[0-9]{8,20}$/.test(phone)) { showFieldError('error-phone', 'Numéro invalide (8 à 20 chiffres).'); hasError = true; }
        if (message.length < 10)  { showFieldError('error-message', 'Le message doit contenir au moins 10 caractères.'); hasError = true; }
        if (hasError) return;
        var submitBtn = contactForm.querySelector('.btn-submit');
        var originalHTML = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Envoi en cours…';
        fetch(API_URL + '/api/contact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: name, email: email, phone: phone, message: message })
        })
        .then(function (r) { return r.json().then(function (d) { return { status: r.status, data: d }; }); })
        .then(function (result) {
          if (result.status === 200 && result.data.success) {
            incrementCount();
            showNotification('Message envoyé ! Je vous répondrai bientôt.', 'success');
            contactForm.reset();
            submitBtn.innerHTML = '<i class="fas fa-check"></i> Envoyé !';
            submitBtn.style.background = '#10B981';
            setTimeout(function () {
              submitBtn.disabled = false; submitBtn.innerHTML = originalHTML; submitBtn.style.background = '';
            }, 3000);
          } else {
            showNotification(result.data.error || "Erreur lors de l'envoi.", 'error');
            submitBtn.disabled = false; submitBtn.innerHTML = originalHTML;
          }
        })
        .catch(function () {
          showNotification('Erreur réseau. Vérifiez votre connexion.', 'error');
          submitBtn.disabled = false; submitBtn.innerHTML = originalHTML;
        });
      });

      var nameInput = document.getElementById('name');
      if (nameInput) {
        nameInput.addEventListener('blur', function () {
          this.style.borderColor = (this.value.trim().length > 0 && this.value.trim().length < 2) ? '#EF4444' : '';
        });
      }
      var emailInput = document.getElementById('email');
      if (emailInput) {
        emailInput.addEventListener('blur', function () {
          this.style.borderColor = (this.value.trim() && !isValidEmail(this.value.trim())) ? '#EF4444' : '';
        });
      }
      var messageInput = document.getElementById('message');
      if (messageInput) {
        messageInput.addEventListener('input', function () {
          var len = this.value.length, maxLen = 2000;
          var counter = this.parentElement.querySelector('.char-counter');
          if (!counter) {
            counter = document.createElement('div');
            counter.className = 'char-counter';
            this.parentElement.appendChild(counter);
          }
          counter.textContent = len + ' / ' + maxLen + ' caractères';
          if (len > maxLen)            { counter.style.color = '#EF4444'; this.style.borderColor = '#EF4444'; }
          else if (len > maxLen * 0.9) { counter.style.color = '#F59E0B'; this.style.borderColor = ''; }
          else                         { counter.style.color = '#6B7280'; this.style.borderColor = ''; }
        });
      }
    }

    /* ===== Newsletter ===== */
    var newsletterForm = document.querySelector('.newsletter-form');
    if (newsletterForm) {
      var nlSent = false;
      newsletterForm.addEventListener('submit', function (e) {
        e.preventDefault();
        if (nlSent) { showNotification('Vous êtes déjà inscrit(e). Merci !', 'info'); return; }
        var emailInput = newsletterForm.querySelector('input[type="email"]');
        var email = sanitizeInput(emailInput.value, 254);
        if (!email || !isValidEmail(email)) { showNotification('Veuillez entrer une adresse email valide.', 'error'); return; }
        var btn = newsletterForm.querySelector('button'), orig = btn.innerHTML;
        var sp = document.createElement('i'); sp.className = 'fas fa-spinner fa-spin';
        btn.innerHTML = ''; btn.appendChild(sp); btn.disabled = true;
        setTimeout(function () {
          showNotification('Inscription réussie ! Merci.', 'success');
          emailInput.value = ''; btn.innerHTML = orig; btn.disabled = false; nlSent = true;
        }, 1000);
      });
    }

    /* ===== Bouton "Voir mes projets" ===== */
    var voirProjetsBtn = Array.from(document.querySelectorAll('a, button')).find(function (el) {
      return el.textContent.trim().indexOf('Voir mes projets') !== -1;
    });
    if (voirProjetsBtn) {
      voirProjetsBtn.addEventListener('click', function (e) {
        var href = voirProjetsBtn.getAttribute('href');
        if (!href || href === '#projets') {
          e.preventDefault();
          var s = document.getElementById('projets');
          if (s) s.scrollIntoView({ behavior: 'smooth' });
        }
      });
    }

    /* ===== Styles notification ===== */
    activateNavLink();

    if (!document.getElementById('_notif_styles')) {
      var style = document.createElement('style');
      style.id  = '_notif_styles';
      style.textContent = [
        '.notification{position:fixed;top:-100px;right:20px;background:rgba(10,14,39,.97);color:#fff;',
        'padding:1rem 1.5rem;border-radius:12px;box-shadow:0 8px 32px rgba(0,0,0,.5);',
        'display:flex;align-items:center;gap:.75rem;z-index:10000;min-width:300px;max-width:500px;',
        'transition:transform .3s cubic-bezier(.4,0,.2,1);border:1px solid rgba(255,255,255,.1);}',
        '.notification.show{transform:translateY(120px);}',
        '.notification-success{border-left:4px solid #10B981;}',
        '.notification-error{border-left:4px solid #EF4444;}',
        '.notification-info{border-left:4px solid #00D9FF;}',
        '.notification i{font-size:1.25rem;}',
        '.notification-success i{color:#10B981;}',
        '.notification-error i{color:#EF4444;}',
        '.notification-info i{color:#00D9FF;}',
        '.notification span{flex:1;font-weight:500;}',
        '.char-counter{font-size:.875rem;color:#6B7280;margin-top:.5rem;text-align:right;}',
        '@media(max-width:768px){.notification{right:10px;left:10px;min-width:auto;}}'
      ].join('');
      document.head.appendChild(style);
    }

  });

})();