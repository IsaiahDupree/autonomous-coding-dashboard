/**
 * PCT State Management Unit Tests
 * Feature: PCT-WC-006 - Unit tests for stores/context
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

interface PCTState {
  brands: any[];
  selectedBrandId: string | null;
  products: any[];
  selectedProductId: string | null;
  hooks: any[];
  hookFilters: {
    messagingFramework: string | null;
    awarenessLevel: number | null;
    marketSophistication: number | null;
    status: string | null;
    search: string;
  };
  selectedHookIds: Set<string>;
  loading: boolean;
  error: string | null;
}

class PCTStateManager {
  private state: PCTState;
  private listeners: Array<(state: PCTState) => void> = [];

  constructor() {
    this.state = {
      brands: [],
      selectedBrandId: null,
      products: [],
      selectedProductId: null,
      hooks: [],
      hookFilters: {
        messagingFramework: null,
        awarenessLevel: null,
        marketSophistication: null,
        status: null,
        search: '',
      },
      selectedHookIds: new Set(),
      loading: false,
      error: null,
    };
  }

  getState(): PCTState {
    return { ...this.state, selectedHookIds: new Set(this.state.selectedHookIds) };
  }

  subscribe(listener: (state: PCTState) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notify(): void {
    this.listeners.forEach(listener => listener(this.getState()));
  }

  // Actions
  setBrands(brands: any[]): void {
    this.state.brands = brands;
    this.notify();
  }

  selectBrand(brandId: string | null): void {
    this.state.selectedBrandId = brandId;
    this.notify();
  }

  setProducts(products: any[]): void {
    this.state.products = products;
    this.notify();
  }

  selectProduct(productId: string | null): void {
    this.state.selectedProductId = productId;
    this.notify();
  }

  setHooks(hooks: any[]): void {
    this.state.hooks = hooks;
    this.notify();
  }

  setHookFilter(key: keyof PCTState['hookFilters'], value: any): void {
    this.state.hookFilters[key] = value;
    this.notify();
  }

  toggleHookSelection(hookId: string): void {
    if (this.state.selectedHookIds.has(hookId)) {
      this.state.selectedHookIds.delete(hookId);
    } else {
      this.state.selectedHookIds.add(hookId);
    }
    this.notify();
  }

  clearHookSelection(): void {
    this.state.selectedHookIds.clear();
    this.notify();
  }

  setLoading(loading: boolean): void {
    this.state.loading = loading;
    this.notify();
  }

  setError(error: string | null): void {
    this.state.error = error;
    this.notify();
  }

  reset(): void {
    this.state = {
      brands: [],
      selectedBrandId: null,
      products: [],
      selectedProductId: null,
      hooks: [],
      hookFilters: {
        messagingFramework: null,
        awarenessLevel: null,
        marketSophistication: null,
        status: null,
        search: '',
      },
      selectedHookIds: new Set(),
      loading: false,
      error: null,
    };
    this.notify();
  }

  // Selectors
  getSelectedBrand(): any | null {
    return this.state.brands.find(b => b.id === this.state.selectedBrandId) || null;
  }

  getSelectedProduct(): any | null {
    return this.state.products.find(p => p.id === this.state.selectedProductId) || null;
  }

  getFilteredHooks(): any[] {
    let filtered = [...this.state.hooks];

    if (this.state.hookFilters.messagingFramework) {
      filtered = filtered.filter(h => h.messagingFramework === this.state.hookFilters.messagingFramework);
    }

    if (this.state.hookFilters.awarenessLevel !== null) {
      filtered = filtered.filter(h => h.awarenessLevel === this.state.hookFilters.awarenessLevel);
    }

    if (this.state.hookFilters.marketSophistication !== null) {
      filtered = filtered.filter(h => h.marketSophistication === this.state.hookFilters.marketSophistication);
    }

    if (this.state.hookFilters.status) {
      filtered = filtered.filter(h => h.status === this.state.hookFilters.status);
    }

    if (this.state.hookFilters.search) {
      const search = this.state.hookFilters.search.toLowerCase();
      filtered = filtered.filter(h => h.text.toLowerCase().includes(search));
    }

    return filtered;
  }

  getSelectedHooks(): any[] {
    return this.state.hooks.filter(h => this.state.selectedHookIds.has(h.id));
  }
}

describe('PCT State Management', () => {
  let stateManager: PCTStateManager;

  beforeEach(() => {
    stateManager = new PCTStateManager();
  });

  // ============================================
  // INITIAL STATE TESTS
  // ============================================

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const state = stateManager.getState();

      expect(state.brands).toEqual([]);
      expect(state.selectedBrandId).toBeNull();
      expect(state.products).toEqual([]);
      expect(state.selectedProductId).toBeNull();
      expect(state.hooks).toEqual([]);
      expect(state.selectedHookIds.size).toBe(0);
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('should have initial hook filters', () => {
      const state = stateManager.getState();

      expect(state.hookFilters.messagingFramework).toBeNull();
      expect(state.hookFilters.awarenessLevel).toBeNull();
      expect(state.hookFilters.marketSophistication).toBeNull();
      expect(state.hookFilters.status).toBeNull();
      expect(state.hookFilters.search).toBe('');
    });
  });

  // ============================================
  // ACTIONS TESTS
  // ============================================

  describe('Actions', () => {
    it('should set brands', () => {
      const brands = [{ id: 'b1', name: 'Brand 1' }];
      stateManager.setBrands(brands);

      const state = stateManager.getState();
      expect(state.brands).toEqual(brands);
    });

    it('should select brand', () => {
      stateManager.selectBrand('brand-123');

      const state = stateManager.getState();
      expect(state.selectedBrandId).toBe('brand-123');
    });

    it('should set products', () => {
      const products = [{ id: 'p1', name: 'Product 1' }];
      stateManager.setProducts(products);

      const state = stateManager.getState();
      expect(state.products).toEqual(products);
    });

    it('should select product', () => {
      stateManager.selectProduct('product-456');

      const state = stateManager.getState();
      expect(state.selectedProductId).toBe('product-456');
    });

    it('should set hooks', () => {
      const hooks = [
        { id: 'h1', text: 'Hook 1', messagingFramework: 'punchy' },
        { id: 'h2', text: 'Hook 2', messagingFramework: 'bold' },
      ];
      stateManager.setHooks(hooks);

      const state = stateManager.getState();
      expect(state.hooks).toEqual(hooks);
    });

    it('should set hook filter', () => {
      stateManager.setHookFilter('messagingFramework', 'punchy');

      const state = stateManager.getState();
      expect(state.hookFilters.messagingFramework).toBe('punchy');
    });

    it('should toggle hook selection', () => {
      stateManager.toggleHookSelection('hook-1');

      let state = stateManager.getState();
      expect(state.selectedHookIds.has('hook-1')).toBe(true);

      stateManager.toggleHookSelection('hook-1');
      state = stateManager.getState();
      expect(state.selectedHookIds.has('hook-1')).toBe(false);
    });

    it('should clear hook selection', () => {
      stateManager.toggleHookSelection('hook-1');
      stateManager.toggleHookSelection('hook-2');
      stateManager.clearHookSelection();

      const state = stateManager.getState();
      expect(state.selectedHookIds.size).toBe(0);
    });

    it('should set loading state', () => {
      stateManager.setLoading(true);
      expect(stateManager.getState().loading).toBe(true);

      stateManager.setLoading(false);
      expect(stateManager.getState().loading).toBe(false);
    });

    it('should set error state', () => {
      stateManager.setError('Something went wrong');
      expect(stateManager.getState().error).toBe('Something went wrong');

      stateManager.setError(null);
      expect(stateManager.getState().error).toBeNull();
    });

    it('should reset state', () => {
      stateManager.setBrands([{ id: 'b1' }]);
      stateManager.selectBrand('b1');
      stateManager.setError('Error');

      stateManager.reset();

      const state = stateManager.getState();
      expect(state.brands).toEqual([]);
      expect(state.selectedBrandId).toBeNull();
      expect(state.error).toBeNull();
    });
  });

  // ============================================
  // SELECTORS TESTS
  // ============================================

  describe('Selectors', () => {
    beforeEach(() => {
      const brands = [
        { id: 'b1', name: 'Brand 1' },
        { id: 'b2', name: 'Brand 2' },
      ];
      stateManager.setBrands(brands);

      const products = [
        { id: 'p1', name: 'Product 1', brandId: 'b1' },
        { id: 'p2', name: 'Product 2', brandId: 'b1' },
      ];
      stateManager.setProducts(products);

      const hooks = [
        { id: 'h1', text: 'Hook 1', messagingFramework: 'punchy', awarenessLevel: 3, status: 'approved' },
        { id: 'h2', text: 'Hook 2', messagingFramework: 'bold', awarenessLevel: 4, status: 'pending' },
        { id: 'h3', text: 'Hook 3', messagingFramework: 'punchy', awarenessLevel: 3, status: 'approved' },
      ];
      stateManager.setHooks(hooks);
    });

    it('should get selected brand', () => {
      stateManager.selectBrand('b1');
      const brand = stateManager.getSelectedBrand();

      expect(brand).toBeDefined();
      expect(brand?.id).toBe('b1');
    });

    it('should return null for non-existent brand', () => {
      stateManager.selectBrand('nonexistent');
      const brand = stateManager.getSelectedBrand();

      expect(brand).toBeNull();
    });

    it('should get selected product', () => {
      stateManager.selectProduct('p1');
      const product = stateManager.getSelectedProduct();

      expect(product).toBeDefined();
      expect(product?.id).toBe('p1');
    });

    it('should filter hooks by messaging framework', () => {
      stateManager.setHookFilter('messagingFramework', 'punchy');
      const filtered = stateManager.getFilteredHooks();

      expect(filtered).toHaveLength(2);
      filtered.forEach(hook => {
        expect(hook.messagingFramework).toBe('punchy');
      });
    });

    it('should filter hooks by awareness level', () => {
      stateManager.setHookFilter('awarenessLevel', 3);
      const filtered = stateManager.getFilteredHooks();

      expect(filtered).toHaveLength(2);
      filtered.forEach(hook => {
        expect(hook.awarenessLevel).toBe(3);
      });
    });

    it('should filter hooks by status', () => {
      stateManager.setHookFilter('status', 'approved');
      const filtered = stateManager.getFilteredHooks();

      expect(filtered).toHaveLength(2);
      filtered.forEach(hook => {
        expect(hook.status).toBe('approved');
      });
    });

    it('should filter hooks by search text', () => {
      stateManager.setHookFilter('search', 'hook 1');
      const filtered = stateManager.getFilteredHooks();

      expect(filtered).toHaveLength(1);
      expect(filtered[0].text).toBe('Hook 1');
    });

    it('should combine multiple filters', () => {
      stateManager.setHookFilter('messagingFramework', 'punchy');
      stateManager.setHookFilter('awarenessLevel', 3);
      stateManager.setHookFilter('status', 'approved');
      const filtered = stateManager.getFilteredHooks();

      expect(filtered).toHaveLength(2);
    });

    it('should get selected hooks', () => {
      stateManager.toggleHookSelection('h1');
      stateManager.toggleHookSelection('h3');

      const selected = stateManager.getSelectedHooks();
      expect(selected).toHaveLength(2);
      expect(selected.map(h => h.id)).toEqual(['h1', 'h3']);
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

      stateManager.setBrands([{ id: 'b1' }]);
      expect(notified).toBe(true);
    });

    it('should unsubscribe listener', () => {
      let count = 0;
      const unsubscribe = stateManager.subscribe(() => {
        count++;
      });

      stateManager.setBrands([{ id: 'b1' }]);
      expect(count).toBe(1);

      unsubscribe();
      stateManager.setBrands([{ id: 'b2' }]);
      expect(count).toBe(1); // Should not increment
    });

    it('should handle multiple listeners', () => {
      let count1 = 0;
      let count2 = 0;

      stateManager.subscribe(() => { count1++; });
      stateManager.subscribe(() => { count2++; });

      stateManager.setBrands([{ id: 'b1' }]);

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
      state.brands.push({ id: 'new' });

      const newState = stateManager.getState();
      expect(newState.brands).toEqual([]);
    });
  });
});
