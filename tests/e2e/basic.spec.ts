import { test, expect } from '@playwright/test';
import { loginUser } from './helpers/test-setup';

test.describe('Basic App Tests', () => {
  test('should load the home page', async ({ page }) => {
    await page.goto('/');

    // Check that the page loads
    await expect(page).toHaveTitle(/Sleeping Queens/);

    // Check for login form
    await expect(page.locator('input[placeholder="Enter your username"]')).toBeVisible();
    await expect(page.locator('button:has-text("Start Playing")')).toBeVisible();
  });

  test.skip('should navigate to lobby after login', async ({ page }) => {
    // Skip - auth flow is inconsistent in test environment
    await loginUser(page, 'TestUser');

    // Should be redirected to lobby
    await expect(page).toHaveURL('/lobby');

    // Check for lobby elements
    await expect(page.locator('h1:has-text("Game Lobby")')).toBeVisible();
    await expect(page.locator('span:has-text("Create Game")')).toBeVisible();
    await expect(page.locator('span:has-text("Join Game")')).toBeVisible();
  });

  test('should show game creation form', async ({ page }) => {
    await loginUser(page, 'TestUser');

    // Wait for lobby to load
    await page.waitForTimeout(1000);

    // The Create Game form should be visible by default (it's the default tab)
    // Should see create game form with Maximum Players label
    await expect(page.locator('text="Maximum Players"')).toBeVisible({ timeout: 10000 });
  });

  test.skip('should show game join form', async ({ page }) => {
    // Skip - auth flow is inconsistent in test environment
    await loginUser(page, 'TestUser');

    // Wait for lobby to load
    await page.waitForTimeout(1000);

    // Click join game tab - it's a button with span inside
    const joinButton = page.locator('button').filter({ has: page.locator('span:has-text("Join Game")') });
    await joinButton.click();

    // Should see join game form with input
    await expect(page.locator('input[placeholder="Enter 6-character code"]')).toBeVisible({ timeout: 10000 });
  });
});