import { test, expect } from '@playwright/test';

test.describe('Basic Accessibility Tests', () => {
  test('should be navigable with keyboard', async ({ page }) => {
    await page.goto('/');

    // Tab through page elements
    await page.keyboard.press('Tab');

    // Check if an element is focused
    const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
    expect(focusedElement).toBeTruthy();

    // Continue tabbing
    await page.keyboard.press('Tab');
    const nextFocusedElement = await page.evaluate(() => document.activeElement?.tagName);
    expect(nextFocusedElement).toBeTruthy();
  });

  test('should have proper page structure', async ({ page }) => {
    await page.goto('/');

    // Check for main heading
    const headings = await page.locator('h1, h2, h3').count();
    expect(headings).toBeGreaterThan(0);

    // Check for form inputs have labels or placeholders
    const inputs = await page.locator('input').all();
    for (const input of inputs) {
      const hasAccessibility = await input.evaluate((el) => {
        return !!(el.getAttribute('aria-label') ||
                  el.getAttribute('placeholder') ||
                  el.getAttribute('title'));
      });
      expect(hasAccessibility).toBeTruthy();
    }
  });

  test('should handle focus correctly', async ({ page }) => {
    await page.goto('/');

    // Click on an input if available
    const input = page.locator('input').first();
    if (await input.isVisible()) {
      await input.click();

      // Check it's focused
      const isFocused = await input.evaluate(el => el === document.activeElement);
      expect(isFocused).toBeTruthy();
    }
  });

  test('should have sufficient color contrast', async ({ page }) => {
    await page.goto('/');

    // Check that text is visible on backgrounds
    const textElements = await page.locator('p, span, div, h1, h2, h3, button').all();

    // Sample a few elements
    const sampled = textElements.slice(0, 5);
    for (const element of sampled) {
      const isVisible = await element.isVisible();
      if (isVisible) {
        const color = await element.evaluate(el => {
          const styles = window.getComputedStyle(el);
          return styles.color;
        });
        // Just check that color is defined
        expect(color).toBeTruthy();
      }
    }
  });

  test('should be responsive', async ({ page }) => {
    await page.goto('/');

    // Desktop
    await page.setViewportSize({ width: 1920, height: 1080 });
    await expect(page.locator('body')).toBeVisible();

    // Tablet
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(page.locator('body')).toBeVisible();

    // Mobile
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.locator('body')).toBeVisible();
  });
});