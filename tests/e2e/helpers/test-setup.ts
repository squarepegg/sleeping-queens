import { Page, expect } from '@playwright/test';

// Test user accounts
export const TEST_USERS = {
  player1: { username: 'TestPlayer1' },
  player2: { username: 'TestPlayer2' },
  player3: { username: 'TestPlayer3' },
  player4: { username: 'TestPlayer4' }
};

// Game IDs for testing
export const TEST_GAME_ID = 'test-game-' + Date.now();

// Helper to login a user
export async function loginUser(page: Page, username: string) {
  await page.goto('/');

  // Wait for page to load
  await page.waitForSelector('input[type="text"]');

  // Fill username - the input might have different attributes
  const input = page.locator('input[type="text"]').first();
  await input.fill(username);

  // Wait a bit for validation
  await page.waitForTimeout(100);

  // Click button or press Enter
  const button = page.locator('button:has-text("Start Playing")');

  // Wait for button to be enabled
  await expect(button).toBeEnabled({ timeout: 5000 });
  await button.click();

  // Wait for navigation to lobby
  await page.waitForURL('/lobby', { timeout: 10000 });
}

// Helper to create a game
export async function createGame(page: Page, playerCount: number = 2) {
  await page.click('button:has-text("Create Game")');
  await page.selectOption('select', playerCount.toString());
  await page.click('button:has-text("Create")');
  await page.waitForSelector('text=/Game Code:|Waiting for players/');
}

// Helper to join a game
export async function joinGame(page: Page, gameCode: string) {
  await page.click('button:has-text("Join Game")');
  await page.fill('input[placeholder="Enter game code"]', gameCode);
  await page.click('button:has-text("Join")');
  await page.waitForURL(/\/game\/.+/);
}

// Helper to start a game (as host)
export async function startGame(page: Page) {
  await page.click('button:has-text("Start Game")');
  await page.waitForSelector('[data-game-phase="playing"]');
}

// Helper to setup a full game with multiple players
export async function setupMultiplayerGame(pages: Page[], playerCount: number = 2) {
  // Player 1 creates the game
  await loginUser(pages[0], TEST_USERS.player1.username);
  await createGame(pages[0], playerCount);
  
  // Get game code
  const gameCodeElement = await pages[0].locator('text=/Game Code:.*/');
  const gameCodeText = await gameCodeElement.textContent();
  const gameCode = gameCodeText?.split(':')[1]?.trim() || '';
  
  // Other players join
  for (let i = 1; i < playerCount; i++) {
    const user = Object.values(TEST_USERS)[i];
    await loginUser(pages[i], user.username);
    await joinGame(pages[i], gameCode);
  }
  
  // Host starts the game
  await startGame(pages[0]);
  
  // Wait for all players to see game started
  for (const page of pages.slice(0, playerCount)) {
    await page.waitForSelector('[data-game-phase="playing"]');
  }
  
  return gameCode;
}

// Helper to wait for turn
export async function waitForMyTurn(page: Page) {
  await page.waitForSelector('[data-my-turn="true"]', { timeout: 30000 });
}

// Helper to play a card
export async function playCard(page: Page, cardType: string) {
  const card = page.locator(`[data-card-type="${cardType}"]`).first();
  await card.click();
  await page.click('button:has-text("Play")');
  await page.waitForSelector('[data-turn-complete="true"]');
}

// Helper to check game state
export async function getGameState(page: Page) {
  return {
    phase: await page.getAttribute('[data-game-phase]', 'data-game-phase'),
    currentPlayer: await page.locator('[data-current-player]').textContent(),
    myTurn: await page.getAttribute('[data-my-turn]', 'data-my-turn') === 'true',
    handSize: await page.locator('[data-hand-card]').count(),
    queensCount: await page.locator('[data-my-queen]').count()
  };
}

// Helper to clean up after tests
export async function cleanup(page: Page) {
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
}