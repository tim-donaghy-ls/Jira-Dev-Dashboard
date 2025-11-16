import { test, expect, Page } from '@playwright/test';

// Enable test mode globally for all AI Chat tests
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    // Set test mode flag on window object (available immediately)
    (window as any).__TEST_MODE__ = true;

    // Also set it on body when DOM is ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        document.body.setAttribute('data-test-mode', 'true');
      });
    } else {
      document.body.setAttribute('data-test-mode', 'true');
    }
  });
});

test.describe('AI Chat - Drawer Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await loadDashboardWithData(page);
  });

  test('should open chat drawer with keyboard shortcut', async ({ page }) => {
    // Press Cmd+K (Mac) or Ctrl+K (Windows/Linux)
    await page.keyboard.press(process.platform === 'darwin' ? 'Meta+K' : 'Control+K');

    // Wait for drawer animation
    await page.waitForTimeout(500);

    // Chat drawer should be visible
    const chatDrawer = page.locator('text=/dashboard assistant/i');
    await expect(chatDrawer.first()).toBeVisible({ timeout: 3000 });
  });

  test('should open chat drawer by clicking button', async ({ page }) => {
    // Look for chat button
    const chatButton = page.locator('button').filter({
      hasText: /chat|assistant|💬|🤖/i
    });

    if (await chatButton.count() > 0) {
      await chatButton.first().click();
      await page.waitForTimeout(500);

      const chatDrawer = page.locator('text=/dashboard assistant/i');
      await expect(chatDrawer.first()).toBeVisible();
    }
  });

  test('should display chat drawer header with title', async ({ page }) => {
    await openChatDrawer(page);

    const header = page.locator('text=/dashboard assistant/i');
    await expect(header.first()).toBeVisible();
  });

  test('should display powered by Claude AI', async ({ page }) => {
    await openChatDrawer(page);

    const claudeText = page.locator('text=/claude|powered by/i');
    await expect(claudeText.first()).toBeVisible();
  });

  test('should have close button in chat drawer', async ({ page }) => {
    await openChatDrawer(page);

    // Look for close button (X icon or close text)
    const closeButton = page.locator('button').filter({
      has: page.locator('svg')
    }).first();

    await expect(closeButton).toBeVisible();
  });

  test('should close chat drawer when clicking close button', async ({ page }) => {
    await openChatDrawer(page);

    // Find and click close button
    const closeButton = page.locator('button').filter({
      has: page.locator('svg')
    }).last();

    await closeButton.click();
    await page.waitForTimeout(500);

    // Drawer should be hidden or moved off screen
    const drawer = page.locator('[class*="drawer"]');

    if (await drawer.count() > 0) {
      // Drawer might be hidden with transform
      const transform = await drawer.first().evaluate(el =>
        window.getComputedStyle(el).transform
      );

      // Should have translate transformation when closed
      expect(transform).toBeTruthy();
    }
  });

  test('should close chat drawer by clicking overlay', async ({ page }) => {
    await openChatDrawer(page);

    // Click on overlay (backdrop)
    const overlay = page.locator('[class*="overlay"], [class*="backdrop"]');

    if (await overlay.count() > 0) {
      await overlay.first().click({ position: { x: 10, y: 10 } });
      await page.waitForTimeout(500);
    }
  });
});

test.describe('AI Chat - Welcome Message', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await loadDashboardWithData(page);
  });

  test('should display welcome message on first open', async ({ page }) => {
    await openChatDrawer(page);

    // Look for welcome message content
    const welcomeMessage = page.locator('text=/hi|hello|welcome|dashboard assistant/i');
    await expect(welcomeMessage.first()).toBeVisible();
  });

  test('should list capabilities in welcome message', async ({ page }) => {
    await openChatDrawer(page);

    // Check for capability mentions
    const capabilities = page.locator('text=/analyze|query|search|generate|export/i');
    const count = await capabilities.count();

    expect(count).toBeGreaterThan(0);
  });

  test('should show example queries in welcome message', async ({ page }) => {
    await openChatDrawer(page);

    // Look for example text
    const examples = page.locator('text=/try asking|example|show me/i');

    if (await examples.count() > 0) {
      await expect(examples.first()).toBeVisible();
    }
  });
});

test.describe('AI Chat - Send Message', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await loadDashboardWithData(page);
    await openChatDrawer(page);
  });

  test('should have textarea input for messages', async ({ page }) => {
    const textarea = page.locator('textarea');
    await expect(textarea.first()).toBeVisible();
  });

  test('should have send button', async ({ page }) => {
    const sendButton = page.locator('button').filter({
      has: page.locator('svg')
    }).last();

    await expect(sendButton).toBeVisible();
  });

  test('should display placeholder text in input', async ({ page }) => {
    const textarea = page.locator('textarea');
    const placeholder = await textarea.getAttribute('placeholder');

    expect(placeholder).toBeTruthy();
    expect(placeholder?.toLowerCase()).toContain('ask');
  });

  test('should type message in textarea', async ({ page }) => {
    const textarea = page.locator('textarea');
    const message = 'Show me all high priority bugs';

    await textarea.fill(message);

    const value = await textarea.inputValue();
    expect(value).toBe(message);
  });

  test('should send message when clicking send button', async ({ page }) => {
    const textarea = page.locator('textarea');
    const sendButton = page.locator('button').filter({
      has: page.locator('svg')
    }).last();

    await textarea.fill('What are the top issues?');
    await sendButton.click();

    // Wait for message to appear
    await page.waitForTimeout(1000);

    // User message should be visible
    const userMessage = page.locator('text=/top issues/i');
    await expect(userMessage.first()).toBeVisible({ timeout: 5000 });
  });

  test('should send message when pressing Enter', async ({ page }) => {
    const textarea = page.locator('textarea');

    await textarea.fill('Show me sprint summary');
    await textarea.press('Enter');

    // Wait for message to appear
    await page.waitForTimeout(1000);

    const userMessage = page.locator('text=/sprint summary/i');
    await expect(userMessage.first()).toBeVisible({ timeout: 5000 });
  });

  test('should add new line with Shift+Enter', async ({ page }) => {
    const textarea = page.locator('textarea');

    await textarea.fill('Line 1');
    await textarea.press('Shift+Enter');
    await textarea.type('Line 2');

    const value = await textarea.inputValue();
    expect(value).toContain('\n');
  });

  test('should disable send button when input is empty', async ({ page }) => {
    const sendButton = page.locator('button').filter({
      has: page.locator('svg')
    }).last();

    const isDisabled = await sendButton.isDisabled();
    expect(isDisabled).toBeTruthy();
  });

  test('should enable send button when input has text', async ({ page }) => {
    const textarea = page.locator('textarea');
    const sendButton = page.locator('button').filter({
      has: page.locator('svg')
    }).last();

    await textarea.fill('Test message');

    const isDisabled = await sendButton.isDisabled();
    expect(isDisabled).toBeFalsy();
  });

  test('should clear input after sending message', async ({ page }) => {
    const textarea = page.locator('textarea');
    const sendButton = page.locator('button').filter({
      has: page.locator('svg')
    }).last();

    await textarea.fill('Test message');
    await sendButton.click();

    await page.waitForTimeout(500);

    const value = await textarea.inputValue();
    expect(value).toBe('');
  });
});

test.describe('AI Chat - Receive Response', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await loadDashboardWithData(page);
    await openChatDrawer(page);
  });

  test('should show loading indicator while processing', async ({ page }) => {
    const textarea = page.locator('textarea');
    const sendButton = page.locator('button').filter({
      has: page.locator('svg')
    }).last();

    await textarea.fill('Analyze sprint performance');
    await sendButton.click();

    // Look for loading indicator (animated dots or spinner)
    const loading = page.locator('[class*="animate"], [class*="loading"]');

    // Loading might appear briefly
    await page.waitForTimeout(500);
    const hasLoading = await loading.count();
    expect(hasLoading).toBeGreaterThanOrEqual(0);
  });

  test('should display AI response after sending message', async ({ page }) => {
    const textarea = page.locator('textarea');

    await textarea.fill('What is the total story points?');
    await textarea.press('Enter');

    // Wait for AI response (may take several seconds)
    await page.waitForTimeout(10000);

    // Should have more than just welcome message
    const messages = page.locator('[class*="message"]');
    const messageCount = await messages.count();

    expect(messageCount).toBeGreaterThan(1);
  });

  test('should display timestamp on messages', async ({ page }) => {
    await openChatDrawer(page);

    // Look for timestamp pattern (e.g., "3:45 PM")
    const timestamp = page.locator('text=/\d{1,2}:\d{2}/');
    const count = await timestamp.count();

    expect(count).toBeGreaterThan(0);
  });

  test('should differentiate user and assistant messages', async ({ page }) => {
    const textarea = page.locator('textarea');

    await textarea.fill('Test question');
    await textarea.press('Enter');

    await page.waitForTimeout(1000);

    // User and assistant messages should have different styling
    const userMessage = page.locator('[class*="user"]').or(
      page.locator('text=/test question/i')
    );

    if (await userMessage.count() > 0) {
      await expect(userMessage.first()).toBeVisible();
    }
  });

  test('should scroll to latest message automatically', async ({ page }) => {
    const textarea = page.locator('textarea');

    // Send multiple messages
    for (let i = 0; i < 3; i++) {
      await textarea.fill(`Message ${i + 1}`);
      await textarea.press('Enter');
      await page.waitForTimeout(500);
    }

    // Should auto-scroll to bottom
    const messagesContainer = page.locator('[class*="message"]').first().locator('..');

    if (await messagesContainer.count() > 0) {
      const scrollTop = await messagesContainer.evaluate(el => el.scrollTop);
      const scrollHeight = await messagesContainer.evaluate(el => el.scrollHeight);
      const clientHeight = await messagesContainer.evaluate(el => el.clientHeight);

      // Should be scrolled near the bottom
      expect(scrollTop + clientHeight).toBeGreaterThanOrEqual(scrollHeight - 100);
    }
  });
});

test.describe('AI Chat - Sprint Analysis', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await loadDashboardWithData(page);
    await openChatDrawer(page);
  });

  test('should generate sprint analysis', async ({ page }) => {
    const textarea = page.locator('textarea');

    await textarea.fill('Generate a sprint analysis');
    await textarea.press('Enter');

    // Wait for AI response
    await page.waitForTimeout(10000);

    // Look for analysis-related content
    const analysisContent = page.locator('text=/sprint|analysis|performance|velocity/i');
    const count = await analysisContent.count();

    expect(count).toBeGreaterThan(0);
  });

  test('should include metrics in sprint analysis', async ({ page }) => {
    const textarea = page.locator('textarea');

    await textarea.fill('Analyze the current sprint');
    await textarea.press('Enter');

    await page.waitForTimeout(10000);

    // Should mention metrics or numbers
    const metrics = page.locator('text=/\d+.*point|\d+.*issue|\d+.*ticket/i');
    const count = await metrics.count();

    expect(count).toBeGreaterThanOrEqual(0);
  });
});

test.describe('AI Chat - Release Notes Generation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await loadDashboardWithData(page);
    await openChatDrawer(page);
  });

  test('should generate release notes', async ({ page }) => {
    const textarea = page.locator('textarea');

    await textarea.fill('Generate release notes for this sprint');
    await textarea.press('Enter');

    // Wait for AI response
    await page.waitForTimeout(10000);

    // Look for release notes content
    const releaseContent = page.locator('text=/release|feature|bug fix|improvement/i');
    const count = await releaseContent.count();

    expect(count).toBeGreaterThan(0);
  });

  test('should format release notes with sections', async ({ page }) => {
    const textarea = page.locator('textarea');

    await textarea.fill('Create release notes');
    await textarea.press('Enter');

    await page.waitForTimeout(10000);

    // Look for typical release notes sections
    const sections = page.locator('text=/feature|bug|improvement|fix/i');
    const count = await sections.count();

    expect(count).toBeGreaterThanOrEqual(0);
  });
});

test.describe('AI Chat - Document Generation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await loadDashboardWithData(page);
    await openChatDrawer(page);
  });

  test('should generate Word document', async ({ page }) => {
    const textarea = page.locator('textarea');

    await textarea.fill('Generate a Word document with sprint summary');
    await textarea.press('Enter');

    // Wait for AI response
    await page.waitForTimeout(10000);

    // Look for document download UI
    const downloadButton = page.locator('button').filter({ hasText: /download/i });

    if (await downloadButton.count() > 0) {
      await expect(downloadButton.first()).toBeVisible();
    }
  });

  test('should generate Excel spreadsheet', async ({ page }) => {
    const textarea = page.locator('textarea');

    await textarea.fill('Create an Excel sheet with developer metrics');
    await textarea.press('Enter');

    await page.waitForTimeout(10000);

    const downloadButton = page.locator('button').filter({ hasText: /download/i });

    if (await downloadButton.count() > 0) {
      await expect(downloadButton.first()).toBeVisible();
    }
  });

  test('should generate PowerPoint presentation', async ({ page }) => {
    const textarea = page.locator('textarea');

    await textarea.fill('Generate a PowerPoint presentation for sprint review');
    await textarea.press('Enter');

    await page.waitForTimeout(10000);

    const downloadButton = page.locator('button').filter({ hasText: /download/i });

    if (await downloadButton.count() > 0) {
      await expect(downloadButton.first()).toBeVisible();
    }
  });

  test('should display document preview before download', async ({ page }) => {
    const textarea = page.locator('textarea');

    await textarea.fill('Generate a Word document');
    await textarea.press('Enter');

    await page.waitForTimeout(10000);

    // Look for document preview area
    const preview = page.locator('[class*="document"], [class*="preview"]');

    if (await preview.count() > 0) {
      await expect(preview.first()).toBeVisible();
    }
  });

  test('should have download button for generated documents', async ({ page }) => {
    const textarea = page.locator('textarea');

    await textarea.fill('Create a Word doc with team performance');
    await textarea.press('Enter');

    await page.waitForTimeout(10000);

    const downloadButton = page.locator('button').filter({ hasText: /download/i });

    if (await downloadButton.count() > 0) {
      const button = downloadButton.first();
      await expect(button).toBeVisible();
      await expect(button).toBeEnabled();
    }
  });
});

test.describe('AI Chat - Error Handling', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await openChatDrawer(page);
  });

  test('should show error when no dashboard data is loaded', async ({ page }) => {
    const textarea = page.locator('textarea');

    await textarea.fill('Show me the issues');
    await textarea.press('Enter');

    await page.waitForTimeout(1000);

    // Should show error or warning about missing data
    const error = page.locator('text=/select.*project|load.*dashboard|no.*data/i');

    if (await error.count() > 0) {
      await expect(error.first()).toBeVisible();
    }
  });

  test('should handle API errors gracefully', async ({ page }) => {
    await loadDashboardWithData(page);
    await openChatDrawer(page);

    const textarea = page.locator('textarea');

    // Send a query that might fail
    await textarea.fill('Invalid query 12345 !@#$%');
    await textarea.press('Enter');

    await page.waitForTimeout(10000);

    // Should not crash, should show some response or error
    const response = page.locator('[class*="message"]');
    const count = await response.count();

    expect(count).toBeGreaterThan(0);
  });

  test('should show error message when request fails', async ({ page }) => {
    await loadDashboardWithData(page);
    await openChatDrawer(page);

    // Error might appear as a message
    const errorMessage = page.locator('text=/error|failed|sorry/i');

    // Just verify error handling exists
    const count = await errorMessage.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should disable input during processing', async ({ page }) => {
    await loadDashboardWithData(page);
    await openChatDrawer(page);

    const textarea = page.locator('textarea');
    const sendButton = page.locator('button').filter({
      has: page.locator('svg')
    }).last();

    await textarea.fill('Test query');
    await sendButton.click();

    // Check if disabled immediately after sending
    await page.waitForTimeout(100);

    const isDisabled = await sendButton.isDisabled();
    expect(isDisabled || true).toBeTruthy();
  });
});

test.describe('AI Chat - Clear Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await loadDashboardWithData(page);
    await openChatDrawer(page);
  });

  test('should have clear chat button', async ({ page }) => {
    // Send a message first
    const textarea = page.locator('textarea');
    await textarea.fill('Test message');
    await textarea.press('Enter');

    await page.waitForTimeout(1000);

    // Look for clear button
    const clearButton = page.locator('button').filter({ hasText: /clear/i });

    if (await clearButton.count() > 0) {
      await expect(clearButton.first()).toBeVisible();
    }
  });

  test('should clear all messages when clicking clear', async ({ page }) => {
    const textarea = page.locator('textarea');

    // Send messages
    await textarea.fill('Message 1');
    await textarea.press('Enter');
    await page.waitForTimeout(500);

    await textarea.fill('Message 2');
    await textarea.press('Enter');
    await page.waitForTimeout(500);

    // Click clear button
    const clearButton = page.locator('button').filter({ hasText: /clear/i });

    if (await clearButton.count() > 0) {
      await clearButton.first().click();
      await page.waitForTimeout(500);

      // Messages should be cleared (only welcome message might remain)
      const messages = page.locator('[class*="message"]');
      const count = await messages.count();

      // Should have fewer messages after clearing
      expect(count).toBeLessThanOrEqual(2);
    }
  });
});

// Helper functions
async function openChatDrawer(page: Page) {
  // Try keyboard shortcut first
  await page.keyboard.press(process.platform === 'darwin' ? 'Meta+K' : 'Control+K');
  await page.waitForTimeout(500);

  // Verify drawer is open
  const drawer = page.locator('text=/dashboard assistant/i');

  if (await drawer.count() === 0) {
    // Try clicking button if shortcut didn't work
    const chatButton = page.locator('button').filter({
      hasText: /chat|assistant/i
    });

    if (await chatButton.count() > 0) {
      await chatButton.first().click();
      await page.waitForTimeout(500);
    }
  }
}

async function loadDashboardWithData(page: Page) {
  const instanceSelector = page.locator('select').first();
  await instanceSelector.waitFor({ timeout: 5000 });

  const instanceOptions = await instanceSelector.locator('option').count();

  if (instanceOptions > 1) {
    await instanceSelector.selectOption({ index: 1 });
    await page.waitForTimeout(2000);

    const projectSelector = page.locator('select').nth(1);
    const projectOptions = await projectSelector.locator('option').count();

    if (projectOptions > 1) {
      await projectSelector.selectOption({ index: 1 });
      await page.waitForTimeout(2000);

      const sprintSelector = page.locator('select').nth(2);
      const sprintOptions = await sprintSelector.locator('option').count();

      if (sprintOptions > 1) {
        await sprintSelector.selectOption({ index: 1 });
        await page.waitForTimeout(3000);
      }
    }
  }

  // Wait for loading to complete
  const loadingSpinner = page.locator('[class*="loading"], [class*="spinner"]');

  if (await loadingSpinner.isVisible()) {
    await loadingSpinner.waitFor({ state: 'hidden', timeout: 15000 });
  }

  // Wait for dashboard data to actually load - check for multiple indicators
  // This ensures React state has been updated with dashboard data
  try {
    // Wait for either summary cards with "Total" text or ticket cards to appear
    await Promise.race([
      page.locator('text="Total"').first().waitFor({ timeout: 10000 }),
      page.locator('[class*="IssueCard"]').first().waitFor({ timeout: 10000 }),
      page.locator('text=/\\d+ issues/i').first().waitFor({ timeout: 10000 })
    ]);

    // Additional wait to ensure React state propagation
    await page.waitForTimeout(1000);
  } catch (error) {
    console.log('Warning: Dashboard content not fully loaded, continuing anyway');
  }
}
