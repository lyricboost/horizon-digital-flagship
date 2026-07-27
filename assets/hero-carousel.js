/**
 * Hero Carousel Component
 * Handles autoplay, navigation, keyboard controls, and accessibility for the hero carousel.
 * Respects prefers-reduced-motion preference and pauses on hover/focus.
 */

class HeroCarouselComponent extends HTMLElement {
  constructor() {
    super();
    
    // Core elements
    this.scroller = this.querySelector('[ref="scroller"]');
    this.slides = [...this.querySelectorAll('[ref="slide"]')];
    this.dots = [...this.querySelectorAll('[ref="dot"]')];
    this.prevButton = this.querySelector('[ref="previous"]');
    this.nextButton = this.querySelector('[ref="next"]');
    this.announcer = this.querySelector('[ref="announcer"]');
    
    // State
    this.currentIndex = parseInt(this.getAttribute('initial-slide') || '0', 10);
    this.autoplayInterval = null;
    this.autoplaySpeed = parseFloat(this.getAttribute('autoplay') || '0') || 0;
    this.isInfinite = this.hasAttribute('infinite');
    this.isPaused = false;
    this.prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    
    // Disable autoplay if user prefers reduced motion
    if (this.prefersReducedMotion && this.autoplaySpeed > 0) {
      this.autoplaySpeed = 0;
    }
    
    // Bind methods
    this.handleScroll = this.debounce(this.handleScroll.bind(this), 100);
    this.handleDotClick = this.handleDotClick.bind(this);
    this.handlePrevClick = this.handlePrevClick.bind(this);
    this.handleNextClick = this.handleNextClick.bind(this);
    this.handleKeydown = this.handleKeydown.bind(this);
    this.pauseAutoplay = this.pauseAutoplay.bind(this);
    this.resumeAutoplay = this.resumeAutoplay.bind(this);
    this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
  }
  
  connectedCallback() {
    if (!this.scroller || this.slides.length === 0) return;
    
    this.init();
  }
  
  disconnectedCallback() {
    this.cleanup();
  }
  
  /**
   * Initialize the carousel
   */
  init() {
    // Set up event listeners
    this.scroller.addEventListener('scroll', this.handleScroll, { passive: true });
    
    // Dots navigation
    this.dots.forEach(dot => {
      dot.addEventListener('click', this.handleDotClick);
    });
    
    // Arrow navigation
    if (this.prevButton) {
      this.prevButton.addEventListener('click', this.handlePrevClick);
    }
    if (this.nextButton) {
      this.nextButton.addEventListener('click', this.handleNextClick);
    }
    
    // Keyboard navigation
    this.addEventListener('keydown', this.handleKeydown);
    
    // Pause autoplay on hover/focus
    this.addEventListener('mouseenter', this.pauseAutoplay);
    this.addEventListener('mouseleave', this.resumeAutoplay);
    this.addEventListener('focusin', this.pauseAutoplay);
    this.addEventListener('focusout', this.resumeAutoplay);
    
    // Pause when page is hidden
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
    
    // Initialize autoplay if enabled
    if (this.autoplaySpeed > 0) {
      this.startAutoplay();
    }
    
    // Set initial slide
    this.goToSlide(this.currentIndex, false);
  }
  
  /**
   * Clean up event listeners and intervals
   */
  cleanup() {
    this.stopAutoplay();
    
    if (this.scroller) {
      this.scroller.removeEventListener('scroll', this.handleScroll);
    }
    
    this.dots.forEach(dot => {
      dot.removeEventListener('click', this.handleDotClick);
    });
    
    if (this.prevButton) {
      this.prevButton.removeEventListener('click', this.handlePrevClick);
    }
    if (this.nextButton) {
      this.nextButton.removeEventListener('click', this.handleNextClick);
    }
    
    this.removeEventListener('keydown', this.handleKeydown);
    this.removeEventListener('mouseenter', this.pauseAutoplay);
    this.removeEventListener('mouseleave', this.resumeAutoplay);
    this.removeEventListener('focusin', this.pauseAutoplay);
    this.removeEventListener('focusout', this.resumeAutoplay);
    
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
  }
  
  /**
   * Navigate to a specific slide
   * @param {number} index - The slide index
   * @param {boolean} smooth - Whether to use smooth scrolling
   */
  goToSlide(index, smooth = true) {
    if (index < 0 || index >= this.slides.length || !this.scroller) return;
    
    this.currentIndex = index;
    const slide = this.slides[index];
    
    if (!slide) return;
    
    // Scroll to slide
    const behavior = smooth && !this.prefersReducedMotion ? 'smooth' : 'auto';
    const scrollOptions = {
      left: /** @type {HTMLElement} */ (slide).offsetLeft,
      behavior: /** @type {ScrollBehavior} */ (behavior)
    };
    
    this.scroller.scrollTo(scrollOptions);
    
    // Update dots
    this.updateDots();
    
    // Announce slide change to screen readers
    this.announceSlide();
  }
  
  /**
   * Navigate to the next slide
   */
  nextSlide() {
    let nextIndex = this.currentIndex + 1;
    
    if (nextIndex >= this.slides.length) {
      nextIndex = this.isInfinite ? 0 : this.slides.length - 1;
    }
    
    this.goToSlide(nextIndex);
  }
  
  /**
   * Navigate to the previous slide
   */
  prevSlide() {
    let prevIndex = this.currentIndex - 1;
    
    if (prevIndex < 0) {
      prevIndex = this.isInfinite ? this.slides.length - 1 : 0;
    }
    
    this.goToSlide(prevIndex);
  }
  
  /**
   * Update active state on pagination dots
   */
  updateDots() {
    this.dots.forEach((dot, index) => {
      if (index === this.currentIndex) {
        dot.setAttribute('aria-current', 'true');
      } else {
        dot.removeAttribute('aria-current');
      }
    });
  }
  
  /**
   * Announce slide change to screen readers
   */
  announceSlide() {
    if (!this.announcer) return;
    
    const current = this.currentIndex + 1;
    const total = this.slides.length;
    this.announcer.textContent = `Slide ${current} of ${total}`;
  }
  
  /**
   * Handle scroll event to detect current slide
   */
  handleScroll() {
    if (!this.scroller) return;
    
    const scrollLeft = this.scroller.scrollLeft;
    const slideWidth = /** @type {HTMLElement} */ (this.slides[0])?.offsetWidth || 0;
    
    if (slideWidth === 0) return;
    
    const newIndex = Math.round(scrollLeft / slideWidth);
    
    if (newIndex !== this.currentIndex && newIndex >= 0 && newIndex < this.slides.length) {
      this.currentIndex = newIndex;
      this.updateDots();
      this.announceSlide();
    }
  }
  
  /**
   * Handle dot click
   * @param {Event} event
   */
  handleDotClick(event) {
    const dot = /** @type {HTMLElement} */ (event.currentTarget);
    const index = parseInt(dot?.dataset?.slideIndex || '0', 10);
    
    if (!isNaN(index)) {
      this.goToSlide(index);
    }
  }
  
  /**
   * Handle previous button click
   */
  handlePrevClick() {
    this.prevSlide();
  }
  
  /**
   * Handle next button click
   */
  handleNextClick() {
    this.nextSlide();
  }
  
  /**
   * Handle keyboard navigation
   * @param {KeyboardEvent} event
   */
  handleKeydown(event) {
    // Only handle arrow keys
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    
    // Prevent default scrolling behavior
    event.preventDefault();
    
    if (event.key === 'ArrowLeft') {
      this.prevSlide();
    } else if (event.key === 'ArrowRight') {
      this.nextSlide();
    }
  }
  
  /**
   * Start autoplay
   */
  startAutoplay() {
    if (this.autoplaySpeed <= 0 || this.prefersReducedMotion) return;
    
    this.stopAutoplay(); // Clear any existing interval
    
    this.autoplayInterval = setInterval(() => {
      if (!this.isPaused && !document.hidden) {
        this.nextSlide();
      }
    }, this.autoplaySpeed * 1000);
  }
  
  /**
   * Stop autoplay
   */
  stopAutoplay() {
    if (this.autoplayInterval) {
      clearInterval(this.autoplayInterval);
      this.autoplayInterval = null;
    }
  }
  
  /**
   * Pause autoplay (on hover/focus)
   */
  pauseAutoplay() {
    this.isPaused = true;
  }
  
  /**
   * Resume autoplay (on mouseleave/focusout)
   */
  resumeAutoplay() {
    this.isPaused = false;
  }
  
  /**
   * Handle page visibility change
   */
  handleVisibilityChange() {
    if (document.hidden) {
      this.pauseAutoplay();
    } else {
      this.resumeAutoplay();
    }
  }
  
  /**
   * Debounce utility function
   * @param {Function} func - Function to debounce
   * @param {number} wait - Wait time in milliseconds
   * @returns {Function}
   */
  debounce(func, wait) {
    /** @type {number | undefined} */
    let timeout;
    return function executedFunction() {
      const later = () => {
        timeout = undefined;
        func.call(this);
      };
      if (timeout !== undefined) {
        clearTimeout(timeout);
      }
      timeout = setTimeout(later, wait);
    };
  }
}

// Register the custom element
if (!customElements.get('hero-carousel-component')) {
  customElements.define('hero-carousel-component', HeroCarouselComponent);
}
