// ===== PORTFOLIO - VERSION SÉCURISÉE =====

// === PROTECTION IMMÉDIATE ===
(function() {
  // Bloquer le clic droit sur tout le site
  document.addEventListener('contextmenu', function(e) {
    e.preventDefault();
  });

  // Bloquer l'accès au code source
  document.addEventListener('keydown', function(e) {
    // Bloquer F12
    if (e.key === 'F12') {
      e.preventDefault();
      return false;
    }
    // Bloquer Ctrl+U (view source)
    if (e.ctrlKey && e.key === 'u') {
      e.preventDefault();
      return false;
    }
    // Bloquer Ctrl+Shift+I (dev tools)
    if (e.ctrlKey && e.shiftKey && e.key === 'I') {
      e.preventDefault();
      return false;
    }
    // Bloquer Ctrl+Shift+J (console)
    if (e.ctrlKey && e.shiftKey && e.key === 'J') {
      e.preventDefault();
      return false;
    }
    // Bloquer Ctrl+Shift+C (inspect element)
    if (e.ctrlKey && e.shiftKey && e.key === 'C') {
      e.preventDefault();
      return false;
    }
    // Ctrl+Shift+P = Rediriger vers admin (seul accès autorisé)
    if (e.ctrlKey && e.shiftKey && e.key === 'P') {
      e.preventDefault();
      window.location.href = 'admin/index.html';
      return false;
    }
  });

  // Empêcher la sélection de texte (optionnel mais renforcé)
  document.addEventListener('selectstart', function(e) {
    e.preventDefault();
  });

  // Empêcher le drag and drop d'éléments
  document.addEventListener('dragstart', function(e) {
    e.preventDefault();
  });
})();
// === VARIABLES GLOBALES ===
let db;

// === ÉLÉMENTS DU DOM ===
const header = document.querySelector('header');
const hamburger = document.querySelector('.hamburger');
const navLinks = document.querySelector('.nav-links');
const backToTop = document.querySelector('.back-to-top');
const navLinksItems = document.querySelectorAll('.nav-links a');
const contactForm = document.getElementById('contactForm');

// === INITIALISATION FIREBASE ===
function initializeFirebase() {
  try {
    if (typeof firebase === 'undefined') {
      console.error('Firebase SDK non chargé !');
      return false;
    }

    if (!firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
    }

    db = firebase.database();
    console.log('✅ Firebase initialisé');
    return true;
  } catch (error) {
    console.error('❌ Erreur Firebase:', error);
    return false;
  }
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
let lastScroll = 0;

window.addEventListener('scroll', function() {
  const currentScroll = window.pageYOffset;
  
  if (currentScroll > 100) {
    header.classList.add('scrolled');
  } else {
    header.classList.remove('scrolled');
  }
  
  if (currentScroll > 300) {
    backToTop.classList.add('visible');
  } else {
    backToTop.classList.remove('visible');
  }
  
  lastScroll = currentScroll;
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
    const sectionHeight = section.offsetHeight;
    const sectionTop = section.offsetTop - 100;
    const sectionId = section.getAttribute('id');
    const link = document.querySelector('.nav-links a[href="#' + sectionId + '"]');
    
    if (scrollY > sectionTop && scrollY <= sectionTop + sectionHeight) {
      navLinksItems.forEach(function(item) {
        item.classList.remove('active');
      });
      if (link) link.classList.add('active');
    }
  });
}

window.addEventListener('scroll', activateNavLink);

// === ANIMATIONS ===
const observerOptions = {
  threshold: 0.01,
  rootMargin: '0px 0px -50px'
};

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
}, observerOptions);

const animatedElements = document.querySelectorAll('.skill-category, .projet-card, .stat, .contact-method');
animatedElements.forEach(function(el) {
  el.style.opacity = '0';
  el.style.transform = 'translateY(5px)';
  el.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
  observer.observe(el);
});

// === UTILITAIRES ===
function showNotification(message, type = 'success') {
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.innerHTML = `
    <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
    <span>${message}</span>
  `;
  
  document.body.appendChild(notification);
  setTimeout(() => notification.classList.add('show'), 10);
  setTimeout(() => {
    notification.classList.remove('show');
    setTimeout(() => notification.remove(), 300);
  }, 5000);
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function sanitizeInput(input) {
  const div = document.createElement('div');
  div.textContent = input;
  return div.innerHTML;
}

// === FORMULAIRE DE CONTACT ===
if (contactForm) {
  // Initialiser Firebase immédiatement
  window.addEventListener('DOMContentLoaded', function() {
    console.log('🔄 Initialisation Firebase...');
    if (firebaseConfig.apiKey !== 'VOTRE_API_KEY') {
      initializeFirebase();
    }
  });
  
  contactForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    // Récupérer les valeurs
    const name = document.getElementById('name').value.trim();
    const email = document.getElementById('email').value.trim();
    const message = document.getElementById('message').value.trim();
    
    // Validation
    if (!name || name.length < 2) {
      showNotification('Le nom doit contenir au moins 2 caractères', 'error');
      return;
    }
    
    if (!email || !isValidEmail(email)) {
      showNotification('Veuillez entrer une adresse email valide', 'error');
      return;
    }
    
    if (!message || message.length < 10) {
      showNotification('Le message doit contenir au moins 10 caractères', 'error');
      return;
    }
    
    if (message.length > 2000) {
      showNotification('Le message ne peut pas dépasser 2000 caractères', 'error');
      return;
    }
    
    // Vérifier Firebase
    if (firebaseConfig.apiKey === 'VOTRE_API_KEY') {
      showNotification('Erreur : Firebase non configuré. Consultez le README.', 'error');
      return;
    }
    
    if (!db) {
      if (!initializeFirebase()) {
        showNotification('Erreur : Impossible de se connecter à Firebase', 'error');
        return;
      }
    }
    
    // Désactiver le bouton
    const submitBtn = contactForm.querySelector('.btn-submit');
    const originalHTML = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Envoi en cours...';
    
    try {
      // Créer le message
      const messageData = {
        name: sanitizeInput(name),
        email: sanitizeInput(email),
        message: sanitizeInput(message),
        date: new Date().toISOString(),
        read: false
      };
      
      // Envoyer à Firebase
      await db.ref('messages').push(messageData);
      
      // Succès
      showNotification('✓ Message envoyé avec succès ! Je vous répondrai bientôt.', 'success');
      contactForm.reset();
      
      // Animation succès
      submitBtn.innerHTML = '<i class="fas fa-check"></i> Message envoyé !';
      submitBtn.style.background = '#10B981';
      
      setTimeout(() => {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalHTML;
        submitBtn.style.background = '';
      }, 3000);
      
    } catch (error) {
      console.error('Erreur:', error);
      showNotification('Erreur lors de l\'envoi. Réessayez.', 'error');
      
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalHTML;
    }
  });
  
  // Validation en temps réel
  const nameInput = document.getElementById('name');
  const emailInput = document.getElementById('email');
  const messageInput = document.getElementById('message');
  
  if (nameInput) {
    nameInput.addEventListener('blur', function() {
      if (this.value.trim() && this.value.trim().length < 2) {
        this.style.borderColor = '#EF4444';
      } else {
        this.style.borderColor = '';
      }
    });
  }
  
  if (emailInput) {
    emailInput.addEventListener('blur', function() {
      if (this.value.trim() && !isValidEmail(this.value.trim())) {
        this.style.borderColor = '#EF4444';
      } else {
        this.style.borderColor = '';
      }
    });
  }
  
  if (messageInput) {
    messageInput.addEventListener('input', function() {
      const length = this.value.length;
      const maxLength = 2000;
      
      let counter = this.parentElement.querySelector('.char-counter');
      if (!counter) {
        counter = document.createElement('div');
        counter.className = 'char-counter';
        this.parentElement.appendChild(counter);
      }
      
      counter.textContent = `${length} / ${maxLength} caractères`;
      
      if (length > maxLength) {
        counter.style.color = '#EF4444';
        this.style.borderColor = '#EF4444';
      } else if (length > maxLength * 0.9) {
        counter.style.color = '#F59E0B';
        this.style.borderColor = '';
      } else {
        counter.style.color = '#6B7280';
        this.style.borderColor = '';
      }
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
      showNotification('Veuillez entrer une adresse email valide', 'error');
      return;
    }
    
    const btn = newsletterForm.querySelector('button');
    const originalHTML = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    
    setTimeout(() => {
      showNotification('✓ Inscription réussie ! Merci.', 'success');
      emailInput.value = '';
      btn.innerHTML = originalHTML;
    }, 1000);
  });
}

// === COMPTEURS ANIMÉS ===
const statsObserver = new IntersectionObserver(function(entries) {
  entries.forEach(function(entry) {
    if (entry.isIntersecting) {
      const statNumber = entry.target.querySelector('.stat-number');
      const text = statNumber.textContent;
      const number = parseInt(text.replace(/\D/g, ''));
      
      if (number && !entry.target.dataset.animated) {
        entry.target.dataset.animated = 'true';
        
        let current = 0;
        const increment = number / 30;
        const isPercentage = text.indexOf('%') !== -1;
        
        const timer = setInterval(function() {
          current += increment;
          if (current >= number) {
            current = number;
            clearInterval(timer);
          }
          statNumber.textContent = isPercentage ? Math.floor(current) + '%' : Math.floor(current) + '+';
        }, 40);
      }
    }
  });
}, { threshold: 0.5 });

document.querySelectorAll('.stat').forEach(function(stat) {
  statsObserver.observe(stat);
});

// === PROTECTION SPAM ===
let submissionCount = parseInt(sessionStorage.getItem('submissionCount') || '0');
const MAX_SUBMISSIONS = 3;

if (contactForm) {
  contactForm.addEventListener('submit', function(e) {
    if (submissionCount >= MAX_SUBMISSIONS) {
      e.preventDefault();
      showNotification('Limite de soumissions atteinte. Réessayez plus tard.', 'error');
      return false;
    }
    
    submissionCount++;
    sessionStorage.setItem('submissionCount', submissionCount.toString());
  }, true);
}

// === HONEYPOT ===
if (contactForm) {
  const honeypot = document.createElement('input');
  honeypot.type = 'text';
  honeypot.name = 'website';
  honeypot.style.display = 'none';
  honeypot.tabIndex = -1;
  honeypot.autocomplete = 'off';
  contactForm.appendChild(honeypot);
  
  contactForm.addEventListener('submit', function(e) {
    if (honeypot.value) {
      e.preventDefault();
      console.log('Bot détecté');
      return false;
    }
  }, true);
}

// === INITIALISATION ===
document.addEventListener('DOMContentLoaded', function() {
  console.log('✅ Portfolio chargé');
  activateNavLink();
  
  // Styles pour notifications
  if (!document.getElementById('notification-styles')) {
    const style = document.createElement('style');
    style.id = 'notification-styles';
    style.textContent = `
      .notification {
        position: fixed;
        top: -100px;
        right: 20px;
        background: rgba(10, 14, 39, 0.95);
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 12px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        gap: 0.75rem;
        z-index: 10000;
        min-width: 300px;
        max-width: 500px;
        transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        border: 1px solid rgba(255, 255, 255, 0.1);
        backdrop-filter: blur(20px);
      }
      
      .notification.show {
        transform: translateY(120px);
      }
      
      .notification-success {
        border-left: 4px solid #10B981;
      }
      
      .notification-error {
        border-left: 4px solid #EF4444;
      }
      
      .notification-info {
        border-left: 4px solid #00D9FF;
      }
      
      .notification i {
        font-size: 1.25rem;
      }
      
      .notification-success i {
        color: #10B981;
      }
      
      .notification-error i {
        color: #EF4444;
      }
      
      .notification-info i {
        color: #00D9FF;
      }
      
      .notification span {
        flex: 1;
        font-weight: 500;
      }
      
      .char-counter {
        font-size: 0.875rem;
        color: #6B7280;
        margin-top: 0.5rem;
        text-align: right;
      }
      
      @media (max-width: 768px) {
        .notification {
          right: 10px;
          left: 10px;
          min-width: auto;
        }
      }
    `;
    document.head.appendChild(style);
  }
});

console.log('✅ Portfolio initialisé (version Firebase)');
console.log('⚠️ N\'oubliez pas de configurer Firebase !');
