/**
 * ==========================================================================
 * KOCHUMAGIQUE — Floating Vertical Navigation Engine (Phase 4 Integrated)
 * Active Section Tracking + Adaptive Dark/Light Switching + Smooth Scroll
 * ==========================================================================
 */

(function () {
  'use strict';

  // State Management
  const state = {
    activeSectionId: 'home',
    isClickScrolling: false,
    clickScrollTimer: null,
    isDarkTheme: true
  };

  // DOM Elements
  const navContainer = document.getElementById('magique-nav');
  const navCapsule = navContainer ? navContainer.querySelector('.nav-capsule') : null;
  const navLinks = document.querySelectorAll('.nav-link');
  const sections = document.querySelectorAll('[data-nav-section]');

  /**
   * 1. ACTIVE SECTION TRACKING VIA INTERSECTION OBSERVER
   * Targets the optical center corridor (central 40%) to eliminate boundary flicker.
   */
  function initSectionObserver() {
    if (!sections.length) return;

    const observerOptions = {
      root: null,
      rootMargin: '-30% 0px -30% 0px',
      threshold: [0, 0.1, 0.25, 0.5, 0.75, 1.0]
    };

    const sectionEntries = new Map();

    const observer = new IntersectionObserver((entries) => {
      if (state.isClickScrolling) return;

      entries.forEach((entry) => {
        sectionEntries.set(entry.target.id, entry);
      });

      let bestSectionId = null;
      let highestRatio = -1;

      sections.forEach((section) => {
        const entry = sectionEntries.get(section.id);
        if (entry && entry.isIntersecting && entry.intersectionRatio > highestRatio) {
          highestRatio = entry.intersectionRatio;
          bestSectionId = section.id;
        }
      });

      if (!bestSectionId) {
        const midY = window.innerHeight * 0.4;
        sections.forEach((section) => {
          const rect = section.getBoundingClientRect();
          if (rect.top <= midY && rect.bottom >= midY) {
            bestSectionId = section.id;
          }
        });
      }

      if (bestSectionId && bestSectionId !== state.activeSectionId) {
        setActiveSection(bestSectionId);
      }
    }, observerOptions);

    sections.forEach((section) => observer.observe(section));
  }

  /**
   * 2. SET ACTIVE LINK & UPDATE ARIA ATTRIBUTES
   */
  function setActiveSection(sectionId) {
    state.activeSectionId = sectionId;

    // Celebrations & Brookies are artisanal extensions of Baking Showcase
    let activeNavId = sectionId;
    if (sectionId === 'celebrations' || sectionId === 'brookies') {
      activeNavId = 'baking';
    }

    navLinks.forEach((link) => {
      const targetId = link.getAttribute('data-section') || link.getAttribute('href').replace('#', '');
      const isActive = targetId === activeNavId;

      if (isActive) {
        link.classList.add('active');
        link.setAttribute('aria-current', 'page');
      } else {
        link.classList.remove('active');
        link.removeAttribute('aria-current');
      }
    });

    updateThemeForSection(sectionId);
  }

  /**
   * 3. ADAPTIVE THEME SWITCHER (Dark Cinematic vs Ivory Editorial)
   */
  function updateThemeForSection(sectionId) {
    if (!navContainer) return;

    const currentSection = document.getElementById(sectionId);
    if (!currentSection) return;

    const isDark = currentSection.classList.contains('theme-dark-section') || 
                   currentSection.getAttribute('data-theme') === 'dark';

    state.isDarkTheme = isDark;
    const gotoPill = document.getElementById('goto-portal-pill');

    if (isDark) {
      navContainer.classList.add('theme-dark');
      if (gotoPill) {
        gotoPill.classList.remove('theme-light');
        gotoPill.classList.add('theme-dark');
      }
    } else {
      navContainer.classList.remove('theme-dark');
      if (gotoPill) {
        gotoPill.classList.remove('theme-dark');
        gotoPill.classList.add('theme-light');
      }
    }
  }

  /**
   * 4. SMOOTH CLICK SCROLLING WITH LOCK DEBOUNCE
   * Supports all internal anchor links (nav capsule, logo, header, and footer)
   */
  function initClickScrolling() {
    const internalLinks = document.querySelectorAll('a[href^="#"]');
    internalLinks.forEach((link) => {
      link.addEventListener('click', (e) => {
        const href = link.getAttribute('href');
        if (!href || href === '#' || !href.startsWith('#')) return;

        const targetEl = document.querySelector(href);
        if (!targetEl) return;

        e.preventDefault();

        state.isClickScrolling = true;
        clearTimeout(state.clickScrollTimer);

        const targetId = href.replace('#', '');
        setActiveSection(targetId);

        if (window.__magiqueLenis) {
          window.__magiqueLenis.scrollTo(targetId === 'home' ? 0 : targetEl, {
            duration: 1.2
          });
        } else {
          const targetTop = targetId === 'home' ? 0 : (targetEl.getBoundingClientRect().top + window.scrollY);
          window.scrollTo({
            top: targetTop,
            behavior: 'smooth'
          });
        }

        if (history.pushState) {
          history.pushState(null, null, href);
        }

        state.clickScrollTimer = setTimeout(() => {
          state.isClickScrolling = false;
        }, 750);
      });
    });
  }

  /**
   * 5. ACCESSIBLE KEYBOARD NAVIGATION (Arrow Keys & Escape)
   */
  function initKeyboardNavigation() {
    if (!navCapsule) return;

    const linkArray = Array.from(navLinks);

    navCapsule.addEventListener('keydown', (e) => {
      const activeIdx = linkArray.indexOf(document.activeElement);

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const nextIdx = (activeIdx + 1) % linkArray.length;
        linkArray[nextIdx].focus();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const prevIdx = (activeIdx - 1 + linkArray.length) % linkArray.length;
        linkArray[prevIdx].focus();
      } else if (e.key === 'Escape') {
        navCapsule.blur();
        document.activeElement.blur();
      }
    });
  }

  /**
   * 6. SCROLL THEME MONITOR (Backup continuous check)
   */
  function initContinuousThemeCheck() {
    let scrollTimeout;
    window.addEventListener('scroll', () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        if (!state.isClickScrolling) {
          const midY = window.innerHeight * 0.45;
          sections.forEach((sec) => {
            const rect = sec.getBoundingClientRect();
            if (rect.top <= midY && rect.bottom >= midY) {
              updateThemeForSection(sec.id);
            }
          });
        }
      }, 50);
    }, { passive: true });
  }

  /**
   * INITIALIZE ENGINE
   */
  window.addEventListener('DOMContentLoaded', () => {
    initSectionObserver();
    initClickScrolling();
    initKeyboardNavigation();
    initContinuousThemeCheck();

    const initialHash = window.location.hash ? window.location.hash.replace('#', '') : 'home';
    setActiveSection(initialHash);

    console.log('[Kochumagique] Integrated floating navigation engine initialized.');
  });

})();
