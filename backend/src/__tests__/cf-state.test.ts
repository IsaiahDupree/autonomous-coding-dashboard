/**
 * Content Factory State Management Unit Tests
 * Feature: CF-WC-006 - Unit tests for stores/context
 *
 * Tests state management for:
 * - Initial state
 * - Actions and reducers
 * - Selectors
 */

import { describe, it, expect, beforeEach } from 'vitest';

// ============================================
// STATE MANAGEMENT (Vanilla JS State Pattern)
// ============================================

interface CFState {
  dossiers: any[];
  selectedDossierId: string | null;
  generatedImages: any[];
  generatedVideos: any[];
  scripts: any[];
  assembledContent: any[];
  publishedContent: any[];
  filters: {
    awarenessLevel: number | null;
    status: string | null;
    platform: string | null;
    search: string;
  };
  selectedContentIds: Set<string>;
  loading: boolean;
  error: string | null;
  activeGeneration: {
    type: 'image' | 'video' | 'script' | 'assembly' | null;
    progress: number;
  };
}

class CFStateManager {
  private state: CFState;
  private listeners: Array<(state: CFState) => void> = [];

  constructor() {
    this.state = {
      dossiers: [],
      selectedDossierId: null,
      generatedImages: [],
      generatedVideos: [],
      scripts: [],
      assembledContent: [],
      publishedContent: [],
      filters: {
        awarenessLevel: null,
        status: null,
        platform: null,
        search: '',
      },
      selectedContentIds: new Set(),
      loading: false,
      error: null,
      activeGeneration: {
        type: null,
        progress: 0,
      },
    };
  }

  getState(): CFState {
    return {
      ...this.state,
      dossiers: [...this.state.dossiers],
      generatedImages: [...this.state.generatedImages],
      generatedVideos: [...this.state.generatedVideos],
      scripts: [...this.state.scripts],
      assembledContent: [...this.state.assembledContent],
      publishedContent: [...this.state.publishedContent],
      selectedContentIds: new Set(this.state.selectedContentIds),
      filters: { ...this.state.filters },
      activeGeneration: { ...this.state.activeGeneration },
    };
  }

  subscribe(listener: (state: CFState) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notify(): void {
    this.listeners.forEach(listener => listener(this.getState()));
  }

  // Dossier Actions
  setDossiers(dossiers: any[]): void {
    this.state.dossiers = dossiers;
    this.notify();
  }

  addDossier(dossier: any): void {
    this.state.dossiers.push(dossier);
    this.notify();
  }

  updateDossier(id: string, updates: Partial<any>): void {
    const index = this.state.dossiers.findIndex(d => d.id === id);
    if (index !== -1) {
      this.state.dossiers[index] = { ...this.state.dossiers[index], ...updates };
      this.notify();
    }
  }

  deleteDossier(id: string): void {
    this.state.dossiers = this.state.dossiers.filter(d => d.id !== id);
    this.notify();
  }

  selectDossier(dossierId: string | null): void {
    this.state.selectedDossierId = dossierId;
    this.notify();
  }

  // Generated Content Actions
  setGeneratedImages(images: any[]): void {
    this.state.generatedImages = images;
    this.notify();
  }

  addGeneratedImage(image: any): void {
    this.state.generatedImages.push(image);
    this.notify();
  }

  setGeneratedVideos(videos: any[]): void {
    this.state.generatedVideos = videos;
    this.notify();
  }

  addGeneratedVideo(video: any): void {
    this.state.generatedVideos.push(video);
    this.notify();
  }

  setScripts(scripts: any[]): void {
    this.state.scripts = scripts;
    this.notify();
  }

  addScript(script: any): void {
    this.state.scripts.push(script);
    this.notify();
  }

  // Assembly and Publishing Actions
  setAssembledContent(content: any[]): void {
    this.state.assembledContent = content;
    this.notify();
  }

  addAssembledContent(content: any): void {
    this.state.assembledContent.push(content);
    this.notify();
  }

  setPublishedContent(content: any[]): void {
    this.state.publishedContent = content;
    this.notify();
  }

  addPublishedContent(content: any): void {
    this.state.publishedContent.push(content);
    this.notify();
  }

  updatePublishedContentMetrics(id: string, metrics: any): void {
    const index = this.state.publishedContent.findIndex(c => c.id === id);
    if (index !== -1) {
      this.state.publishedContent[index].metrics = {
        ...this.state.publishedContent[index].metrics,
        ...metrics,
      };
      this.notify();
    }
  }

  // Filter Actions
  setFilter(key: keyof CFState['filters'], value: any): void {
    this.state.filters[key] = value;
    this.notify();
  }

  clearFilters(): void {
    this.state.filters = {
      awarenessLevel: null,
      status: null,
      platform: null,
      search: '',
    };
    this.notify();
  }

  // Selection Actions
  toggleContentSelection(contentId: string): void {
    if (this.state.selectedContentIds.has(contentId)) {
      this.state.selectedContentIds.delete(contentId);
    } else {
      this.state.selectedContentIds.add(contentId);
    }
    this.notify();
  }

  clearContentSelection(): void {
    this.state.selectedContentIds.clear();
    this.notify();
  }

  // Loading and Error Actions
  setLoading(loading: boolean): void {
    this.state.loading = loading;
    this.notify();
  }

  setError(error: string | null): void {
    this.state.error = error;
    this.notify();
  }

  // Generation Progress Actions
  setActiveGeneration(type: CFState['activeGeneration']['type'], progress: number = 0): void {
    this.state.activeGeneration = { type, progress };
    this.notify();
  }

  updateGenerationProgress(progress: number): void {
    this.state.activeGeneration.progress = progress;
    this.notify();
  }

  clearActiveGeneration(): void {
    this.state.activeGeneration = { type: null, progress: 0 };
    this.notify();
  }

  // Reset
  reset(): void {
    this.state = {
      dossiers: [],
      selectedDossierId: null,
      generatedImages: [],
      generatedVideos: [],
      scripts: [],
      assembledContent: [],
      publishedContent: [],
      filters: {
        awarenessLevel: null,
        status: null,
        platform: null,
        search: '',
      },
      selectedContentIds: new Set(),
      loading: false,
      error: null,
      activeGeneration: {
        type: null,
        progress: 0,
      },
    };
    this.notify();
  }

  // Selectors
  getSelectedDossier(): any | null {
    return this.state.dossiers.find(d => d.id === this.state.selectedDossierId) || null;
  }

  getFilteredContent(): any[] {
    let filtered = [...this.state.assembledContent];

    if (this.state.filters.awarenessLevel !== null) {
      filtered = filtered.filter(c => c.awarenessLevel === this.state.filters.awarenessLevel);
    }

    if (this.state.filters.status) {
      filtered = filtered.filter(c => c.status === this.state.filters.status);
    }

    if (this.state.filters.platform) {
      filtered = filtered.filter(c => c.platform === this.state.filters.platform);
    }

    if (this.state.filters.search) {
      const search = this.state.filters.search.toLowerCase();
      filtered = filtered.filter(c =>
        c.title?.toLowerCase().includes(search) ||
        c.description?.toLowerCase().includes(search)
      );
    }

    return filtered;
  }

  getSelectedContent(): any[] {
    return this.state.assembledContent.filter(c => this.state.selectedContentIds.has(c.id));
  }

  getContentByDossier(dossierId: string): any[] {
    return this.state.assembledContent.filter(c => c.dossierId === dossierId);
  }

  getScriptsByAwarenessLevel(level: number): any[] {
    return this.state.scripts.filter(s => s.awarenessLevel === level);
  }
}

describe('CF State Management', () => {
  let stateManager: CFStateManager;

  beforeEach(() => {
    stateManager = new CFStateManager();
  });

  // ============================================
  // INITIAL STATE TESTS
  // ============================================

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const state = stateManager.getState();

      expect(state.dossiers).toEqual([]);
      expect(state.selectedDossierId).toBeNull();
      expect(state.generatedImages).toEqual([]);
      expect(state.generatedVideos).toEqual([]);
      expect(state.scripts).toEqual([]);
      expect(state.assembledContent).toEqual([]);
      expect(state.publishedContent).toEqual([]);
      expect(state.selectedContentIds.size).toBe(0);
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('should have initial filters', () => {
      const state = stateManager.getState();

      expect(state.filters.awarenessLevel).toBeNull();
      expect(state.filters.status).toBeNull();
      expect(state.filters.platform).toBeNull();
      expect(state.filters.search).toBe('');
    });

    it('should have initial generation state', () => {
      const state = stateManager.getState();

      expect(state.activeGeneration.type).toBeNull();
      expect(state.activeGeneration.progress).toBe(0);
    });
  });

  // ============================================
  // ACTIONS TESTS
  // ============================================

  describe('Dossier Actions', () => {
    it('should set dossiers', () => {
      const dossiers = [
        { id: 'd1', productName: 'Product 1' },
        { id: 'd2', productName: 'Product 2' },
      ];
      stateManager.setDossiers(dossiers);

      const state = stateManager.getState();
      expect(state.dossiers).toEqual(dossiers);
    });

    it('should add dossier', () => {
      const dossier = { id: 'd1', productName: 'Product 1' };
      stateManager.addDossier(dossier);

      const state = stateManager.getState();
      expect(state.dossiers).toHaveLength(1);
      expect(state.dossiers[0]).toEqual(dossier);
    });

    it('should update dossier', () => {
      stateManager.setDossiers([
        { id: 'd1', productName: 'Product 1', status: 'draft' },
      ]);

      stateManager.updateDossier('d1', { status: 'active' });

      const state = stateManager.getState();
      expect(state.dossiers[0].status).toBe('active');
      expect(state.dossiers[0].productName).toBe('Product 1');
    });

    it('should delete dossier', () => {
      stateManager.setDossiers([
        { id: 'd1', productName: 'Product 1' },
        { id: 'd2', productName: 'Product 2' },
      ]);

      stateManager.deleteDossier('d1');

      const state = stateManager.getState();
      expect(state.dossiers).toHaveLength(1);
      expect(state.dossiers[0].id).toBe('d2');
    });

    it('should select dossier', () => {
      stateManager.selectDossier('dossier-123');

      const state = stateManager.getState();
      expect(state.selectedDossierId).toBe('dossier-123');
    });
  });

  describe('Generated Content Actions', () => {
    it('should set and add generated images', () => {
      const images = [{ id: 'img1', url: 'http://example.com/1.jpg' }];
      stateManager.setGeneratedImages(images);

      let state = stateManager.getState();
      expect(state.generatedImages).toEqual(images);

      stateManager.addGeneratedImage({ id: 'img2', url: 'http://example.com/2.jpg' });
      state = stateManager.getState();
      expect(state.generatedImages).toHaveLength(2);
    });

    it('should set and add generated videos', () => {
      const videos = [{ id: 'vid1', url: 'http://example.com/1.mp4' }];
      stateManager.setGeneratedVideos(videos);

      let state = stateManager.getState();
      expect(state.generatedVideos).toEqual(videos);

      stateManager.addGeneratedVideo({ id: 'vid2', url: 'http://example.com/2.mp4' });
      state = stateManager.getState();
      expect(state.generatedVideos).toHaveLength(2);
    });

    it('should set and add scripts', () => {
      const scripts = [{ id: 's1', text: 'Script 1', awarenessLevel: 1 }];
      stateManager.setScripts(scripts);

      let state = stateManager.getState();
      expect(state.scripts).toEqual(scripts);

      stateManager.addScript({ id: 's2', text: 'Script 2', awarenessLevel: 2 });
      state = stateManager.getState();
      expect(state.scripts).toHaveLength(2);
    });
  });

  describe('Assembly and Publishing Actions', () => {
    it('should set and add assembled content', () => {
      const content = [{ id: 'c1', title: 'Content 1' }];
      stateManager.setAssembledContent(content);

      let state = stateManager.getState();
      expect(state.assembledContent).toEqual(content);

      stateManager.addAssembledContent({ id: 'c2', title: 'Content 2' });
      state = stateManager.getState();
      expect(state.assembledContent).toHaveLength(2);
    });

    it('should set and add published content', () => {
      const content = [{ id: 'p1', title: 'Published 1' }];
      stateManager.setPublishedContent(content);

      let state = stateManager.getState();
      expect(state.publishedContent).toEqual(content);

      stateManager.addPublishedContent({ id: 'p2', title: 'Published 2' });
      state = stateManager.getState();
      expect(state.publishedContent).toHaveLength(2);
    });

    it('should update published content metrics', () => {
      stateManager.setPublishedContent([
        { id: 'p1', title: 'Published 1', metrics: { views: 100 } },
      ]);

      stateManager.updatePublishedContentMetrics('p1', { views: 200, likes: 50 });

      const state = stateManager.getState();
      expect(state.publishedContent[0].metrics.views).toBe(200);
      expect(state.publishedContent[0].metrics.likes).toBe(50);
    });
  });

  describe('Filter Actions', () => {
    it('should set individual filters', () => {
      stateManager.setFilter('awarenessLevel', 3);
      stateManager.setFilter('status', 'published');
      stateManager.setFilter('platform', 'tiktok');

      const state = stateManager.getState();
      expect(state.filters.awarenessLevel).toBe(3);
      expect(state.filters.status).toBe('published');
      expect(state.filters.platform).toBe('tiktok');
    });

    it('should clear all filters', () => {
      stateManager.setFilter('awarenessLevel', 3);
      stateManager.setFilter('status', 'published');
      stateManager.clearFilters();

      const state = stateManager.getState();
      expect(state.filters.awarenessLevel).toBeNull();
      expect(state.filters.status).toBeNull();
      expect(state.filters.platform).toBeNull();
      expect(state.filters.search).toBe('');
    });
  });

  describe('Selection Actions', () => {
    it('should toggle content selection', () => {
      stateManager.toggleContentSelection('content-1');

      let state = stateManager.getState();
      expect(state.selectedContentIds.has('content-1')).toBe(true);

      stateManager.toggleContentSelection('content-1');
      state = stateManager.getState();
      expect(state.selectedContentIds.has('content-1')).toBe(false);
    });

    it('should clear content selection', () => {
      stateManager.toggleContentSelection('content-1');
      stateManager.toggleContentSelection('content-2');
      stateManager.clearContentSelection();

      const state = stateManager.getState();
      expect(state.selectedContentIds.size).toBe(0);
    });
  });

  describe('Loading and Error Actions', () => {
    it('should set loading state', () => {
      stateManager.setLoading(true);
      expect(stateManager.getState().loading).toBe(true);

      stateManager.setLoading(false);
      expect(stateManager.getState().loading).toBe(false);
    });

    it('should set error state', () => {
      stateManager.setError('Generation failed');
      expect(stateManager.getState().error).toBe('Generation failed');

      stateManager.setError(null);
      expect(stateManager.getState().error).toBeNull();
    });
  });

  describe('Generation Progress Actions', () => {
    it('should set active generation', () => {
      stateManager.setActiveGeneration('image', 25);

      const state = stateManager.getState();
      expect(state.activeGeneration.type).toBe('image');
      expect(state.activeGeneration.progress).toBe(25);
    });

    it('should update generation progress', () => {
      stateManager.setActiveGeneration('video', 0);
      stateManager.updateGenerationProgress(50);
      stateManager.updateGenerationProgress(100);

      const state = stateManager.getState();
      expect(state.activeGeneration.progress).toBe(100);
    });

    it('should clear active generation', () => {
      stateManager.setActiveGeneration('script', 75);
      stateManager.clearActiveGeneration();

      const state = stateManager.getState();
      expect(state.activeGeneration.type).toBeNull();
      expect(state.activeGeneration.progress).toBe(0);
    });
  });

  describe('Reset Action', () => {
    it('should reset entire state', () => {
      stateManager.setDossiers([{ id: 'd1' }]);
      stateManager.selectDossier('d1');
      stateManager.setError('Error');
      stateManager.setActiveGeneration('image', 50);

      stateManager.reset();

      const state = stateManager.getState();
      expect(state.dossiers).toEqual([]);
      expect(state.selectedDossierId).toBeNull();
      expect(state.error).toBeNull();
      expect(state.activeGeneration.type).toBeNull();
    });
  });

  // ============================================
  // SELECTORS TESTS
  // ============================================

  describe('Selectors', () => {
    beforeEach(() => {
      const dossiers = [
        { id: 'd1', productName: 'Product 1' },
        { id: 'd2', productName: 'Product 2' },
      ];
      stateManager.setDossiers(dossiers);

      const scripts = [
        { id: 's1', text: 'Script 1', awarenessLevel: 1 },
        { id: 's2', text: 'Script 2', awarenessLevel: 2 },
        { id: 's3', text: 'Script 3', awarenessLevel: 1 },
      ];
      stateManager.setScripts(scripts);

      const content = [
        {
          id: 'c1',
          title: 'Before/After 1',
          description: 'Product demo',
          dossierId: 'd1',
          awarenessLevel: 3,
          status: 'published',
          platform: 'tiktok',
        },
        {
          id: 'c2',
          title: 'Before/After 2',
          description: 'Review style',
          dossierId: 'd1',
          awarenessLevel: 4,
          status: 'draft',
          platform: 'instagram',
        },
        {
          id: 'c3',
          title: 'POV Content',
          description: 'POV meme',
          dossierId: 'd2',
          awarenessLevel: 1,
          status: 'published',
          platform: 'tiktok',
        },
      ];
      stateManager.setAssembledContent(content);
    });

    it('should get selected dossier', () => {
      stateManager.selectDossier('d1');
      const dossier = stateManager.getSelectedDossier();

      expect(dossier).toBeDefined();
      expect(dossier?.id).toBe('d1');
    });

    it('should return null for non-existent dossier', () => {
      stateManager.selectDossier('nonexistent');
      const dossier = stateManager.getSelectedDossier();

      expect(dossier).toBeNull();
    });

    it('should filter content by awareness level', () => {
      stateManager.setFilter('awarenessLevel', 1);
      const filtered = stateManager.getFilteredContent();

      expect(filtered).toHaveLength(1);
      expect(filtered[0].awarenessLevel).toBe(1);
    });

    it('should filter content by status', () => {
      stateManager.setFilter('status', 'published');
      const filtered = stateManager.getFilteredContent();

      expect(filtered).toHaveLength(2);
      filtered.forEach(content => {
        expect(content.status).toBe('published');
      });
    });

    it('should filter content by platform', () => {
      stateManager.setFilter('platform', 'tiktok');
      const filtered = stateManager.getFilteredContent();

      expect(filtered).toHaveLength(2);
      filtered.forEach(content => {
        expect(content.platform).toBe('tiktok');
      });
    });

    it('should filter content by search text', () => {
      stateManager.setFilter('search', 'pov');
      const filtered = stateManager.getFilteredContent();

      expect(filtered).toHaveLength(1);
      expect(filtered[0].title).toBe('POV Content');
    });

    it('should combine multiple filters', () => {
      stateManager.setFilter('status', 'published');
      stateManager.setFilter('platform', 'tiktok');
      const filtered = stateManager.getFilteredContent();

      expect(filtered).toHaveLength(2);
    });

    it('should get selected content', () => {
      stateManager.toggleContentSelection('c1');
      stateManager.toggleContentSelection('c3');

      const selected = stateManager.getSelectedContent();
      expect(selected).toHaveLength(2);
      expect(selected.map(c => c.id)).toEqual(['c1', 'c3']);
    });

    it('should get content by dossier', () => {
      const content = stateManager.getContentByDossier('d1');

      expect(content).toHaveLength(2);
      content.forEach(c => {
        expect(c.dossierId).toBe('d1');
      });
    });

    it('should get scripts by awareness level', () => {
      const scripts = stateManager.getScriptsByAwarenessLevel(1);

      expect(scripts).toHaveLength(2);
      scripts.forEach(s => {
        expect(s.awarenessLevel).toBe(1);
      });
    });
  });

  // ============================================
  // SUBSCRIPTION TESTS
  // ============================================

  describe('Subscriptions', () => {
    it('should notify listeners on state change', () => {
      let notified = false;
      stateManager.subscribe(() => {
        notified = true;
      });

      stateManager.setDossiers([{ id: 'd1' }]);
      expect(notified).toBe(true);
    });

    it('should unsubscribe listener', () => {
      let count = 0;
      const unsubscribe = stateManager.subscribe(() => {
        count++;
      });

      stateManager.setDossiers([{ id: 'd1' }]);
      expect(count).toBe(1);

      unsubscribe();
      stateManager.setDossiers([{ id: 'd2' }]);
      expect(count).toBe(1); // Should not increment
    });

    it('should handle multiple listeners', () => {
      let count1 = 0;
      let count2 = 0;

      stateManager.subscribe(() => { count1++; });
      stateManager.subscribe(() => { count2++; });

      stateManager.setDossiers([{ id: 'd1' }]);

      expect(count1).toBe(1);
      expect(count2).toBe(1);
    });
  });

  // ============================================
  // STATE IMMUTABILITY TESTS
  // ============================================

  describe('State Immutability', () => {
    it('should return new state object on getState', () => {
      const state1 = stateManager.getState();
      const state2 = stateManager.getState();

      expect(state1).not.toBe(state2);
    });

    it('should not mutate original state when modifying returned state', () => {
      const state = stateManager.getState();
      state.dossiers.push({ id: 'new' });

      const newState = stateManager.getState();
      expect(newState.dossiers).toEqual([]);
    });

    it('should return new Set for selectedContentIds', () => {
      stateManager.toggleContentSelection('c1');
      const state1 = stateManager.getState();
      const state2 = stateManager.getState();

      expect(state1.selectedContentIds).not.toBe(state2.selectedContentIds);
    });
  });
});
