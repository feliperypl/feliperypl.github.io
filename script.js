(() => {
  'use strict';

  const DESKTOP_BREAKPOINT = 1024;
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasFinePointer = window.matchMedia('(pointer: fine)').matches;

  /* ========================================================================
     1. INTERSECTION OBSERVER — ANIMAÇÕES DE ENTRADA (.reveal)
     ======================================================================== */
  function initRevealObserver() {
    const targets = document.querySelectorAll('.reveal');
    if (!targets.length) return;

    if (prefersReducedMotion || !('IntersectionObserver' in window)) {
      targets.forEach((el) => el.classList.add('is-visible'));
      return;
    }

    const observer = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            obs.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.12,
        rootMargin: '0px 0px -48px 0px'
      }
    );

    targets.forEach((el) => observer.observe(el));
  }

  /* ========================================================================
     2. TRILHO HORIZONTAL STICKY VINCULADO AO SCROLL (DESKTOP)
     ======================================================================== */
  function initHorizontalProjects() {
    const section = document.getElementById('projetos');
    const viewport = document.getElementById('projectsViewport');
    const track = document.getElementById('projectsTrack');
    const progressBar = document.getElementById('projectsProgressBar');
    const counter = document.getElementById('projectsCounter');
    const tabs = Array.from(document.querySelectorAll('.slide-tab'));
    const slides = Array.from(document.querySelectorAll('.project-slide'));

    if (!section || !viewport || !track || !slides.length) return;

    let isDesktop = window.innerWidth > DESKTOP_BREAKPOINT;
    let maxTranslate = 0;
    let scrollDistance = 0;
    let targetProgress = 0;
    let currentProgress = 0;
    let rafId = null;
    let activeSlideIndex = 0;

    function clamp(val, min, max) {
      return Math.min(Math.max(val, min), max);
    }

    function updateMetrics() {
      isDesktop = window.innerWidth > DESKTOP_BREAKPOINT;

      if (!isDesktop) {
        section.style.height = '';
        track.style.transform = '';
        if (progressBar) progressBar.style.transform = 'scaleX(0)';
        cancelAnimationFrame(rafId);
        rafId = null;
        return;
      }

      // Garante medição exata da largura horizontal total
      maxTranslate = Math.max(0, track.scrollWidth - viewport.clientWidth);
      // Multiplicador 1.05 dá uma cadência editorial firme e confortável
      scrollDistance = Math.round(maxTranslate * 1.05);
      section.style.height = `${window.innerHeight + scrollDistance}px`;

      syncTargetFromScroll();
      applyTransform(targetProgress);
    }

    function syncTargetFromScroll() {
      if (!isDesktop || scrollDistance <= 0) return;
      const rect = section.getBoundingClientRect();
      const scrolled = -rect.top;
      targetProgress = clamp(scrolled / scrollDistance, 0, 1);
    }

    function updateSlideIndicators(progress) {
      const idx = clamp(Math.round(progress * (slides.length - 1)), 0, slides.length - 1);
      if (idx === activeSlideIndex) return;
      activeSlideIndex = idx;

      if (counter) {
        counter.textContent = `0${idx + 1} / 0${slides.length}`;
      }

      tabs.forEach((tab, i) => {
        const active = i === idx;
        tab.classList.toggle('is-active', active);
        tab.setAttribute('aria-selected', String(active));
      });
    }

    function applyTransform(progress) {
      const x = -(progress * maxTranslate);
      track.style.transform = `translate3d(${x.toFixed(2)}px, 0, 0)`;

      if (progressBar) {
        progressBar.style.transform = `scaleX(${progress.toFixed(4)})`;
      }

      updateSlideIndicators(progress);
    }

    function animate() {
      if (!isDesktop) {
        rafId = null;
        return;
      }

      if (prefersReducedMotion) {
        currentProgress = targetProgress;
        applyTransform(currentProgress);
        rafId = null;
        return;
      }

      const diff = targetProgress - currentProgress;
      if (Math.abs(diff) < 0.0004) {
        currentProgress = targetProgress;
        applyTransform(currentProgress);
        rafId = null;
        return;
      }

      currentProgress += diff * 0.14;
      applyTransform(currentProgress);
      rafId = requestAnimationFrame(animate);
    }

    function onScroll() {
      if (!isDesktop) return;
      syncTargetFromScroll();
      if (!rafId) {
        rafId = requestAnimationFrame(animate);
      }
    }

    // Navegação por clique nas abas 01..04
    function scrollToSlide(index) {
      const safeIndex = clamp(index, 0, slides.length - 1);

      if (!isDesktop) {
        slides[safeIndex].scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth' });
        return;
      }

      const sectionTop = section.getBoundingClientRect().top + window.scrollY;
      const slideRatio = safeIndex / (slides.length - 1);
      const destY = sectionTop + slideRatio * scrollDistance;

      window.scrollTo({
        top: Math.round(destY),
        behavior: prefersReducedMotion ? 'auto' : 'smooth'
      });
    }

    tabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        const idx = Number(tab.dataset.slide);
        if (!Number.isNaN(idx)) scrollToSlide(idx);
      });
    });

    // Atalho por teclado (setas esquerda/direita quando a seção está em foco visual)
    window.addEventListener('keydown', (e) => {
      if (!isDesktop) return;
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;

      const rect = section.getBoundingClientRect();
      const inStickyZone = rect.top <= 10 && rect.bottom >= window.innerHeight - 10;
      if (!inStickyZone) return;

      if (e.key === 'ArrowRight' && activeSlideIndex < slides.length - 1) {
        e.preventDefault();
        scrollToSlide(activeSlideIndex + 1);
      } else if (e.key === 'ArrowLeft' && activeSlideIndex > 0) {
        e.preventDefault();
        scrollToSlide(activeSlideIndex - 1);
      }
    });

    window.addEventListener('scroll', onScroll, { passive: true });

    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(updateMetrics, 120);
    });

    // Inicialização após fontes/layout estabilizarem
    updateMetrics();
    window.addEventListener('load', updateMetrics);
  }

  /* ========================================================================
     3. DETECÇÃO AUTOMÁTICA DE IMAGENS EM /assets/projetos/
     ======================================================================== */
  function initBentoImages() {
    const images = document.querySelectorAll('.bento-img');

    images.forEach((img) => {
      const card = img.closest('.bento-card');
      if (!card) return;

      const revealImage = () => {
        if (img.naturalWidth > 0) {
          card.classList.add('has-loaded-image');
        }
      };

      if (img.complete && img.naturalWidth > 0) {
        revealImage();
      } else {
        img.addEventListener('load', revealImage, { once: true });
        img.addEventListener('error', () => {
          // Mantém o mockup editorial elegante sem ícone de imagem quebrada
          img.style.display = 'none';
        }, { once: true });
      }
    });
  }

  /* ========================================================================
     4. CURSOR CUSTOMIZADO (APENAS @media (pointer: fine))
     ======================================================================== */
  function initCustomCursor() {
    if (!hasFinePointer || prefersReducedMotion) return;

    const dot = document.getElementById('cursorDot');
    const ring = document.getElementById('cursorRing');
    if (!dot || !ring) return;

    const interactiveSelector = 'a, button, .bento-card, .stack-items li, .tag, .hero-portrait-stage';

    let mouseX = -100;
    let mouseY = -100;
    let ringX = -100;
    let ringY = -100;
    let rafId = null;

    function renderCursor() {
      const dx = mouseX - ringX;
      const dy = mouseY - ringY;

      ringX += dx * 0.18;
      ringY += dy * 0.18;

      dot.style.transform = `translate3d(${mouseX}px, ${mouseY}px, 0)`;
      ring.style.transform = `translate3d(${ringX.toFixed(2)}px, ${ringY.toFixed(2)}px, 0)`;

      if (Math.abs(dx) > 0.15 || Math.abs(dy) > 0.15) {
        rafId = requestAnimationFrame(renderCursor);
      } else {
        ringX = mouseX;
        ringY = mouseY;
        ring.style.transform = `translate3d(${ringX}px, ${ringY}px, 0)`;
        rafId = null;
      }
    }

    document.addEventListener('mousemove', (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;

      if (!document.body.classList.contains('cursor-visible')) {
        ringX = mouseX;
        ringY = mouseY;
        document.body.classList.add('cursor-visible');
      }

      if (!rafId) {
        rafId = requestAnimationFrame(renderCursor);
      }
    }, { passive: true });

    document.addEventListener('mouseleave', () => {
      document.body.classList.remove('cursor-visible', 'cursor-hover', 'cursor-pressed');
    });

    document.addEventListener('mouseover', (e) => {
      if (e.target.closest(interactiveSelector)) {
        document.body.classList.add('cursor-hover');
      }
    }, { passive: true });

    document.addEventListener('mouseout', (e) => {
      if (e.target.closest(interactiveSelector)) {
        const next = e.relatedTarget;
        if (!next || !next.closest(interactiveSelector)) {
          document.body.classList.remove('cursor-hover');
        }
      }
    }, { passive: true });

    document.addEventListener('mousedown', () => {
      document.body.classList.add('cursor-pressed');
    }, { passive: true });

    document.addEventListener('mouseup', () => {
      document.body.classList.remove('cursor-pressed');
    }, { passive: true });
  }

  /* ========================================================================
     5. NAVEGAÇÃO ATIVA POR SEÇÃO
     ======================================================================== */
  function initActiveNav() {
    const navLinks = Array.from(document.querySelectorAll('.nav-link[data-section]'));
    if (!navLinks.length) return;

    const sections = navLinks
      .map((link) => document.getElementById(link.dataset.section))
      .filter(Boolean);

    function updateActive() {
      const marker = window.scrollY + window.innerHeight * 0.35;
      let currentId = '';

      sections.forEach((sec) => {
        if (marker >= sec.offsetTop) {
          currentId = sec.id;
        }
      });

      navLinks.forEach((link) => {
        link.classList.toggle('is-active', link.dataset.section === currentId);
      });
    }

    let ticking = false;
    window.addEventListener('scroll', () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        updateActive();
        ticking = false;
      });
    }, { passive: true });

    updateActive();
  }

  /* ========================================================================
     6. COPIAR E-MAIL COM FEEDBACK VISUAL
     ======================================================================== */
  function initCopyEmail() {
    const btn = document.getElementById('copyEmailBtn');
    const label = document.getElementById('copyEmailLabel');
    const feedback = document.getElementById('copyFeedback');
    if (!btn || !label) return;

    const email = btn.dataset.email || 'feliperypl@gmail.com';
    let resetTimer = null;

    async function copyText(text) {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return;
      }

      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.setAttribute('readonly', '');
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      textarea.style.pointerEvents = 'none';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }

    btn.addEventListener('click', async () => {
      try {
        await copyText(email);

        clearTimeout(resetTimer);
        btn.classList.add('is-copied');
        label.textContent = 'Copiado ✓';

        if (feedback) {
          feedback.textContent = 'E-mail copiado para a área de transferência.';
          feedback.classList.add('is-visible');
        }

        resetTimer = setTimeout(() => {
          btn.classList.remove('is-copied');
          label.textContent = 'Copiar e-mail';
          if (feedback) {
            feedback.classList.remove('is-visible');
          }
        }, 2600);
      } catch {
        if (feedback) {
          feedback.textContent = `Copie manualmente: ${email}`;
          feedback.classList.add('is-visible');
        }
      }
    });
  }

  /* ========================================================================
     7. RETRATO EDITORIAL DO HERO (TILT 3D SUTIL, PARALLAX & LUZ ESPECULAR)
     ======================================================================== */
  function initHeroPortrait() {
    if (!hasFinePointer || prefersReducedMotion) return;

    const stage = document.getElementById('heroPortrait');
    if (!stage) return;

    const MAX_TILT = 5.5; // graus
    const MAX_SHIFT = 8;  // pixels

    let targetRx = 0;
    let targetRy = 0;
    let targetPx = 0;
    let targetPy = 0;
    let targetMx = 50;
    let targetMy = 50;

    let currentRx = 0;
    let currentRy = 0;
    let currentPx = 0;
    let currentPy = 0;
    let currentMx = 50;
    let currentMy = 50;

    let rafId = null;
    let isHovering = false;

    function tick() {
      const ease = isHovering ? 0.14 : 0.1;

      currentRx += (targetRx - currentRx) * ease;
      currentRy += (targetRy - currentRy) * ease;
      currentPx += (targetPx - currentPx) * ease;
      currentPy += (targetPy - currentPy) * ease;
      currentMx += (targetMx - currentMx) * 0.18;
      currentMy += (targetMy - currentMy) * 0.18;

      stage.style.setProperty('--rx', `${currentRx.toFixed(2)}deg`);
      stage.style.setProperty('--ry', `${currentRy.toFixed(2)}deg`);
      stage.style.setProperty('--px', `${currentPx.toFixed(2)}px`);
      stage.style.setProperty('--py', `${currentPy.toFixed(2)}px`);
      stage.style.setProperty('--mx', `${currentMx.toFixed(1)}%`);
      stage.style.setProperty('--my', `${currentMy.toFixed(1)}%`);

      const settled =
        Math.abs(targetRx - currentRx) < 0.02 &&
        Math.abs(targetRy - currentRy) < 0.02 &&
        Math.abs(targetPx - currentPx) < 0.05 &&
        Math.abs(targetPy - currentPy) < 0.05;

      if (settled && !isHovering) {
        stage.style.setProperty('--rx', '0deg');
        stage.style.setProperty('--ry', '0deg');
        stage.style.setProperty('--px', '0px');
        stage.style.setProperty('--py', '0px');
        stage.classList.remove('is-tilting');
        rafId = null;
        return;
      }

      rafId = requestAnimationFrame(tick);
    }

    function startLoop() {
      if (!rafId) {
        rafId = requestAnimationFrame(tick);
      }
    }

    stage.addEventListener('pointerenter', () => {
      isHovering = true;
      stage.classList.add('is-tilting');
      startLoop();
    });

    stage.addEventListener('pointermove', (e) => {
      const rect = stage.getBoundingClientRect();
      if (!rect.width || !rect.height) return;

      const normX = Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1);
      const normY = Math.min(Math.max((e.clientY - rect.top) / rect.height, 0), 1);

      // Centro = 0, bordas = -1..+1
      const dx = (normX - 0.5) * 2;
      const dy = (normY - 0.5) * 2;

      targetRx = -dy * MAX_TILT;
      targetRy = dx * MAX_TILT;
      targetPx = -dx * MAX_SHIFT;
      targetPy = -dy * MAX_SHIFT;
      targetMx = normX * 100;
      targetMy = normY * 100;

      startLoop();
    }, { passive: true });

    stage.addEventListener('pointerleave', () => {
      isHovering = false;
      targetRx = 0;
      targetRy = 0;
      targetPx = 0;
      targetPy = 0;
      targetMx = 50;
      targetMy = 50;
      startLoop();
    });
  }

  /* ========================================================================
     INICIALIZAÇÃO
     ======================================================================== */
  document.addEventListener('DOMContentLoaded', () => {
    initRevealObserver();
    initHorizontalProjects();
    initBentoImages();
    initCustomCursor();
    initActiveNav();
    initCopyEmail();
    initHeroPortrait();
  });
})();
