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

import Anthropic from '@anthropic-ai/sdk';
import { chromium, Browser, Page } from 'playwright';
import * as dotenv from 'dotenv';
import { getBaseUrl } from '../config/appConfig'

dotenv.config();

interface PageAnalysis {
  url: string;
  title: string;
  elements: string[];
  interactions: string[];
  testScenarios: string[];
}

class SiteExplorerAgent {
  private client: Anthropic;
  private browser: Browser | null = null;
  private page: Page | null = null;

  constructor() {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY not found in environment variables');
    }
    this.client = new Anthropic({ apiKey });
  }

  async initialize() {
    console.log('🚀 Launching browser...');
    this.browser = await chromium.launch({ headless: false });
    this.page = await this.browser.newPage();
  }

  async explorePage(url: string): Promise<PageAnalysis> {
    if (!this.page) throw new Error('Browser not initialized');

    console.log(`🔍 Navigating to: ${url}`);
    await this.page.goto(url);
    await this.page.waitForLoadState('networkidle');

    // Take screenshot
    const screenshot = await this.page.screenshot({ fullPage: true });

    // Get page content
    const title = await this.page.title();
    const htmlContent = await this.page.content();

    // Extract interactive elements
    const buttons = await this.page.$$eval('button', btns => 
      btns.map(b => ({ text: b.textContent?.trim(), id: b.id, class: b.className }))
    );
    const inputs = await this.page.$$eval('input', inputs => 
      inputs.map(i => ({ type: i.type, id: i.id, name: i.name, placeholder: i.placeholder }))
    );
    const links = await this.page.$$eval('a', links => 
      links.map(l => ({ text: l.textContent?.trim(), href: l.href }))
    );

    console.log('🤖 Analyzing page with Claude...');

    // Ask Claude to analyze the page
    const message = await this.client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: 'image/png',
              data: screenshot.toString('base64')
            }
          },
          {
            type: 'text',
            text: `Analyze this web page and provide:

1. What is the main purpose of this page?
2. List all interactive elements you can see (buttons, inputs, links)
3. Suggest 5 comprehensive test scenarios for this page
4. Identify potential edge cases to test

Page Info:
- URL: ${url}
- Title: ${title}
- Buttons found: ${JSON.stringify(buttons, null, 2)}
- Inputs found: ${JSON.stringify(inputs, null, 2)}
- Links found: ${JSON.stringify(links.slice(0, 10), null, 2)}

Provide your response in JSON format with keys: purpose, elements, testScenarios, edgeCases`
          }
        ]
      }],
    });

    const responseText = message.content[0].type === 'text' 
      ? message.content[0].text 
      : '';

    // Parse Claude's response
    let analysis;
    try {
      // Extract JSON from response (Claude might wrap it in markdown)
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      analysis = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
    } catch (e) {
      console.log('Raw response:', responseText);
      analysis = { purpose: responseText, elements: [], testScenarios: [], edgeCases: [] };
    }

    return {
      url,
      title,
      elements: analysis.elements || [],
      interactions: [`${buttons.length} buttons`, `${inputs.length} inputs`, `${links.length} links`],
      testScenarios: analysis.testScenarios || []
    };
  }

  async exploreEntireSite(baseUrl: string): Promise<PageAnalysis[]> {
    await this.initialize();
    
    const analyses: PageAnalysis[] = [];
    
    // Start with the main page
    console.log('\n📊 Exploring main page...');
    const mainPage = await this.explorePage(baseUrl);
    analyses.push(mainPage);

    console.log('\n✅ Site exploration complete!');
    console.log('\n📋 Summary:');
    console.log(`- Pages analyzed: ${analyses.length}`);
    console.log(`- Total test scenarios generated: ${analyses.reduce((sum, a) => sum + a.testScenarios.length, 0)}`);

    return analyses;
  }

  async generateTestReport(analyses: PageAnalysis[]) {
    console.log('\n🤖 Generating comprehensive test report with Claude...');

    const message = await this.client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 3000,
      messages: [{
        role: 'user',
        content: `Based on this site analysis, create a comprehensive test plan:

${JSON.stringify(analyses, null, 2)}

IMPORTANT CONTEXT:
- We are using Playwright (TypeScript) for automation
- We are building an AI-powered E2E testing framework
- Target framework capabilities: Test case generation, E2E agentic testing, self-healing tests, edge case detection

Provide:
1. Priority test scenarios (P0, P1, P2)
2. Test data requirements for each scenario
3. Expected outcomes
4. Automation strategy (MUST use Playwright + TypeScript)
5. Edge cases to cover
6. Specific Playwright code examples for P0 scenarios

Format as a detailed test plan with actionable Playwright implementation details.`
      }]
    });

    const report = message.content[0].type === 'text' 
      ? message.content[0].text 
      : '';

    // Save report
    const fs = require('fs');
    const reportPath = `reports/test-plan-${Date.now()}.md`;
    fs.writeFileSync(reportPath, report);
    
    console.log(`\n📄 Test report saved to: ${reportPath}`);
    console.log('\n' + report);

    return report;
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
    }
  }
}

// Main execution
async function main() {
  const explorer = new SiteExplorerAgent();
  
  try {
    const analyses = await explorer.exploreEntireSite(getBaseUrl())
    await explorer.generateTestReport(analyses);
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await explorer.cleanup();
  }
}

main();