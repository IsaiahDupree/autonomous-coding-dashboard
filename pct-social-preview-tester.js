/**
 * PCT Social Preview Tester
 * Verify how pages appear when shared on Facebook, Twitter, LinkedIn
 * PCT-WC-070: Social share preview testing
 */

class PCTSocialPreviewTester {
  constructor() {
    this.platforms = ['facebook', 'twitter', 'linkedin'];
    this.currentMeta = null;
    this.modal = null;
  }

  /**
   * Initialize the tester
   */
  init() {
    this.createUI();
    this.extractMetaTags();

    console.log('[Social Preview] Tester initialized');
  }

  /**
   * Extract meta tags from page
   */
  extractMetaTags() {
    this.currentMeta = {
      title: document.title,
      description: this.getMetaContent('description') || this.getMetaContent('og:description'),
      image: this.getMetaContent('og:image') || this.getMetaContent('twitter:image'),
      url: this.getMetaContent('og:url') || window.location.href,
      siteName: this.getMetaContent('og:site_name'),
      type: this.getMetaContent('og:type'),
      twitterCard: this.getMetaContent('twitter:card'),
      twitterSite: this.getMetaContent('twitter:site'),
    };

    return this.currentMeta;
  }

  /**
   * Get meta tag content
   */
  getMetaContent(name) {
    const meta =
      document.querySelector(`meta[name="${name}"]`) ||
      document.querySelector(`meta[property="${name}"]`);
    return meta ? meta.getAttribute('content') : null;
  }

  /**
   * Create UI for preview testing
   */
  createUI() {
    // Create floating button
    const button = document.createElement('button');
    button.id = 'pct-social-preview-btn';
    button.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M15 13l-3-3m0 0l-3 3m3-3v8M4 13v5a2 2 0 002 2h8a2 2 0 002-2v-5M16 7V5a2 2 0 00-2-2H6a2 2 0 00-2 2v2m12 0a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2V9a2 2 0 012-2m12 0H4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      <span>Social Preview</span>
    `;
    button.className = 'pct-social-preview-btn';
    button.onclick = () => this.showModal();

    document.body.appendChild(button);

    // Create modal
    this.createModal();

    // Add styles
    this.addStyles();
  }

  /**
   * Create preview modal
   */
  createModal() {
    const modal = document.createElement('div');
    modal.id = 'pct-social-preview-modal';
    modal.className = 'pct-social-preview-modal';
    modal.style.display = 'none';

    modal.innerHTML = `
      <div class="pct-social-preview-modal-overlay" onclick="window.pctSocialPreview.hideModal()"></div>
      <div class="pct-social-preview-modal-content">
        <div class="pct-social-preview-modal-header">
          <h2>Social Share Preview</h2>
          <button class="pct-social-preview-close" onclick="window.pctSocialPreview.hideModal()">&times;</button>
        </div>
        <div class="pct-social-preview-modal-body">
          <div class="pct-social-preview-tabs">
            <button class="pct-social-preview-tab active" data-platform="facebook">Facebook</button>
            <button class="pct-social-preview-tab" data-platform="twitter">Twitter</button>
            <button class="pct-social-preview-tab" data-platform="linkedin">LinkedIn</button>
          </div>
          <div id="pct-social-preview-content" class="pct-social-preview-content"></div>
          <div class="pct-social-preview-actions">
            <button class="pct-btn pct-btn-sm" onclick="window.pctSocialPreview.testDebuggers()">Test in Debuggers</button>
            <button class="pct-btn pct-btn-sm pct-btn-primary" onclick="window.pctSocialPreview.copyMetaTags()">Copy Meta Tags</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    this.modal = modal;

    // Add tab click handlers
    modal.querySelectorAll('.pct-social-preview-tab').forEach((tab) => {
      tab.addEventListener('click', (e) => {
        modal.querySelectorAll('.pct-social-preview-tab').forEach((t) => t.classList.remove('active'));
        e.target.classList.add('active');
        this.showPreview(e.target.dataset.platform);
      });
    });
  }

  /**
   * Show modal
   */
  showModal() {
    this.extractMetaTags();
    this.modal.style.display = 'flex';
    this.showPreview('facebook');
  }

  /**
   * Hide modal
   */
  hideModal() {
    this.modal.style.display = 'none';
  }

  /**
   * Show preview for specific platform
   */
  showPreview(platform) {
    const container = document.getElementById('pct-social-preview-content');
    container.innerHTML = '';

    const preview = this.generatePreview(platform);
    container.appendChild(preview);
  }

  /**
   * Generate preview element for platform
   */
  generatePreview(platform) {
    const wrapper = document.createElement('div');
    wrapper.className = `pct-social-preview-wrapper pct-social-preview-${platform}`;

    if (platform === 'facebook') {
      wrapper.innerHTML = `
        <div class="pct-social-preview-card">
          <div class="pct-social-preview-image" style="background-image: url('${this.currentMeta.image || ''}')">
            ${!this.currentMeta.image ? '<div class="pct-social-preview-no-image">No image</div>' : ''}
          </div>
          <div class="pct-social-preview-info">
            <div class="pct-social-preview-domain">${new URL(this.currentMeta.url).hostname.toUpperCase()}</div>
            <div class="pct-social-preview-title">${this.truncate(this.currentMeta.title, 60)}</div>
            <div class="pct-social-preview-description">${this.truncate(this.currentMeta.description, 160)}</div>
          </div>
        </div>
        <div class="pct-social-preview-note">
          Facebook OG Preview (1200x630px image recommended)
        </div>
      `;
    } else if (platform === 'twitter') {
      const cardType = this.currentMeta.twitterCard || 'summary_large_image';
      wrapper.innerHTML = `
        <div class="pct-social-preview-card pct-social-preview-twitter-${cardType}">
          <div class="pct-social-preview-image" style="background-image: url('${this.currentMeta.image || ''}')">
            ${!this.currentMeta.image ? '<div class="pct-social-preview-no-image">No image</div>' : ''}
          </div>
          <div class="pct-social-preview-info">
            <div class="pct-social-preview-title">${this.truncate(this.currentMeta.title, 70)}</div>
            <div class="pct-social-preview-description">${this.truncate(this.currentMeta.description, 200)}</div>
            <div class="pct-social-preview-domain">${new URL(this.currentMeta.url).hostname}</div>
          </div>
        </div>
        <div class="pct-social-preview-note">
          Twitter ${cardType} (1200x628px for large image, 1:1 for summary)
        </div>
      `;
    } else if (platform === 'linkedin') {
      wrapper.innerHTML = `
        <div class="pct-social-preview-card">
          <div class="pct-social-preview-image" style="background-image: url('${this.currentMeta.image || ''}')">
            ${!this.currentMeta.image ? '<div class="pct-social-preview-no-image">No image</div>' : ''}
          </div>
          <div class="pct-social-preview-info">
            <div class="pct-social-preview-title">${this.truncate(this.currentMeta.title, 100)}</div>
            <div class="pct-social-preview-domain">${new URL(this.currentMeta.url).hostname}</div>
          </div>
        </div>
        <div class="pct-social-preview-note">
          LinkedIn Preview (1200x627px image recommended)
        </div>
      `;
    }

    return wrapper;
  }

  /**
   * Truncate text to max length
   */
  truncate(text, maxLength) {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength - 3) + '...';
  }

  /**
   * Open social media debuggers
   */
  testDebuggers() {
    const url = encodeURIComponent(this.currentMeta.url);

    const debuggers = {
      facebook: `https://developers.facebook.com/tools/debug/?q=${url}`,
      twitter: `https://cards-dev.twitter.com/validator?url=${url}`,
      linkedin: `https://www.linkedin.com/post-inspector/?url=${url}`,
    };

    Object.entries(debuggers).forEach(([platform, debugUrl]) => {
      window.open(debugUrl, `${platform}_debugger`);
    });

    console.log('[Social Preview] Opened debuggers');
  }

  /**
   * Copy meta tags to clipboard
   */
  copyMetaTags() {
    const meta = this.currentMeta;
    const tags = `
<!-- Open Graph / Facebook -->
<meta property="og:type" content="${meta.type || 'website'}">
<meta property="og:url" content="${meta.url}">
<meta property="og:title" content="${meta.title}">
<meta property="og:description" content="${meta.description}">
<meta property="og:image" content="${meta.image}">
<meta property="og:site_name" content="${meta.siteName || ''}">

<!-- Twitter -->
<meta name="twitter:card" content="${meta.twitterCard || 'summary_large_image'}">
<meta name="twitter:url" content="${meta.url}">
<meta name="twitter:title" content="${meta.title}">
<meta name="twitter:description" content="${meta.description}">
<meta name="twitter:image" content="${meta.image}">
${meta.twitterSite ? `<meta name="twitter:site" content="${meta.twitterSite}">` : ''}
    `.trim();

    navigator.clipboard.writeText(tags).then(() => {
      this.showToast('Meta tags copied to clipboard!');
    });
  }

  /**
   * Show toast notification
   */
  showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'pct-social-preview-toast';
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('show');
    }, 10);

    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  /**
   * Add styles
   */
  addStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .pct-social-preview-btn {
        position: fixed;
        bottom: 20px;
        right: 20px;
        z-index: 9998;
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 12px 20px;
        background: #6366f1;
        color: white;
        border: none;
        border-radius: 8px;
        font-weight: 500;
        cursor: pointer;
        box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
        transition: all 0.2s;
      }

      .pct-social-preview-btn:hover {
        background: #4f46e5;
        transform: translateY(-2px);
        box-shadow: 0 6px 16px rgba(99, 102, 241, 0.5);
      }

      .pct-social-preview-modal {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 9999;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .pct-social-preview-modal-overlay {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.6);
      }

      .pct-social-preview-modal-content {
        position: relative;
        background: white;
        border-radius: 12px;
        max-width: 800px;
        width: 90%;
        max-height: 90vh;
        overflow: hidden;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      }

      .pct-social-preview-modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 20px;
        border-bottom: 1px solid #e5e7eb;
      }

      .pct-social-preview-modal-header h2 {
        margin: 0;
        font-size: 1.5rem;
      }

      .pct-social-preview-close {
        background: none;
        border: none;
        font-size: 2rem;
        cursor: pointer;
        color: #6b7280;
        line-height: 1;
        padding: 0;
        width: 32px;
        height: 32px;
      }

      .pct-social-preview-modal-body {
        padding: 20px;
        overflow-y: auto;
        max-height: calc(90vh - 80px);
      }

      .pct-social-preview-tabs {
        display: flex;
        gap: 8px;
        margin-bottom: 20px;
        border-bottom: 2px solid #e5e7eb;
      }

      .pct-social-preview-tab {
        padding: 12px 24px;
        background: none;
        border: none;
        border-bottom: 2px solid transparent;
        margin-bottom: -2px;
        cursor: pointer;
        font-weight: 500;
        color: #6b7280;
        transition: all 0.2s;
      }

      .pct-social-preview-tab.active {
        color: #6366f1;
        border-bottom-color: #6366f1;
      }

      .pct-social-preview-content {
        min-height: 400px;
      }

      .pct-social-preview-card {
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        overflow: hidden;
        background: white;
        margin-bottom: 16px;
      }

      .pct-social-preview-image {
        width: 100%;
        height: 300px;
        background-size: cover;
        background-position: center;
        background-color: #f3f4f6;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .pct-social-preview-no-image {
        color: #9ca3af;
        font-size: 1.125rem;
      }

      .pct-social-preview-info {
        padding: 16px;
      }

      .pct-social-preview-domain {
        font-size: 0.75rem;
        color: #6b7280;
        text-transform: uppercase;
        margin-bottom: 8px;
      }

      .pct-social-preview-title {
        font-size: 1.125rem;
        font-weight: 600;
        color: #111827;
        margin-bottom: 8px;
        line-height: 1.4;
      }

      .pct-social-preview-description {
        font-size: 0.9375rem;
        color: #6b7280;
        line-height: 1.5;
      }

      .pct-social-preview-note {
        font-size: 0.875rem;
        color: #6b7280;
        padding: 12px;
        background: #f9fafb;
        border-radius: 4px;
      }

      .pct-social-preview-actions {
        display: flex;
        gap: 12px;
        margin-top: 20px;
        padding-top: 20px;
        border-top: 1px solid #e5e7eb;
      }

      .pct-social-preview-toast {
        position: fixed;
        bottom: 80px;
        right: 20px;
        z-index: 10000;
        background: #10b981;
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        opacity: 0;
        transform: translateY(20px);
        transition: all 0.3s;
      }

      .pct-social-preview-toast.show {
        opacity: 1;
        transform: translateY(0);
      }
    `;
    document.head.appendChild(style);
  }
}

// Create singleton instance
const pctSocialPreview = new PCTSocialPreviewTester();

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => pctSocialPreview.init());
} else {
  pctSocialPreview.init();
}

// Export for use in other modules
window.pctSocialPreview = pctSocialPreview;
