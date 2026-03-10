import { chromium, Browser, Page } from 'playwright';

export interface UITestScript {
  steps: Array<{
    action: 'goto' | 'click' | 'type' | 'waitForSelector' | 'screenshot';
    selector?: string;
    value?: string;
    url?: string;
    timeout?: number;
  }>;
  headless?: boolean;
}

export class UIEngine {
  private static browser: Browser | null = null;

  static async execute(script: UITestScript): Promise<any> {
    try {
      if (!this.browser) {
        this.browser = await chromium.launch({ headless: script.headless !== false });
      }

      const page = await this.browser.newPage();
      const results: any[] = [];

      for (const step of script.steps) {
        switch (step.action) {
          case 'goto':
            await page.goto(step.url!, { timeout: step.timeout || 30000 });
            results.push({ action: 'goto', url: step.url, success: true });
            break;
          case 'click':
            await page.click(step.selector!, { timeout: step.timeout || 10000 });
            results.push({ action: 'click', selector: step.selector, success: true });
            break;
          case 'type':
            await page.fill(step.selector!, step.value!, { timeout: step.timeout || 10000 });
            results.push({ action: 'type', selector: step.selector, value: this.maskSensitive(step.value!), success: true });
            break;
          case 'waitForSelector':
            await page.waitForSelector(step.selector!, { timeout: step.timeout || 10000 });
            results.push({ action: 'waitForSelector', selector: step.selector, success: true });
            break;
          case 'screenshot':
            const screenshot = await page.screenshot({ fullPage: true });
            results.push({ action: 'screenshot', data: screenshot.toString('base64') });
            break;
        }
      }

      await page.close();
      return { results };
    } catch (error: any) {
      return { error: error.message };
    }
  }

  static async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  private static maskSensitive(value: string): string {
    // Simple masking for sensitive data like passwords
    if (value && value.length > 4) {
      return value.substring(0, 2) + '*'.repeat(value.length - 4) + value.substring(value.length - 2);
    }
    return value;
  }
}