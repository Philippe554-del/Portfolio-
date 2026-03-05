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

    function openMenu() {
      if (hamburger) hamburger.classList.add('active');
      if (navLinks)  navLinks.classList.add('active');
      overlay.style.display = 'block';
    }

    function closeMenu() {
      if (hamburger) hamburger.classList.remove('active');
      if (navLinks)  navLinks.classList.remove('active');
      overlay.style.display = 'none';
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
       SCROLL VERS SECTION — CORRIGÉ POUR LES IDS DU HTML
    ================================================================ */
    function scrollToSection(targetId) {
      if (!targetId || !/^[a-zA-Z0-9_-]+$/.test(targetId)) return;
      var target = document.getElementById(targetId);
      if (!target) return;

      var headerH   = header ? header.getBoundingClientRect().height : 70;
      var targetTop = target.getBoundingClientRect().top + window.pageYOffset - headerH - 10;

      // ✅ S'assure que html ET body ne bloquent pas le scroll
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';

      try {
        window.scrollTo({ top: targetTop, behavior: 'smooth' });
      } catch (e) {
        window.scrollTo(0, targetTop);
      }
    }

    // ✅ LIENS DU MENU MOBILE — CORRIGÉ POUR LES IDS
    function bindMenuLinks() {
      if (!navLinks) return;
      navLinks.querySelectorAll('a[href^="#"]').forEach(function (link) {
        // Clone pour supprimer tout ancien listener résiduel
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

          var idToScrollTo  = targetId;
          var isMenuOpen    = navLinks.classList.contains('active');

          if (isMenuOpen) {
            closeMenu();
            setTimeout(function () {
              scrollToSection(idToScrollTo);
            }, 50);
          } else {
            scrollToSection(idToScrollTo);
          }
        }

        newLink.addEventListener('touchend', function (e) {
          _linkTouchHandled = true;
          handleNavLink(e);
          setTimeout(function () { _linkTouch