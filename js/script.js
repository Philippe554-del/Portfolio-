// ===== PORTFOLIO - VERSION SÉCURISÉE =====

// === PROTECTION DE BASE ===
(function() {
  document.addEventListener('contextmenu', function(e) { e.preventDefault(); });

  document.addEventListener('keydown', function(e) {
    if (e.key === 'F12') { e.preventDefault(); return false; }
    if (e.ctrlKey && e.key === 'u') { e.preventDefault(); return false; }
    if (e.ctrlKey && e.shiftKey && e.key === 'I') { e.preventDefault(); return false; }
    if (e.ctrlKey && e.shiftKey && e.key === 'J') { e.preventDefault(); return false; }
    if (e.ctrlKey && e.shiftKey && e.key === 'C') { e.preventDefault(); return false; }
    // NOTE: Ctrl+Shift+P ne redirige plus vers admin (faille supprimée)
  });

  document.addEventListener('dragstart', function(e) { e.preventDefault(); });
})();

// === ÉLÉMENTS DU DOM ===
const header       = document.querySelector('header');
const hamburger    = document.querySelector('.hamburger');
const navLinks     = document.querySelector('.nav-links');
const backToTop    = document.querySelector('.back-to-top');
const navLinksItems = document.querySelectorAll('.nav-links a');
const contactForm  = document.getElementById('contactForm');

// === UTILITAIRES ===

function sanitizeInput(input) {
  const div = document.createElement('div');
  div.textContent = String(input).trim();
  return div.textContent;
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function showError(id, msg) {
  const el = document.getElementById(id);
  if (el) el.textContent = msg;
}

function clearErrors() {
  ['error-name', 'error-email', 'error-phone', 'error-message'].forEach(function(id) {
    const el = document.getElementById(id);
    if (el) el.textContent = '';
  });
}

// Notification sécurisée (textContent uniquement — zéro XSS)
function showNotification(message, type) {
  type = type || 'success';
  const notification = document.createElement('div');
  notification.className = 'notification notification-' + type;

  const icon = document.createElement('i');
  icon.className = 'fas ' + (
    type === 'success' ? 'fa-check-circle' :
    type === 'error'   ? 'fa-exclamation-circle' : 'fa-info-circle'
  );

  const span = document.createElement('span');
  span.textContent = message;

  notification.appendChild(icon);
  notification.appendChild(span);
  document.body.appendChild(notification);

  setTimeout(function() { notification.classList.add('show'); }, 10);
  setTimeout(function() {
    notification.classList.remove('show');
    setTimeout(function() { notification.remove(); }, 300);
  }, 5000);
}

// === NAVIGATION ===
if (hamburger) {
  hamburger.addEventListener('click', function(e) {
    e.preventDefault();
    hamburger.classList.toggle('active');
    navLinks.classList.toggle('active');
  });
}

navLinksItems.forEach(function(link) {
  link.addEventListener('click', function() {
    hamburger.classList.remove('active');
    navLinks.classList.remove('active');
  });
});

// === SCROLL ===
window.addEventListener('scroll', function() {
  const s = window.pageYOffset;
  header.classList.toggle('scrolled', s > 100);
  backToTop.classList.toggle('visible', s > 300);
});

if (backToTop) {
  backToTop.addEventListener('click', function() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

// === ACTIVE LINK ===
const sections = document.querySelectorAll('section[id]');

function activateNavLink() {
  const scrollY = window.pageYOffset;
  sections.forEach(function(section) {
    const top = section.offsetTop - 100;
    const id  = section.getAttribute('id');
    const lnk = document.querySelector('.nav-links a[href="#' + id + '"]');
    if (scrollY > top && scrollY <= top + section.offsetHeight) {
      navLinksItems.forEach(function(i) { i.classList.remove('active'); });
      if (lnk) lnk.classList.add('active');
    }
  });
}
window.addEventListener('scroll', activateNavLink);

// === ANIMATIONS ===
const observer = new IntersectionObserver(function(entries) {
  entries.forEach(function(entry) {
    if (entry.isIntersecting) {
      requestAnimationFrame(function() {
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'translateY(0)';
      });
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.01, rootMargin: '0px 0px -50px' });

document.querySelectorAll('.skill-category, .projet-card, .stat, .contact-method').forEach(function(el) {
  el.style.opacity = '0';
  el.style.transform = 'translateY(5px)';
  el.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
  observer.observe(el);
});

// === FORMULAIRE DE CONTACT — InputDev SDK ===
if (contactForm) {

  // Honeypot anti-bot (ajouté dynamiquement, invisible)
  const honeypot = document.createElement('input');
  honeypot.type         = 'text';
  honeypot.name         = 'website';
  honeypot.style.display = 'none';
  honeypot.tabIndex     = -1;
  honeypot.autocomplete = 'off';
  contactForm.appendChild(honeypot);

  // Initialisation du SDK (la clé n'est jamais utilisée côté serveur,
  // InputDev est un service conçu pour les sites statiques — la clé est liée
  // uniquement à ton compte et ne peut pas être utilisée abusivement sans
  // accès à ton dashboard)
  var inputDevSDK = null;
  var INPUT_DEV_KEY = 'grts_xychzmpfx8nzfuplerdq7fc7tfdz';

  function getSDK() {
    if (inputDevSDK) return inputDevSDK;
    if (typeof InputDevSDK !== 'undefined') {
      inputDevSDK = new InputDevSDK();
      return inputDevSDK;
    }
    return null;
  }

  contactForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    clearErrors();

    // Honeypot check (silencieux)
    if (honeypot.value) return false;

    // Anti-spam : limite de soumissions par session
    let count = parseInt(sessionStorage.getItem('submitCount') || '0', 10);
    if (count >= 3) {
      showNotification('Limite atteinte. Réessayez plus tard.', 'error');
      return;
    }

    // Récupération et sanitisation des valeurs
    const name    = sanitizeInput(document.getElementById('name').value);
    const email   = sanitizeInput(document.getElementById('email').value);
    const phone   = sanitizeInput(document.getElementById('phone').value);
    const message = sanitizeInput(document.getElementById('message').value);

    let hasError = false;

    if (name.length < 2) {
      showError('error-name', 'Le nom doit contenir au moins 2 caractères.'); hasError = true;
    } else if (name.length > 100) {
      showError('error-name', 'Le nom ne peut pas dépasser 100 caractères.'); hasError = true;
    }

    if (!isValidEmail(email)) {
      showError('error-email', 'Adresse email invalide.'); hasError = true;
    }

    if (phone && !/^\+?[0-9]{8,20}$/.test(phone)) {
      showError('error-phone', 'Numéro invalide (8 à 20 chiffres).'); hasError = true;
    }

    if (message.length < 10) {
      showError('error-message', 'Le message doit contenir au moins 10 caractères.'); hasError = true;
    } else if (message.length > 2000) {
      showError('error-message', 'Le message ne peut pas dépasser 2000 caractères.'); hasError = true;
    }

    if (hasError) return;

    // Désactiver le bouton
    const submitBtn   = contactForm.querySelector('.btn-submit');
    const originalHTML = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Envoi en cours…';

    try {
      const sdk = getSDK();

      if (sdk) {
        // Envoi via InputDev SDK
        await sdk.submit(INPUT_DEV_KEY, { name, email, phone, message });
      } else {
        // Fallback : mailto si le SDK n'est pas chargé
        const subj = encodeURIComponent('Message de ' + name + ' via portfolio');
        const body = encodeURIComponent(
          'Nom : ' + name + '\nEmail : ' + email +
          (phone ? '\nTéléphone : ' + phone : '') +
          '\n\nMessage :\n' + message
        );
        window.location.href = 'mailto:hountondjiphilippe58@gmail.com?subject=' + subj + '&body=' + body;
      }

      // Succès
      sessionStorage.setItem('submitCount', String(count + 1));
      showNotification('✓ Message envoyé ! Je vous répondrai bientôt.', 'success');
      contactForm.reset();

      submitBtn.innerHTML = '<i class="fas fa-check"></i> Message envoyé !';
      submitBtn.style.background = '#10B981';

      setTimeout(function() {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalHTML;
        submitBtn.style.background = '';
      }, 3000);

    } catch (err) {
      showNotification('Erreur lors de l\'envoi. Veuillez réessayer.', 'error');
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalHTML;
    }
  });

  // Validation visuelle en temps réel
  const nameInput    = document.getElementById('name');
  const emailInput   = document.getElementById('email');
  const messageInput = document.getElementById('message');

  if (nameInput) {
    nameInput.addEventListener('blur', function() {
      this.style.borderColor = (this.value.trim().length > 0 && this.value.trim().length < 2) ? '#EF4444' : '';
    });
  }

  if (emailInput) {
    emailInput.addEventListener('blur', function() {
      this.style.borderColor = (this.value.trim() && !isValidEmail(this.value.trim())) ? '#EF4444' : '';
    });
  }

  if (messageInput) {
    messageInput.addEventListener('input', function() {
      const len    = this.value.length;
      const maxLen = 2000;

      let counter = this.parentElement.querySelector('.char-counter');
      if (!counter) {
        counter = document.createElement('div');
        counter.className = 'char-counter';
        this.parentElement.appendChild(counter);
      }

      counter.textContent = len + ' / ' + maxLen + ' caractères';

      if (len > maxLen)            { counter.style.color = '#EF4444'; this.style.borderColor = '#EF4444'; }
      else if (len > maxLen * 0.9) { counter.style.color = '#F59E0B'; this.style.borderColor = ''; }
      else                          { counter.style.color = '#6B7280'; this.style.borderColor = ''; }
    });
  }
}

// === NEWSLETTER ===
const newsletterForm = document.querySelector('.newsletter-form');
if (newsletterForm) {
  newsletterForm.addEventListener('submit', function(e) {
    e.preventDefault();
    const emailInput = newsletterForm.querySelector('input[type="email"]');
    const email = emailInput.value.trim();

    if (!email || !isValidEmail(email)) {
      showNotification('Veuillez entrer une adresse email valide.', 'error');
      return;
    }

    const btn = newsletterForm.querySelector('button');
    const orig = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

    setTimeout(function() {
      showNotification('✓ Inscription réussie ! Merci.', 'success');
      emailInput.value = '';
      btn.innerHTML = orig;
    }, 1000);
  });
}

// === COMPTEURS ANIMÉS ===
const statsObserver = new IntersectionObserver(function(entries) {
  entries.forEach(function(entry) {
    if (entry.isIntersecting) {
      const el   = entry.target.querySelector('.stat-number');
      const text = el.textContent;
      const num  = parseInt(text.replace(/\D/g, ''), 10);

      if (num && !entry.target.dataset.animated) {
        entry.target.dataset.animated = 'true';
        let cur = 0;
        const inc  = num / 30;
        const isPct = text.indexOf('%') !== -1;

        const t = setInterval(function() {
          cur += inc;
          if (cur >= num) { cur = num; clearInterval(t); }
          el.textContent = isPct ? Math.floor(cur) + '%' : Math.floor(cur) + '+';
        }, 40);
      }
    }
  });
}, { threshold: 0.5 });

document.querySelectorAll('.stat').forEach(function(s) { statsObserver.observe(s); });

// === INITIALISATION ===
document.addEventListener('DOMContentLoaded', function() {
  activateNavLink();

  if (!document.getElementById('notification-styles')) {
    const style = document.createElement('style');
    style.id = 'notification-styles';
    style.textContent = `
      .notification {
        position: fixed; top: -100px; right: 20px;
        background: rgba(10, 14, 39, 0.97);
        color: white; padding: 1rem 1.5rem;
        border-radius: 12px;
        box-shadow: 0 8px 32px rgba(0,0,0,0.5);
        display: flex; align-items: center; gap: 0.75rem;
        z-index: 10000; min-width: 300px; max-width: 500px;
        transition: transform 0.3s cubic-bezier(0.4,0,0.2,1);
        border: 1px solid rgba(255,255,255,0.1);
        backdrop-filter: blur(20px);
      }
      .notification.show    { transform: translateY(120px); }
      .notification-success { border-left: 4px solid #10B981; }
      .notification-error   { border-left: 4px solid #EF4444; }
      .notification-info    { border-left: 4px solid #00D9FF; }
      .notification i       { font-size: 1.25rem; }
      .notification-success i { color: #10B981; }
      .notification-error i   { color: #EF4444; }
      .notification-info i    { color: #00D9FF; }
      .notification span      { flex: 1; font-weight: 500; }
      .char-counter {
        font-size: 0.875rem; color: #6B7280;
        margin-top: 0.5rem; text-align: right;
      }
      @media (max-width: 768px) {
        .notification { right: 10px; left: 10px; min-width: auto; }
      }
    `;
    document.head.appendChild(style);
  }
});