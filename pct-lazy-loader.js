/**
 * Code Splitting and Lazy Loading for PCT System
 * Dynamically load modules only when needed
 */

class LazyLoader {
  constructor() {
    this.loadedModules = new Set();
    this.loadingPromises = new Map();
  }

  /**
   * Lazy load a JavaScript module
   */
  async loadScript(url, moduleId) {
    // Return if already loaded
    if (this.loadedModules.has(moduleId)) {
      return Promise.resolve();
    }

    // Deduplicate loading
    if (this.loadingPromises.has(moduleId)) {
      return this.loadingPromises.get(moduleId);
    }

    const promise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = url;
      script.async = true;

      script.onload = () => {
        this.loadedModules.add(moduleId);
        this.loadingPromises.delete(moduleId);
        resolve();
      };

      script.onerror = () => {
        this.loadingPromises.delete(moduleId);
        reject(new Error(`Failed to load script: ${url}`));
      };

      document.head.appendChild(script);
    });

    this.loadingPromises.set(moduleId, promise);
    return promise;
  }

  /**
   * Lazy load CSS
   */
  async loadCSS(url, moduleId) {
    if (this.loadedModules.has(moduleId)) {
      return Promise.resolve();
    }

    if (this.loadingPromises.has(moduleId)) {
      return this.loadingPromises.get(moduleId);
    }

    const promise = new Promise((resolve, reject) => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = url;

      link.onload = () => {
        this.loadedModules.add(moduleId);
        this.loadingPromises.delete(moduleId);
        resolve();
      };

      link.onerror = () => {
        this.loadingPromises.delete(moduleId);
        reject(new Error(`Failed to load CSS: ${url}`));
      };

      document.head.appendChild(link);
    });

    this.loadingPromises.set(moduleId, promise);
    return promise;
  }

  /**
   * Lazy load an image
   */
  async loadImage(url) {
    return new Promise((resolve, reject) => {
      const img = new Image();

      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`Failed to load image: ${url}`));

      img.src = url;
    });
  }

  /**
   * Check if module is loaded
   */
  isLoaded(moduleId) {
    return this.loadedModules.has(moduleId);
  }
}

const lazyLoader = new LazyLoader();

/**
 * PCT Module Registry
 * Define modules that can be lazy loaded
 */
const PCT_MODULES = {
  // Heavy modules that are only needed on specific tabs
  VIDEO_SCRIPTS: {
    id: 'video-scripts',
    files: ['pct-video-generator.js'],
    condition: () => document.querySelector('[data-tab="scripts"]')?.classList.contains('active'),
  },

  AD_CREATIVE: {
    id: 'ad-creative',
    files: ['pct-creative-generator.js'],
    condition: () => document.querySelector('[data-tab="creative"]')?.classList.contains('active'),
  },

  ANALYTICS: {
    id: 'analytics',
    files: ['pct-analytics.js', 'chart.min.js'],
    condition: () => document.querySelector('[data-tab="analytics"]')?.classList.contains('active'),
  },

  DEPLOYMENT: {
    id: 'deployment',
    files: ['pct-deployment.js'],
    condition: () => document.querySelector('[data-tab="deploy"]')?.classList.contains('active'),
  },
};

/**
 * Load module when tab is activated
 */
async function loadModuleForTab(tabName) {
  const moduleMap = {
    scripts: PCT_MODULES.VIDEO_SCRIPTS,
    creative: PCT_MODULES.AD_CREATIVE,
    analytics: PCT_MODULES.ANALYTICS,
    deploy: PCT_MODULES.DEPLOYMENT,
  };

  const module = moduleMap[tabName];

  if (!module) {
    return; // No lazy loading for this tab
  }

  if (lazyLoader.isLoaded(module.id)) {
    return; // Already loaded
  }

  try {
    console.log(`[LazyLoad] Loading module: ${module.id}`);

    // Load all files for this module
    await Promise.all(
      module.files.map((file) =>
        lazyLoader.loadScript(`/${file}`, `${module.id}-${file}`)
      )
    );

    console.log(`[LazyLoad] Module loaded: ${module.id}`);
  } catch (error) {
    console.error(`[LazyLoad] Failed to load module: ${module.id}`, error);
  }
}

/**
 * Intersection Observer for lazy loading images
 */
class LazyImageLoader {
  constructor() {
    this.observer = null;
    this.init();
  }

  init() {
    if ('IntersectionObserver' in window) {
      this.observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              this.loadImage(entry.target);
              this.observer.unobserve(entry.target);
            }
          });
        },
        {
          rootMargin: '50px', // Load 50px before visible
        }
      );
    }
  }

  observe(img) {
    if (this.observer) {
      this.observer.observe(img);
    } else {
      // Fallback for browsers without IntersectionObserver
      this.loadImage(img);
    }
  }

  loadImage(img) {
    const src = img.dataset.src;
    if (src) {
      img.src = src;
      img.removeAttribute('data-src');

      img.classList.add('loaded');
    }
  }

  /**
   * Make images lazy
   */
  makeImagesLazy(container = document) {
    const images = container.querySelectorAll('img[data-src]');

    images.forEach((img) => {
      this.observe(img);
    });
  }
}

const lazyImageLoader = new LazyImageLoader();

/**
 * Prefetch modules for likely next navigation
 */
function prefetchModules() {
  // Prefetch common modules after initial load
  setTimeout(() => {
    const prefetchList = [PCT_MODULES.AD_CREATIVE, PCT_MODULES.VIDEO_SCRIPTS];

    prefetchList.forEach((module) => {
      if (!lazyLoader.isLoaded(module.id)) {
        // Low priority prefetch
        module.files.forEach((file) => {
          const link = document.createElement('link');
          link.rel = 'prefetch';
          link.href = `/${file}`;
          document.head.appendChild(link);
        });
      }
    });
  }, 3000); // Wait 3 seconds after page load
}

/**
 * Code splitting helper - split large functions
 */
function lazy(importFn) {
  let module = null;

  return async (...args) => {
    if (!module) {
      module = await importFn();
    }

    return module.default(...args);
  };
}

// Export for global use
window.lazyLoader = lazyLoader;
window.loadModuleForTab = loadModuleForTab;
window.lazyImageLoader = lazyImageLoader;
window.prefetchModules = prefetchModules;

// Initialize lazy image loading on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    lazyImageLoader.makeImagesLazy();
    prefetchModules();
  });
} else {
  lazyImageLoader.makeImagesLazy();
  prefetchModules();
}
