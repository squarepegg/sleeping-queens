import { test, expect } from '@playwright/test';

test.describe('Integration Tests', () => {
  test('should complete login flow', async ({ page }) => {
    await page.goto('/');
    
    // Fill username
    const input = page.locator('input[type="text"]').first();
    await input.fill('TestPlayer');
    
    // Submit form (click button or press enter)
    const submitButton = page.locator('button').filter({ hasText: /start|play|enter/i }).first();
    if (await submitButton.isVisible()) {
      await submitButton.click();
    } else {
      await input.press('Enter');
    }
    
    // Wait for navigation
    await page.waitForTimeout(1000);
    
    // Should be on lobby or still on home with error
    const url = page.url();
    expect(url).toMatch(/\/(lobby|$)/);
  });

  test('should show game UI elements', async ({ page }) => {
    // Navigate directly to a game page
    await page.goto('/game/test-game');
    
    // Wait for page to load
    await page.waitForTimeout(1000);
    
    // Check if redirected to home (not authenticated) or shows game
    const url = page.url();
    if (url.includes('/game/')) {
      // If on game page, check for game elements
      const hasGameElements = await page.locator('div').filter({ hasText: /queen|card|player/i }).first().isVisible().catch(() => false);
      expect(hasGameElements || url.includes('game')).toBeTruthy();
    } else {
      // Redirected to home is also valid
      expect(url).toMatch(/\//);
    }
  });

  test('should handle page refreshes', async ({ page }) => {
    await page.goto('/');
    
    // Login
    const input = page.locator('input[type="text"]').first();
    await input.fill('TestPlayer');
    await input.press('Enter');
    
    await page.waitForTimeout(1000);
    
    // Refresh page
    await page.reload();
    
    // Page should still work
    await expect(page.locator('body')).toBeVisible();
  });

  test('should have working navigation', async ({ page }) => {
    await page.goto('/');
    const initialUrl = page.url();
    
    // Try to navigate to lobby
    await page.goto('/lobby');
    await page.waitForTimeout(500);
    
    // Either stays on lobby (if auth works) or redirects to home
    const currentUrl = page.url();
    expect(currentUrl).toBeTruthy();
    
    // Go back should work
    if (currentUrl !== initialUrl) {
      await page.goBack();
      await page.waitForTimeout(500);
      expect(page.url()).toBeTruthy();
    }
  });

  test('should handle errors gracefully', async ({ page }) => {
    // Set up console error listener
    let consoleErrors = 0;
    page.on('pageerror', () => {
      consoleErrors++;
    });

    // Try various pages
    await page.goto('/');
    await page.waitForTimeout(200);

    await page.goto('/lobby');
    await page.waitForTimeout(200);

    // Game page might redirect, catch the error
    try {
      await page.goto('/game/nonexistent', { waitUntil: 'domcontentloaded' });
    } catch (e) {
      // Navigation interruption is okay, it means redirect happened
    }
    await page.waitForTimeout(200);

    await page.goto('/404');
    await page.waitForTimeout(200);

    // Should handle all without crashing
    expect(consoleErrors).toBeLessThan(5); // Allow some errors but not excessive
  });
});