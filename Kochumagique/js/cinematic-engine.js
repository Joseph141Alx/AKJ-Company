/**
 * ==========================================================================
 * KOCHUMAGIQUE — Triple-Sequence Cinematic Canvas Engine
 * Sequence 1: Chef Reveal Hero (136 frames: Hip -> Chest -> Face -> Smile)
 * Sequence 2: Brookies Showcase (144 frames: Dark Chocolate Alchemy)
 * Sequence 3: Celebrations Cake (145 frames: "The Golden Ascent")
 * Features:
 * - Parallel binary .pack streaming with individual WebP fallback (file://)
 * - Strict full-load entry gate (scroll locked until 100% loaded & ready)
 * - Symmetrical nearest-frame lookup + pinned stride-8 anchors (zero Frame-0 flicker)
 * - Active-sequence full frame warming + offscreen trimming + directional decode queue
 * - Synchronous canvas draw inside GSAP ticker + crisp responsive Lenis scroll
 * ==========================================================================
 */

(function () {
  'use strict';

  const isReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const getDevicePixelRatio = () => Math.min(window.devicePixelRatio || 1, 2);

  const SEQUENCE_CONFIGS = {
    chef: {
      id: 'chef',
      label: 'Chef Sequence',
      totalFrames: 136,
      packName: 'chef',
      legacyFolder: 'assets/chef-reveal',
      canvasId: 'chef-canvas',
      sectionId: 'home',
      fitMode: 'chef',
      bgColor: '#162420',
      scrollEnd: '+=300%',
      scrub: isReducedMotion ? true : 0.08,
      estimatedBytes: { desktop: 2110000, mobile: 1110000 }
    },
    brookies: {
      id: 'brookies',
      label: 'Brookies Sequence',
      totalFrames: 144,
      packName: 'brookies',
      legacyFolder: 'assets/brookies-v2',
      canvasId: 'brookies-canvas',
      sectionId: 'brookies',
      fitMode: 'brookies',
      bgColor: '#162420',
      scrollEnd: '+=300%',
      scrub: isReducedMotion ? true : 0.08,
      estimatedBytes: { desktop: 4100000, mobile: 2300000 }
    },
    cake: {
      id: 'cake',
      label: 'Celebrations Sequence',
      totalFrames: 145,
      packName: 'cake',
      legacyFolder: 'assets/birthday-cake',
      canvasId: 'cake-canvas',
      sectionId: 'celebrations',
      fitMode: 'cake',
      bgColor: '#F6F3E9',
      scrollEnd: '+=350%',
      scrub: isReducedMotion ? true : 0.08,
      estimatedBytes: { desktop: 4370000, mobile: 2690000 }
    }
  };

  const PACK_MAGIC = 0x50514d4b; // 'KMQP' little-endian
  const ANCHOR_STRIDE = 8;
  const INACTIVE_LRU_LIMIT = 20;
  const MOBILE_ACTIVE_LRU_LIMIT = 76;
  const MAX_CONCURRENT_DECODES = 3;

  let lenisInstance = null;
  let activeTier = window.innerWidth < 768 ? 'mobile' : 'desktop';
  let hasEntered = false;

  /**
   * Shared Lenis Smooth Scroll Synchronization
   */
  function initLenis() {
    if (lenisInstance) return lenisInstance;
    if (typeof window.Lenis === 'undefined') return null;

    lenisInstance = new window.Lenis({
      lerp: 0.18,
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

    return lenisInstance;
  }

  /**
   * Parses a KMQP binary frame pack into an array of WebP Blobs.
   */
  function parsePackBuffer(buffer, expectedCount) {
    if (buffer.byteLength < 12) {
      throw new Error('Invalid pack buffer size');
    }
    const view = new DataView(buffer);
    const magic = view.getUint32(0, true);
    const version = view.getUint32(4, true);
    const count = view.getUint32(8, true);

    if (magic !== PACK_MAGIC || version !== 1 || count !== expectedCount) {
      throw new Error(`Invalid pack header (magic=${magic}, version=${version}, count=${count})`);
    }

    const headerBytes = 12 + count * 4;
    if (buffer.byteLength < headerBytes) {
      throw new Error('Truncated pack header');
    }

    const bytes = new Uint8Array(buffer);
    const blobs = new Array(count);
    let offset = headerBytes;

    for (let i = 0; i < count; i++) {
      const len = view.getUint32(12 + i * 4, true);
      if (offset + len > bytes.byteLength) {
        throw new Error(`Truncated pack payload at frame ${i}`);
      }
      blobs[i] = new Blob([bytes.subarray(offset, offset + len)], { type: 'image/webp' });
      offset += len;
    }

    return blobs;
  }

  /**
   * Downloads a single .pack file with real-time byte progress and retry support.
   */
  async function fetchPackWithProgress(url, estimatedBytes, onProgress, retries = 2) {
    let lastErr = null;
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const res = await fetch(url, { credentials: 'same-origin' });
        if (!res.ok) {
          throw new Error(`HTTP ${res.status} for ${url}`);
        }

        const contentLenHeader = res.headers.get('Content-Length');
        const contentLen = contentLenHeader ? parseInt(contentLenHeader, 10) : 0;
        const total = contentLen > 0 ? contentLen : estimatedBytes;

        if (!res.body || typeof res.body.getReader !== 'function') {
          const buf = await res.arrayBuffer();
          onProgress(buf.byteLength, buf.byteLength);
          return buf;
        }

        const reader = res.body.getReader();
        const chunks = [];
        let received = 0;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value) {
            chunks.push(value);
            received += value.byteLength;
            onProgress(received, Math.max(total, received));
          }
        }

        const combined = new Uint8Array(received);
        let pos = 0;
        for (let i = 0; i < chunks.length; i++) {
          combined.set(chunks[i], pos);
          pos += chunks[i].byteLength;
        }
        onProgress(received, received);
        return combined.buffer;
      } catch (err) {
        lastErr = err;
        if (attempt < retries) {
          await new Promise((r) => setTimeout(r, 250 * (attempt + 1)));
        }
      }
    }
    throw lastErr;
  }

  /**
   * Adaptive LRU ImageBitmap cache with pinned stride-8 anchors, symmetrical
   * nearest-frame lookup, concurrency-capped decode queue, and background warming.
   */
  class FrameCache {
    constructor(totalFrames, mode, items) {
      this.totalFrames = totalFrames;
      this.mode = mode; // 'pack' | 'image'
      this.blobs = mode === 'pack' ? items : null;
      this.images = mode === 'image' ? items : null;
      this.pinned = new Map();
      this.lru = new Map();
      this.inFlight = new Map();
      this.decodeQueue = [];
      this.activeDecodes = 0;
      this.maxLru = INACTIVE_LRU_LIMIT;
      this.warmingActive = false;
      this.destroyed = false;
    }

    isPinnedIndex(index) {
      return index === 0 || index === this.totalFrames - 1 || index % ANCHOR_STRIDE === 0;
    }

    getExact(index) {
      if (this.mode === 'image') {
        const img = this.images[index];
        return img && img.complete && img.naturalWidth > 0 ? img : null;
      }
      return this.pinned.get(index) || this.lru.get(index) || null;
    }

    /**
     * Searches outward symmetrically by frame distance so fallback NEVER jumps to Frame 0.
     */
    getDrawable(index) {
      const exact = this.getExact(index);
      if (exact) {
        if (this.mode === 'pack' && this.lru.has(index)) {
          this.lru.delete(index);
          this.lru.set(index, exact);
        }
        return { drawable: exact, isExact: true };
      }

      for (let offset = 1; offset < this.totalFrames; offset++) {
        if (index - offset >= 0) {
          const prev = this.getExact(index - offset);
          if (prev) return { drawable: prev, isExact: false };
        }
        if (index + offset < this.totalFrames) {
          const next = this.getExact(index + offset);
          if (next) return { drawable: next, isExact: false };
        }
      }
      return { drawable: null, isExact: false };
    }

    trimLru() {
      while (this.lru.size > this.maxLru) {
        const oldestKey = this.lru.keys().next().value;
        const oldestBmp = this.lru.get(oldestKey);
        this.lru.delete(oldestKey);
        if (oldestBmp && typeof oldestBmp.close === 'function') {
          oldestBmp.close();
        }
      }
    }

    setActiveBudget(isActive) {
      if (isActive) {
        this.maxLru = activeTier === 'desktop' ? this.totalFrames : MOBILE_ACTIVE_LRU_LIMIT;
        this.startWarming();
      } else {
        this.warmingActive = false;
        this.maxLru = INACTIVE_LRU_LIMIT;
        this.trimLru();
      }
    }

    ensureDecoded(index, onReady, highPriority = false) {
      if (this.destroyed || index < 0 || index >= this.totalFrames) return Promise.resolve(null);
      const existing = this.getExact(index);
      if (existing) return Promise.resolve(existing);
      if (this.mode !== 'pack') return Promise.resolve(null);

      if (this.inFlight.has(index)) {
        const existingEntry = this.inFlight.get(index);
        if (onReady) existingEntry.callbacks.push(onReady);
        if (highPriority) {
          const qIdx = this.decodeQueue.indexOf(index);
          if (qIdx > 0) {
            this.decodeQueue.splice(qIdx, 1);
            this.decodeQueue.unshift(index);
          }
        }
        return existingEntry.promise;
      }

      let resolvePromise;
      const promise = new Promise((res) => { resolvePromise = res; });
      this.inFlight.set(index, {
        promise,
        resolve: resolvePromise,
        callbacks: onReady ? [onReady] : []
      });

      if (highPriority) {
        this.decodeQueue.unshift(index);
      } else {
        this.decodeQueue.push(index);
      }
      this.pumpQueue();
      return promise;
    }

    pumpQueue() {
      while (!this.destroyed && this.activeDecodes < MAX_CONCURRENT_DECODES && this.decodeQueue.length > 0) {
        const index = this.decodeQueue.shift();
        const entry = this.inFlight.get(index);
        if (!entry) continue;

        const blob = this.blobs[index];
        if (!blob) {
          this.inFlight.delete(index);
          entry.resolve(null);
          continue;
        }

        this.activeDecodes++;
        createImageBitmap(blob)
          .then((bmp) => {
            this.activeDecodes--;
            this.inFlight.delete(index);
            if (this.destroyed) {
              if (typeof bmp.close === 'function') bmp.close();
              entry.resolve(null);
              return;
            }
            if (this.isPinnedIndex(index)) {
              this.pinned.set(index, bmp);
            } else {
              this.lru.set(index, bmp);
              this.trimLru();
            }
            entry.resolve(bmp);
            for (let i = 0; i < entry.callbacks.length; i++) {
              entry.callbacks[i](index);
            }
            this.pumpQueue();
          })
          .catch(() => {
            this.activeDecodes--;
            this.inFlight.delete(index);
            entry.resolve(null);
            this.pumpQueue();
          });
      }
    }

    async predecodeAnchors(decodeAll = false) {
      if (decodeAll) {
        this.maxLru = activeTier === 'desktop' ? this.totalFrames : MOBILE_ACTIVE_LRU_LIMIT;
      }
      const indices = [];
      for (let i = 0; i < this.totalFrames; i++) {
        if (decodeAll || i < 6 || this.isPinnedIndex(i)) {
          indices.push(i);
        }
      }

      if (this.mode === 'pack') {
        const batchSize = 24;
        for (let i = 0; i < indices.length; i += batchSize) {
          const slice = indices.slice(i, i + batchSize);
          await Promise.all(
            slice.map((idx) => {
              const blob = this.blobs[idx];
              if (!blob || this.getExact(idx)) return Promise.resolve();
              return createImageBitmap(blob)
                .then((bmp) => {
                  if (this.destroyed) {
                    if (typeof bmp.close === 'function') bmp.close();
                    return;
                  }
                  if (this.isPinnedIndex(idx)) {
                    this.pinned.set(idx, bmp);
                  } else {
                    this.lru.set(idx, bmp);
                  }
                })
                .catch(() => {});
            })
          );
        }
        this.trimLru();
      } else {
        await Promise.all(
          indices.map((idx) => {
            const img = this.images[idx];
            if (img && typeof img.decode === 'function') {
              return img.decode().catch(() => {});
            }
            return Promise.resolve();
          })
        );
      }
    }

    startWarming() {
      if (this.mode !== 'pack' || this.warmingActive || this.destroyed) return;
      if (activeTier !== 'desktop') return;
      this.warmingActive = true;

      let cursor = 0;
      const step = () => {
        if (!this.warmingActive || this.destroyed) return;
        let queued = 0;
        while (cursor < this.totalFrames && queued < 4) {
          const idx = cursor++;
          if (!this.getExact(idx) && !this.inFlight.has(idx)) {
            this.ensureDecoded(idx, null, false);
            queued++;
          }
        }
        if (cursor < this.totalFrames) {
          if (typeof window.requestIdleCallback === 'function') {
            window.requestIdleCallback(step, { timeout: 60 });
          } else {
            setTimeout(step, 16);
          }
        } else {
          this.warmingActive = false;
        }
      };
      step();
    }

    lookahead(targetIndex, direction, onReady) {
      if (this.mode !== 'pack') return;
      const forwardSpan = direction >= 0 ? 6 : 3;
      const backwardSpan = direction <= 0 ? 6 : 3;
      for (let step = 1; step <= Math.max(forwardSpan, backwardSpan); step++) {
        const primary = direction >= 0 ? targetIndex + step : targetIndex - step;
        const secondary = direction >= 0 ? targetIndex - step : targetIndex + step;
        if (step <= (direction >= 0 ? forwardSpan : backwardSpan) && primary >= 0 && primary < this.totalFrames) {
          this.ensureDecoded(primary, onReady, false);
        }
        if (step <= (direction >= 0 ? backwardSpan : forwardSpan) && secondary >= 0 && secondary < this.totalFrames) {
          this.ensureDecoded(secondary, onReady, false);
        }
      }
    }

    destroy() {
      this.destroyed = true;
      this.warmingActive = false;
      this.decodeQueue = [];
      this.inFlight.clear();
      this.pinned.forEach((bmp) => {
        if (bmp && typeof bmp.close === 'function') bmp.close();
      });
      this.lru.forEach((bmp) => {
        if (bmp && typeof bmp.close === 'function') bmp.close();
      });
      this.pinned.clear();
      this.lru.clear();
    }
  }

  /**
   * Loads sequence assets via binary .pack first, falling back to individual WebP frames
   * on file:// protocol or if createImageBitmap is unavailable.
   */
  async function loadSequenceCache(config, tier, onProgress) {
    const canUsePack =
      window.location.protocol !== 'file:' &&
      typeof window.fetch === 'function' &&
      typeof window.createImageBitmap === 'function';

    if (canUsePack) {
      try {
        const packUrl = `assets/packs/${config.packName}-${tier}.pack`;
        const buffer = await fetchPackWithProgress(
          packUrl,
          config.estimatedBytes[tier],
          onProgress
        );
        const blobs = parsePackBuffer(buffer, config.totalFrames);
        return new FrameCache(config.totalFrames, 'pack', blobs);
      } catch (err) {
        console.warn(`[${config.label}] Pack load fallback triggered:`, err.message);
      }
    }

    return new Promise((resolve) => {
      const basePath = `${config.legacyFolder}/${tier}/`;
      const images = new Array(config.totalFrames);
      let loaded = 0;

      for (let i = 0; i < config.totalFrames; i++) {
        const img = new Image();
        img.src = `${basePath}frame-${String(i + 1).padStart(3, '0')}.webp`;
        images[i] = img;

        const doneOne = () => {
          loaded++;
          onProgress(loaded, config.totalFrames);
          if (loaded >= config.totalFrames) {
            resolve(new FrameCache(config.totalFrames, 'image', images));
          }
        };

        if (img.complete && img.naturalWidth > 0) {
          doneOne();
        } else {
          img.onload = doneOne;
          img.onerror = doneOne;
        }
      }
    });
  }

  /**
   * Renders a frame onto the sequence canvas using its aspect-adaptive framing rule.
   */
  function drawCanvasFrame(ctx, canvas, img, fitMode, bgColor, dpr) {
    const cw = canvas.width;
    const ch = canvas.height;
    const imgW = img.naturalWidth || img.width;
    const imgH = img.naturalHeight || img.height;
    if (!cw || !ch || !imgW || !imgH) return;

    const canvasAspect = cw / ch;

    if (fitMode === 'brookies' && canvasAspect < 1.0) {
      const scale = cw / imgW;
      const drawW = cw;
      const drawH = Math.round(imgH * scale);
      const drawX = 0;
      const drawY = Math.round(ch * 0.46 - drawH * 0.5);

      const bgGrad = ctx.createLinearGradient(0, 0, 0, ch);
      bgGrad.addColorStop(0, '#183e40');
      bgGrad.addColorStop(0.5, '#183c3e');
      bgGrad.addColorStop(1, '#283438');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, cw, ch);

      ctx.drawImage(img, 0, 0, imgW, imgH, drawX, drawY, drawW, drawH);

      const featherH = Math.min(24 * dpr, drawH * 0.1);
      const featherTop = ctx.createLinearGradient(0, drawY, 0, drawY + featherH);
      featherTop.addColorStop(0, 'rgba(24, 62, 64, 0.95)');
      featherTop.addColorStop(1, 'rgba(24, 62, 64, 0)');
      ctx.fillStyle = featherTop;
      ctx.fillRect(drawX, drawY, drawW, featherH);

      const featherBot = ctx.createLinearGradient(0, drawY + drawH - featherH, 0, drawY + drawH);
      featherBot.addColorStop(0, 'rgba(40, 52, 56, 0)');
      featherBot.addColorStop(1, 'rgba(40, 52, 56, 0.95)');
      ctx.fillStyle = featherBot;
      ctx.fillRect(drawX, drawY + drawH - featherH, drawW, featherH);
      return;
    }

    const scale = Math.max(cw / imgW, ch / imgH);
    const drawW = Math.round(imgW * scale);
    const drawH = Math.round(imgH * scale);
    const drawX = Math.round((cw - drawW) / 2);
    const verticalBias = fitMode === 'chef' && canvasAspect < 1.0 ? 0.45 : 0.5;
    const drawY = Math.round((ch - drawH) * verticalBias);

    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, cw, ch);
    ctx.drawImage(img, 0, 0, imgW, imgH, drawX, drawY, drawW, drawH);
  }

  /**
   * Factory creating a controller for one scroll-driven canvas sequence.
   */
  function createSequenceController(config, buildTimelineFn) {
    const canvas = document.getElementById(config.canvasId);
    const scrollContainer = document.getElementById(config.sectionId);
    const ctx = canvas ? canvas.getContext('2d', { alpha: false }) : null;

    const anim = { frame: 0 };
    let cache = null;
    let timeline = null;
    let dpr = getDevicePixelRatio();
    let renderedExactFrame = -1;
    let lastRequestedFrame = 0;
    let lastDirection = 1;
    let forceRedraw = true;
    let loadedTier = null;

    function renderFrame(frameIndex, force = false) {
      if (!ctx || !canvas || !cache) return;
      if (frameIndex === renderedExactFrame && !force && !forceRedraw) return;

      const { drawable, isExact } = cache.getDrawable(frameIndex);
      if (!drawable) {
        cache.ensureDecoded(frameIndex, (decodedIdx) => {
          if (Math.round(anim.frame) === decodedIdx) {
            renderFrame(decodedIdx, true);
          }
        }, true);
        return;
      }

      drawCanvasFrame(ctx, canvas, drawable, config.fitMode, config.bgColor, dpr);
      renderedExactFrame = isExact ? frameIndex : -1;
      forceRedraw = false;

      if (!isExact) {
        cache.ensureDecoded(frameIndex, (decodedIdx) => {
          if (Math.round(anim.frame) === decodedIdx) {
            renderFrame(decodedIdx, true);
          }
        }, true);
      }
    }

    /**
     * Synchronous render inside GSAP's ticker rAF (eliminates 1-frame phase lag).
     */
    function renderImmediate() {
      const targetFrame = Math.min(config.totalFrames - 1, Math.max(0, Math.round(anim.frame)));
      if (targetFrame !== lastRequestedFrame) {
        lastDirection = targetFrame > lastRequestedFrame ? 1 : -1;
        lastRequestedFrame = targetFrame;
      }
      renderFrame(targetFrame);
      if (cache) {
        cache.lookahead(targetFrame, lastDirection, (decodedIdx) => {
          if (Math.round(anim.frame) === decodedIdx && renderedExactFrame !== decodedIdx) {
            renderFrame(decodedIdx, true);
          }
        });
      }
    }

    function setActive(isActive) {
      if (cache) cache.setActiveBudget(isActive);
    }

    function resizeCanvas() {
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const width = rect.width || window.innerWidth;
      const height = rect.height || window.innerHeight;
      dpr = getDevicePixelRatio();

      canvas.width = Math.max(1, Math.floor(width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));

      if (ctx) {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
      }

      forceRedraw = true;
      renderFrame(Math.min(config.totalFrames - 1, Math.max(0, Math.round(anim.frame))), true);
    }

    async function loadTier(tier, onProgress, decodeAll = false) {
      const nextCache = await loadSequenceCache(config, tier, onProgress);
      await nextCache.predecodeAnchors(decodeAll && tier === 'desktop');
      if (cache) cache.destroy();
      cache = nextCache;
      loadedTier = tier;
      forceRedraw = true;
      renderedExactFrame = -1;
    }

    function initScrollTrigger() {
      if (!canvas || !scrollContainer) return;
      if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;

      if (timeline) {
        ScrollTrigger.refresh();
        return;
      }

      timeline = buildTimelineFn({
        config,
        scrollContainer,
        anim,
        renderImmediate,
        setActive
      });
    }

    async function switchTierIfNeeded(newTier) {
      if (newTier === loadedTier) return;
      try {
        await loadTier(newTier, () => {}, false);
        resizeCanvas();
      } catch (err) {
        console.warn(`[${config.label}] Background tier switch failed:`, err);
      }
    }

    return {
      config,
      loadTier,
      resizeCanvas,
      renderFrame,
      setActive,
      initScrollTrigger,
      switchTierIfNeeded
    };
  }

  // ==========================================================================
  // SEQUENCE TIMELINE BUILDERS
  // ==========================================================================

  const chefController = createSequenceController(SEQUENCE_CONFIGS.chef, ({ config, scrollContainer, anim, renderImmediate, setActive }) => {
    const scrollIndicator = document.getElementById('scroll-indicator');
    const brandTop = document.getElementById('brand-pill-top');
    const brandBottom = document.getElementById('brand-pill-bottom');
    const s1 = document.getElementById('chef-slide-1');
    const s2 = document.getElementById('chef-slide-2');
    const s3 = document.getElementById('chef-slide-3');
    const isMobile = window.innerWidth < 768;

    if (s1) gsap.set(s1, { opacity: 0, visibility: 'hidden', y: 30 });
    if (s2) gsap.set(s2, { opacity: 0, visibility: 'hidden', y: 30 });
    if (s3) {
      gsap.set(s3, isMobile
        ? { xPercent: -50, yPercent: 0, x: 0, y: 25, opacity: 0, visibility: 'hidden' }
        : { xPercent: 0, yPercent: -50, x: 35, y: 0, opacity: 0, visibility: 'hidden' });
    }

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: scrollContainer,
        start: 'top top',
        end: config.scrollEnd,
        pin: true,
        scrub: config.scrub,
        anticipatePin: 0,
        invalidateOnRefresh: true,
        onEnter: () => setActive(true),
        onEnterBack: () => setActive(true),
        onUpdate: (self) => {
          if (scrollIndicator) {
            scrollIndicator.classList.toggle('faded', self.progress > 0.02);
          }
        }
      }
    });

    tl.to(anim, {
      frame: config.totalFrames - 1,
      ease: 'none',
      duration: 1.0,
      onUpdate: renderImmediate
    }, 0);

    if (s1) {
      tl.set(s1, { visibility: 'visible', opacity: 0, y: 30 }, 0.03)
        .to(s1, { opacity: 1, y: 0, duration: 0.05, ease: 'power2.out' }, 0.04)
        .to(s1, { opacity: 0, y: -20, duration: 0.05, ease: 'power2.in' }, 0.22)
        .set(s1, { visibility: 'hidden' }, 0.27);
    }

    if (s2) {
      tl.set(s2, { visibility: 'visible', opacity: 0, y: 30 }, 0.33)
        .to(s2, { opacity: 1, y: 0, duration: 0.06, ease: 'power2.out' }, 0.35)
        .to(s2, { opacity: 0, y: -20, duration: 0.05, ease: 'power2.in' }, 0.58)
        .set(s2, { visibility: 'hidden' }, 0.64);
    }

    if (s3) {
      const brandTitle = s3.querySelector('.chef-cursive-brand');
      const flourish = s3.querySelector('.chef-flourish-path');
      const subtext = s3.querySelector('.chef-cursive-sub');
      const pill = s3.querySelector('.chef-tags-pill');

      tl.set(s3, {
        visibility: 'visible',
        xPercent: isMobile ? -50 : 0,
        yPercent: isMobile ? 0 : -50
      }, 0.72).fromTo(
        s3,
        {
          opacity: 0,
          xPercent: isMobile ? -50 : 0,
          yPercent: isMobile ? 0 : -50,
          x: isMobile ? 0 : 35,
          y: isMobile ? 25 : 0
        },
        {
          opacity: 1,
          xPercent: isMobile ? -50 : 0,
          yPercent: isMobile ? 0 : -50,
          x: 0,
          y: 0,
          duration: 0.08,
          ease: 'power3.out'
        },
        0.74
      );

      if (brandTitle) {
        tl.fromTo(
          brandTitle,
          { scale: 0.94, filter: 'drop-shadow(0 0 0px rgba(197, 160, 89, 0))' },
          { scale: 1.0, filter: 'drop-shadow(0 4px 28px rgba(197, 160, 89, 0.45)) drop-shadow(0 2px 10px rgba(0, 0, 0, 0.95))', duration: 0.1, ease: 'power2.out' },
          0.75
        );
      }

      if (flourish) {
        tl.fromTo(flourish, { strokeDashoffset: 200 }, { strokeDashoffset: 0, duration: 0.12, ease: 'power2.out' }, 0.77);
      }

      if (subtext) {
        tl.fromTo(subtext, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.07, ease: 'power2.out' }, 0.80);
      }

      if (pill) {
        tl.fromTo(pill, { opacity: 0, scale: 0.92 }, { opacity: 1, scale: 1.0, duration: 0.07, ease: 'back.out(1.5)' }, 0.83);
      }
    }

    if (brandTop) {
      tl.to(brandTop, { opacity: 0, y: -10, duration: 0.06, ease: 'power2.in' }, 0.92);
    }
    if (brandBottom) {
      tl.to(brandBottom, { opacity: 0, y: 10, duration: 0.06, ease: 'power2.in' }, 0.92);
    }

    return tl;
  });

  const brookiesController = createSequenceController(SEQUENCE_CONFIGS.brookies, ({ config, scrollContainer, anim, renderImmediate, setActive }) => {
    const slides = [
      document.getElementById('slide-1'),
      document.getElementById('slide-2'),
      document.getElementById('slide-3'),
      document.getElementById('slide-4')
    ];

    slides.forEach((slide) => {
      if (slide) gsap.set(slide, { opacity: 0, visibility: 'hidden', y: 30 });
    });

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: scrollContainer,
        start: 'top top',
        end: config.scrollEnd,
        pin: true,
        scrub: config.scrub,
        anticipatePin: 0,
        invalidateOnRefresh: true,
        onEnter: () => setActive(true),
        onEnterBack: () => setActive(true)
      }
    });

    tl.to(anim, {
      frame: config.totalFrames - 1,
      ease: 'none',
      duration: 1.0,
      onUpdate: renderImmediate
    }, 0);

    if (slides[0]) {
      tl.set(slides[0], { visibility: 'visible', opacity: 0, y: 30 }, 0.03)
        .to(slides[0], { opacity: 1, y: 0, duration: 0.05, ease: 'power2.out' }, 0.04)
        .to(slides[0], { opacity: 0, y: -20, duration: 0.05, ease: 'power2.in' }, 0.20)
        .set(slides[0], { visibility: 'hidden' }, 0.25);
    }

    if (slides[1]) {
      tl.set(slides[1], { visibility: 'visible', opacity: 0, y: 30 }, 0.28)
        .to(slides[1], { opacity: 1, y: 0, duration: 0.05, ease: 'power2.out' }, 0.29)
        .to(slides[1], { opacity: 0, y: -20, duration: 0.05, ease: 'power2.in' }, 0.46)
        .set(slides[1], { visibility: 'hidden' }, 0.51);
    }

    if (slides[2]) {
      tl.set(slides[2], { visibility: 'visible', opacity: 0, y: 30 }, 0.54)
        .to(slides[2], { opacity: 1, y: 0, duration: 0.05, ease: 'power2.out' }, 0.55)
        .to(slides[2], { opacity: 0, y: -20, duration: 0.05, ease: 'power2.in' }, 0.72)
        .set(slides[2], { visibility: 'hidden' }, 0.77);
    }

    if (slides[3]) {
      tl.set(slides[3], { visibility: 'visible', opacity: 0, y: 25 }, 0.78)
        .to(slides[3], { opacity: 1, y: 0, duration: 0.04, ease: 'power2.out' }, 0.80)
        .to(slides[3], { opacity: 0, y: -15, duration: 0.04, ease: 'power2.in' }, 0.88)
        .set(slides[3], { visibility: 'hidden' }, 0.90);
    }

    return tl;
  });

  const cakeController = createSequenceController(SEQUENCE_CONFIGS.cake, ({ config, scrollContainer, anim, renderImmediate, setActive }) => {
    const introOverlay = document.getElementById('cake-intro-overlay');
    const scrollMessage = document.getElementById('cake-scroll-message');
    const heroOverlay = document.getElementById('cake-hero-overlay');
    const scrollIndicator = document.getElementById('cake-scroll-indicator');

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: scrollContainer,
        start: 'top top',
        end: config.scrollEnd,
        pin: true,
        scrub: config.scrub,
        anticipatePin: 0,
        invalidateOnRefresh: true,
        onEnter: () => setActive(true),
        onEnterBack: () => setActive(true),
        onUpdate: (self) => {
          if (scrollIndicator) {
            scrollIndicator.classList.toggle('faded', self.progress > 0.03);
          }
        }
      }
    });

    tl.to(anim, {
      frame: config.totalFrames - 1,
      ease: 'none',
      duration: 1.0,
      onUpdate: renderImmediate
    }, 0);

    if (introOverlay) {
      tl.to(introOverlay, { opacity: 0, y: -24, duration: 0.14, ease: 'power2.in' }, 0.05);
    }

    if (scrollMessage) {
      tl.fromTo(
        scrollMessage,
        { opacity: 0, y: 30, scale: 0.96 },
        { opacity: 1, y: 0, scale: 1.0, duration: 0.12, ease: 'power2.out' },
        0.38
      ).to(
        scrollMessage,
        { opacity: 0, y: -20, scale: 0.98, duration: 0.10, ease: 'power2.in' },
        0.64
      );
    }

    if (heroOverlay) {
      tl.fromTo(
        heroOverlay,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.15, ease: 'power2.out' },
        0.80
      );
    }

    return tl;
  });

  const allControllers = [chefController, brookiesController, cakeController];

  /**
   * Pre-warms a sequence's cache before scroll enters its viewport.
   */
  function setupProximityWarming() {
    if (!('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const ctrl = allControllers.find((c) => c.config.sectionId === entry.target.id);
          if (ctrl) ctrl.setActive(entry.isIntersecting);
        });
      },
      { rootMargin: '2200px 0px 2200px 0px', threshold: 0 }
    );
    allControllers.forEach((ctrl) => {
      const el = document.getElementById(ctrl.config.sectionId);
      if (el) observer.observe(el);
    });
  }

  /**
   * Waits for all page <img> tags (logo avatar + stitching gallery) to settle.
   */
  function waitForDomImages(onProgress) {
    const imgs = Array.from(document.querySelectorAll('img'));
    if (!imgs.length) {
      onProgress(1, 1);
      return Promise.resolve();
    }

    let done = 0;
    onProgress(0, imgs.length);

    return Promise.all(
      imgs.map((img) => {
        if (img.complete) {
          done++;
          onProgress(done, imgs.length);
          return typeof img.decode === 'function' ? img.decode().catch(() => {}) : Promise.resolve();
        }
        return new Promise((resolve) => {
          const finish = () => {
            done++;
            onProgress(done, imgs.length);
            if (typeof img.decode === 'function') {
              img.decode().catch(() => {}).finally(resolve);
            } else {
              resolve();
            }
          };
          img.addEventListener('load', finish, { once: true });
          img.addEventListener('error', finish, { once: true });
        });
      })
    );
  }

  /**
   * Waits for web fonts without letting blocked external font CDNs trap the preloader.
   */
  function waitForFonts() {
    if (!document.fonts || !document.fonts.ready) return Promise.resolve();
    return Promise.race([
      document.fonts.ready.catch(() => {}),
      new Promise((resolve) => setTimeout(resolve, 2500))
    ]);
  }

  /**
   * Master Full-Experience Boot Gate:
   * Blocks page interaction/scroll until all 3 sequences, DOM images, fonts,
   * anchor frames, and ScrollTriggers are 100% loaded and ready.
   */
  async function bootFullExperience() {
    const preloader = document.getElementById('preloader');
    const preloaderBar = document.getElementById('preloader-bar');
    const preloaderPercent = document.getElementById('preloader-percent');
    const preloaderSubtitle = document.getElementById('preloader-subtitle');

    if ('scrollRestoration' in history) {
      history.scrollRestoration = 'manual';
    }
    window.scrollTo(0, 0);
    document.documentElement.classList.add('is-preloading');

    const progressState = {
      chef: { ratio: 0, weight: SEQUENCE_CONFIGS.chef.estimatedBytes[activeTier] },
      brookies: { ratio: 0, weight: SEQUENCE_CONFIGS.brookies.estimatedBytes[activeTier] },
      cake: { ratio: 0, weight: SEQUENCE_CONFIGS.cake.estimatedBytes[activeTier] },
      domImgs: { loaded: 0, total: 1 },
      fontsDone: false,
      maxPercent: 0
    };

    function updateUI(statusText) {
      const totalWeight = progressState.chef.weight + progressState.brookies.weight + progressState.cake.weight;
      const weightedProgress =
        progressState.chef.ratio * progressState.chef.weight +
        progressState.brookies.ratio * progressState.brookies.weight +
        progressState.cake.ratio * progressState.cake.weight;
      const seqRatio = Math.min(1, weightedProgress / Math.max(1, totalWeight));
      const imgRatio = Math.min(1, progressState.domImgs.loaded / Math.max(1, progressState.domImgs.total));
      const fontRatio = progressState.fontsDone ? 1 : 0;

      // 86% sequences, 10% gallery/brand images, 3% fonts, final 1% on scene setup
      const rawPercent = Math.floor(seqRatio * 86 + imgRatio * 10 + fontRatio * 3);
      progressState.maxPercent = Math.max(progressState.maxPercent, Math.min(99, rawPercent));

      if (preloaderBar) preloaderBar.style.width = `${progressState.maxPercent}%`;
      if (preloaderPercent) preloaderPercent.textContent = `${progressState.maxPercent}%`;
      if (preloaderSubtitle && statusText) preloaderSubtitle.textContent = statusText;
    }

    try {
      await Promise.all([
        ...allControllers.map((ctrl) =>
          ctrl.loadTier(
            activeTier,
            (loaded, total) => {
              progressState[ctrl.config.id].ratio = Math.min(1, loaded / Math.max(1, total));
              updateUI();
            },
            ctrl === chefController
          )
        ),
        waitForDomImages((done, total) => {
          progressState.domImgs.loaded = done;
          progressState.domImgs.total = total;
          updateUI();
        }),
        waitForFonts().then(() => {
          progressState.fontsDone = true;
          updateUI();
        })
      ]);
    } catch (err) {
      console.error('[Kochumagique] Error during asset boot:', err);
    }

    if (preloaderSubtitle) preloaderSubtitle.textContent = 'Preparing Canvas Sequences';

    // Render resting Frame 0 across all 3 canvases before entry
    allControllers.forEach((ctrl) => {
      ctrl.resizeCanvas();
      ctrl.renderFrame(0, true);
    });

    // Unlock scroll before ScrollTrigger.refresh & Lenis init so Dimensions measures full scrollHeight immediately
    hasEntered = true;
    document.documentElement.classList.remove('is-preloading');
    if ('scrollRestoration' in history) {
      history.scrollRestoration = 'auto';
    }

    // Deterministic DOM-order ScrollTrigger setup
    if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
      gsap.registerPlugin(ScrollTrigger);
      ScrollTrigger.config({ ignoreMobileResize: true });

      allControllers.forEach((ctrl) => ctrl.initScrollTrigger());
      ScrollTrigger.sort();
      ScrollTrigger.refresh(true);
      initLenis();
      if (lenisInstance && typeof lenisInstance.resize === 'function') {
        lenisInstance.resize();
      }
    } else {
      initLenis();
      if (lenisInstance && typeof lenisInstance.resize === 'function') {
        lenisInstance.resize();
      }
    }

    setupProximityWarming();
    chefController.setActive(true);

    // Complete 100% progress bar and unlock user entry
    if (preloaderBar) preloaderBar.style.width = '100%';
    if (preloaderPercent) preloaderPercent.textContent = '100%';
    if (preloaderSubtitle) preloaderSubtitle.textContent = 'Welcome to Kochumagique';

    const hash = window.location.hash;
    const hashTarget = hash && hash !== '#home' ? document.querySelector(hash) : null;
    if (hashTarget) {
      if (lenisInstance) {
        lenisInstance.scrollTo(hashTarget, { immediate: true });
      } else {
        hashTarget.scrollIntoView({ behavior: 'auto' });
      }
    } else {
      window.scrollTo(0, 0);
    }

    if (typeof ScrollTrigger !== 'undefined') {
      requestAnimationFrame(() => ScrollTrigger.refresh());
    }

    if (preloader) {
      requestAnimationFrame(() => {
        preloader.classList.add('loaded');
      });
    }

    console.log(`[Kochumagique] Full experience loaded (${activeTier} tier, 425 frames ready).`);
  }

  // ==========================================================================
  // GLOBAL RESIZE LISTENER WITH MOBILE ADDRESS BAR DEBOUNCE
  // ==========================================================================
  let lastWindowWidth = window.innerWidth;
  let resizeTimeout = null;

  window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      if (!hasEntered) return;
      const currentWidth = window.innerWidth;
      const widthChanged = Math.abs(currentWidth - lastWindowWidth) > 10;
      if (!widthChanged) return;

      lastWindowWidth = currentWidth;
      const newTier = currentWidth < 768 ? 'mobile' : 'desktop';

      if (newTier !== activeTier) {
        activeTier = newTier;
        Promise.all(allControllers.map((ctrl) => ctrl.switchTierIfNeeded(newTier))).then(() => {
          if (typeof ScrollTrigger !== 'undefined') ScrollTrigger.refresh();
        });
      } else {
        allControllers.forEach((ctrl) => ctrl.resizeCanvas());
        if (typeof ScrollTrigger !== 'undefined') ScrollTrigger.refresh();
      }
    }, 150);
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootFullExperience);
  } else {
    bootFullExperience();
  }
})();
