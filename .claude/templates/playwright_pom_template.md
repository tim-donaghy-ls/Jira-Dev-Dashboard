
# Playwright POM Template

```typescript
import { Page } from '@playwright/test';

export class {{PAGE_OBJECT_NAME}} {
  constructor(private readonly page: Page) {}

  async goto() {
    await this.page.goto('{{ROUTE}}');
    await this.page.waitForLoadState('networkidle');
  }

  async expectLoaded() {
    // TODO: add checks for key elements
  }

  // Add more interaction methods here
}
```
