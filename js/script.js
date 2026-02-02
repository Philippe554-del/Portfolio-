// ===== PORTFOLIO PHILIPPE HOUNTONDJI - SCRIPT JAVASCRIPT =====

// === ÉLÉMENTS DU DOM ===
const header = document.querySelector('header');
const hamburger = document.querySelector('.hamburger');
const navLinks = document.querySelector('.nav-links');
const backToTop = document.querySelector('.back-to-top');
const navLinksItems = document.querySelectorAll('.nav-links a');

// === NAVIGATION ===
// Ouvrir/fermer le menu hamburger
hamburger.addEventListener('click', function(e) {
  e.preventDefault();
  hamburger.classList.toggle('active');
  navLinks.classList.toggle('active');
});

// Fermer le menu quand on clique sur un lien
navLinksItems.forEach(function(link) {
  link.addEventListener('click', function() {
    hamburger.classList.remove('active');
    navLinks.classList.remove('active');
  });
});

// === SCROLL STICKY HEADER ===
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

// === BACK TO TOP ===
backToTop.addEventListener('click', function() {
  window.scrollTo(0, 0);
});

// === ACTIVE LINK AU SCROLL ===
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
      if (link) {
        link.classList.add('active');
      }
    }
  });
}

window.addEventListener('scroll', activateNavLink);

// === ANIMATIONS SCROLL (instantanées) ===
// Utiliser requestAnimationFrame pour de meilleures performances
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

// Démarrer les animations immédiatement sans délai
const animatedElements = document.querySelectorAll('.skill-category, .projet-card, .stat, .contact-method');
animatedElements.forEach(function(el) {
  el.style.opacity = '0';
  el.style.transform = 'translateY(5px)';
  el.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
  observer.observe(el);
});

// === FORMULAIRE DE CONTACT ===
const contactForm = document.getElementById('contactForm');
if (contactForm) {
  contactForm.addEventListener('submit', function(e) {
    e.preventDefault();
    
    const submitBtn = contactForm.querySelector('.btn-submit');
    submitBtn.innerHTML = '✓ Message envoyé !';
    submitBtn.style.background = '#10B981';
    
    setTimeout(function() {
      contactForm.reset();
      submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Envoyer le message';
      submitBtn.style.background = '';
    }, 3000);
  });
}

// === NEWSLETTER ===
const newsletterForm = document.querySelector('.newsletter-form');
if (newsletterForm) {
  newsletterForm.addEventListener('submit', function(e) {
    e.preventDefault();
    const btn = newsletterForm.querySelector('button');
    btn.innerHTML = '✓';
    setTimeout(function() {
      newsletterForm.querySelector('input').value = '';
      btn.innerHTML = '<i class="fas fa-paper-plane"></i>';
    }, 2000);
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
        const increment = number / 20;
        const isPercentage = text.indexOf('%') !== -1;
        
        const timer = setInterval(function() {
          current += increment;
          if (current >= number) {
            current = number;
            clearInterval(timer);
          }
          statNumber.textContent = isPercentage ? Math.floor(current) + '%' : Math.floor(current) + '+';
        }, 30);
      }
    }
  });
}, { threshold: 0.5 });

document.querySelectorAll('.stat').forEach(function(stat) {
  statsObserver.observe(stat);
});

// === PROTECTION DU CODE SOURCE ===

document.addEventListener('contextmenu', function(e) {
  e.preventDefault();
  return false;
});

document.addEventListener('keydown', function(e) {
  // Bloquer Ctrl+U, F12, Ctrl+Shift+I, etc.
  const blockedKeys = ['u', 'U', 'F12', 's', 'S', 'p', 'P'];
  if (e.ctrlKey || e.metaKey) {
    if (blockedKeys.indexOf(e.key) !== -1) {
      e.preventDefault();
      return false;
    }
  }
  if (e.key === 'F12') {
    e.preventDefault();
    return false;
  }
});

document.addEventListener('dragstart', function(e) {
  e.preventDefault();
  return false;
});

// === AJOUTER STYLES CSS ===
const style = document.createElement('style');
style.textContent = 'body{overflow-x:hidden}';
document.head.appendChild(style);

// === INITIALISATION ===
document.addEventListener('DOMContentLoaded', function() {
  console.log('Portfolio chargé avec succès');
  activateNavLink();
});

