/**
 * ==========================================================================
 * KOCHUMAGIQUE — Atelier & Loom Interactive Stitching Gallery Engine
 * Category Filtering + Luxury Fullscreen Lightbox Modal + Keyboard Nav
 * ==========================================================================
 */

(function () {
  'use strict';

  const STITCHING_DATA = [
    {
      id: 'bedsheet-suite-wide',
      category: 'bedding',
      badge: 'Signature Bedding Suite',
      title: 'Botanical Azure Bedding Suite',
      subtitle: 'Pure Breathable Cotton & Archival Lace Ties',
      description: 'Handcrafted from crisp, breathable natural cotton adorned with delicate botanical floral prints in serene azure. Features hand-stitched archival lace borders and soft hand-tied ribbon ties along the pillow shams for a restful heirloom sanctuary.',
      primaryImage: 'assets/stitching/bedsheet-suite-wide.webp',
      altImage: 'assets/stitching/bedsheet-detail-tie.webp',
      thumb: 'assets/stitching/bedsheet-suite-wide-thumb.webp',
      specs: {
        technique: 'Hand-Finished Seams & Lace Edging',
        material: '100% Breathable Pure Cotton',
        accents: 'Hand-Tied Linen Ribbon Knots',
        care: 'Gentle Hand Wash or Delicates Cycle'
      },
      tag: 'Bedsheet & Shams'
    },
    {
      id: 'cushion-mayilpeeli-embroidery',
      category: 'cushions',
      badge: 'Bespoke Embroidery',
      title: 'The Mayilpeeli Heirloom Cushion',
      subtitle: 'Peacock Feather Embroidery & Gold Tassels',
      description: 'An artisanal tribute to Kerala’s timeless classical art forms. Embellished with a hand-embroidered peacock feather (Mayilpeeli) motif, golden flute needlework, pure metallic Kasavu band, and handcrafted dangling silk tassels.',
      primaryImage: 'assets/stitching/cushion-mayilpeeli-embroidery.webp',
      thumb: 'assets/stitching/cushion-mayilpeeli-embroidery-thumb.webp',
      specs: {
        technique: 'Bespoke Threadwork & Kasavu Zari',
        material: 'Luminous Pure Raw Silk',
        accents: 'Hand-Tied Hanging Silk Tassels',
        care: 'Dry Clean Recommended'
      },
      tag: 'Kasavu Cushion'
    },
    {
      id: 'cushion-scalloped-lace-diptych',
      category: 'cushions',
      badge: 'Hand-Laced Diptych',
      title: 'The Scalloped Diptych Cushion',
      subtitle: 'Chevron Kasavu & Crimson Brocade Dual Tone',
      description: 'A luxurious meeting of two worlds. The upper panel presents fine ivory chevron Kasavu needlework, meeting rich crimson jacquard brocade through an intricate scalloped golden lace insert.',
      primaryImage: 'assets/stitching/cushion-scalloped-lace-diptych.webp',
      thumb: 'assets/stitching/cushion-scalloped-lace-diptych-thumb.webp',
      specs: {
        technique: 'Dual-Panel Joinery & Scalloped Lace',
        material: 'Kasavu Silk & Crimson Brocade',
        accents: 'Scalloped Antique Gold Lace',
        care: 'Dry Clean Recommended'
      },
      tag: 'Brocade & Kasavu'
    },
    {
      id: 'sofa-curated-living',
      category: 'living',
      badge: 'Curated Living Harmony',
      title: 'The Kasavu Living Trio Ensemble',
      subtitle: 'Harmonious Styling for Modern Homes',
      description: 'A real-world styling showcase demonstrating how our textile creations converse within an interior. Featuring a triad of Horizontal Kasavu, Saffron Raw Silk, and Vertical Chevron cushions arranged on a tailored linen armchair beside lush foliage.',
      primaryImage: 'assets/stitching/sofa-curated-living.webp',
      thumb: 'assets/stitching/sofa-curated-living-thumb.webp',
      specs: {
        technique: 'Ensemble Styling & Spatial Harmony',
        material: 'Mixed Kasavu Silk & Saffron Raw Silk',
        accents: 'Multi-Textural Cohesion',
        care: 'Collection Care Set Included'
      },
      tag: 'Living Ensemble'
    },
    {
      id: 'cushion-crimson-brocade',
      category: 'cushions',
      badge: 'Royal Brocade',
      title: 'The Heritage Crimson Brocade',
      subtitle: 'Regal Diagonal Zari Wave Jacquard',
      description: 'Woven from royal scarlet raw silk with undulating diagonal metallic zari waves. Evokes the quiet grandeur of Kerala palace tapestries, providing a rich, opulent accent to neutral seating.',
      primaryImage: 'assets/stitching/cushion-crimson-brocade.webp',
      thumb: 'assets/stitching/cushion-crimson-brocade-thumb.webp',
      specs: {
        technique: 'Jacquard Loom Zari Weaving',
        material: 'Crimson Heritage Silk Brocade',
        accents: 'Tone-on-Tone Gold Zari Sheen',
        care: 'Dry Clean Recommended'
      },
      tag: 'Heritage Brocade'
    },
    {
      id: 'cushion-royal-kasavu-band',
      category: 'cushions',
      badge: 'Traditional Kasavu',
      title: 'The Royal Kasavu Band Cushion',
      subtitle: 'Micro-Checkered Weave with Wide Gold Zari',
      description: 'Exemplifying traditional Kerala Kasavu handloom simplicity and nobility. A fine ivory micro-checkered weave is crowned by a wide, brilliant gold zari band running across its center.',
      primaryImage: 'assets/stitching/cushion-royal-kasavu-band.webp',
      thumb: 'assets/stitching/cushion-royal-kasavu-band-thumb.webp',
      specs: {
        technique: 'Kasavu Handloom Checkered Weave',
        material: 'Pure Cream Silk Cotton',
        accents: 'High-Lustre Central Kasavu Zari',
        care: 'Gentle Hand Wash or Dry Clean'
      },
      tag: 'Pure Kasavu'
    },
    {
      id: 'cushion-saffron-raw-silk',
      category: 'cushions',
      badge: 'Textured Raw Silk',
      title: 'The Saffron Raw Silk Cushion',
      subtitle: 'Textured Ochre Micro-Geometric Weave',
      description: 'Woven with authentic raw slub silk in rich ochre-saffron. The subtle micro-diamond texture reflects light with warmth, offering an earthy, grounding element to any tailored sofa.',
      primaryImage: 'assets/stitching/cushion-saffron-raw-silk.webp',
      thumb: 'assets/stitching/cushion-saffron-raw-silk-thumb.webp',
      specs: {
        technique: 'Slub Silk Textured Weaving',
        material: '100% Earthy Saffron Raw Silk',
        accents: 'Micro-Textured Diamond Weave',
        care: 'Dry Clean Recommended'
      },
      tag: 'Earthy Raw Silk'
    },
    {
      id: 'cushion-horizontal-kasavu',
      category: 'cushions',
      badge: 'Linear Kasavu',
      title: 'The Horizontal Kasavu Stripe',
      subtitle: 'Pristine Ivory Silk with Metallic Ribbons',
      description: 'Clean lines meet traditional splendor. Sleek horizontal bands of golden zari intersect pristine hand-woven cream silk, delivering a balanced, modern architectural rhythm.',
      primaryImage: 'assets/stitching/cushion-horizontal-kasavu.webp',
      thumb: 'assets/stitching/cushion-horizontal-kasavu-thumb.webp',
      specs: {
        technique: 'Horizontal Zari Inlay',
        material: 'Fine Handloom Ivory Silk',
        accents: 'Metallic Gold Kasavu Ribbons',
        care: 'Gentle Hand Wash or Dry Clean'
      },
      tag: 'Modern Kasavu'
    },
    {
      id: 'cushion-vertical-chevron-kasavu',
      category: 'cushions',
      badge: 'Chevron Needlework',
      title: 'The Vertical Chevron Kasavu',
      subtitle: 'Linear Chevron Needlework & Gold Ribbons',
      description: 'A contemporary interpretation of traditional border motifs. Features rhythmic vertical columns of golden chevron waves and straight zari lines across ivory silk.',
      primaryImage: 'assets/stitching/cushion-vertical-chevron-kasavu.webp',
      thumb: 'assets/stitching/cushion-vertical-chevron-kasavu-thumb.webp',
      specs: {
        technique: 'Vertical Chevron Needlecraft',
        material: 'Hand-Loomed Cream Silk',
        accents: 'Alternating Chevron & Stripe Zari',
        care: 'Dry Clean Recommended'
      },
      tag: 'Chevron Kasavu'
    },
    {
      id: 'bedsheet-detail-tie',
      category: 'bedding',
      badge: 'Artisanal Macro Detail',
      title: 'Hand-Tied Ribbon & Lace Accents',
      subtitle: 'Tailored Pillow Sham Corner Craft',
      description: 'A macro study of our pillow sham finishing: soft sky-blue cotton tailored with double hand-stitched archival cotton lace borders and secure hand-tied ribbon closures.',
      primaryImage: 'assets/stitching/bedsheet-detail-tie.webp',
      thumb: 'assets/stitching/bedsheet-detail-tie-thumb.webp',
      specs: {
        technique: 'Pillow Sham Corner Tie & Lace Inset',
        material: 'Natural Sky-Blue Cotton & Archival Lace',
        accents: 'Hand-Tied Ribbon Knots',
        care: 'Gentle Cycle, Air Dry'
      },
      tag: 'Loom Detail'
    }
  ];

  let currentLightboxIndex = 0;
  let activeFilter = 'all';

  function initStitchingGallery() {
    const filterButtons = document.querySelectorAll('.stitching-filter-btn');
    const cards = document.querySelectorAll('.stitching-card');
    const lightbox = document.getElementById('stitching-lightbox');

    if (!cards.length) return;

    // 1. Category Filtering
    filterButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const targetCategory = btn.getAttribute('data-filter') || 'all';
        activeFilter = targetCategory;

        filterButtons.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');

        cards.forEach((card) => {
          const cardCategory = card.getAttribute('data-category');
          if (targetCategory === 'all' || cardCategory === targetCategory) {
            card.style.display = '';
            if (typeof gsap !== 'undefined') {
              gsap.fromTo(card, { opacity: 0, y: 15 }, { opacity: 1, y: 0, duration: 0.35, ease: 'power2.out' });
            } else {
              card.style.opacity = '1';
            }
          } else {
            card.style.display = 'none';
          }
        });

        // Trigger ScrollTrigger refresh if available
        if (typeof ScrollTrigger !== 'undefined') {
          ScrollTrigger.refresh();
        }
      });
    });

    // 2. Card Click -> Open Lightbox
    cards.forEach((card) => {
      card.addEventListener('click', (e) => {
        // Don't open if clicking on an interactive inner button
        if (e.target.closest('.stitching-toggle-btn')) return;

        const itemId = card.getAttribute('data-item-id');
        const itemIdx = STITCHING_DATA.findIndex((it) => it.id === itemId);
        if (itemIdx !== -1) {
          openLightbox(itemIdx);
        }
      });
    });

    // 3. Bedding Toggle View Button
    const beddingToggleBtn = document.getElementById('bedding-view-toggle');
    if (beddingToggleBtn) {
      beddingToggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const beddingCard = document.querySelector('[data-item-id="bedsheet-suite-wide"]');
        if (!beddingCard) return;
        const imgEl = beddingCard.querySelector('.stitching-img');
        const labelEl = beddingToggleBtn.querySelector('.toggle-label');
        const isDetail = imgEl.src.includes('detail-tie');

        if (isDetail) {
          imgEl.src = 'assets/stitching/bedsheet-suite-wide.webp';
          if (labelEl) labelEl.textContent = 'View Lace Detail';
        } else {
          imgEl.src = 'assets/stitching/bedsheet-detail-tie.webp';
          if (labelEl) labelEl.textContent = 'View Bedroom Setting';
        }
      });
    }

    // 4. Lightbox Controls
    if (lightbox) {
      const closeBtn = lightbox.querySelector('.stitching-lightbox-close');
      const prevBtn = lightbox.querySelector('.stitching-lightbox-prev');
      const nextBtn = lightbox.querySelector('.stitching-lightbox-next');

      if (closeBtn) closeBtn.addEventListener('click', closeLightbox);
      if (prevBtn) prevBtn.addEventListener('click', () => navigateLightbox(-1));
      if (nextBtn) nextBtn.addEventListener('click', () => navigateLightbox(1));

      // Close on backdrop click
      lightbox.addEventListener('click', (e) => {
        if (e.target === lightbox) {
          closeLightbox();
        }
      });

      // Keyboard navigation
      window.addEventListener('keydown', (e) => {
        if (!lightbox.classList.contains('active')) return;
        if (e.key === 'Escape') closeLightbox();
        if (e.key === 'ArrowLeft') navigateLightbox(-1);
        if (e.key === 'ArrowRight') navigateLightbox(1);
      });
    }
  }

  function openLightbox(index) {
    const lightbox = document.getElementById('stitching-lightbox');
    if (!lightbox) return;

    currentLightboxIndex = index;
    updateLightboxContent(STITCHING_DATA[index]);

    lightbox.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeLightbox() {
    const lightbox = document.getElementById('stitching-lightbox');
    if (!lightbox) return;

    lightbox.classList.remove('active');
    document.body.style.overflow = '';
  }

  function navigateLightbox(direction) {
    let newIndex = currentLightboxIndex + direction;
    if (newIndex < 0) newIndex = STITCHING_DATA.length - 1;
    if (newIndex >= STITCHING_DATA.length) newIndex = 0;
    openLightbox(newIndex);
  }

  function updateLightboxContent(item) {
    const lightbox = document.getElementById('stitching-lightbox');
    if (!lightbox || !item) return;

    const imgEl = lightbox.querySelector('.stitching-lightbox-img');
    const badgeEl = lightbox.querySelector('.stitching-lb-badge');
    const titleEl = lightbox.querySelector('.stitching-lb-title');
    const subtitleEl = lightbox.querySelector('.stitching-lb-subtitle');
    const descEl = lightbox.querySelector('.stitching-lb-desc');
    const techEl = lightbox.querySelector('.stitching-lb-technique');
    const matEl = lightbox.querySelector('.stitching-lb-material');
    const accEl = lightbox.querySelector('.stitching-lb-accents');
    const careEl = lightbox.querySelector('.stitching-lb-care');

    if (imgEl) {
      imgEl.src = item.primaryImage;
      imgEl.alt = item.title;
    }
    if (badgeEl) badgeEl.textContent = item.badge;
    if (titleEl) titleEl.textContent = item.title;
    if (subtitleEl) subtitleEl.textContent = item.subtitle;
    if (descEl) descEl.textContent = item.description;

    if (techEl) techEl.textContent = item.specs.technique;
    if (matEl) matEl.textContent = item.specs.material;
    if (accEl) accEl.textContent = item.specs.accents;
    if (careEl) careEl.textContent = item.specs.care;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initStitchingGallery);
  } else {
    initStitchingGallery();
  }
})();
