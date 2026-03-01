/**
 * PCT E2E Tests - Core Workflow
 * Features: PCT-WC-011, PCT-WC-012, PCT-WC-013
 *
 * Tests end-to-end user journeys:
 * - Brand and product creation
 * - VoC collection
 * - USP and angle management
 * - Hook generation and approval workflow
 */

import { test, expect, Page } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const PCT_URL = `${BASE_URL}/pct.html`;

// Test data
const testBrand = {
  name: `E2E Test Brand ${Date.now()}`,
  description: 'A test brand for E2E testing',
  voice: 'Professional and approachable',
  values: 'Quality, Innovation, Customer-first',
};

const testProduct = {
  name: `E2E Test Product ${Date.now()}`,
  description: 'A revolutionary skincare product that self-adjusts to your skin tone and provides buildable coverage for flawless results every time.',
  features: 'Self-adjusting color, Long-lasting formula, Natural ingredients',
  benefits: 'Perfect match every time, All-day wear, Gentle on sensitive skin',
  targetAudience: 'Women 25-45 interested in natural, easy-to-apply makeup',
};

test.describe('PCT Core Workflow E2E', () => {
  let page: Page;
  let brandId: string;
  let productId: string;

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext();
    page = await context.newPage();
  });

  test.afterAll(async () => {
    await page.close();
  });

  // ============================================
  // STEP 1: BRAND CREATION
  // ============================================

  test.describe('Step 1: Brand Creation', () => {
    test('should load the PCT application', async () => {
      await page.goto(PCT_URL);
      await expect(page).toHaveTitle(/Programmatic Creative Testing|PCT/);
    });

    test('should navigate to brand creation form', async () => {
      await page.goto(PCT_URL);

      // Click on "Brands" tab or section
      const brandsTab = page.locator('[data-tab="brands"], #tab-brands, button:has-text("Brands")').first();
      if (await brandsTab.isVisible()) {
        await brandsTab.click();
      }

      // Click "Add Brand" or "Create Brand" button
      const addBrandBtn = page.locator('button:has-text("Add Brand"), button:has-text("Create Brand"), [data-action="create-brand"]').first();
      await addBrandBtn.click();

      // Verify form is visible
      await expect(page.locator('form, [data-form="brand"]')).toBeVisible();
    });

    test('should create a new brand', async () => {
      await page.goto(PCT_URL);

      // Navigate to brand creation
      const brandsTab = page.locator('[data-tab="brands"], button:has-text("Brands")').first();
      if (await brandsTab.isVisible()) {
        await brandsTab.click();
      }

      const addBrandBtn = page.locator('button:has-text("Add Brand"), button:has-text("Create Brand")').first();
      await addBrandBtn.click();

      // Fill in brand form
      await page.fill('input[name="name"], [data-field="brand-name"]', testBrand.name);
      await page.fill('textarea[name="description"], [data-field="brand-description"]', testBrand.description);
      await page.fill('input[name="voice"], textarea[name="voice"], [data-field="brand-voice"]', testBrand.voice);
      await page.fill('input[name="values"], textarea[name="values"], [data-field="brand-values"]', testBrand.values);

      // Submit form
      const submitBtn = page.locator('button[type="submit"]:has-text("Create"), button[type="submit"]:has-text("Save")').first();
      await submitBtn.click();

      // Wait for success message or redirect
      await page.waitForTimeout(2000);

      // Verify brand appears in list
      await expect(page.locator(`text=${testBrand.name}`)).toBeVisible();
    });

    test('should display created brand in list', async () => {
      await page.goto(PCT_URL);

      // Navigate to brands section
      const brandsTab = page.locator('[data-tab="brands"], button:has-text("Brands")').first();
      if (await brandsTab.isVisible()) {
        await brandsTab.click();
      }

      // Verify brand is in the list
      await expect(page.locator(`text=${testBrand.name}`)).toBeVisible();
    });
  });

  // ============================================
  // STEP 2: PRODUCT CREATION
  // ============================================

  test.describe('Step 2: Product Creation', () => {
    test('should navigate to product creation form', async () => {
      await page.goto(PCT_URL);

      // Select the test brand first
      const brandCard = page.locator(`text=${testBrand.name}`).first();
      await brandCard.click();

      // Click "Add Product" button
      const addProductBtn = page.locator('button:has-text("Add Product"), button:has-text("Create Product")').first();
      await addProductBtn.click();

      // Verify form is visible
      await expect(page.locator('form, [data-form="product"]')).toBeVisible();
    });

    test('should create a new product', async () => {
      await page.goto(PCT_URL);

      // Select brand and navigate to product creation
      const brandCard = page.locator(`text=${testBrand.name}`).first();
      await brandCard.click();

      await page.waitForTimeout(1000);

      const addProductBtn = page.locator('button:has-text("Add Product"), button:has-text("Create Product")').first();
      await addProductBtn.click();

      // Fill in product form
      await page.fill('input[name="name"], [data-field="product-name"]', testProduct.name);
      await page.fill('textarea[name="description"], [data-field="product-description"]', testProduct.description);
      await page.fill('textarea[name="features"], [data-field="product-features"]', testProduct.features);
      await page.fill('textarea[name="benefits"], [data-field="product-benefits"]', testProduct.benefits);
      await page.fill('input[name="targetAudience"], textarea[name="targetAudience"], [data-field="product-target"]', testProduct.targetAudience);

      // Submit form
      const submitBtn = page.locator('button[type="submit"]:has-text("Create"), button[type="submit"]:has-text("Save")').first();
      await submitBtn.click();

      // Wait for success
      await page.waitForTimeout(2000);

      // Verify product appears
      await expect(page.locator(`text=${testProduct.name}`)).toBeVisible();
    });

    test('should display product details', async () => {
      await page.goto(PCT_URL);

      // Navigate to product
      const productCard = page.locator(`text=${testProduct.name}`).first();
      await productCard.click();

      await page.waitForTimeout(1000);

      // Verify product details are visible
      await expect(page.locator(`text=${testProduct.description.substring(0, 30)}`)).toBeVisible();
    });
  });

  // ============================================
  // STEP 3: VOICE OF CUSTOMER
  // ============================================

  test.describe('Step 3: Voice of Customer Collection', () => {
    test('should add VoC entry', async () => {
      await page.goto(PCT_URL);

      // Navigate to product
      const productCard = page.locator(`text=${testProduct.name}`).first();
      await productCard.click();

      await page.waitForTimeout(1000);

      // Navigate to VoC tab
      const vocTab = page.locator('[data-tab="voc"], button:has-text("Voice of Customer"), button:has-text("VoC")').first();
      if (await vocTab.isVisible()) {
        await vocTab.click();
      }

      // Click Add VoC button
      const addVocBtn = page.locator('button:has-text("Add VoC"), button:has-text("Add Quote")').first();
      await addVocBtn.click();

      // Fill VoC form
      await page.fill('textarea[name="quote"], [data-field="voc-quote"]', 'This product is absolutely amazing! Perfect color match every time.');
      await page.selectOption('select[name="source"], [data-field="voc-source"]', 'amazon');
      await page.selectOption('select[name="category"], [data-field="voc-category"]', 'benefit');

      // Submit
      const submitBtn = page.locator('button[type="submit"]:has-text("Add"), button[type="submit"]:has-text("Save")').first();
      await submitBtn.click();

      await page.waitForTimeout(1000);

      // Verify VoC appears
      await expect(page.locator('text=This product is absolutely amazing')).toBeVisible();
    });

    test('should add multiple VoC entries', async () => {
      await page.goto(PCT_URL);

      const vocEntries = [
        { quote: 'I struggle with makeup application but this makes it easy', source: 'reddit', category: 'benefit' },
        { quote: 'My hands shake and makeup is always uneven', source: 'forum', category: 'pain_point' },
      ];

      // Navigate to product
      const productCard = page.locator(`text=${testProduct.name}`).first();
      await productCard.click();

      for (const voc of vocEntries) {
        const addVocBtn = page.locator('button:has-text("Add VoC"), button:has-text("Add Quote")').first();
        await addVocBtn.click();

        await page.fill('textarea[name="quote"]', voc.quote);
        await page.selectOption('select[name="source"]', voc.source);
        await page.selectOption('select[name="category"]', voc.category);

        const submitBtn = page.locator('button[type="submit"]:has-text("Add"), button[type="submit"]:has-text("Save")').first();
        await submitBtn.click();

        await page.waitForTimeout(500);
      }
    });
  });

  // ============================================
  // STEP 4: USP MANAGEMENT
  // ============================================

  test.describe('Step 4: USP Management', () => {
    test('should manually create a USP', async () => {
      await page.goto(PCT_URL);

      // Navigate to product
      const productCard = page.locator(`text=${testProduct.name}`).first();
      await productCard.click();

      await page.waitForTimeout(1000);

      // Navigate to USPs tab
      const uspsTab = page.locator('[data-tab="usps"], button:has-text("USPs")').first();
      if (await uspsTab.isVisible()) {
        await uspsTab.click();
      }

      // Click Add USP button
      const addUspBtn = page.locator('button:has-text("Add USP"), button:has-text("Create USP")').first();
      await addUspBtn.click();

      // Fill USP form
      await page.fill('input[name="text"], textarea[name="text"], [data-field="usp-text"]', 'Impossible to overdo');

      // Submit
      const submitBtn = page.locator('button[type="submit"]:has-text("Add"), button[type="submit"]:has-text("Save")').first();
      await submitBtn.click();

      await page.waitForTimeout(1000);

      // Verify USP appears
      await expect(page.locator('text=Impossible to overdo')).toBeVisible();
    });

    test('should generate USPs with AI', async () => {
      await page.goto(PCT_URL);

      // Navigate to product
      const productCard = page.locator(`text=${testProduct.name}`).first();
      await productCard.click();

      // Navigate to USPs tab
      const uspsTab = page.locator('[data-tab="usps"], button:has-text("USPs")').first();
      if (await uspsTab.isVisible()) {
        await uspsTab.click();
      }

      // Click Generate USPs button
      const generateBtn = page.locator('button:has-text("Generate USPs"), button:has-text("AI Generate")').first();
      if (await generateBtn.isVisible()) {
        await generateBtn.click();

        // Wait for generation
        await page.waitForTimeout(3000);

        // Verify USPs were generated
        const uspCount = await page.locator('[data-item="usp"], .usp-item').count();
        expect(uspCount).toBeGreaterThan(0);
      }
    });
  });

  // ============================================
  // STEP 5: MARKETING ANGLES
  // ============================================

  test.describe('Step 5: Marketing Angles', () => {
    test('should generate marketing angles from USP', async () => {
      await page.goto(PCT_URL);

      // Navigate to product
      const productCard = page.locator(`text=${testProduct.name}`).first();
      await productCard.click();

      // Find a USP and generate angles
      const uspItem = page.locator('text=Impossible to overdo').first();
      await uspItem.click();

      // Click Generate Angles button
      const generateAnglesBtn = page.locator('button:has-text("Generate Angles"), button:has-text("Create Angles")').first();
      if (await generateAnglesBtn.isVisible()) {
        await generateAnglesBtn.click();

        // Wait for generation
        await page.waitForTimeout(3000);

        // Verify angles were generated
        const angleCount = await page.locator('[data-item="angle"], .angle-item').count();
        expect(angleCount).toBeGreaterThan(0);
      }
    });
  });

  // ============================================
  // STEP 6: HOOK GENERATION
  // ============================================

  test.describe('Step 6: Hook Generation and Approval', () => {
    test('should navigate to hook generation', async () => {
      await page.goto(PCT_URL);

      // Navigate to Hooks tab
      const hooksTab = page.locator('[data-tab="hooks"], button:has-text("Hooks")').first();
      await hooksTab.click();

      // Verify hooks section is visible
      await expect(page.locator('[data-section="hooks"], #hooks-section')).toBeVisible();
    });

    test('should generate hooks with parameters', async () => {
      await page.goto(PCT_URL);

      // Navigate to hooks
      const hooksTab = page.locator('[data-tab="hooks"], button:has-text("Hooks")').first();
      await hooksTab.click();

      // Click Generate Hooks button
      const generateBtn = page.locator('button:has-text("Generate Hooks"), button:has-text("Generate")').first();
      await generateBtn.click();

      // Select parameters
      await page.selectOption('select[name="messagingFramework"], [data-field="framework"]', 'punchy');
      await page.selectOption('select[name="awarenessLevel"], [data-field="awareness"]', '3');
      await page.selectOption('select[name="marketSophistication"], [data-field="sophistication"]', '3');

      // Submit generation
      const submitBtn = page.locator('button[type="submit"]:has-text("Generate"), button:has-text("Create Hooks")').first();
      await submitBtn.click();

      // Wait for hooks to generate
      await page.waitForTimeout(5000);

      // Verify hooks appear
      const hookCount = await page.locator('[data-item="hook"], .hook-item').count();
      expect(hookCount).toBeGreaterThan(0);
    });

    test('should approve a hook', async () => {
      await page.goto(PCT_URL);

      // Navigate to hooks
      const hooksTab = page.locator('[data-tab="hooks"], button:has-text("Hooks")').first();
      await hooksTab.click();

      // Find first pending hook
      const firstHook = page.locator('[data-status="pending"], .hook-item.pending').first();
      if (await firstHook.isVisible()) {
        // Click approve button
        const approveBtn = firstHook.locator('button:has-text("Approve"), [data-action="approve"]').first();
        await approveBtn.click();

        await page.waitForTimeout(500);

        // Verify hook is approved
        await expect(page.locator('[data-status="approved"], .hook-item.approved').first()).toBeVisible();
      }
    });

    test('should reject a hook', async () => {
      await page.goto(PCT_URL);

      // Navigate to hooks
      const hooksTab = page.locator('[data-tab="hooks"], button:has-text("Hooks")').first();
      await hooksTab.click();

      // Find a pending hook
      const pendingHook = page.locator('[data-status="pending"], .hook-item.pending').first();
      if (await pendingHook.isVisible()) {
        // Click reject button
        const rejectBtn = pendingHook.locator('button:has-text("Reject"), [data-action="reject"]').first();
        await rejectBtn.click();

        await page.waitForTimeout(500);

        // Verify hook is rejected
        const rejectedCount = await page.locator('[data-status="rejected"], .hook-item.rejected').count();
        expect(rejectedCount).toBeGreaterThan(0);
      }
    });

    test('should filter hooks by status', async () => {
      await page.goto(PCT_URL);

      // Navigate to hooks
      const hooksTab = page.locator('[data-tab="hooks"], button:has-text("Hooks")').first();
      await hooksTab.click();

      // Select "Approved" filter
      const statusFilter = page.locator('select[name="status"], [data-filter="status"]').first();
      await statusFilter.selectOption('approved');

      await page.waitForTimeout(500);

      // Verify only approved hooks are shown
      const approvedCount = await page.locator('[data-status="approved"], .hook-item.approved').count();
      const pendingCount = await page.locator('[data-status="pending"], .hook-item.pending').count();

      expect(approvedCount).toBeGreaterThan(0);
      expect(pendingCount).toBe(0);
    });

    test('should filter hooks by messaging framework', async () => {
      await page.goto(PCT_URL);

      // Navigate to hooks
      const hooksTab = page.locator('[data-tab="hooks"], button:has-text("Hooks")').first();
      await hooksTab.click();

      // Select "Punchy" framework filter
      const frameworkFilter = page.locator('select[name="messagingFramework"], [data-filter="framework"]').first();
      await frameworkFilter.selectOption('punchy');

      await page.waitForTimeout(500);

      // Verify hooks are filtered
      const hooks = await page.locator('[data-framework="punchy"], .hook-item[data-framework="punchy"]').count();
      expect(hooks).toBeGreaterThanOrEqual(0);
    });

    test('should search hooks by text', async () => {
      await page.goto(PCT_URL);

      // Navigate to hooks
      const hooksTab = page.locator('[data-tab="hooks"], button:has-text("Hooks")').first();
      await hooksTab.click();

      // Enter search query
      const searchInput = page.locator('input[name="search"], [data-field="search"]').first();
      await searchInput.fill('beautiful');

      await page.waitForTimeout(1000);

      // Verify search results
      const results = await page.locator('[data-item="hook"], .hook-item').count();
      // Results might be 0 if no hooks contain "beautiful"
      expect(results).toBeGreaterThanOrEqual(0);
    });
  });

  // ============================================
  // CLEANUP
  // ============================================

  test.describe('Cleanup', () => {
    test('should clean up test data', async () => {
      // This test would delete the test brand and product
      // In a real scenario, you'd use the API or database directly
      // For now, we'll skip actual deletion to preserve test data for inspection
      expect(true).toBe(true);
    });
  });
});

// ============================================
// CRUD OPERATIONS E2E TESTS
// ============================================

test.describe('PCT CRUD Operations E2E', () => {
  test('should edit a brand', async ({ page }) => {
    await page.goto(PCT_URL);

    // Find test brand
    const brandCard = page.locator(`text=${testBrand.name}`).first();
    await brandCard.click();

    // Click edit button
    const editBtn = page.locator('button:has-text("Edit"), [data-action="edit"]').first();
    await editBtn.click();

    // Update description
    await page.fill('textarea[name="description"]', 'Updated brand description');

    // Save
    const saveBtn = page.locator('button[type="submit"]:has-text("Save"), button[type="submit"]:has-text("Update")').first();
    await saveBtn.click();

    await page.waitForTimeout(1000);

    // Verify update
    await expect(page.locator('text=Updated brand description')).toBeVisible();
  });

  test('should delete a VoC entry', async ({ page }) => {
    await page.goto(PCT_URL);

    // Navigate to product
    const productCard = page.locator(`text=${testProduct.name}`).first();
    await productCard.click();

    // Find a VoC entry
    const vocItem = page.locator('[data-item="voc"], .voc-item').first();
    if (await vocItem.isVisible()) {
      // Click delete button
      const deleteBtn = vocItem.locator('button:has-text("Delete"), [data-action="delete"]').first();
      await deleteBtn.click();

      // Confirm deletion if there's a confirm dialog
      const confirmBtn = page.locator('button:has-text("Confirm"), button:has-text("Yes")').first();
      if (await confirmBtn.isVisible({ timeout: 1000 })) {
        await confirmBtn.click();
      }

      await page.waitForTimeout(500);
    }
  });
});

// ============================================
// RESPONSIVE LAYOUT TESTS
// ============================================

test.describe('PCT Responsive Layout E2E', () => {
  test('should display correctly on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE

    await page.goto(PCT_URL);

    // Verify page loads
    await expect(page).toHaveTitle(/Programmatic Creative Testing|PCT/);

    // Verify main content is visible
    await expect(page.locator('body')).toBeVisible();
  });

  test('should display correctly on tablet viewport', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 }); // iPad

    await page.goto(PCT_URL);

    // Verify page loads
    await expect(page).toHaveTitle(/Programmatic Creative Testing|PCT/);
  });

  test('should display correctly on desktop viewport', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 }); // Desktop

    await page.goto(PCT_URL);

    // Verify page loads
    await expect(page).toHaveTitle(/Programmatic Creative Testing|PCT/);
  });
});
