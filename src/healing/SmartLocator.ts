import { Page, Locator } from '@playwright/test';
import { SmartLocatorDef, SelectorStrategy, HealEvent } from './types';
import { healStore } from './HealStore';

const STRATEGY_TIMEOUT = 2000;
// Read at call time so tests can toggle HEALING_DISABLED via process.env at runtime
const isHealingDisabled = (): boolean => process.env.HEALING_DISABLED === 'true';

export class SmartLocator {
  private page: Page;
  private def: SmartLocatorDef;
  private healEvents: HealEvent[] = [];

  constructor(page: Page, def: SmartLocatorDef) {
    this.page = page;
    this.def = def;
  }

  async resolve(): Promise<Locator> {
    const [primary, ...fallbacks] = this.def.strategies;

    // Check heal store first -- use remembered selector if available
    const storedSelector = healStore.getHealedSelector(this.def.key);
    if (storedSelector && !isHealingDisabled()) {
      const storedLocator = this.page.locator(storedSelector);
      if (await this.isResolvable(storedLocator)) {
        console.log(`[SmartLocator] Using stored heal for "${this.def.key}": ${storedSelector}`);
        return storedLocator;
      }
      // Stored selector no longer works -- retire it
      healStore.retireHeal(this.def.key);
    }

    // Happy path -- try primary
    const primaryLocator = this.buildLocator(primary);
    if (await this.isResolvable(primaryLocator)) {
      // Primary works -- retire any stale heal entry
      if (healStore.getEntry(this.def.key)) {
        healStore.retireHeal(this.def.key);
      }
      return primaryLocator;
    }

    // Healing disabled -- fail immediately
    if (isHealingDisabled()) {
      throw new Error(
        `[SmartLocator] Primary selector failed for "${this.def.key}": ${primary.selector}\n` +
        `Healing is disabled (HEALING_DISABLED=true)`
      );
    }

    // Strategy chain -- try fallbacks in order
    for (const strategy of fallbacks) {
      const locator = this.buildLocator(strategy);
      if (await this.isResolvable(locator)) {
        this.recordHeal(primary, strategy, 'strategy-chain');
        console.warn(
          `[SmartLocator] Healed "${this.def.key}": ` +
          `${primary.selector} -> ${strategy.selector} (${strategy.name})`
        );
        return locator;
      }
    }

    throw new Error(
      `[SmartLocator] All strategies exhausted for "${this.def.key}".\n` +
      `Tried: ${this.def.strategies.map(s => s.selector).join(', ')}\n` +
      `Description: ${this.def.description}`
    );
  }

  async click(): Promise<void> {
    const locator = await this.resolve();
    await locator.click();
  }

  async fill(value: string): Promise<void> {
    const locator = await this.resolve();
    await locator.fill(value);
  }

  async isVisible(): Promise<boolean> {
    try {
      const locator = await this.resolve();
      return locator.isVisible();
    } catch {
      return false;
    }
  }

  async textContent(): Promise<string> {
    const locator = await this.resolve();
    return (await locator.textContent()) ?? '';
  }

  async waitFor(options?: { state?: 'visible' | 'hidden' | 'attached' | 'detached'; timeout?: number }): Promise<void> {
    const locator = await this.resolve();
    await locator.waitFor(options);
  }

  getHealEvents(): HealEvent[] {
    return this.healEvents;
  }

  private buildLocator(strategy: SelectorStrategy): Locator {
    return this.page.locator(strategy.selector);
  }

  private async isResolvable(locator: Locator): Promise<boolean> {
    try {
      await locator.waitFor({ state: 'visible', timeout: STRATEGY_TIMEOUT });
      return true;
    } catch {
      return false;
    }
  }

  private recordHeal(
    original: SelectorStrategy,
    healed: SelectorStrategy,
    source: 'strategy-chain' | 'vision',
    confidence?: number
  ): void {
    const event: HealEvent = {
      key: this.def.key,
      timestamp: new Date().toISOString(),
      originalStrategy: original.name,
      healedStrategy: healed.name,
      healedSelector: healed.selector,
      source,
      confidence,
    };
    this.healEvents.push(event);
    healStore.recordHeal(event);  // persist to store
    healStore.save();              // write immediately
  }
}
