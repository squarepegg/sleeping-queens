import { test, expect, devices } from '@playwright/test';

// Configure retries for flaky tests
test.describe.configure({ retries: 2 });

test.describe('Responsive Design Tests', () => {
  const viewports = [
    { name: 'Mobile', width: 320, height: 568 }, // iPhone SE
    { name: 'Mobile Large', width: 414, height: 896 }, // iPhone 11 Pro Max
    { name: 'Tablet', width: 768, height: 1024 }, // iPad
    { name: 'Tablet Landscape', width: 1024, height: 768 }, // iPad Landscape
    { name: 'Desktop', width: 1280, height: 720 }, // Desktop HD
    { name: 'Desktop Large', width: 1920, height: 1080 }, // Full HD
  ];

  viewports.forEach(viewport => {
    test.describe(`${viewport.name} (${viewport.width}x${viewport.height})`, () => {
      test.beforeEach(async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
      });

      test('home page is responsive', async ({ page }) => {
        await page.goto('/');

        // Check that the main container is visible
        await expect(page.locator('.container-responsive')).toBeVisible();

        // Check that the crown icon scales properly
        const crownIcon = page.locator('svg').first();
        await expect(crownIcon).toBeVisible();

        // Check that the title is visible
        await expect(page.locator('h1:has-text("Sleeping Queens")')).toBeVisible();

        // Check that the login form is visible
        await expect(page.locator('input[placeholder="Enter your username"]')).toBeVisible();
        await expect(page.locator('button:has-text("Start Playing")')).toBeVisible();

        // Check that feature cards are visible (should be 2 columns on mobile, side by side)
        const featureCards = page.locator('.grid > div').filter({ hasText: /Multiplayer|Real-time/ });
        const count = await featureCards.count();
        expect(count).toBe(2);

        // On mobile, check that cards stack properly
        if (viewport.width < 640) {
          const grid = page.locator('.grid').nth(0);
          const gridClasses = await grid.getAttribute('class');
          expect(gridClasses).toContain('grid-cols-2');
        }

        // Check no horizontal scrollbar
        const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
        const viewportWidth = await page.evaluate(() => window.innerWidth);
        expect(bodyWidth).toBeLessThanOrEqual(viewportWidth);
      });

      test('lobby page is responsive', async ({ page }) => {
        // First login
        await page.goto('/');

        // Wait for page to be fully loaded
        await page.waitForLoadState('networkidle');

        // Find and fill the username input
        const usernameInput = page.locator('input[type="text"]');
        await expect(usernameInput).toBeVisible();

        // Retry the input a few times to handle timing issues
        let buttonEnabled = false;
        for (let i = 0; i < 5 && !buttonEnabled; i++) {
          // Try different input methods
          if (i === 0) {
            // Method 1: Standard fill
            await usernameInput.click();
            await usernameInput.fill('TestUser');
          } else if (i === 1) {
            // Method 2: Clear and type
            await usernameInput.click();
            await usernameInput.fill('');
            await usernameInput.type('TestUser', { delay: 50 });
          } else if (i === 2) {
            // Method 3: Focus, clear, and press keys
            await usernameInput.focus();
            await usernameInput.clear();
            await usernameInput.press('T');
            await usernameInput.press('e');
            await usernameInput.press('s');
            await usernameInput.press('t');
            await usernameInput.press('U');
            await usernameInput.press('s');
            await usernameInput.press('e');
            await usernameInput.press('r');
          } else if (i === 3) {
            // Method 4: JavaScript fallback
            await page.evaluate(() => {
              const input = document.querySelector('input[type="text"]') as HTMLInputElement;
              if (input) {
                const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
                nativeInputValueSetter?.call(input, 'TestUser');
                const event = new Event('input', { bubbles: true });
                input.dispatchEvent(event);
              }
            });
          } else {
            // Method 5: Fill and blur
            await usernameInput.fill('TestUser');
            await usernameInput.blur();
            await usernameInput.focus();
          }

          // Small delay for React to process
          await page.waitForTimeout(300);

          // Check if button is enabled
          const startButton = page.locator('button:has-text("Start Playing")');
          try {
            await expect(startButton).toBeEnabled({ timeout: 2000 });
            buttonEnabled = true;
          } catch {
            // Retry
            if (i < 4) {
              await page.waitForTimeout(500);
            }
          }
        }

        // Wait for the button to become enabled (final check)
        const startButton = page.locator('button:has-text("Start Playing")');
        await expect(startButton).toBeEnabled({ timeout: 10000 });

        // Click the button with retry
        await startButton.click({ timeout: 5000 });

        // Wait for navigation to lobby
        await page.waitForURL('/lobby', { timeout: 10000 });

        // Check header is visible and responsive
        const header = page.locator('h1').first();
        await expect(header).toBeVisible();

        // Check tab navigation - tabs just say "Create" and "Join"
        const createTab = page.locator('button:has-text("Create")').first();
        const joinTab = page.locator('button:has-text("Join")').first();
        await expect(createTab).toBeVisible();
        await expect(joinTab).toBeVisible();

        // Check that content area is visible - look for the Create New Game heading
        await expect(page.locator('h2:has-text("Create New Game")')).toBeVisible({ timeout: 10000 });

        // On mobile, check that header uses flex-col class
        if (viewport.width < 640) {
          const headerContainer = page.locator('.flex-col').first();
          await expect(headerContainer).toBeVisible();
        }

        // Check no horizontal scrollbar
        const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
        const viewportWidth = await page.evaluate(() => window.innerWidth);
        expect(bodyWidth).toBeLessThanOrEqual(viewportWidth);
      });

      test('touch targets are appropriately sized', async ({ page }) => {
        await page.goto('/');
        // Fill username to enable button
        await page.fill('input[type="text"]', 'TestUser');
        await page.waitForTimeout(100);

        // Check button sizes
        const button = page.locator('button:has-text("Start Playing")');
        const box = await button.boundingBox();
        if (box) {
          // Touch targets should be at least 44x44px on mobile
          if (viewport.width < 768) {
            expect(box.height).toBeGreaterThanOrEqual(44);
          }
        }

        // Check input field height
        const input = page.locator('input[placeholder="Enter your username"]');
        const inputBox = await input.boundingBox();
        if (inputBox) {
          // Input fields should be tall enough for easy tapping
          if (viewport.width < 768) {
            expect(inputBox.height).toBeGreaterThanOrEqual(44);
          }
        }
      });

      test('text is readable at all sizes', async ({ page }) => {
        await page.goto('/');

        // Check that main title has appropriate font size
        const title = page.locator('h1:has-text("Sleeping Queens")');
        const fontSize = await title.evaluate(el => {
          return window.getComputedStyle(el).fontSize;
        });

        const fontSizePx = parseFloat(fontSize);

        // Font sizes should scale with viewport
        if (viewport.width < 640) {
          // Mobile: smaller but still readable
          expect(fontSizePx).toBeGreaterThanOrEqual(20);
          expect(fontSizePx).toBeLessThanOrEqual(32);
        } else if (viewport.width < 1024) {
          // Tablet
          expect(fontSizePx).toBeGreaterThanOrEqual(28);
          expect(fontSizePx).toBeLessThanOrEqual(48);
        } else {
          // Desktop
          expect(fontSizePx).toBeGreaterThanOrEqual(36);
        }
      });

      test('images and icons scale properly', async ({ page }) => {
        await page.goto('/');

        // Check crown icon scaling
        const crownIcon = page.locator('svg').first();
        const iconBox = await crownIcon.boundingBox();

        if (iconBox) {
          if (viewport.width < 640) {
            // Mobile: smaller icons
            expect(iconBox.width).toBeGreaterThanOrEqual(20);
            expect(iconBox.width).toBeLessThanOrEqual(48);
          } else {
            // Larger screens: bigger icons
            expect(iconBox.width).toBeGreaterThanOrEqual(32);
            expect(iconBox.width).toBeLessThanOrEqual(48);
          }
        }
      });
    });
  });

  // Test specific device presets
  test.describe('Device-specific tests', () => {
    test('works on iPhone 12', async ({ browser, browserName }) => {
      test.skip(browserName !== 'chromium', 'Device emulation only supported in Chromium');
      const context = await browser.newContext({
        ...devices['iPhone 12'],
      });
      const page = await context.newPage();

      await page.goto('/');
      await expect(page.locator('h1:has-text("Sleeping Queens")')).toBeVisible();

      // Check viewport meta tag
      const viewportMeta = await page.$('meta[name="viewport"]');
      expect(viewportMeta).toBeTruthy();

      await context.close();
    });

    test('works on iPad', async ({ browser, browserName }) => {
      test.skip(browserName !== 'chromium', 'Device emulation only supported in Chromium');
      const context = await browser.newContext({
        ...devices['iPad'],
      });
      const page = await context.newPage();

      await page.goto('/');
      await expect(page.locator('h1:has-text("Sleeping Queens")')).toBeVisible();

      // Check that layout uses tablet-optimized styles
      const container = page.locator('.container-responsive');
      await expect(container).toBeVisible();

      await context.close();
    });

    test('works on Galaxy S9+', async ({ browser, browserName }) => {
      test.skip(browserName !== 'chromium', 'Device emulation only supported in Chromium');
      const context = await browser.newContext({
        ...devices['Galaxy S9+'],
      });
      const page = await context.newPage();

      await page.goto('/');
      await expect(page.locator('h1:has-text("Sleeping Queens")')).toBeVisible();

      await context.close();
    });
  });

  // Orientation tests
  test.describe('Orientation changes', () => {
    test('handles portrait to landscape transition', async ({ page }) => {
      // Start in portrait
      await page.setViewportSize({ width: 414, height: 896 });
      await page.goto('/');

      const titlePortrait = page.locator('h1:has-text("Sleeping Queens")');
      await expect(titlePortrait).toBeVisible();

      // Switch to landscape
      await page.setViewportSize({ width: 896, height: 414 });

      // Content should still be visible and properly laid out
      await expect(titlePortrait).toBeVisible();

      // Check no horizontal scrollbar in landscape
      const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
      const viewportWidth = await page.evaluate(() => window.innerWidth);
      expect(bodyWidth).toBeLessThanOrEqual(viewportWidth);
    });
  });

  // Performance tests for responsive images
  test.describe('Responsive performance', () => {
    test('uses appropriate image sizes for viewport', async ({ page }) => {
      await page.setViewportSize({ width: 320, height: 568 });
      await page.goto('/');

      // Check that cards use smaller sizes on mobile
      const cards = page.locator('.card-base');
      const firstCard = cards.first();

      const cardExists = await firstCard.count();
      if (cardExists > 0) {
        const cardBox = await firstCard.boundingBox();
        if (cardBox) {
          // Cards should be smaller on mobile
          expect(cardBox.width).toBeLessThanOrEqual(80);
        }
      }
    });
  });
});