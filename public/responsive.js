/**
 * CricketLive Pro - Advanced Responsive Features
 * Touch gestures, adaptive layouts, and mobile optimizations
 */

// Touch gesture detection and handling
class TouchGestureHandler {
    constructor(element) {
        this.element = element;
        this.touchStartX = 0;
        this.touchStartY = 0;
        this.touchEndX = 0;
        this.touchEndY = 0;
        this.minSwipeDistance = 50;
        this.maxTime = 300;
        this.startTime = 0;
        
        this.init();
    }
    
    init() {
        this.element.addEventListener('touchstart', (e) => {
            this.touchStartX = e.changedTouches[0].screenX;
            this.touchStartY = e.changedTouches[0].screenY;
            this.startTime = new Date().getTime();
        }, { passive: true });
        
        this.element.addEventListener('touchend', (e) => {
            this.touchEndX = e.changedTouches[0].screenX;
            this.touchEndY = e.changedTouches[0].screenY;
            this.handleGesture();
        }, { passive: true });
    }
    
    handleGesture() {
        const deltaX = this.touchEndX - this.touchStartX;
        const deltaY = this.touchEndY - this.touchStartY;
        const deltaTime = new Date().getTime() - this.startTime;
        
        if (deltaTime > this.maxTime) return;
        
        const absX = Math.abs(deltaX);
        const absY = Math.abs(deltaY);
        
        if (absX > this.minSwipeDistance && absX > absY) {
            // Horizontal swipe
            if (deltaX > 0) {
                this.onSwipeRight();
            } else {
                this.onSwipeLeft();
            }
        } else if (absY > this.minSwipeDistance && absY > absX) {
            // Vertical swipe
            if (deltaY > 0) {
                this.onSwipeDown();
            } else {
                this.onSwipeUp();
            }
        }
    }
    
    onSwipeLeft() {
        console.log('Swiped left');
        // Override in subclass
    }
    
    onSwipeRight() {
        console.log('Swiped right');
        // Override in subclass
    }
    
    onSwipeUp() {
        console.log('Swiped up');
        // Override in subclass
    }
    
    onSwipeDown() {
        console.log('Swiped down');
        // Override in subclass
    }
}

// Pull to refresh functionality
class PullToRefresh {
    constructor(element, callback) {
        this.element = element;
        this.callback = callback;
        this.startY = 0;
        this.currentY = 0;
        this.pullDistance = 0;
        this.threshold = 100;
        this.isPulling = false;
        
        this.init();
    }
    
    init() {
        this.element.addEventListener('touchstart', (e) => {
            if (this.element.scrollTop === 0) {
                this.startY = e.touches[0].pageY;
                this.isPulling = true;
            }
        }, { passive: true });
        
        this.element.addEventListener('touchmove', (e) => {
            if (!this.isPulling) return;
            
            this.currentY = e.touches[0].pageY;
            this.pullDistance = this.currentY - this.startY;
            
            if (this.pullDistance > 0) {
                e.preventDefault();
                this.element.style.transform = `translateY(${this.pullDistance * 0.5}px)`;
                
                // Show loading indicator
                if (this.pullDistance > this.threshold) {
                    this.element.classList.add('ready-to-refresh');
                } else {
                    this.element.classList.remove('ready-to-refresh');
                }
            }
        }, { passive: false });
        
        this.element.addEventListener('touchend', () => {
            if (!this.isPulling) return;
            
            this.isPulling = false;
            this.element.style.transform = '';
            
            if (this.pullDistance > this.threshold) {
                this.callback();
            }
            
            this.element.classList.remove('ready-to-refresh');
            this.pullDistance = 0;
        }, { passive: true });
    }
}

// Adaptive layout manager
class AdaptiveLayoutManager {
    constructor() {
        this.breakpoints = {
            xs: 0,
            sm: 640,
            md: 768,
            lg: 1024,
            xl: 1280,
            xxl: 1536
        };
        
        this.currentBreakpoint = this.getBreakpoint();
        this.init();
    }
    
    init() {
        window.addEventListener('resize', this.debounce(() => {
            const newBreakpoint = this.getBreakpoint();
            if (newBreakpoint !== this.currentBreakpoint) {
                this.currentBreakpoint = newBreakpoint;
                this.onBreakpointChange(newBreakpoint);
            }
        }, 100));
        
        // Initial call
        this.onBreakpointChange(this.currentBreakpoint);
    }
    
    getBreakpoint() {
        const width = window.innerWidth;
        
        if (width >= this.breakpoints.xxl) return 'xxl';
        if (width >= this.breakpoints.xl) return 'xl';
        if (width >= this.breakpoints.lg) return 'lg';
        if (width >= this.breakpoints.md) return 'md';
        if (width >= this.breakpoints.sm) return 'sm';
        return 'xs';
    }
    
    onBreakpointChange(breakpoint) {
        console.log(`Breakpoint changed to: ${breakpoint}`);
        
        // Update CSS custom properties
        document.documentElement.style.setProperty('--current-breakpoint', breakpoint);
        
        // Trigger custom event
        const event = new CustomEvent('breakpointchange', {
            detail: { breakpoint }
        });
        window.dispatchEvent(event);
        
        // Adjust layout based on breakpoint
        this.adjustLayout(breakpoint);
    }
    
    adjustLayout(breakpoint) {
        // Adjust grid layouts
        const grids = document.querySelectorAll('[data-adaptive-grid]');
        grids.forEach(grid => {
            const columns = grid.getAttribute(`data-cols-${breakpoint}`) || 
                           grid.getAttribute('data-cols-default') || 1;
            grid.style.gridTemplateColumns = `repeat(${columns}, 1fr)`;
        });
        
        // Adjust font sizes
        if (breakpoint === 'xs' || breakpoint === 'sm') {
            document.documentElement.style.fontSize = '14px';
        } else {
            document.documentElement.style.fontSize = '16px';
        }
    }
    
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
}

// Mobile menu manager
class MobileMenuManager {
    constructor() {
        this.menus = [];
        this.init();
    }
    
    init() {
        // Initialize all mobile menus
        document.querySelectorAll('[data-mobile-menu]').forEach(menu => {
            this.menus.push({
                element: menu,
                id: menu.getAttribute('data-mobile-menu'),
                isOpen: false
            });
        });
        
        // Add event listeners to menu toggles
        document.querySelectorAll('[data-mobile-menu-toggle]').forEach(toggle => {
            toggle.addEventListener('click', (e) => {
                const menuId = toggle.getAttribute('data-mobile-menu-toggle');
                this.toggle(menuId);
            });
        });
        
        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('[data-mobile-menu]') && 
                !e.target.closest('[data-mobile-menu-toggle]')) {
                this.closeAll();
            }
        });
    }
    
    toggle(menuId) {
        const menu = this.menus.find(m => m.id === menuId);
        if (menu) {
            menu.isOpen = !menu.isOpen;
            menu.element.classList.toggle('active', menu.isOpen);
            menu.element.setAttribute('aria-hidden', !menu.isOpen);
            
            // Prevent body scroll when menu is open
            document.body.style.overflow = menu.isOpen ? 'hidden' : '';
        }
    }
    
    closeAll() {
        this.menus.forEach(menu => {
            menu.isOpen = false;
            menu.element.classList.remove('active');
            menu.element.setAttribute('aria-hidden', 'true');
        });
        document.body.style.overflow = '';
    }
}

// Touch-optimized components
class TouchOptimizedComponents {
    constructor() {
        this.init();
    }
    
    init() {
        this.optimizeButtons();
        this.optimizeForms();
        this.optimizeTables();
        this.addTouchFeedback();
    }
    
    optimizeButtons() {
        // Add touch feedback to buttons
        document.querySelectorAll('button, .btn, [role="button"]').forEach(button => {
            button.addEventListener('touchstart', () => {
                button.classList.add('touch-active');
            }, { passive: true });
            
            button.addEventListener('touchend', () => {
                button.classList.remove('touch-active');
            }, { passive: true });
        });
    }
    
    optimizeForms() {
        // Prevent zoom on iOS for form inputs
        document.querySelectorAll('input, select, textarea').forEach(input => {
            if (parseInt(getComputedStyle(input).fontSize) < 16) {
                input.style.fontSize = '16px';
            }
        });
    }
    
    optimizeTables() {
        // Convert tables to card layout on mobile
        document.querySelectorAll('[data-responsive-table]').forEach(table => {
            if (window.innerWidth <= 768) {
                this.convertTableToCards(table);
            }
        });
    }
    
    convertTableToCards(table) {
        const headers = Array.from(table.querySelectorAll('th')).map(th => th.textContent);
        const rows = Array.from(table.querySelectorAll('tbody tr'));
        
        const cardsContainer = document.createElement('div');
        cardsContainer.className = 'mobile-cards-container';
        
        rows.forEach(row => {
            const card = document.createElement('div');
            card.className = 'mobile-card';
            
            Array.from(row.cells).forEach((cell, index) => {
                if (headers[index]) {
                    const item = document.createElement('div');
                    item.className = 'mobile-card-item';
                    item.innerHTML = `
                        <span class="mobile-card-label">${headers[index]}</span>
                        <span class="mobile-card-value">${cell.textContent}</span>
                    `;
                    card.appendChild(item);
                }
            });
            
            cardsContainer.appendChild(card);
        });
        
        table.parentNode.insertBefore(cardsContainer, table);
        table.style.display = 'none';
    }
    
    addTouchFeedback() {
        // Add visual feedback for touch interactions
        const style = document.createElement('style');
        style.textContent = `
            .touch-active {
                transform: scale(0.98);
                opacity: 0.9;
            }
            
            .mobile-cards-container {
                display: flex;
                flex-direction: column;
                gap: 1rem;
                padding: 1rem;
            }
            
            .mobile-card {
                background: rgba(15, 23, 42, 0.8);
                border: 1px solid rgba(148, 163, 184, 0.1);
                border-radius: 0.75rem;
                padding: 1rem;
            }
            
            .mobile-card-item {
                display: flex;
                justify-content: space-between;
                padding: 0.5rem 0;
                border-bottom: 1px solid rgba(148, 163, 184, 0.05);
            }
            
            .mobile-card-item:last-child {
                border-bottom: none;
            }
            
            .mobile-card-label {
                color: #94a3b8;
                font-size: 0.75rem;
                font-weight: 600;
                text-transform: uppercase;
                letter-spacing: 0.05em;
            }
            
            .mobile-card-value {
                color: #fff;
                font-size: 0.875rem;
            }
            
            .ready-to-refresh::before {
                content: 'Pull to refresh';
                position: absolute;
                top: -30px;
                left: 50%;
                transform: translateX(-50%);
                background: rgba(239, 68, 68, 0.9);
                color: white;
                padding: 0.5rem 1rem;
                border-radius: 0.5rem;
                font-size: 0.75rem;
            }
        `;
        document.head.appendChild(style);
    }
}

// Performance optimizer for mobile
class MobilePerformanceOptimizer {
    constructor() {
        this.init();
    }
    
    init() {
        this.optimizeImages();
        this.lazyLoadElements();
        this.reduceAnimations();
    }
    
    optimizeImages() {
        // Use smaller images on mobile
        document.querySelectorAll('img[data-src-mobile]').forEach(img => {
            if (window.innerWidth <= 768) {
                img.src = img.getAttribute('data-src-mobile');
            }
        });
        
        // Lazy load images
        if ('IntersectionObserver' in window) {
            const imageObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        img.src = img.dataset.src || img.src;
                        img.classList.remove('lazy');
                        imageObserver.unobserve(img);
                    }
                });
            });
            
            document.querySelectorAll('img.lazy').forEach(img => {
                imageObserver.observe(img);
            });
        }
    }
    
    lazyLoadElements() {
        // Lazy load non-critical elements
        if ('IntersectionObserver' in window) {
            const elementObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('loaded');
                        elementObserver.unobserve(entry.target);
                    }
                });
            }, {
                rootMargin: '50px'
            });
            
            document.querySelectorAll('[data-lazy]').forEach(el => {
                elementObserver.observe(el);
            });
        }
    }
    
    reduceAnimations() {
        // Reduce animations on low-end devices
        if (navigator.hardwareConcurrency <= 2) {
            document.documentElement.classList.add('reduce-motion');
        }
        
        // Check for reduced motion preference
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            document.documentElement.classList.add('reduce-motion');
        }
    }
}

// Accessibility enhancements
class AccessibilityEnhancer {
    constructor() {
        this.init();
    }
    
    init() {
        this.addSkipLinks();
        this.enhanceFocus();
        this.addAriaAttributes();
    }
    
    addSkipLinks() {
        // Add skip to main content link
        const skipLink = document.createElement('a');
        skipLink.href = '#main-content';
        skipLink.className = 'skip-link';
        skipLink.textContent = 'Skip to main content';
        document.body.insertBefore(skipLink, document.body.firstChild);
    }
    
    enhanceFocus() {
        // Better focus visibility for keyboard users
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                document.body.classList.add('keyboard-navigation');
            }
        });
        
        document.addEventListener('mousedown', () => {
            document.body.classList.remove('keyboard-navigation');
        });
    }
    
    addAriaAttributes() {
        // Add aria attributes for better screen reader support
        document.querySelectorAll('button').forEach(button => {
            if (!button.getAttribute('aria-label') && !button.textContent.trim()) {
                console.warn('Button without accessible label:', button);
            }
        });
        
        document.querySelectorAll('input').forEach(input => {
            const label = document.querySelector(`label[for="${input.id}"]`);
            if (!label && !input.getAttribute('aria-label')) {
                console.warn('Input without accessible label:', input);
            }
        });
    }
}

// Initialize all responsive features when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Initialize adaptive layout manager
    const layoutManager = new AdaptiveLayoutManager();
    
    // Initialize mobile menu manager
    const menuManager = new MobileMenuManager();
    
    // Initialize touch optimizations
    const touchOptimizer = new TouchOptimizedComponents();
    
    // Initialize performance optimizer
    const performanceOptimizer = new MobilePerformanceOptimizer();
    
    // Initialize accessibility enhancer
    const accessibilityEnhancer = new AccessibilityEnhancer();
    
    // Add swipe gestures to navigation for mobile
    const nav = document.querySelector('nav');
    if (nav && window.innerWidth <= 768) {
        const gestureHandler = new TouchGestureHandler(nav);
        gestureHandler.onSwipeUp = () => {
            nav.style.transform = 'translateY(-100%)';
            setTimeout(() => {
                nav.style.transform = '';
            }, 3000);
        };
    }
    
    // Initialize pull to refresh on main content
    const mainContent = document.querySelector('#app');
    if (mainContent && window.innerWidth <= 768) {
        new PullToRefresh(mainContent, () => {
            console.log('Refreshing content...');
            // Add your refresh logic here
            setTimeout(() => {
                mainContent.classList.remove('pulling');
            }, 1000);
        });
    }
    
    // Listen for breakpoint changes
    window.addEventListener('breakpointchange', (e) => {
        console.log(`Breakpoint changed to: ${e.detail.breakpoint}`);
        
        // Adjust UI based on breakpoint
        if (e.detail.breakpoint === 'xs' || e.detail.breakpoint === 'sm') {
            document.body.classList.add('mobile-view');
            document.body.classList.remove('desktop-view');
        } else {
            document.body.classList.add('desktop-view');
            document.body.classList.remove('mobile-view');
        }
    });
    
    // Add resize listener for orientation changes
    window.addEventListener('orientationchange', () => {
        setTimeout(() => {
            layoutManager.onBreakpointChange(layoutManager.getBreakpoint());
        }, 100);
    });
    
    // Prevent double-tap zoom on iOS
    let lastTouchEnd = 0;
    document.addEventListener('touchend', (e) => {
        const now = new Date().getTime();
        if (now - lastTouchEnd <= 300) {
            e.preventDefault();
        }
        lastTouchEnd = now;
    }, { passive: false });
    
    // Add mobile-specific classes
    if ('ontouchstart' in window) {
        document.documentElement.classList.add('touch-device');
    }
    
    // Check for hover capability
    if (window.matchMedia('(hover: none)').matches) {
        document.documentElement.classList.add('no-hover');
    }
    
    console.log('Mobile responsive features initialized');
});

// Export classes for global access
window.TouchGestureHandler = TouchGestureHandler;
window.PullToRefresh = PullToRefresh;
window.AdaptiveLayoutManager = AdaptiveLayoutManager;
window.MobileMenuManager = MobileMenuManager;
window.TouchOptimizedComponents = TouchOptimizedComponents;
window.MobilePerformanceOptimizer = MobilePerformanceOptimizer;
window.AccessibilityEnhancer = AccessibilityEnhancer;