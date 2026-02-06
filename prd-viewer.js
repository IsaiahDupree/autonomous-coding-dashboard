/**
 * PRD Viewer - View and navigate PRDs inline
 * feat-034
 */

let currentProject = null;
let currentPRDContent = '';
let currentPRDPath = '';
let searchTerm = '';

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  loadProjects();
  setupEventListeners();
  setupMarkedOptions();
});

/**
 * Configure marked.js options
 */
function setupMarkedOptions() {
  if (typeof marked !== 'undefined') {
    marked.setOptions({
      breaks: true,
      gfm: true,
      headerIds: true,
      mangle: false,
      highlight: function(code, lang) {
        if (lang && typeof hljs !== 'undefined' && hljs.getLanguage(lang)) {
          try {
            return hljs.highlight(code, { language: lang }).value;
          } catch (err) {
            console.error('Highlight error:', err);
          }
        }
        return code;
      }
    });
  }
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
  const projectSelector = document.getElementById('project-selector');
  const searchInput = document.getElementById('search-input');
  const searchClear = document.getElementById('search-clear');

  if (projectSelector) {
    projectSelector.addEventListener('change', (e) => {
      const projectId = e.target.value;
      if (projectId) {
        loadPRD(projectId);
      }
    });
  }

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchTerm = e.target.value;
      if (searchTerm.length >= 2) {
        performSearch();
      } else if (searchTerm.length === 0) {
        clearSearch();
      }
    });
  }

  if (searchClear) {
    searchClear.addEventListener('click', () => {
      searchInput.value = '';
      searchTerm = '';
      clearSearch();
    });
  }
}

/**
 * Load projects from repo-queue.json
 */
async function loadProjects() {
  try {
    const response = await fetch('http://localhost:3435/api/projects/list');
    const data = await response.json();

    if (data.success && data.data.repos) {
      populateProjectSelector(data.data.repos);
    }
  } catch (err) {
    console.error('Error loading projects:', err);
    showError('Failed to load projects. Please check that the backend is running.');
  }
}

/**
 * Populate project selector dropdown
 */
function populateProjectSelector(repos) {
  const selector = document.getElementById('project-selector');
  if (!selector) return;

  // Clear existing options except the first one
  selector.innerHTML = '<option value="">Select a project...</option>';

  repos.forEach(repo => {
    const option = document.createElement('option');
    option.value = repo.id;
    option.textContent = repo.name;
    option.dataset.prd = repo.prd;
    selector.appendChild(option);
  });
}

/**
 * Load PRD content for a project
 */
async function loadPRD(projectId) {
  const selector = document.getElementById('project-selector');
  const selectedOption = selector.options[selector.selectedIndex];
  const prdPath = selectedOption.dataset.prd;

  if (!prdPath) {
    showError('No PRD path configured for this project.');
    return;
  }

  currentProject = projectId;
  currentPRDPath = prdPath;

  showLoading();

  try {
    const response = await fetch(`http://localhost:3435/api/prd/read?path=${encodeURIComponent(prdPath)}`);
    const data = await response.json();

    if (data.success && data.data.content) {
      currentPRDContent = data.data.content;
      renderPRD(currentPRDContent);
      generateTOC();
    } else {
      showError(data.error || 'Failed to load PRD content.');
    }
  } catch (err) {
    console.error('Error loading PRD:', err);
    showError('Failed to load PRD. Please check that the file exists and the backend is running.');
  }
}

/**
 * Render PRD markdown content
 */
function renderPRD(markdown) {
  const contentDiv = document.getElementById('prd-content');
  if (!contentDiv) return;

  try {
    let html = marked.parse(markdown);

    // Process links to open in editor
    html = processLinks(html);

    contentDiv.innerHTML = `<div class="markdown-body">${html}</div>`;

    // Highlight code blocks
    if (typeof hljs !== 'undefined') {
      contentDiv.querySelectorAll('pre code').forEach((block) => {
        hljs.highlightElement(block);
      });
    }

    // Add scroll listeners for active TOC highlighting
    setupScrollSpy();
  } catch (err) {
    console.error('Error rendering markdown:', err);
    showError('Failed to render PRD content.');
  }
}

/**
 * Process links in the rendered HTML
 * Makes file links open in a new tab or trigger an editor action
 */
function processLinks(html) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  doc.querySelectorAll('a').forEach(link => {
    const href = link.getAttribute('href');

    // Check if it's a file reference (ends with common file extensions)
    if (href && /\.(js|ts|jsx|tsx|py|java|go|rs|c|cpp|h|hpp|md|txt|json|yaml|yml|toml|xml|html|css|scss|sass)$/i.test(href)) {
      link.setAttribute('class', 'file-link');
      link.setAttribute('title', 'Open in editor');
      link.addEventListener('click', (e) => {
        e.preventDefault();
        openInEditor(href);
      });
    }
  });

  return doc.body.innerHTML;
}

/**
 * Open a file in the user's editor (placeholder)
 */
function openInEditor(filePath) {
  // For now, just show a message
  // In a real implementation, this could trigger a VS Code command or similar
  showInfo(`File reference: ${filePath}\n\nIn a full implementation, this would open in your editor.`);
}

/**
 * Generate table of contents from headings
 */
function generateTOC() {
  const contentDiv = document.getElementById('prd-content');
  const tocList = document.getElementById('prd-toc');

  if (!contentDiv || !tocList) return;

  const headings = contentDiv.querySelectorAll('h1, h2, h3, h4');
  tocList.innerHTML = '';

  if (headings.length === 0) {
    tocList.innerHTML = '<li style="color: var(--color-text-secondary); font-size: 0.875rem;">No headings found</li>';
    return;
  }

  headings.forEach((heading, index) => {
    const level = heading.tagName.toLowerCase();
    const text = heading.textContent;
    const id = `heading-${index}`;

    // Add ID to heading for scroll-to functionality
    heading.id = id;

    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = `#${id}`;
    a.textContent = text;
    a.className = `toc-${level}`;
    a.addEventListener('click', (e) => {
      e.preventDefault();
      scrollToHeading(id);
    });

    li.appendChild(a);
    tocList.appendChild(li);
  });
}

/**
 * Scroll to a heading and highlight it
 */
function scrollToHeading(id) {
  const heading = document.getElementById(id);
  if (heading) {
    heading.scrollIntoView({ behavior: 'smooth', block: 'start' });

    // Update active TOC item
    document.querySelectorAll('.prd-toc a').forEach(link => {
      link.classList.remove('active');
    });
    document.querySelector(`.prd-toc a[href="#${id}"]`)?.classList.add('active');
  }
}

/**
 * Setup scroll spy for automatic TOC highlighting
 */
function setupScrollSpy() {
  const contentDiv = document.getElementById('prd-content');
  if (!contentDiv) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const id = entry.target.id;
        document.querySelectorAll('.prd-toc a').forEach(link => {
          link.classList.remove('active');
        });
        const activeLink = document.querySelector(`.prd-toc a[href="#${id}"]`);
        if (activeLink) {
          activeLink.classList.add('active');
        }
      }
    });
  }, {
    rootMargin: '-100px 0px -66%',
    threshold: 0
  });

  contentDiv.querySelectorAll('h1, h2, h3, h4').forEach(heading => {
    observer.observe(heading);
  });
}

/**
 * Perform search in the document
 */
function performSearch() {
  if (!currentPRDContent || searchTerm.length < 2) return;

  const contentDiv = document.getElementById('prd-content');
  if (!contentDiv) return;

  // Re-render with search highlighting
  let html = marked.parse(currentPRDContent);
  html = processLinks(html);

  // Highlight search terms
  const regex = new RegExp(`(${escapeRegex(searchTerm)})`, 'gi');
  html = html.replace(regex, '<span class="search-highlight">$1</span>');

  contentDiv.innerHTML = `<div class="markdown-body">${html}</div>`;

  // Re-apply syntax highlighting
  if (typeof hljs !== 'undefined') {
    contentDiv.querySelectorAll('pre code').forEach((block) => {
      hljs.highlightElement(block);
    });
  }

  // Scroll to first match
  const firstMatch = contentDiv.querySelector('.search-highlight');
  if (firstMatch) {
    firstMatch.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  setupScrollSpy();
}

/**
 * Clear search highlighting
 */
function clearSearch() {
  if (currentPRDContent) {
    renderPRD(currentPRDContent);
    generateTOC();
  }
}

/**
 * Escape regex special characters
 */
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Download PRD as markdown file
 */
function downloadPRD() {
  if (!currentPRDContent || !currentProject) {
    showWarning('No PRD loaded to download.');
    return;
  }

  const blob = new Blob([currentPRDContent], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${currentProject}-PRD.md`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  showInfo('PRD downloaded successfully!');
}

/**
 * Show loading state
 */
function showLoading() {
  const contentDiv = document.getElementById('prd-content');
  if (contentDiv) {
    contentDiv.innerHTML = `
      <div class="loading-state">
        <div class="spinner"></div>
        <span style="margin-left: 1rem;">Loading PRD...</span>
      </div>
    `;
  }
}

/**
 * Show error message
 */
function showError(message) {
  const contentDiv = document.getElementById('prd-content');
  if (contentDiv) {
    contentDiv.innerHTML = `
      <div class="empty-state">
        <h3>⚠️ Error</h3>
        <p>${message}</p>
      </div>
    `;
  }

  if (typeof showErrorToast !== 'undefined') {
    showErrorToast(message, null, { type: 'error' });
  }
}

/**
 * Show warning message
 */
function showWarning(message) {
  if (typeof showErrorToast !== 'undefined') {
    showErrorToast(message, null, { type: 'warning' });
  } else {
    alert(message);
  }
}

/**
 * Show info message
 */
function showInfo(message) {
  if (typeof showErrorToast !== 'undefined') {
    showErrorToast(message, null, { type: 'info' });
  } else {
    alert(message);
  }
}

/**
 * Extract features from current PRD
 */
async function extractFeatures() {
  if (!currentPRDPath || !currentProject) {
    showWarning('No PRD loaded. Please select a project first.');
    return;
  }

  const extractBtn = document.getElementById('extract-btn');
  if (!extractBtn) return;

  // Disable button and show loading
  extractBtn.disabled = true;
  extractBtn.textContent = '⏳ Extracting...';

  try {
    // Call backend API to extract features
    const response = await fetch('http://localhost:3434/api/prd/extract', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        prdPath: currentPRDPath,
        projectName: currentProject,
        startingId: 1
      })
    });

    const data = await response.json();

    if (data.success && data.data.featureList) {
      const { featuresCount, featureList } = data.data;

      // Show success message with feature count
      showInfo(`✅ Successfully extracted ${featuresCount} features from PRD!`);

      // Open modal to show extracted features
      showExtractionResultsModal(featureList);
    } else {
      showError(data.error || 'Failed to extract features');
    }
  } catch (err) {
    console.error('Error extracting features:', err);
    showError('Failed to extract features. Please check that the backend is running.');
  } finally {
    // Re-enable button
    extractBtn.disabled = false;
    extractBtn.textContent = '🔍 Extract Features';
  }
}

/**
 * Show extraction results in a modal
 */
function showExtractionResultsModal(featureList) {
  // Create modal HTML
  const modalHTML = `
    <div class="modal-overlay" id="extraction-modal" onclick="closeExtractionModal(event)">
      <div class="modal large-modal" onclick="event.stopPropagation()">
        <div class="modal-header">
          <h2>Extracted Features</h2>
          <button class="modal-close" onclick="closeExtractionModal()">&times;</button>
        </div>
        <div class="modal-body" style="max-height: 70vh; overflow-y: auto;">
          <div style="margin-bottom: 1rem;">
            <strong>Total Features:</strong> ${featureList.features.length}
          </div>

          <div style="margin-bottom: 1rem;">
            <strong>Categories:</strong>
            <div style="display: flex; gap: 0.5rem; flex-wrap: wrap; margin-top: 0.5rem;">
              ${getUniqueCategoriesHTML(featureList.features)}
            </div>
          </div>

          <div class="features-list">
            ${featureList.features.map(f => `
              <div class="feature-card" style="margin-bottom: 1rem; padding: 1rem; background: var(--color-bg); border-radius: 8px; border-left: 3px solid var(--color-primary);">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 0.5rem;">
                  <strong>${f.id}</strong>
                  <span class="badge badge-${f.category}">${f.category}</span>
                </div>
                <div style="margin-bottom: 0.5rem;">${f.description}</div>
                <div style="font-size: 0.875rem; color: var(--color-text-secondary);">
                  <strong>Acceptance Criteria:</strong>
                  <ul style="margin: 0.25rem 0 0 1.5rem; padding: 0;">
                    ${f.acceptance_criteria.map(c => `<li>${c}</li>`).join('')}
                  </ul>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="closeExtractionModal()">Close</button>
          <button class="btn btn-primary" onclick="downloadExtractedFeatures()">💾 Download JSON</button>
        </div>
      </div>
    </div>
  `;

  // Store feature list globally for download
  window.extractedFeatureList = featureList;

  // Insert modal into DOM
  const modalContainer = document.createElement('div');
  modalContainer.innerHTML = modalHTML;
  document.body.appendChild(modalContainer.firstElementChild);
}

/**
 * Get unique categories as HTML badges
 */
function getUniqueCategoriesHTML(features) {
  const categories = [...new Set(features.map(f => f.category))];
  return categories.map(cat => `<span class="badge badge-${cat}">${cat}</span>`).join('');
}

/**
 * Close extraction results modal
 */
function closeExtractionModal(event) {
  if (event && event.target.classList.contains('modal-overlay')) {
    const modal = document.getElementById('extraction-modal');
    if (modal) modal.remove();
  } else if (!event) {
    const modal = document.getElementById('extraction-modal');
    if (modal) modal.remove();
  }
}

/**
 * Download extracted features as JSON
 */
function downloadExtractedFeatures() {
  if (!window.extractedFeatureList) {
    showWarning('No extracted features to download.');
    return;
  }

  const blob = new Blob([JSON.stringify(window.extractedFeatureList, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${currentProject || 'features'}_extracted.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  showInfo('Feature list downloaded successfully!');
}
