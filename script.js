// Variables globales
let isPlaying = false;
let isMuted = false;
let currentChannelIndex = 0;
let currentAudio = null;
let scrollLocked = false;
let scrollLockTimeout = null;

// Configuración de canales
const channels = [
  { name: "CH 01: PRÓXIMAMENTE", audio: "audio/channel_01.mp3", status: "próximamente" },
  { name: "CH 02: PRÓXIMAMENTE", audio: "audio/channel_02.mp3", status: "próximamente" },
  { name: "CH 03: PRÓXIMAMENTE", audio: "audio/channel_03.mp3", status: "próximamente" },
  { name: "CH 04: PRÓXIMAMENTE", audio: "audio/channel_04.mp3", status: "próximamente" },
  { name: "CH 05: PRÓXIMAMENTE", audio: "audio/channel_05.mp3", status: "próximamente" }
];

// ===== RELOJ =====
function updateClock() {
  const now = new Date();
  const timeString = `[${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}]`;
  
  ['liveClock', 'mobileLiveClock', 'mobileLiveClock2'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = timeString;
  });
}

updateClock();
setInterval(updateClock, 1000);

// ===== BARRA DE REFLEXIONES =====
function closeReflectionBar() {
  const bar = document.getElementById('reflectionBar');
  if (bar) bar.classList.add('hidden');
}

// ===== AUDIO =====
function loadAudio(index) {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.removeEventListener('ended', soundNextTrack);
    currentAudio = null;
  }
  
  if (channels[index] && channels[index].status === "disponible") {
    try {
      currentAudio = new Audio(channels[index].audio);
      currentAudio.addEventListener('ended', soundNextTrack);
      currentAudio.volume = 0.7;
      console.log(`Audio cargado: ${channels[index].name}`);
    } catch (error) {
      console.error('Error cargando audio:', error);
      currentAudio = null;
    }
  } else {
    currentAudio = null;
    console.log(`Canal ${index + 1}: Próximamente`);
  }
}

function soundTogglePlayPause() {
  const playBtn = document.getElementById('soundPlayBtn');
  
  // Si no hay audio cargado, intentar cargar
  if (!currentAudio) {
    loadAudio(currentChannelIndex);
  }
  
  // Si sigue sin audio (canal no disponible), mostrar mensaje
  if (!currentAudio) {
    console.log('Canal no disponible aún');
    // Simular estado "playing" para canales próximamente
    isPlaying = !isPlaying;
    updatePlayButtonState();
    return;
  }

  try {
    if (isPlaying) {
      currentAudio.pause();
      isPlaying = false;
    } else {
      currentAudio.play()
        .then(() => {
          isPlaying = true;
          updatePlayButtonState();
        })
        .catch(error => {
          console.error('Error reproduciendo audio:', error);
          isPlaying = false;
          updatePlayButtonState();
        });
    }
    updatePlayButtonState();
  } catch (error) {
    console.error('Error en toggle play/pause:', error);
  }
}

function updatePlayButtonState() {
  const playBtn = document.getElementById('soundPlayBtn');
  if (!playBtn) return;
  
  if (isPlaying) {
    playBtn.classList.add('playing');
    // SVG de pause con color correcto
    playBtn.innerHTML = '<svg width="12" height="12" viewBox="0 0 12 12"><rect x="3" y="2" width="2" height="8" fill="#000"/><rect x="7" y="2" width="2" height="8" fill="#000"/></svg>';
  } else {
    playBtn.classList.remove('playing');
    // SVG de play con color de texto normal
    playBtn.innerHTML = '<svg width="12" height="12" viewBox="0 0 12 12"><path d="M3 0v12l9-6z" fill="currentColor"/></svg>';
  }
}

function soundStop() {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
  }
  isPlaying = false;
  updatePlayButtonState();
}

function soundSelectChannel(index) {
  if (index < 0 || index >= channels.length) return;
  
  console.log(`Seleccionando canal ${index + 1}: ${channels[index].name}`);
  
  // Detener audio actual si está reproduciendo
  if (isPlaying && currentAudio) {
    currentAudio.pause();
    isPlaying = false;
  }
  
  // Actualizar índice actual
  currentChannelIndex = index;
  
  // Actualizar UI de canales
  document.querySelectorAll('.sound-channel-item').forEach((item, i) => {
    item.classList.toggle('selected', i === index);
  });
  
  // Cargar nuevo audio
  loadAudio(index);
  
  // Resetear botón de play
  updatePlayButtonState();
}

function soundPreviousTrack() {
  currentChannelIndex = (currentChannelIndex - 1 + channels.length) % channels.length;
  soundSelectChannel(currentChannelIndex);
}

function soundNextTrack() {
  currentChannelIndex = (currentChannelIndex + 1) % channels.length;
  soundSelectChannel(currentChannelIndex);
}

// ===== SCROLL - Funciones necesarias para el reproductor =====
function lockScrollSmooth() {
  if (scrollLocked) return;
  scrollLocked = true;
  document.body.style.overflow = 'hidden';
}

function unlockScrollSmooth() {
  if (!scrollLocked) return;
  document.body.style.overflow = '';
  scrollLocked = false;
}

function scheduleScrollUnlockSmooth(delay = 300) {
  if (scrollLockTimeout) clearTimeout(scrollLockTimeout);
  scrollLockTimeout = setTimeout(() => {
    unlockScrollSmooth();
    scrollLockTimeout = null;
  }, delay);
}

// ===== CARRUSEL SÚPER SIMPLE CON FIX PARA MOBILE =====
class SimpleCarousel {
  constructor(element, index) {
    this.carousel = element;
    this.index = index;
    this.track = element.querySelector('.carousel-track');
    this.slides = element.querySelectorAll('.carousel-slide');
    this.indicators = element.querySelector('.carousel-indicators');
    this.prevBtn = element.querySelector('.carousel-btn.prev');
    this.nextBtn = element.querySelector('.carousel-btn.next');
    
    this.currentSlide = 0;
    this.totalSlides = this.slides.length;
    
    // Variables para touch - MEJORADAS
    this.touchStartX = 0;
    this.touchStartY = 0;
    this.touchEndX = 0;
    this.touchEndY = 0;
    this.touchStartTime = 0;
    this.isTouchActive = false;
    this.hasMovedHorizontally = false;
    
    if (!this.track || this.totalSlides === 0) {
      console.warn(`Carrusel ${index} incompleto`);
      return;
    }
    
    this.init();
  }
  
  init() {
    console.log(`Inicializando carrusel ${this.index} con ${this.totalSlides} slides`);
    
    // Forzar estilos
    this.track.style.cssText = `
      display: flex !important;
      width: ${this.totalSlides * 100}% !important;
      transition: transform 0.3s ease !important;
      transform: translateX(0%) !important;
    `;
    
    this.slides.forEach((slide, i) => {
      slide.style.cssText = `
        width: ${100 / this.totalSlides}% !important;
        flex: 0 0 ${100 / this.totalSlides}% !important;
        min-width: ${100 / this.totalSlides}% !important;
      `;
    });
    
    this.createIndicators();
    this.addEventListeners();
    this.updateCarousel();
    
    console.log(`✅ Carrusel ${this.index} listo`);
  }
  
  createIndicators() {
    if (!this.indicators || this.totalSlides <= 1) return;
    
    this.indicators.innerHTML = '';
    for (let i = 0; i < this.totalSlides; i++) {
      const dot = document.createElement('div');
      dot.classList.add('carousel-dot');
      if (i === 0) dot.classList.add('active');
      dot.addEventListener('click', () => this.goToSlide(i));
      this.indicators.appendChild(dot);
    }
  }
  
  updateCarousel() {
    const offset = -(this.currentSlide * (100 / this.totalSlides));
    this.track.style.transform = `translateX(${offset}%)`;
    
    // Actualizar indicadores
    if (this.indicators) {
      const dots = this.indicators.querySelectorAll('.carousel-dot');
      dots.forEach((dot, i) => {
        dot.classList.toggle('active', i === this.currentSlide);
      });
    }
    
    console.log(`Carrusel ${this.index} -> slide ${this.currentSlide}`);
  }
  
  goToSlide(index) {
    if (index >= 0 && index < this.totalSlides) {
      this.currentSlide = index;
      this.updateCarousel();
    }
  }
  
  nextSlide() {
    if (this.currentSlide < this.totalSlides - 1) {
      this.currentSlide++;
      this.updateCarousel();
    }
  }
  
  prevSlide() {
    if (this.currentSlide > 0) {
      this.currentSlide--;
      this.updateCarousel();
    }
  }
  
  // Verificar si el carousel está en modo tarjeta (no expandido) en mobile
  isCardMode() {
    if (window.innerWidth > 1024) return false;
    const project = this.carousel.closest('.project');
    return project && !project.classList.contains('expanded');
  }

  // NUEVOS MÉTODOS TOUCH OPTIMIZADOS
  handleTouchStart(e) {
    // En modo tarjeta, no procesar touch del carousel
    if (this.isCardMode()) return;

    this.touchStartX = e.touches[0].clientX;
    this.touchStartY = e.touches[0].clientY;
    this.touchStartTime = Date.now();
    this.isTouchActive = true;
    this.hasMovedHorizontally = false;

    // Pausar transición durante el touch
    this.track.style.transition = 'none';
  }
  
  handleTouchMove(e) {
    if (!this.isTouchActive || this.isCardMode()) return;

    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const deltaX = currentX - this.touchStartX;
    const deltaY = currentY - this.touchStartY;
    
    // Determinar dirección del swipe
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
      this.hasMovedHorizontally = true;
      e.preventDefault(); // Prevenir scroll vertical
      e.stopPropagation();
      
      // Feedback visual durante el drag
      const dragProgress = deltaX / this.track.offsetWidth;
      const currentOffset = -(this.currentSlide * (100 / this.totalSlides));
      const newOffset = currentOffset + (dragProgress * 100);
      
      this.track.style.transform = `translateX(${newOffset}%)`;
    }
  }
  
  handleTouchEnd(e) {
    if (!this.isTouchActive || this.isCardMode()) return;
    
    this.touchEndX = e.changedTouches[0].clientX;
    this.touchEndY = e.changedTouches[0].clientY;
    
    const deltaX = this.touchEndX - this.touchStartX;
    const deltaY = this.touchEndY - this.touchStartY;
    const deltaTime = Date.now() - this.touchStartTime;
    
    // Restaurar transición
    this.track.style.transition = 'transform 0.3s ease';
    
    // Lógica de swipe mejorada
    const minSwipeDistance = 50;
    const maxSwipeTime = 300;
    const isHorizontalSwipe = Math.abs(deltaX) > Math.abs(deltaY);
    const isFastSwipe = deltaTime < maxSwipeTime;
    const isLongSwipe = Math.abs(deltaX) > minSwipeDistance;
    
    if (isHorizontalSwipe && (isFastSwipe || isLongSwipe)) {
      if (deltaX > 0) {
        this.prevSlide();
      } else {
        this.nextSlide();
      }
    } else {
      // Volver a la posición actual si no es un swipe válido
      this.updateCarousel();
    }
    
    // Reset de variables
    this.isTouchActive = false;
    this.hasMovedHorizontally = false;
    
    // Timeout para asegurar que el estado se resetee completamente
    setTimeout(() => {
      this.isTouchActive = false;
    }, 50);
  }
  
  addEventListeners() {
    // Botones
    if (this.prevBtn) {
      this.prevBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.prevSlide();
      });
    }
    
    if (this.nextBtn) {
      this.nextBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.nextSlide();
      });
    }
    
    // Touch events OPTIMIZADOS con mejor manejo
    this.track.addEventListener('touchstart', (e) => {
      this.handleTouchStart(e);
    }, { passive: false });
    
    this.track.addEventListener('touchmove', (e) => {
      this.handleTouchMove(e);
    }, { passive: false });
    
    this.track.addEventListener('touchend', (e) => {
      this.handleTouchEnd(e);
    }, { passive: false });
    
    // Prevenir comportamientos indeseados
    this.track.addEventListener('touchcancel', (e) => {
      this.isTouchActive = false;
      this.track.style.transition = 'transform 0.3s ease';
      this.updateCarousel();
    }, { passive: false });
    
    // Lightbox solo en desktop
    this.slides.forEach(slide => {
      slide.addEventListener('click', (e) => {
        if (!this.hasMovedHorizontally && window.innerWidth > 1024) {
          const img = slide.querySelector('img');
          if (img?.src) {
            openLightbox(img.src, this.carousel);
          }
        }
      });
    });
  }
}

// ===== LIGHTBOX =====
let currentLightboxCarousel = null;
let currentLightboxSlide = 0;
let lightboxSlides = [];

function openLightbox(imageSrc, carouselElement = null) {
  if (!imageSrc || window.innerWidth <= 1024) return;
  
  const lightbox = document.getElementById('lightbox');
  const lightboxImage = document.getElementById('lightboxImage');
  
  if (lightbox && lightboxImage) {
    if (carouselElement) {
      currentLightboxCarousel = carouselElement;
      lightboxSlides = Array.from(carouselElement.querySelectorAll('.carousel-slide img')).map(img => img.src);
      currentLightboxSlide = lightboxSlides.indexOf(imageSrc);
    } else {
      lightboxSlides = [imageSrc];
      currentLightboxSlide = 0;
    }
    
    lightbox.style.display = 'flex';
    lightboxImage.src = imageSrc;
    document.body.style.overflow = 'hidden';
    updateLightboxNavigation();
    
    requestAnimationFrame(() => lightbox.classList.add('active'));
  }
}

function lightboxPrevious() {
  if (currentLightboxSlide > 0) {
    currentLightboxSlide--;
    updateLightboxImage();
  }
}

function lightboxNext() {
  if (currentLightboxSlide < lightboxSlides.length - 1) {
    currentLightboxSlide++;
    updateLightboxImage();
  }
}

function updateLightboxImage() {
  const lightboxImage = document.getElementById('lightboxImage');
  if (lightboxImage && lightboxSlides[currentLightboxSlide]) {
    lightboxImage.src = lightboxSlides[currentLightboxSlide];
    updateLightboxNavigation();
  }
}

function updateLightboxNavigation() {
  const prevBtn = document.getElementById('lightboxPrev');
  const nextBtn = document.getElementById('lightboxNext');
  
  if (prevBtn) prevBtn.disabled = currentLightboxSlide === 0;
  if (nextBtn) nextBtn.disabled = currentLightboxSlide === lightboxSlides.length - 1;
}

function closeLightbox() {
  const lightbox = document.getElementById('lightbox');
  if (lightbox) {
    lightbox.classList.remove('active');
    setTimeout(() => {
      if (!lightbox.classList.contains('active')) {
        lightbox.style.display = 'none';
        document.body.style.overflow = 'auto';
      }
    }, 500);
  }
}

// ===== INICIALIZACIÓN =====
function initCarousels() {
  console.log('🚀 Inicializando carruseles...');
  
  const carousels = document.querySelectorAll('.project-carousel');
  console.log(`Encontrados ${carousels.length} carruseles`);
  
  carousels.forEach((carousel, index) => {
    new SimpleCarousel(carousel, index);
  });
}

// DOM Ready con múltiples estrategias
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM listo');
  
  setTimeout(() => {
    initCarousels();
    soundSelectChannel(0);
    initLocoScroll();
    initCardParallax();
    console.log('✅ Inicialización completa');
  }, 100);
});

// Backup con delay mayor
window.addEventListener('load', () => {
  setTimeout(() => {
    const carousels = document.querySelectorAll('.project-carousel');
    if (carousels.length > 0) {
      console.log('🔄 Backup init');
      initCarousels();
    }
  }, 300);
});

// Event listeners globales
document.addEventListener('click', (e) => {
  if (e.target?.id === 'lightbox') closeLightbox();
});

document.addEventListener('keydown', (e) => {
  const lightbox = document.getElementById('lightbox');
  if (lightbox?.classList.contains('active')) {
    if (e.key === 'Escape') closeLightbox();
    else if (e.key === 'ArrowLeft') { e.preventDefault(); lightboxPrevious(); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); lightboxNext(); }
  }
});

// Cleanup
window.addEventListener('beforeunload', () => {
  if (scrollLockTimeout) clearTimeout(scrollLockTimeout);
  unlockScrollSmooth();
});

// ===== LOCOMOTIVE SCROLL (SMOOTH KINETICS) =====
let locoScroll = null;

// --- Smooth scroll per-panel (desktop) ---
class SmoothPanel {
  constructor(el) {
    this.el = el;
    this.target = el.scrollTop;
    this.current = el.scrollTop;
    this.ease = 0.03;
    this.rafId = null;

    this.onWheel = this.onWheel.bind(this);
    this.update = this.update.bind(this);

    el.addEventListener('wheel', this.onWheel, { passive: false });
  }

  onWheel(e) {
    e.preventDefault();

    // Normalizar delta según deltaMode (pixels / lines / pages)
    let delta = e.deltaY;
    if (e.deltaMode === 1) delta *= 40;
    if (e.deltaMode === 2) delta *= 800;

    const maxScroll = this.el.scrollHeight - this.el.clientHeight;

    // Sincronizar con posición real si no hay animación activa
    if (!this.rafId) {
      this.current = this.el.scrollTop;
      this.target = this.current;
    }

    this.target = Math.max(0, Math.min(this.target + delta, maxScroll));

    if (!this.rafId) {
      this.rafId = requestAnimationFrame(this.update);
    }
  }

  update() {
    this.current += (this.target - this.current) * this.ease;

    if (Math.abs(this.target - this.current) < 0.5) {
      this.current = this.target;
      this.el.scrollTop = this.current;
      this.rafId = null;
      return;
    }

    this.el.scrollTop = this.current;
    this.rafId = requestAnimationFrame(this.update);
  }

  destroy() {
    this.el.removeEventListener('wheel', this.onWheel);
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }
}

let smoothPanels = [];

function initPanelSmoothScroll() {
  smoothPanels.forEach(p => p.destroy());
  smoothPanels = [];

  if (window.innerWidth <= 1024) return;

  document.querySelectorAll('.left-projects-panel, .center-info-panel, .right-bio-panel').forEach(panel => {
    smoothPanels.push(new SmoothPanel(panel));
  });

  console.log(`✅ Smooth scroll activado en ${smoothPanels.length} paneles`);
}

// --- Locomotive Scroll init ---
function initLocoScroll() {
  if (typeof LocomotiveScroll === 'undefined') {
    console.warn('LocomotiveScroll no disponible');
    return;
  }

  if (locoScroll) {
    locoScroll.destroy();
    locoScroll = null;
    document.body.classList.remove('has-scroll-init');
  }

  const isDesktop = window.innerWidth > 1024;

  locoScroll = new LocomotiveScroll({
    lenisOptions: {
      lerp: 0.03,
      smoothWheel: !isDesktop, // Mobile: Lenis en body. Desktop: SmoothPanel en cada panel
      smoothTouch: false,
      normalizeWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 2,
    }
  });

  // Desktop: smooth scroll per-panel
  initPanelSmoothScroll();

  // Activar reveal CSS después de que IntersectionObserver procese los elementos visibles
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      document.body.classList.add('has-scroll-init');
    });
  });

  console.log(`✅ Locomotive Scroll inicializado (${isDesktop ? 'desktop: panels + reveal' : 'mobile: smooth + reveal'})`);
}

// ===== MOBILE CARD PARALLAX (KINETIC LOCOMOTION) =====
function initCardParallax() {
  if (window.innerWidth > 1024) return;

  const cards = document.querySelectorAll('.project[data-card-index]');
  if (!cards.length) return;

  const cardData = Array.from(cards).map(card => ({
    el: card,
    label: card.querySelector('.card-label'),
    thumb: card.querySelector('.card-thumb'),
    labelSpeed: 0.15,
    thumbSpeed: 0.08,
  }));

  let ticking = false;

  function onScroll() {
    if (ticking) return;
    ticking = true;

    requestAnimationFrame(() => {
      const viewportCenter = window.innerHeight / 2;

      cardData.forEach(data => {
        if (data.el.classList.contains('expanded')) return;

        const rect = data.el.getBoundingClientRect();
        const cardCenter = rect.top + rect.height / 2;
        const offset = cardCenter - viewportCenter;

        if (data.label) {
          const labelY = offset * data.labelSpeed;
          data.label.style.transform = `translateY(${labelY}px)`;
        }

        if (data.thumb && !data.el.classList.contains('expanded')) {
          const thumbY = offset * data.thumbSpeed;
          const isInView = data.el.classList.contains('is-inview');
          const scale = isInView ? 1 : 0.85;
          data.thumb.style.transform = `translateY(${thumbY}px) scale(${scale})`;
        }
      });

      ticking = false;
    });
  }

  // Use Lenis scroll event if available
  if (locoScroll && locoScroll.lenis) {
    locoScroll.lenis.on('scroll', onScroll);
  } else {
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  onScroll();
  console.log('✅ Card parallax inicializado');
}

console.log('Script cargado - v8.0 Locomotive Scroll');
console.log('Web diseñada por Pignatta - Codificada con IA como copiloto');

// ===== LIGHTBOX VIDEO =====
function openLightboxVideo(videoSrc) {
  if (!videoSrc || window.innerWidth <= 1024) return;
  
  const lightbox = document.getElementById('lightbox');
  const lightboxImage = document.getElementById('lightboxImage');
  const lightboxVideo = document.getElementById('lightboxVideo');
  
  if (lightbox && lightboxVideo) {
    // Ocultar imagen, mostrar video
    lightboxImage.style.display = 'none';
    lightboxVideo.style.display = 'block';
    
    // Configurar video
    lightboxVideo.querySelector('source').src = videoSrc;
    lightboxVideo.load();
    
    lightbox.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    
    // Ocultar navegación para video único
    const prevBtn = document.getElementById('lightboxPrev');
    const nextBtn = document.getElementById('lightboxNext');
    if (prevBtn) prevBtn.style.display = 'none';
    if (nextBtn) nextBtn.style.display = 'none';
    
    requestAnimationFrame(() => lightbox.classList.add('active'));
  }
}

// Modificar closeLightbox para manejar video
const originalCloseLightbox = closeLightbox;
closeLightbox = function() {
  const lightboxVideo = document.getElementById('lightboxVideo');
  const lightboxImage = document.getElementById('lightboxImage');
  
  if (lightboxVideo) {
    lightboxVideo.pause();
    lightboxVideo.style.display = 'none';
  }
  if (lightboxImage) {
    lightboxImage.style.display = 'block';
  }
  
  // Mostrar navegación de nuevo
  const prevBtn = document.getElementById('lightboxPrev');
  const nextBtn = document.getElementById('lightboxNext');
  if (prevBtn) prevBtn.style.display = '';
  if (nextBtn) nextBtn.style.display = '';
  
  originalCloseLightbox();
};

// ===== MOBILE: GESTURE SYSTEM (IG-LIKE) =====

let expandedProject = null;

function isMobile() {
  return window.innerWidth <= 1024;
}

// --- Constantes de gestos ---
const GESTURE = {
  TAP_MAX_DIST: 12,      // px — desplazamiento máximo para un tap
  TAP_MAX_TIME: 280,     // ms — duración máxima para un tap
  DIRECTION_LOCK: 10,    // px — movimiento antes de comprometer dirección
};

// --- Expand / Collapse ---
function expandProject(projectEl) {
  if (!isMobile() || expandedProject) return;

  if (locoScroll) locoScroll.stop();

  expandedProject = projectEl;
  projectEl.classList.add('expanded');
  document.body.style.overflow = 'hidden';

  const carousel = projectEl.querySelector('.project-carousel');
  if (carousel) {
    projectEl._expandedCarousel = new SimpleCarousel(carousel, 99);
  }

  // Swipe-down para cerrar
  projectEl.addEventListener('touchstart', handleSwipeDownStart, { passive: true });
  projectEl.addEventListener('touchmove', handleSwipeDownMove, { passive: false });
  projectEl.addEventListener('touchend', handleSwipeDownEnd, { passive: true });
}

function collapseProject(e) {
  if (e) { e.stopPropagation(); e.preventDefault(); }
  if (!expandedProject) return;

  const projectEl = expandedProject;

  projectEl.removeEventListener('touchstart', handleSwipeDownStart);
  projectEl.removeEventListener('touchmove', handleSwipeDownMove);
  projectEl.removeEventListener('touchend', handleSwipeDownEnd);

  projectEl.classList.remove('expanded');
  projectEl.style.transform = '';
  projectEl.style.opacity = '';
  projectEl.style.borderRadius = '';
  document.body.style.overflow = '';

  expandedProject = null;
  if (locoScroll) locoScroll.start();
}

// --- Swipe down to close (expanded) ---
let swipeDownStartY = 0;
let swipeDownActive = false;

function handleSwipeDownStart(e) {
  if (!expandedProject) return;
  if (expandedProject.scrollTop <= 0) {
    swipeDownStartY = e.touches[0].clientY;
    swipeDownActive = true;
  } else {
    swipeDownActive = false;
  }
}

function handleSwipeDownMove(e) {
  if (!swipeDownActive || !expandedProject) return;

  const deltaY = e.touches[0].clientY - swipeDownStartY;

  if (deltaY > 0 && expandedProject.scrollTop <= 0) {
    e.preventDefault();
    const progress = Math.min(deltaY / 300, 1);
    expandedProject.style.transform = `translateY(${deltaY * 0.5}px) scale(${1 - progress * 0.05})`;
    expandedProject.style.opacity = 1 - progress * 0.3;
    expandedProject.style.borderRadius = `${progress * 16}px`;
  }
}

function handleSwipeDownEnd(e) {
  if (!swipeDownActive || !expandedProject) return;

  const deltaY = e.changedTouches[0].clientY - swipeDownStartY;

  if (deltaY > 120) {
    collapseProject();
  } else {
    expandedProject.style.transform = 'rotate(0deg)';
    expandedProject.style.opacity = '1';
    expandedProject.style.borderRadius = '0';
  }
  swipeDownActive = false;
}

// --- Panel-level gesture handler (tap vs scroll) ---
function initMobileGestures() {
  if (!isMobile()) return;

  const panel = document.querySelector('.left-projects-panel');
  if (!panel) return;

  let startX = 0;
  let startY = 0;
  let startTime = 0;
  let hasMoved = false;
  let targetProject = null;

  // touchstart: registrar origen y proyecto target
  panel.addEventListener('touchstart', (e) => {
    if (expandedProject) return;

    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    startTime = Date.now();
    hasMoved = false;
    targetProject = e.target.closest('.project');
  }, { passive: true });

  // touchmove: marcar como scroll si supera threshold
  panel.addEventListener('touchmove', (e) => {
    if (expandedProject || hasMoved) return;

    const dx = Math.abs(e.touches[0].clientX - startX);
    const dy = Math.abs(e.touches[0].clientY - startY);

    if (dx > GESTURE.TAP_MAX_DIST || dy > GESTURE.TAP_MAX_DIST) {
      hasMoved = true;
    }
    // No preventDefault: el browser maneja scroll horizontal (snap) y vertical nativamente
  }, { passive: true });

  // touchend: si fue tap, abrir proyecto
  panel.addEventListener('touchend', (e) => {
    if (expandedProject) return;

    const elapsed = Date.now() - startTime;
    const dx = Math.abs(e.changedTouches[0].clientX - startX);
    const dy = Math.abs(e.changedTouches[0].clientY - startY);
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (!hasMoved && dist < GESTURE.TAP_MAX_DIST && elapsed < GESTURE.TAP_MAX_TIME && targetProject) {
      e.preventDefault();
      expandProject(targetProject);
    }

    targetProject = null;
  }, { passive: false });
}

// Inicializar gestos mobile en DOM ready
document.addEventListener('DOMContentLoaded', () => {
  initMobileGestures();
});

// Re-inicializar en resize (por si cambia de desktop a mobile)
let resizeTimeout;
let lastScreenMode = window.innerWidth > 1024 ? 'desktop' : 'mobile';

window.addEventListener('resize', () => {
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(() => {
    if (expandedProject && !isMobile()) {
      collapseProject();
    }

    // Reinicializar LS si cambió de modo desktop <-> mobile
    const currentMode = window.innerWidth > 1024 ? 'desktop' : 'mobile';
    if (currentMode !== lastScreenMode) {
      lastScreenMode = currentMode;
      initLocoScroll();
      initCardParallax();
    }
  }, 200);
});

// ===== SECTION SWITCHING =====
let currentSection = 'work';

function switchSection(section) {
  const workContent = document.getElementById('work-content');
  const playgroundContent = document.getElementById('playground-content');
  const spamContent = document.getElementById('spam-content');
  const infoContent = document.getElementById('info-content');
  const pignattaContent = document.getElementById('pignatta-content');

  const allSections = {
    work: workContent,
    playground: playgroundContent,
    spam: spamContent,
    info: infoContent,
    pignatta: pignattaContent
  };

  // Hide all sections
  Object.values(allSections).forEach(s => {
    if (s) {
      if (s === workContent) {
        s.classList.add('hidden');
      } else {
        s.classList.add('hidden');
      }
    }
  });

  // Remove all body section classes
  document.body.classList.remove('spam-active', 'info-active', 'playground-active', 'pignatta-active');

  // Show selected section
  if (allSections[section]) {
    allSections[section].classList.remove('hidden');
    currentSection = section;

    // Apply body class for background
    if (section === 'spam') document.body.classList.add('spam-active');
    if (section === 'playground') document.body.classList.add('playground-active');
    if (section === 'info') document.body.classList.add('info-active');
    if (section === 'pignatta') document.body.classList.add('pignatta-active');

    // Scroll to top
    window.scrollTo(0, 0);
    if (locoScroll) {
      locoScroll.scrollTo(0, { duration: 0 });
    }
  }

  // Update active nav link
  document.querySelectorAll('.nav-title[data-section]').forEach(link => {
    link.classList.toggle('active', link.getAttribute('data-section') === section);
  });
}

// Nav link click handlers
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('[data-section]').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const section = link.getAttribute('data-section');
      switchSection(section);
    });
  });

  // Sidebar button (efe_defede) → toggles pignatta/archive section
  const sidebarBtn = document.getElementById('sidebarBtn');
  if (sidebarBtn) {
    sidebarBtn.addEventListener('click', () => {
      const isPignattaActive = document.body.classList.contains('pignatta-active');
      if (!isPignattaActive) {
        switchSection('pignatta');
      } else {
        switchSection('work');
      }
    });
  }

  // ESC key to return to work
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && currentSection !== 'work') {
      switchSection('work');
    }
  });
});

// ===== IMAGE TRAIL EFFECT (LEARNING STUDIO) =====
const trailImages = [
  'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=300&h=400&fit=crop',
  'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=300&h=400&fit=crop',
  'https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?w=300&h=400&fit=crop',
  'https://images.unsplash.com/photo-1433086966358-54859d0ed716?w=300&h=400&fit=crop',
  'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=300&h=400&fit=crop',
  'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=300&h=400&fit=crop',
  'https://images.unsplash.com/photo-1426604966848-d7adac402bff?w=300&h=400&fit=crop',
  'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=300&h=400&fit=crop'
];

let trailContainer = null;
let imgIndex = 0;
let lastTrailX = 0;
let lastTrailY = 0;
let currentMouseX = window.innerWidth / 2;
let currentMouseY = window.innerHeight / 2;
const trailThreshold = 65;
let activeTrailImages = [];
let exitingTrailImages = [];
const exitSpeed = 8;

// Preload trail images
trailImages.forEach(src => {
  const img = new Image();
  img.src = src;
});

function createTrailImage(x, y) {
  if (!trailContainer) return;

  const img = document.createElement('img');
  img.className = 'trail-img';
  img.src = trailImages[imgIndex];

  const peakRotation = (Math.random() - 0.5) * 8;

  img.style.left = (x - 100) + 'px';
  img.style.top = (y - 100) + 'px';
  img.style.opacity = '1';
  img.style.transform = 'scale(0) rotate(0deg)';

  trailContainer.appendChild(img);
  img.offsetHeight; // Force reflow

  img.style.transition = 'transform 0.55s cubic-bezier(0.3, 0, 0.3, 1)';
  img.style.transform = 'scale(2.5) rotate(' + peakRotation + 'deg)';

  activeTrailImages.push({
    img: img,
    x: x,
    y: y,
    peakRotation: peakRotation,
    createdAt: Date.now()
  });

  setTimeout(() => {
    img.style.transition = 'none';
    exitingTrailImages.push({
      img: img,
      x: x,
      y: y,
      opacity: 1,
      scale: 2.5,
      rotation: peakRotation,
      peakRotation: peakRotation
    });

    const idx = activeTrailImages.findIndex(item => item.img === img);
    if (idx > -1) activeTrailImages.splice(idx, 1);
  }, 570);

  imgIndex = (imgIndex + 1) % trailImages.length;
}

function animateExitingImages() {
  for (let i = exitingTrailImages.length - 1; i >= 0; i--) {
    const item = exitingTrailImages[i];

    if (item && item.img && item.img.parentNode) {
      const progress = 1 - (item.scale / 2.5);
      item.rotation = item.peakRotation * (1 - progress);

      // Move toward mouse cursor
      if (progress > 0.05) {
        const dx = currentMouseX - item.x;
        const dy = currentMouseY - item.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const moveProgress = Math.max(0, progress - 0.05) / 0.95;
        const easedSpeed = exitSpeed * Math.pow(moveProgress, 5) * 50;

        if (dist > easedSpeed && easedSpeed > 0.05) {
          const ratio = easedSpeed / dist;
          item.x += dx * ratio;
          item.y += dy * ratio;
          item.img.style.left = (item.x - 100) + 'px';
          item.img.style.top = (item.y - 100) + 'px';
        }
      }

      // Scale down and fade out
      item.scale -= (0.006 + Math.pow(progress, 4) * 0.5);
      if (item.scale <= 0.8) item.opacity = item.scale / 0.8;

      item.img.style.opacity = Math.max(0, item.opacity);
      item.img.style.transform = 'scale(' + Math.max(0, item.scale) + ') rotate(' + item.rotation + 'deg)';

      // Remove when fully faded
      if (item.scale <= 0) {
        if (item.img.parentNode) item.img.parentNode.removeChild(item.img);
        exitingTrailImages.splice(i, 1);
      }
    }
  }

  requestAnimationFrame(animateExitingImages);
}

// Init trail on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  trailContainer = document.getElementById('image-trail');

  window.addEventListener('mousemove', (e) => {
    currentMouseX = e.clientX;
    currentMouseY = e.clientY;

    // Only active when in spam/learning studio section
    if (currentSection !== 'spam') return;

    const dx = e.clientX - lastTrailX;
    const dy = e.clientY - lastTrailY;

    if (Math.sqrt(dx * dx + dy * dy) > trailThreshold) {
      createTrailImage(e.clientX, e.clientY);
      lastTrailX = e.clientX;
      lastTrailY = e.clientY;
    }
  });

  // Start animation loop
  animateExitingImages();
});

// ===== NAV CLOCK (MONTEVIDEO TIMEZONE) =====
function updateNavClock() {
  const timeEl = document.getElementById('navClock');
  if (timeEl) {
    const now = new Date();
    const options = {
      timeZone: 'America/Montevideo',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    };
    const time = now.toLocaleTimeString('es-UY', options);
    const parts = time.split(':');
    timeEl.innerHTML = parts[0] + '<span class="time-colon">:</span>' + parts[1];
  }
}

updateNavClock();
setInterval(updateNavClock, 1000);
