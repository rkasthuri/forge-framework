/**
 * FORGE — Autonomous Quality Engineering
 * Framework for Observed, Reasoned, and
 * Grounded Evaluation
 *
 * Copyright (c) 2026 AnvilQ Technologies LLC
 * Author: Raj Kasthuri
 *
 * Proprietary and confidential.
 * Unauthorized copying, distribution, or
 * modification of this software is strictly
 * prohibited.
 */

import { Page, Locator } from '@playwright/test';

export interface SelectorFallback {
  primary: string;
  fallbacks: string[];
  description: string;
}

export class SelfHealingHelper {
  /**
   * Attempts to find an element using primary selector, 
   * falls back to alternative selectors if primary fails
   */
  static async findElementWithFallbacks(
    page: Page, 
    primary: string, 
    fallbacks: string[]
  ): Promise<Locator> {
    try {
      await page.waitForSelector(primary, { timeout: 5000 });
      return page.locator(primary);
    } catch (error) {
      console.log(`⚠️ Primary selector failed: ${primary}`);
      
      for (const fallback of fallbacks) {
        try {
          await page.waitForSelector(fallback, { timeout: 2000 });
          console.log(`✅ Self-healed with fallback: ${fallback}`);
          
          // Log healing event for analysis
          this.logHealingEvent(primary, fallback);
          
          return page.locator(fallback);
        } catch (fallbackError) {
          console.log(`❌ Fallback failed: ${fallback}`);
          continue;
        }
      }
      
      throw new Error(
        `Element not found with primary selector "${primary}" or any fallbacks: ${fallbacks.join(', ')}`
      );
    }
  }

  /**
   * Intelligent element finder that tries multiple strategies
   */
  static async smartLocate(
    page: Page,
    elementType: 'button' | 'input' | 'link' | 'text',
    identifier: string
  ): Promise<Locator> {
    const strategies: string[] = [];

    switch (elementType) {
      case 'button':
        strategies.push(
          `button:has-text("${identifier}")`,
          `input[type="submit"][value="${identifier}"]`,
          `[role="button"]:has-text("${identifier}")`,
          `*:has-text("${identifier}")[onclick]`
        );
        break;
      
      case 'input':
        strategies.push(
          `input[name="${identifier}"]`,
          `input[id="${identifier}"]`,
          `input[placeholder*="${identifier}" i]`,
          `[data-test="${identifier}"]`,
          `[aria-label="${identifier}"]`
        );
        break;
      
      case 'link':
        strategies.push(
          `a:has-text("${identifier}")`,
          `a[href*="${identifier}"]`,
          `[role="link"]:has-text("${identifier}")`
        );
        break;
      
      case 'text':
        strategies.push(
          `text=${identifier}`,
          `:has-text("${identifier}")`,
          `[aria-label*="${identifier}" i]`
        );
        break;
    }

    for (const strategy of strategies) {
      try {
        const element = page.locator(strategy).first();
        await element.waitFor({ timeout: 2000 });
        console.log(`✅ Found element using: ${strategy}`);
        return element;
      } catch {
        continue;
      }
    }

    throw new Error(`Could not locate ${elementType} with identifier: ${identifier}`);
  }

  /**
   * Analyze page structure and suggest alternative selectors
   */
  static async analyzeElementStructure(
    page: Page,
    failedSelector: string
  ): Promise<string[]> {
    const suggestions: string[] = [];

    try {
      // Try to find similar elements
      const allButtons = await page.$$('button');
      const allInputs = await page.$$('input');
      const allLinks = await page.$$('a');

      console.log(`📊 Page structure analysis:`);
      console.log(`   - Buttons found: ${allButtons.length}`);
      console.log(`   - Inputs found: ${allInputs.length}`);
      console.log(`   - Links found: ${allLinks.length}`);

      // Generate suggestions based on common patterns
      if (failedSelector.includes('button')) {
        suggestions.push('button[type="submit"]', '[role="button"]', 'input[type="submit"]');
      }
      
      if (failedSelector.includes('input')) {
        suggestions.push('input[type="text"]', 'input[type="password"]', '[role="textbox"]');
      }

    } catch (error) {
      console.log('Could not analyze page structure');
    }

    return suggestions;
  }

  /**
   * Log healing events for reporting and analysis
   */
  private static logHealingEvent(originalSelector: string, healedSelector: string) {
    const healingLog = {
      timestamp: new Date().toISOString(),
      originalSelector,
      healedSelector,
      testFile: 'unknown' // Could be enhanced to capture actual test file
    };

    console.log('🔧 Self-Healing Event:', JSON.stringify(healingLog, null, 2));
    
    // In a real implementation, this would write to a file or database
    // for analysis and selector maintenance
  }

  /**
   * Visual comparison helper for detecting UI changes
   */
  static async detectUIChanges(
    page: Page,
    baselineScreenshot: string,
    currentScreenshot: string
  ): Promise<boolean> {
    // This is a placeholder for visual regression testing
    // In production, you'd use a library like pixelmatch or playwright's built-in visual comparison
    console.log('🖼️ Visual comparison would run here');
    return false;
  }

  /**
   * Auto-repair test by finding new selectors
   */
  static async autoRepairSelector(
    page: Page,
    brokenSelector: string
  ): Promise<string | null> {
    console.log(`🔧 Attempting auto-repair for: ${brokenSelector}`);

    // Try to extract the element type and identifier from broken selector
    const elementType = this.extractElementType(brokenSelector);
    const identifier = this.extractIdentifier(brokenSelector);

    if (elementType && identifier) {
      try {
        const repaired = await this.smartLocate(page, elementType, identifier);
        const repairedSelector = await this.getOptimalSelector(page, repaired);
        console.log(`✅ Auto-repaired selector: ${repairedSelector}`);
        return repairedSelector;
      } catch {
        console.log('❌ Auto-repair failed');
      }
    }

    return null;
  }

  /**
   * Extract element type from selector
   */
  private static extractElementType(selector: string): 'button' | 'input' | 'link' | 'text' | null {
    if (selector.includes('button')) return 'button';
    if (selector.includes('input')) return 'input';
    if (selector.includes('a[')) return 'link';
    return 'text';
  }

  /**
   * Extract identifier from selector
   */
  private static extractIdentifier(selector: string): string {
    // Simple extraction - in production would be more sophisticated
    const idMatch = selector.match(/id="([^"]+)"/);
    const nameMatch = selector.match(/name="([^"]+)"/);
    const textMatch = selector.match(/text="([^"]+)"/);

    return idMatch?.[1] || nameMatch?.[1] || textMatch?.[1] || '';
  }

  /**
   * Get optimal selector for an element
   */
  private static async getOptimalSelector(page: Page, locator: Locator): Promise<string> {
    // Try to generate the most stable selector
    const element = locator.first();
    
    try {
      // Check for ID
      const id = await element.getAttribute('id');
      if (id) return `#${id}`;

      // Check for data-test attribute
      const dataTest = await element.getAttribute('data-test');
      if (dataTest) return `[data-test="${dataTest}"]`;

      // Check for name
      const name = await element.getAttribute('name');
      if (name) return `[name="${name}"]`;

      // Fallback to role or class
      const role = await element.getAttribute('role');
      if (role) return `[role="${role}"]`;

    } catch {
      // Could not determine optimal selector
    }

    return 'selector-not-determined';
  }
} 