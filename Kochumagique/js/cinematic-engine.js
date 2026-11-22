/**
 * ==========================================================================
 * KOCHUMAGIQUE — Triple-Sequence Cinematic Canvas Engine
 * Sequence 1: Chef Reveal Hero (136-Frame Dark Reveal: Hip -> Chest -> Face -> Smile)
 *             Climax: "Kochumagique" Luxury Letter Writing in Last 20 Frames
 * Sequence 2: Brookies Showcase (144-Frame Dark Chocolate Alchemy in Motion)
 * Sequence 3: Celebrations Cake (145-Frame "The Golden Ascent" Ivory Experience)
 * Shared Lenis Smooth Scroll + GSAP ScrollTrigger + High-DPI Adaptive Canvases
 * ==========================================================================
 */

(function () {
  'use strict';

  // Global Infrastructure State
  let lenisInstance = null;
  const isReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const getDevicePixelRatio = () => Math.min(window.devicePixelRatio || 1, 2);

  /**
   * Task 1c: Standard Cover-Fit drawing function with focal point (fx, fy)
   * fx: 0.0 (left) to 1.0 (right)
   * fy: 0.0 (top) to 1.0 (bottom)
   */
  function drawCover(ctx, img, cw, ch, fx = 0.5, fy = 0.5) {
    const ir = img.width / img.height;
    const cr = cw / ch;
    let sw, sh, sx, sy;
    if (cr > ir) {
      sw = img.width;
      sh = sw / cr;
      sx = 0;
      sy = (img.height - sh) * fy;
    } else {
      sh = img.height;
      sw = sh * cr;
      sy = 0;
      sx = (img.width - sw) * fx;
    }
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, cw, ch);
  }

  /**
   * SHARED GLOBAL LENIS SMOOTH SCROLL INTEGRATION
   */
  function initLenis() {
    if (lenisInstance) return lenisInstance;
    
    // Task 1e: Ensure ScrollTrigger ignores mobile resize address bar jumps
    if (typeof ScrollTrigger !== 'undefined') {
      ScrollTrigger.config({ ignoreMobileResize: true });
    }

    if (typeof window.Lenis === 'undefined') {
      console.info('[Kochumagique] Lenis not detected. Using native browser scrolling.');
      return null;
    }

    lenisInstance = new window.Lenis({
      duration: 1.0,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      touchMultiplier: 1.2
    });

    window.__magiqueLenis = lenisInstance;

    lenisInstance.on('scroll', () => {
      if (typeof ScrollTrigger !== 'undefined') {
        ScrollTrigger.update();
      }
    });

    if (typeof gsap !== 'undefined') {
      gsap.ticker.add((time) => {
        lenisInstance.raf(time * 1000);
      });
      gsap.ticker.lagSmoothing(0);
    }

    console.log('[Kochumagique] Shared Lenis smooth scroll synchronized with GSAP ScrollTrigger.');
    return lenisInstance;
  }

  // ==========================================================================
  // SEQUENCE 1: CHEF REVEAL HERO CANVAS CONTROLLER (#home)
  // 136-Frame Sequence: Side Hip -> Chest -> Face & Warm Smile Reveal
  // Climax: "Kochumagique" in Calligraphy Letter Writing Font
  // ==========================================================================
  const ChefSequence = (function () {
    const TOTAL_FRAMES = 136;
    const ASSET_PATHS = {
      desktop: 'assets/chef-reveal/desktop/',
      mobile: 'assets/chef-reveal/mobile/'
    };

    const state = {
      isMobile: window.innerWidth < 768,
      activeTier: window.innerWidth < 768 ? 'mobile' : 'desktop',
      images: [],
      loadedCount: 0,
      currentFrameIndex: 0,
      renderedFrameIndex: -1,
      forceRedraw: true,
      scrollProgress: 0,
      isReady: false,
      hasRenderedFirstFrame: false,
      dpr: getDevicePixelRatio()
    };

    const elements = {
      preloader: document.getElementById('preloader'),
      preloaderBar: document.getElementById('preloader-bar'),
      preloaderPercent: document.getElementById('preloader-percent'),
      canvas: document.getElementById('chef-canvas'),
      scrollContainer: document.getElementById('home'),
      scrollIndicator: document.getElementById('scroll-indicator'),
      brandTop: document.getElementById('brand-pill-top'),
      brandBottom: document.getElementById('brand-pill-bottom'),
      slides: [
        document.getElementById('chef-slide-1'),
        document.getElementById('chef-slide-2'),
        document.getElementById('chef-slide-3')
      ]
    };

    let ctx = null;
    let chefAnim = { frame: 0 };
    let masterTl = null;
    let rafPending = false;
    let safetyTimer = null;

    function init() {
      if (!elements.canvas || !elements.scrollContainer) return;
      ctx = elements.canvas.getContext('2d', { alpha: false });
      initAssetPipeline();
    }

    function initAssetPipeline() {
      const basePath = state.activeTier === 'mobile' ? ASSET_PATHS.mobile : ASSET_PATHS.desktop;
      state.images = new Array(TOTAL_FRAMES);
      state.loadedCount = 0;
      state.renderedFrameIndex = -1;
      state.forceRedraw = true;
      state.hasRenderedFirstFrame = false;

      // Critical initial window (frames 1-20) and final smile/climax frames (frames 116-136)
      const criticalIndices = new Set([
        ...Array.from({ length: 20 }, (_, i) => i),
        ...Array.from({ length: 21 }, (_, i) => TOTAL_FRAMES - 21 + i)
      ]);

      // Safety timeout: dismiss preloader after 4.5s even if slow network
      clearTimeout(safetyTimer);
      safetyTimer = setTimeout(() => {
        if (!state.isReady && state.loadedCount >= 8) {
          console.warn('[Chef Engine] Safety timeout reached, proceeding with loaded frames.');
          onAllAssetsLoaded();
        }
      }, 4500);

      for (let i = 0; i < TOTAL_FRAMES; i++) {
        const img = new Image();
        const filename = `frame-${String(i + 1).padStart(3, '0')}.webp`;
        img.src = `${basePath}${filename}`;
        img._index = i;
        img._decoded = false;
        state.images[i] = img;

        const onImageComplete = () => {
          state.loadedCount++;
          updatePreloaderProgress();

          // Non-blocking decode for critical keyframes
          if (criticalIndices.has(i) && 'decode' in img && !img._decoded) {
            img.decode().then(() => { img._decoded = true; }).catch(() => {});
          }

          // Draw initial resting frame as soon as frame 0 is ready
          if (i === 0 && !state.hasRenderedFirstFrame) {
            state.hasRenderedFirstFrame = true;
            resizeCanvas();
            renderFrame(0);
          }

          // Once all frames load, transition cleanly
          if (state.loadedCount >= TOTAL_FRAMES && !state.isReady) {
            onAllAssetsLoaded();
          }
        };

        if (img.complete && img.naturalWidth > 0) {
          onImageComplete();
        } else {
          img.onload = onImageComplete;
          img.onerror = () => {
            console.warn(`[Chef Engine] Failed loading frame ${i + 1}`);
            state.loadedCount++;
            updatePreloaderProgress();
            if (state.loadedCount >= TOTAL_FRAMES && !state.isReady) {
              onAllAssetsLoaded();
            }
          };
        }
      }
    }

    function updatePreloaderProgress() {
      const percent = Math.min(100, Math.round((state.loadedCount / TOTAL_FRAMES) * 100));
      if (elements.preloaderBar) elements.preloaderBar.style.width = `${percent}%`;
      if (elements.preloaderPercent) elements.preloaderPercent.textContent = `${percent}%`;
    }

    function onAllAssetsLoaded() {
      if (state.isReady) return;
      state.isReady = true;
      clearTimeout(safetyTimer);
      console.log(`[Chef Engine] All ${TOTAL_FRAMES} ${state.activeTier} frames ready.`);

      // Dismiss preloader smoothly
      if (elements.preloader) {
        elements.preloader.classList.add('loaded');
      }

      initScrollEngine();
      scheduleBackgroundDecoding();

      // Progressively initialize Brookies & Celebrations Sequences
      if (typeof window.requestIdleCallback === 'function') {
        window.requestIdleCallback(() => {
          BrookiesSequence.init();
          CelebrationsSequence.init();
        }, { timeout: 300 });
      } else {
        setTimeout(() => {
          BrookiesSequence.init();
          CelebrationsSequence.init();
        }, 100);
      }
    }

    function scheduleBackgroundDecoding() {
      let nextIndex = 0;
      const batchSize = 10;
      function processBatch() {
        let count = 0;
        while (nextIndex < TOTAL_FRAMES && count < batchSize) {
          const img = state.images[nextIndex];
          if (img && 'decode' in img && !img._decoded) {
            img.decode().then(() => { img._decoded = true; }).catch(() => {});
            count++;
          }
          nextIndex++;
        }
        if (nextIndex < TOTAL_FRAMES) {
          if ('requestIdleCallback' in window) {
            window.requestIdleCallback(processBatch, { timeout: 100 });
          } else {
            setTimeout(processBatch, 25);
          }
        }
      }
      processBatch();
    }

    function lookaheadDecode(targetFrame) {
      const start = Math.max(0, targetFrame - 4);
      const end = Math.min(TOTAL_FRAMES, targetFrame + 12);
      for (let i = start; i < end; i++) {
        const img = state.images[i];
        if (img && 'decode' in img && !img._decoded) {
          img.decode().then(() => { img._decoded = true; }).catch(() => {});
        }
      }
    }

    function resizeCanvas() {
      if (!elements.canvas) return;
      const rect = elements.canvas.getBoundingClientRect();
      const width = rect.width || window.innerWidth;
      const height = rect.height || window.innerHeight;
      state.dpr = getDevicePixelRatio();

      elements.canvas.width = Math.floor(width * state.dpr);
      elements.canvas.height = Math.floor(height * state.dpr);

      if (ctx) {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
      }

      state.forceRedraw = true;
      renderFrame(Math.round(chefAnim.frame));
    }

    function renderFrame(frameIndex) {
      if (!ctx || !elements.canvas) return;
      if (frameIndex === state.renderedFrameIndex && !state.forceRedraw) return;

      let img = state.images[frameIndex];
      if (!img || !img.complete || !img.naturalWidth) {
        for (let b = frameIndex - 1; b >= 0; b--) {
          const candidate = state.images[b];
          if (candidate && candidate.complete && candidate.naturalWidth > 0) {
            img = candidate;
            break;
          }
        }
        if (!img || !img.complete || !img.naturalWidth) {
          for (let f = frameIndex + 1; f < TOTAL_FRAMES; f++) {
            const candidate = state.images[f];
            if (candidate && candidate.complete && candidate.naturalWidth > 0) {
              img = candidate;
              break;
            }
          }
        }
      }

      if (!img || !img.complete || !img.naturalWidth) return;

      const cw = elements.canvas.width;
      const ch = elements.canvas.height;
      const imgW = img.naturalWidth || img.width;
      const imgH = img.naturalHeight || img.height;
      if (!imgW || !imgH) return;

      ctx.fillStyle = '#162420';
      ctx.fillRect(0, 0, cw, ch);
      // Task 1c & 1d: Cover fit anchored on chef face (fx=0.50, fy=0.38)
      drawCover(ctx, img, cw, ch, 0.50, 0.38);

      state.renderedFrameIndex = frameIndex;
      state.currentFrameIndex = frameIndex;
      state.forceRedraw = false;
    }

    function scheduleRender() {
      if (!rafPending) {
        rafPending = true;
        requestAnimationFrame(() => {
          rafPending = false;
          const targetFrame = Math.min(TOTAL_FRAMES - 1, Math.max(0, Math.round(chefAnim.frame)));
          renderFrame(targetFrame);
          lookaheadDecode(targetFrame);
        });
      }
    }

    function initScrollEngine() {
      if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;
      if (masterTl) {
        ScrollTrigger.refresh();
        return;
      }

      gsap.registerPlugin(ScrollTrigger);
      initLenis();

      // Initial state: Slides 1 & 2 centered, Slide 3 positioning logic
      if (elements.slides[0]) gsap.set(elements.slides[0], { opacity: 0, visibility: 'hidden', y: 30 });
      if (elements.slides[1]) gsap.set(elements.slides[1], { opacity: 0, visibility: 'hidden', y: 30 });
      if (elements.slides[2]) {
        const isPortraitUnder1024 = window.innerWidth < 1024 && window.matchMedia('(orientation: portrait)').matches;
        if (isPortraitUnder1024) {
          gsap.set(elements.slides[2], { xPercent: -50, yPercent: 0, x: 0, y: 25, opacity: 0, visibility: 'hidden' });
        } else {
          gsap.set(elements.slides[2], { xPercent: 0, yPercent: -50, x: 35, y: 0, opacity: 0, visibility: 'hidden' });
        }
      }

      // Task 1g: Reduced Motion Support - static frame without scrub
      if (isReducedMotion) {
        renderFrame(TOTAL_FRAMES - 1);
        if (elements.slides[2]) {
          gsap.set(elements.slides[2], { opacity: 1, visibility: 'visible', x: 0, y: 0 });
        }
        return;
      }

      masterTl = gsap.timeline({
        scrollTrigger: {
          trigger: elements.scrollContainer,
          start: 'top top',
          end: '+=300%',
          pin: true,
          scrub: 0.35,
          anticipatePin: 1,
          onUpdate: (self) => {
            state.scrollProgress = self.progress;
            if (elements.scrollIndicator) {
              if (self.progress > 0.02) {
                elements.scrollIndicator.classList.add('faded');
              } else {
                elements.scrollIndicator.classList.remove('faded');
              }
            }
          }
        }
      });

      masterTl.to(chefAnim, {
        frame: TOTAL_FRAMES - 1,
        ease: 'none',
        duration: 1.0,
        onUpdate: scheduleRender
      }, 0);

      buildNarrativeTypographyTimeline(masterTl);
    }

    function buildNarrativeTypographyTimeline(masterTl) {
      const s1 = elements.slides[0];
      const s2 = elements.slides[1];
      const s3 = elements.slides[2];
      const brandTop = elements.brandTop;
      const brandBottom = elements.brandBottom;

      // Slide 1: Side Hip to Rotation (Frames 1-35 | Scroll 4% - 26%)
      if (s1) {
        masterTl.set(s1, { visibility: 'visible', opacity: 0, y: 30 }, 0.03)
                .to(s1, { opacity: 1, y: 0, duration: 0.05, ease: 'power2.out' }, 0.04)
                .to(s1, { opacity: 0, y: -20, duration: 0.05, ease: 'power2.in' }, 0.22)
                .set(s1, { visibility: 'hidden' }, 0.27);
      }

      // Slide 2: Ascending through Chest & Atelier Posture (Frames 45-80 | Scroll 34% - 62%)
      if (s2) {
        masterTl.set(s2, { visibility: 'visible', opacity: 0, y: 30 }, 0.33)
                .to(s2, { opacity: 1, y: 0, duration: 0.06, ease: 'power2.out' }, 0.35)
                .to(s2, { opacity: 0, y: -20, duration: 0.05, ease: 'power2.in' }, 0.58)
                .set(s2, { visibility: 'hidden' }, 0.64);
      }

      // Slide 3: Smile on Face & Last 20 Frames Grand Climax ("Kochumagique" Cursive Reveal on the Side)
      // Frames 105-136 (Scroll 74% - 100%)
      if (s3) {
        const brandTitle = s3.querySelector('.chef-cursive-brand');
        const flourish = s3.querySelector('.chef-flourish-path');
        const subtext = s3.querySelector('.chef-cursive-sub');
        const pill = s3.querySelector('.chef-tags-pill');
        const isPortraitUnder1024 = window.innerWidth < 1024 && window.matchMedia('(orientation: portrait)').matches;

        masterTl.set(s3, { 
          visibility: 'visible',
          xPercent: isPortraitUnder1024 ? -50 : 0,
          yPercent: isPortraitUnder1024 ? 0 : -50
        }, 0.72)
        .fromTo(s3,
          { 
            opacity: 0, 
            xPercent: isPortraitUnder1024 ? -50 : 0, 
            yPercent: isPortraitUnder1024 ? 0 : -50, 
            x: isPortraitUnder1024 ? 0 : 35, 
            y: isPortraitUnder1024 ? 25 : 0 
          },
          { 
            opacity: 1, 
            xPercent: isPortraitUnder1024 ? -50 : 0, 
            yPercent: isPortraitUnder1024 ? 0 : -50, 
            x: 0, 
            y: 0, 
            duration: 0.08, 
            ease: 'power3.out' 
          },
          0.74
        );

        if (brandTitle) {
          masterTl.fromTo(brandTitle, 
            { scale: 0.94, filter: 'drop-shadow(0 0 0px rgba(197, 160, 89, 0))' },
            { scale: 1.0, filter: 'drop-shadow(0 4px 28px rgba(197, 160, 89, 0.45)) drop-shadow(0 2px 10px rgba(0, 0, 0, 0.95))', duration: 0.1, ease: 'power2.out' },
            0.75
          );
        }

        if (flourish) {
          masterTl.fromTo(flourish,
            { strokeDashoffset: 200 },
            { strokeDashoffset: 0, duration: 0.12, ease: 'power2.out' },
            0.77
          );
        }

        if (subtext) {
          masterTl.fromTo(subtext,
            { opacity: 0, y: 12 },
            { opacity: 1, y: 0, duration: 0.07, ease: 'power2.out' },
            0.80
          );
        }

        if (pill) {
          masterTl.fromTo(pill,
            { opacity: 0, scale: 0.92 },
            { opacity: 1, scale: 1.0, duration: 0.07, ease: 'back.out(1.5)' },
            0.83
          );
        }

        // Holds triumphantly through 100% scroll
      }

      // Corner brand pills fade out softly at the bottom before entering ivory baking section
      if (brandTop) {
        masterTl.to(brandTop, { opacity: 0, y: -10, duration: 0.06, ease: 'power2.in' }, 0.92);
      }
      if (brandBottom) {
        masterTl.to(brandBottom, { opacity: 0, y: 10, duration: 0.06, ease: 'power2.in' }, 0.92);
      }
    }

    function onResize(widthChanged) {
      const wasMobile = state.isMobile;
      state.isMobile = window.innerWidth < 768;
      const newTier = state.isMobile ? 'mobile' : 'desktop';

      if (newTier !== state.activeTier) {
        state.activeTier = newTier;
        initAssetPipeline();
      } else if (widthChanged) {
        resizeCanvas();
      }
    }

    function redraw() {
      state.forceRedraw = true;
      renderFrame(Math.round(chefAnim.frame));
    }

    return {
      init,
      onResize,
      redraw
    };
  })();

  // ==========================================================================
  // SEQUENCE 2: BROOKIES SHOWCASE CANVAS CONTROLLER (#brookies)
  // 144-Frame 24 FPS Dark Chocolate Alchemy Sequence
  // "as the bookie scroll is taken from dont delte or remove it i want that to come after these texts"
  // ==========================================================================
  const BrookiesSequence = (function () {
    const TOTAL_FRAMES = 144;
    const ASSET_PATHS = {
      desktop: 'assets/brookies-v2/desktop/',
      mobile: 'assets/brookies-v2/mobile/'
    };

    const state = {
      isMobile: window.innerWidth < 768,
      activeTier: window.innerWidth < 768 ? 'mobile' : 'desktop',
      images: [],
      loadedCount: 0,
      currentFrameIndex: 0,
      renderedFrameIndex: -1,
      forceRedraw: true,
      scrollProgress: 0,
      isInitialized: false,
      isReady: false,
      dpr: getDevicePixelRatio()
    };

    const elements = {
      canvas: document.getElementById('brookies-canvas'),
      scrollContainer: document.getElementById('brookies'),
      slides: [
        document.getElementById('slide-1'),
        document.getElementById('slide-2'),
        document.getElementById('slide-3'),
        document.getElementById('slide-4')
      ]
    };

    let ctx = null;
    let brookieAnim = { frame: 0 };
    let masterTl = null;
    let rafPending = false;

    function init() {
      if (!elements.canvas || !elements.scrollContainer || state.isInitialized) return;
      state.isInitialized = true;
      ctx = elements.canvas.getContext('2d', { alpha: false });
      initProgressivePipeline();
    }

    function initProgressivePipeline() {
      const basePath = state.activeTier === 'mobile' ? ASSET_PATHS.mobile : ASSET_PATHS.desktop;
      state.images = new Array(TOTAL_FRAMES);
      state.loadedCount = 0;
      state.renderedFrameIndex = -1;
      state.forceRedraw = true;

      // Critical initial window (frames 1-24) and final hero frames (frames 132-144)
      const criticalIndices = new Set([
        ...Array.from({ length: 24 }, (_, i) => i),
        ...Array.from({ length: 14 }, (_, i) => TOTAL_FRAMES - 14 + i)
      ]);

      // Load Frame 1 immediately as poster
      loadFrame(0, basePath, (img) => {
        resizeCanvas();
        renderFrame(0);
        initScrollEngine();
      });

      // Progressively load remaining frames non-blocking
      for (let i = 1; i < TOTAL_FRAMES; i++) {
        loadFrame(i, basePath, (img) => {
          if (criticalIndices.has(i) && 'decode' in img && !img._decoded) {
            img.decode().then(() => { img._decoded = true; }).catch(() => {});
          }
        });
      }
    }

    function loadFrame(index, basePath, callback) {
      const img = new Image();
      const filename = `frame-${String(index + 1).padStart(3, '0')}.webp`;
      img.src = `${basePath}${filename}`;
      img._index = index;
      img._decoded = false;
      state.images[index] = img;

      const onComplete = () => {
        state.loadedCount++;
        if (callback) callback(img);

        if (Math.round(brookieAnim.frame) === index) {
          scheduleRender();
        }

        if (state.loadedCount >= TOTAL_FRAMES) {
          console.log(`[Brookies Engine] All ${TOTAL_FRAMES} ${state.activeTier} frames ready.`);
          scheduleBackgroundDecoding();
        }
      };

      if (img.complete && img.naturalWidth > 0) {
        onComplete();
      } else {
        img.onload = onComplete;
        img.onerror = () => {
          state.loadedCount++;
          if (state.loadedCount >= TOTAL_FRAMES) scheduleBackgroundDecoding();
        };
      }
    }

    function scheduleBackgroundDecoding() {
      let nextIndex = 0;
      const batchSize = 10;
      function processBatch() {
        let count = 0;
        while (nextIndex < TOTAL_FRAMES && count < batchSize) {
          const img = state.images[nextIndex];
          if (img && 'decode' in img && !img._decoded) {
            img.decode().then(() => { img._decoded = true; }).catch(() => {});
            count++;
          }
          nextIndex++;
        }
        if (nextIndex < TOTAL_FRAMES) {
          if ('requestIdleCallback' in window) {
            window.requestIdleCallback(processBatch, { timeout: 120 });
          } else {
            setTimeout(processBatch, 25);
          }
        }
      }
      processBatch();
    }

    function lookaheadDecode(targetFrame) {
      const start = Math.max(0, targetFrame - 4);
      const end = Math.min(TOTAL_FRAMES, targetFrame + 12);
      for (let i = start; i < end; i++) {
        const img = state.images[i];
        if (img && 'decode' in img && !img._decoded) {
          img.decode().then(() => { img._decoded = true; }).catch(() => {});
        }
      }
    }

    function resizeCanvas() {
      if (!elements.canvas) return;
      const rect = elements.canvas.getBoundingClientRect();
      const width = rect.width || window.innerWidth;
      const height = rect.height || window.innerHeight;
      state.dpr = getDevicePixelRatio();

      elements.canvas.width = Math.floor(width * state.dpr);
      elements.canvas.height = Math.floor(height * state.dpr);

      if (ctx) {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
      }

      state.forceRedraw = true;
      renderFrame(Math.round(brookieAnim.frame));
    }

    function renderFrame(frameIndex) {
      if (!ctx || !elements.canvas) return;
      if (frameIndex === state.renderedFrameIndex && !state.forceRedraw) return;

      let img = state.images[frameIndex];
      if (!img || !img.complete || !img.naturalWidth) {
        for (let b = frameIndex - 1; b >= 0; b--) {
          const candidate = state.images[b];
          if (candidate && candidate.complete && candidate.naturalWidth > 0) {
            img = candidate;
            break;
          }
        }
        if (!img || !img.complete || !img.naturalWidth) {
          for (let f = frameIndex + 1; f < TOTAL_FRAMES; f++) {
            const candidate = state.images[f];
            if (candidate && candidate.complete && candidate.naturalWidth > 0) {
              img = candidate;
              break;
            }
          }
        }
      }

      if (!img || !img.complete || !img.naturalWidth) return;

      const cw = elements.canvas.width;
      const ch = elements.canvas.height;
      const imgW = img.naturalWidth || img.width;
      const imgH = img.naturalHeight || img.height;
      if (!imgW || !imgH) return;

      ctx.fillStyle = '#162420';
      ctx.fillRect(0, 0, cw, ch);
      // Task 1c & 1d: Cover fit centered on brookie product (fx=0.50, fy=0.50)
      drawCover(ctx, img, cw, ch, 0.50, 0.50);

      state.renderedFrameIndex = frameIndex;
      state.currentFrameIndex = frameIndex;
      state.forceRedraw = false;
    }

    function scheduleRender() {
      if (!rafPending) {
        rafPending = true;
        requestAnimationFrame(() => {
          rafPending = false;
          const targetFrame = Math.min(TOTAL_FRAMES - 1, Math.max(0, Math.round(brookieAnim.frame)));
          renderFrame(targetFrame);
          lookaheadDecode(targetFrame);
        });
      }
    }

    function initScrollEngine() {
      if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;
      if (masterTl) {
        ScrollTrigger.refresh();
        return;
      }

      elements.slides.forEach((slide) => {
        if (slide) gsap.set(slide, { opacity: 0, visibility: 'hidden', y: 30 });
      });

      if (isReducedMotion) {
        renderFrame(TOTAL_FRAMES - 1);
        if (elements.slides[3]) gsap.set(elements.slides[3], { opacity: 1, visibility: 'visible', y: 0 });
        return;
      }

      masterTl = gsap.timeline({
        scrollTrigger: {
          trigger: elements.scrollContainer,
          start: 'top top',
          end: '+=300%',
          pin: true,
          scrub: isReducedMotion ? true : 0.35,
          anticipatePin: 1,
          onUpdate: (self) => {
            state.scrollProgress = self.progress;
          }
        }
      });

      masterTl.to(brookieAnim, {
        frame: TOTAL_FRAMES - 1,
        ease: 'none',
        duration: 1.0,
        onUpdate: scheduleRender
      }, 0);

      buildNarrativeTypographyTimeline(masterTl);
    }

    function buildNarrativeTypographyTimeline(masterTl) {
      const s1 = elements.slides[0];
      const s2 = elements.slides[1];
      const s3 = elements.slides[2];
      const s4 = elements.slides[3];

      if (s1) {
        masterTl.set(s1, { visibility: 'visible', opacity: 0, y: 30 }, 0.03)
                .to(s1, { opacity: 1, y: 0, duration: 0.05, ease: 'power2.out' }, 0.04)
                .to(s1, { opacity: 0, y: -20, duration: 0.05, ease: 'power2.in' }, 0.20)
                .set(s1, { visibility: 'hidden' }, 0.25);
      }

      if (s2) {
        masterTl.set(s2, { visibility: 'visible', opacity: 0, y: 30 }, 0.28)
                .to(s2, { opacity: 1, y: 0, duration: 0.05, ease: 'power2.out' }, 0.29)
                .to(s2, { opacity: 0, y: -20, duration: 0.05, ease: 'power2.in' }, 0.46)
                .set(s2, { visibility: 'hidden' }, 0.51);
      }

      if (s3) {
        masterTl.set(s3, { visibility: 'visible', opacity: 0, y: 30 }, 0.54)
                .to(s3, { opacity: 1, y: 0, duration: 0.05, ease: 'power2.out' }, 0.55)
                .to(s3, { opacity: 0, y: -20, duration: 0.05, ease: 'power2.in' }, 0.72)
                .set(s3, { visibility: 'hidden' }, 0.77);
      }

      if (s4) {
        masterTl.set(s4, { visibility: 'visible', opacity: 0, y: 25 }, 0.78)
                .to(s4, { opacity: 1, y: 0, duration: 0.04, ease: 'power2.out' }, 0.80)
                .to(s4, { opacity: 0, y: -15, duration: 0.04, ease: 'power2.in' }, 0.88)
                .set(s4, { visibility: 'hidden' }, 0.90);
      }
    }

    function onResize(widthChanged) {
      const wasMobile = state.isMobile;
      state.isMobile = window.innerWidth < 768;
      const newTier = state.isMobile ? 'mobile' : 'desktop';

      if (newTier !== state.activeTier) {
        state.activeTier = newTier;
        initProgressivePipeline();
      } else if (widthChanged) {
        resizeCanvas();
      }
    }

    function redraw() {
      state.forceRedraw = true;
      renderFrame(Math.round(brookieAnim.frame));
    }

    return {
      init,
      onResize,
      redraw
    };
  })();
  // "The Golden Ascent" 145-Frame Ivory Sequence Scrubbing
  // ==========================================================================
  const CelebrationsSequence = (function () {
    const TOTAL_FRAMES = 145;
    const ASSET_PATHS = {
      desktop: 'assets/birthday-cake/desktop/',
      mobile: 'assets/birthday-cake/mobile/'
    };

    const state = {
      isMobile: window.innerWidth < 768,
      activeTier: window.innerWidth < 768 ? 'mobile' : 'desktop',
      images: [],
      loadedCount: 0,
      currentFrameIndex: 0,
      renderedFrameIndex: -1,
      forceRedraw: true,
      scrollProgress: 0,
      isInitialized: false,
      isScrollTriggerReady: false,
      dpr: getDevicePixelRatio()
    };

    const elements = {
      canvas: document.getElementById('cake-canvas'),
      scrollContainer: document.getElementById('celebrations'),
      introOverlay: document.getElementById('cake-intro-overlay'),
      scrollMessage: document.getElementById('cake-scroll-message'),
      heroOverlay: document.getElementById('cake-hero-overlay'),
      scrollIndicator: document.getElementById('cake-scroll-indicator')
    };

    let ctx = null;
    let cakeAnim = { frame: 0 };
    let cakeTl = null;
    let rafPending = false;

    function init() {
      if (!elements.canvas || !elements.scrollContainer || state.isInitialized) return;
      state.isInitialized = true;
      ctx = elements.canvas.getContext('2d', { alpha: false });

      initProgressivePipeline();
    }

    function initProgressivePipeline() {
      const basePath = state.activeTier === 'mobile' ? ASSET_PATHS.mobile : ASSET_PATHS.desktop;
      state.images = new Array(TOTAL_FRAMES);
      state.loadedCount = 0;
      state.renderedFrameIndex = -1;
      state.forceRedraw = true;

      // Prioritize frame 0 (poster frame), initial 20 frames, and final 15 frames
      const criticalIndices = new Set([
        ...Array.from({ length: 20 }, (_, i) => i),
        ...Array.from({ length: 15 }, (_, i) => TOTAL_FRAMES - 15 + i)
      ]);

      // Load Frame 1 immediately as poster
      loadFrame(0, basePath, (img) => {
        resizeCanvas();
        renderFrame(0);
        initScrollTrigger();
      });

      // Progressively load remaining frames non-blocking
      for (let i = 1; i < TOTAL_FRAMES; i++) {
        loadFrame(i, basePath, (img) => {
          if (criticalIndices.has(i) && 'decode' in img && !img._decoded) {
            img.decode().then(() => { img._decoded = true; }).catch(() => {});
          }
        });
      }
    }

    function loadFrame(index, basePath, callback) {
      const img = new Image();
      const filename = `frame-${String(index + 1).padStart(3, '0')}.webp`;
      img.src = `${basePath}${filename}`;
      img._index = index;
      img._decoded = false;
      state.images[index] = img;

      const onComplete = () => {
        state.loadedCount++;
        if (callback) callback(img);

        if (Math.round(cakeAnim.frame) === index) {
          scheduleRender();
        }

        if (state.loadedCount >= TOTAL_FRAMES) {
          console.log(`[Celebrations Engine] All ${TOTAL_FRAMES} ${state.activeTier} cake frames ready.`);
          scheduleBackgroundDecoding();
        }
      };

      if (img.complete && img.naturalWidth > 0) {
        onComplete();
      } else {
        img.onload = onComplete;
        img.onerror = () => {
          state.loadedCount++;
          if (state.loadedCount >= TOTAL_FRAMES) scheduleBackgroundDecoding();
        };
      }
    }

    function scheduleBackgroundDecoding() {
      let nextIndex = 0;
      const batchSize = 10;
      function processBatch() {
        let count = 0;
        while (nextIndex < TOTAL_FRAMES && count < batchSize) {
          const img = state.images[nextIndex];
          if (img && 'decode' in img && !img._decoded) {
            img.decode().then(() => { img._decoded = true; }).catch(() => {});
            count++;
          }
          nextIndex++;
        }
        if (nextIndex < TOTAL_FRAMES) {
          if ('requestIdleCallback' in window) {
            window.requestIdleCallback(processBatch, { timeout: 150 });
          } else {
            setTimeout(processBatch, 30);
          }
        }
      }
      processBatch();
    }

    function lookaheadDecode(targetFrame) {
      const start = Math.max(0, targetFrame - 4);
      const end = Math.min(TOTAL_FRAMES, targetFrame + 12);
      for (let i = start; i < end; i++) {
        const img = state.images[i];
        if (img && 'decode' in img && !img._decoded) {
          img.decode().then(() => { img._decoded = true; }).catch(() => {});
        }
      }
    }

    function resizeCanvas() {
      if (!elements.canvas) return;
      const rect = elements.canvas.getBoundingClientRect();
      const width = rect.width || window.innerWidth;
      const height = rect.height || window.innerHeight;
      state.dpr = getDevicePixelRatio();

      elements.canvas.width = Math.floor(width * state.dpr);
      elements.canvas.height = Math.floor(height * state.dpr);

      if (ctx) {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
      }

      state.forceRedraw = true;
      renderFrame(Math.round(cakeAnim.frame));
    }

    function renderFrame(frameIndex) {
      if (!ctx || !elements.canvas) return;
      if (frameIndex === state.renderedFrameIndex && !state.forceRedraw) return;

      let img = state.images[frameIndex];
      if (!img || !img.complete || !img.naturalWidth) {
        for (let b = frameIndex - 1; b >= 0; b--) {
          const candidate = state.images[b];
          if (candidate && candidate.complete && candidate.naturalWidth > 0) {
            img = candidate;
            break;
          }
        }
        if (!img || !img.complete || !img.naturalWidth) {
          for (let f = frameIndex + 1; f < TOTAL_FRAMES; f++) {
            const candidate = state.images[f];
            if (candidate && candidate.complete && candidate.naturalWidth > 0) {
              img = candidate;
              break;
            }
          }
        }
      }

      if (!img || !img.complete || !img.naturalWidth) return;

      const cw = elements.canvas.width;
      const ch = elements.canvas.height;
      const imgW = img.naturalWidth || img.width;
      const imgH = img.naturalHeight || img.height;
      if (!imgW || !imgH) return;

      ctx.fillStyle = '#F6F3E9';
      ctx.fillRect(0, 0, cw, ch);
      // Task 1c & 1d: Cover fit centered on celebration cake (fx=0.50, fy=0.50)
      drawCover(ctx, img, cw, ch, 0.50, 0.50);

      state.renderedFrameIndex = frameIndex;
      state.currentFrameIndex = frameIndex;
      state.forceRedraw = false;
    }

    function scheduleRender() {
      if (!rafPending) {
        rafPending = true;
        requestAnimationFrame(() => {
          rafPending = false;
          const targetFrame = Math.min(TOTAL_FRAMES - 1, Math.max(0, Math.round(cakeAnim.frame)));
          renderFrame(targetFrame);
          lookaheadDecode(targetFrame);
        });
      }
    }

    function initScrollTrigger() {
      if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;
      if (cakeTl) {
        ScrollTrigger.refresh();
        return;
      }

      if (isReducedMotion) {
        renderFrame(TOTAL_FRAMES - 1);
        if (elements.heroOverlay) gsap.set(elements.heroOverlay, { opacity: 1, y: 0 });
        return;
      }

      cakeTl = gsap.timeline({
        scrollTrigger: {
          trigger: elements.scrollContainer,
          start: 'top top',
          end: '+=350%',
          pin: true,
          scrub: isReducedMotion ? true : 0.4,
          anticipatePin: 1,
          onUpdate: (self) => {
            state.scrollProgress = self.progress;
            if (elements.scrollIndicator) {
              if (self.progress > 0.03) {
                elements.scrollIndicator.classList.add('faded');
              } else {
                elements.scrollIndicator.classList.remove('faded');
              }
            }
          }
        }
      });

      cakeTl.to(cakeAnim, {
        frame: TOTAL_FRAMES - 1,
        ease: 'none',
        duration: 1.0,
        onUpdate: scheduleRender
      }, 0);

      // Intro Overlay fades out early as camera ascends
      if (elements.introOverlay) {
        cakeTl.to(elements.introOverlay, {
          opacity: 0,
          y: -24,
          duration: 0.14,
          ease: 'power2.in'
        }, 0.05);
      }

      // Mid-Scroll Celebratory Typography Overlay ("Celebrate Your Birthday With Us")
      if (elements.scrollMessage) {
        cakeTl.fromTo(elements.scrollMessage,
          { opacity: 0, y: 30, scale: 0.96 },
          { opacity: 1, y: 0, scale: 1.0, duration: 0.12, ease: 'power2.out' },
          0.38
        );
        cakeTl.to(elements.scrollMessage,
          { opacity: 0, y: -20, scale: 0.98, duration: 0.10, ease: 'power2.in' },
          0.64
        );
      }

      // Final Hero Order Card arrives at top tier
      if (elements.heroOverlay) {
        cakeTl.fromTo(elements.heroOverlay, 
          { opacity: 0, y: 20 },
          { opacity: 1, y: 0, duration: 0.15, ease: 'power2.out' },
          0.80
        );
      }

      ScrollTrigger.refresh();
    }

    function onResize(widthChanged) {
      const wasMobile = state.isMobile;
      state.isMobile = window.innerWidth < 768;
      const newTier = state.isMobile ? 'mobile' : 'desktop';

      if (newTier !== state.activeTier) {
        state.activeTier = newTier;
        initProgressivePipeline();
      } else if (widthChanged) {
        resizeCanvas();
      }
    }

    function redraw() {
      state.forceRedraw = true;
      renderFrame(Math.round(cakeAnim.frame));
    }

    return {
      init,
      onResize,
      redraw
    };
  })();

  // ==========================================================================
  // GLOBAL RESIZE LISTENER (Task 1f: Width-only canvas resize & refresh)
  // ==========================================================================
  let lastWindowWidth = window.innerWidth;
  let resizeTimeout;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      const currentWidth = window.innerWidth;
      const widthChanged = currentWidth !== lastWindowWidth;

      if (widthChanged) {
        lastWindowWidth = currentWidth;
        ChefSequence.onResize(true);
        BrookiesSequence.onResize(true);
        CelebrationsSequence.onResize(true);
        if (typeof ScrollTrigger !== 'undefined') {
          ScrollTrigger.refresh();
        }
      } else {
        // Redraw current frames on height-only address bar changes so canvas never flashes blank
        ChefSequence.redraw();
        BrookiesSequence.redraw();
        CelebrationsSequence.redraw();
      }
    }, 150);
  });

  // Start Primary Pipeline with robust readyState check
  function startEngine() {
    ChefSequence.init();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startEngine);
  } else {
    startEngine();
  }

})();
