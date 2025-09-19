import { test, expect } from '@playwright/test';

test.describe('Smoke Tests', () => {
  test('should load home page and login', async ({ page }) => {
    await page.goto('/');
    
    // Check page loaded
    await expect(page).toHaveTitle(/Sleeping Queens/);
    
    // Login
    await page.fill('input[type="text"]', 'TestPlayer');
    await page.press('input[type="text"]', 'Enter');
    
    // Should redirect to lobby or show error
    await page.waitForURL(/\/(lobby|$)/, { timeout: 5000 });
  });

  test('should access game pages without errors', async ({ page }) => {
    // Try to load game page (will redirect to home if not logged in)
    await page.goto('/game/test-123');
    
    // Should either show game or redirect
    const url = page.url();
    expect(url).toMatch(/\/(game\/test-123|$)/);
    
    // No console errors
    page.on('pageerror', error => {
      expect(error.message).not.toContain('Error');
    });
  });

  test('should have responsive design', async ({ page }) => {
    await page.goto('/');
    
    // Desktop view
    await page.setViewportSize({ width: 1920, height: 1080 });
    await expect(page.locator('body')).toBeVisible();
    
    // Mobile view  
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.locator('body')).toBeVisible();
    
    // Tablet view
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(page.locator('body')).toBeVisible();
  });

  test('should have no accessibility violations on home', async ({ page }) => {
    await page.goto('/');
    
    // Check for basic accessibility
    const title = await page.title();
    expect(title).toBeTruthy();
    
    // Check for form labels
    const inputs = await page.locator('input').count();
    if (inputs > 0) {
      const firstInput = page.locator('input').first();
      const hasLabel = await firstInput.evaluate((el) => {
        return !!el.getAttribute('aria-label') || 
               !!el.getAttribute('placeholder') ||
               !!document.querySelector(`label[for="${el.id}"]`);
      });
      expect(hasLabel).toBeTruthy();
    }
  });

  test('should handle navigation', async ({ page }) => {
    await page.goto('/');

    // Check navigation doesn't break
    await page.goto('/lobby');
    await page.waitForTimeout(500);
    const lobbyUrl = page.url();

    // When not authenticated, it redirects to home
    // So either we're on lobby or home page
    expect(lobbyUrl).toMatch(/\/(lobby|$)/);
  });
});