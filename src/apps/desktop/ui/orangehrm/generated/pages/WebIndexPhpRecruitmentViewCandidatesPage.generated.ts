// @generated from app-model.json v1.0.26 sha256:9ab1f1a9e33a2f16
// DO NOT EDIT — regenerate with: npm run onboard:generate

import { Page, Locator } from '@playwright/test'
import { BasePage } from '../../pages/BasePage'

export class WebIndexPhpRecruitmentViewCandidatesPage extends BasePage {

  constructor(page: Page) {
    super(page)
  }

  // ── Abstract contract ────────────────────────────────────────────────────
  readonly pageUrl = "/web/index.php/recruitment/viewCandidates"
  async isLoaded(): Promise<boolean> { return this.page.url().includes("/web/index.php/recruitment/viewCandidates") }

  // ── Navigation ────────────────────────────────────────────────────────────
  async navigateTo(): Promise<void> {
    await this.page.goto("/web/index.php/recruitment/viewCandidates")
  }

  // ── Critical elements — SmartLocator wired ────────────────────────────────────────
  readonly search = this.smart({
    key: 'web-index-php-recruitment-viewCandidates:search',
    description: "Search",
    strategies: [
      { name: 'role', selector: "textbox", accessibleName: "Search" },
      { name: 'css', selector: "input[placeholder='Search']" },
    ],
  })

  readonly admin = this.smart({
    key: 'web-index-php-recruitment-viewCandidates:admin',
    description: "Admin",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Admin" },
      { name: 'text', selector: "text=Admin" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly pIM = this.smart({
    key: 'web-index-php-recruitment-viewCandidates:pIM',
    description: "PIM",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "PIM" },
      { name: 'text', selector: "text=PIM" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly leave = this.smart({
    key: 'web-index-php-recruitment-viewCandidates:leave',
    description: "Leave",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Leave" },
      { name: 'text', selector: "text=Leave" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly time = this.smart({
    key: 'web-index-php-recruitment-viewCandidates:time',
    description: "Time",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Time" },
      { name: 'text', selector: "text=Time" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly recruitment = this.smart({
    key: 'web-index-php-recruitment-viewCandidates:recruitment',
    description: "Recruitment",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Recruitment" },
      { name: 'text', selector: "text=Recruitment" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly myInfo = this.smart({
    key: 'web-index-php-recruitment-viewCandidates:myInfo',
    description: "My Info",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "My Info" },
      { name: 'text', selector: "text=My Info" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly performance = this.smart({
    key: 'web-index-php-recruitment-viewCandidates:performance',
    description: "Performance",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Performance" },
      { name: 'text', selector: "text=Performance" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly dashboard = this.smart({
    key: 'web-index-php-recruitment-viewCandidates:dashboard',
    description: "Dashboard",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Dashboard" },
      { name: 'text', selector: "text=Dashboard" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly directory = this.smart({
    key: 'web-index-php-recruitment-viewCandidates:directory',
    description: "Directory",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Directory" },
      { name: 'text', selector: "text=Directory" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly maintenance = this.smart({
    key: 'web-index-php-recruitment-viewCandidates:maintenance',
    description: "Maintenance",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Maintenance" },
      { name: 'text', selector: "text=Maintenance" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly claim = this.smart({
    key: 'web-index-php-recruitment-viewCandidates:claim',
    description: "Claim",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Claim" },
      { name: 'text', selector: "text=Claim" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly buzz = this.smart({
    key: 'web-index-php-recruitment-viewCandidates:buzz',
    description: "Buzz",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Buzz" },
      { name: 'text', selector: "text=Buzz" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly upgrade = this.smart({
    key: 'web-index-php-recruitment-viewCandidates:upgrade',
    description: "Upgrade",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Upgrade" },
      { name: 'text', selector: "text=Upgrade" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly upgrade_2 = this.smart({
    key: 'web-index-php-recruitment-viewCandidates:upgrade_2',
    description: "Upgrade",
    strategies: [
      { name: 'role', selector: "button", accessibleName: "Upgrade" },
      { name: 'text', selector: "text=Upgrade" },
      { name: 'css', selector: "button[type=button]" },
    ],
  })

  readonly candidates = this.smart({
    key: 'web-index-php-recruitment-viewCandidates:candidates',
    description: "Candidates",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Candidates" },
      { name: 'text', selector: "text=Candidates" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly vacancies = this.smart({
    key: 'web-index-php-recruitment-viewCandidates:vacancies',
    description: "Vacancies",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Vacancies" },
      { name: 'text', selector: "text=Vacancies" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly typeForHints = this.smart({
    key: 'web-index-php-recruitment-viewCandidates:typeForHints',
    description: "Type for hints...",
    strategies: [
      { name: 'role', selector: "textbox", accessibleName: "Type for hints..." },
      { name: 'css', selector: "input[placeholder='Type for hints...']" },
    ],
  })

  readonly enterCommaSeperatedWords = this.smart({
    key: 'web-index-php-recruitment-viewCandidates:enterCommaSeperatedWords',
    description: "Enter comma seperated words...",
    strategies: [
      { name: 'role', selector: "textbox", accessibleName: "Enter comma seperated words..." },
      { name: 'css', selector: "input[placeholder='Enter comma seperated words...']" },
    ],
  })

  readonly from = this.smart({
    key: 'web-index-php-recruitment-viewCandidates:from',
    description: "From",
    strategies: [
      { name: 'role', selector: "textbox", accessibleName: "From" },
      { name: 'css', selector: "input[placeholder='From']" },
    ],
  })

  readonly to = this.smart({
    key: 'web-index-php-recruitment-viewCandidates:to',
    description: "To",
    strategies: [
      { name: 'role', selector: "textbox", accessibleName: "To" },
      { name: 'css', selector: "input[placeholder='To']" },
    ],
  })

  readonly reset = this.smart({
    key: 'web-index-php-recruitment-viewCandidates:reset',
    description: "Reset",
    strategies: [
      { name: 'role', selector: "button", accessibleName: "Reset" },
      { name: 'text', selector: "text=Reset" },
      { name: 'css', selector: "button[type=reset]" },
    ],
  })

  readonly search_2 = this.smart({
    key: 'web-index-php-recruitment-viewCandidates:search_2',
    description: "Search",
    strategies: [
      { name: 'role', selector: "button", accessibleName: "Search" },
      { name: 'text', selector: "text=Search" },
      { name: 'css', selector: "button[type=submit]" },
    ],
  })

  readonly add = this.smart({
    key: 'web-index-php-recruitment-viewCandidates:add',
    description: "Add",
    strategies: [
      { name: 'role', selector: "button", accessibleName: "Add" },
      { name: 'text', selector: "text=Add" },
      { name: 'css', selector: "button[type=button]" },
    ],
  })

  readonly selectAllCandidatesCheckbox = this.smart({
    key: 'web-index-php-recruitment-viewCandidates:unnamed-input-28',
    description: "unnamed-input-28",
    strategies: [
      { name: 'role', selector: "textbox" },
      { name: 'css', selector: "input[type=checkbox]" },
    ],
  })

  readonly candidateRowCheckbox11 = this.smart({
    key: 'web-index-php-recruitment-viewCandidates:candidateRowCheckbox11',
    description: "unnamed-input-29",
    strategies: [
      { name: 'role', selector: "textbox" },
      { name: 'css', selector: "input[type=checkbox]" },
    ],
  })

  readonly candidateRowCheckbox21 = this.smart({
    key: 'web-index-php-recruitment-viewCandidates:candidateRowCheckbox21',
    description: "unnamed-input-32",
    strategies: [
      { name: 'role', selector: "textbox" },
      { name: 'css', selector: "input[type=checkbox]" },
    ],
  })

  readonly candidateRowCheckbox31 = this.smart({
    key: 'web-index-php-recruitment-viewCandidates:candidateRowCheckbox31',
    description: "unnamed-input-36",
    strategies: [
      { name: 'role', selector: "textbox" },
      { name: 'css', selector: "input[type=checkbox]" },
    ],
  })

  readonly candidateRowCheckbox41 = this.smart({
    key: 'web-index-php-recruitment-viewCandidates:candidateRowCheckbox41',
    description: "unnamed-input-40",
    strategies: [
      { name: 'role', selector: "textbox" },
      { name: 'css', selector: "input[type=checkbox]" },
    ],
  })

  readonly candidateRowCheckbox11_2 = this.smart({
    key: 'web-index-php-recruitment-viewCandidates:candidateRowCheckbox11_2',
    description: "unnamed-input-44",
    strategies: [
      { name: 'role', selector: "textbox" },
      { name: 'css', selector: "input[type=checkbox]" },
    ],
  })

  readonly candidateRowCheckbox21_2 = this.smart({
    key: 'web-index-php-recruitment-viewCandidates:candidateRowCheckbox21_2',
    description: "unnamed-input-48",
    strategies: [
      { name: 'role', selector: "textbox" },
      { name: 'css', selector: "input[type=checkbox]" },
    ],
  })

  readonly candidateRowCheckbox31_2 = this.smart({
    key: 'web-index-php-recruitment-viewCandidates:candidateRowCheckbox31_2',
    description: "unnamed-input-52",
    strategies: [
      { name: 'role', selector: "textbox" },
      { name: 'css', selector: "input[type=checkbox]" },
    ],
  })

  readonly candidateRowCheckbox41_2 = this.smart({
    key: 'web-index-php-recruitment-viewCandidates:candidateRowCheckbox41_2',
    description: "unnamed-input-56",
    strategies: [
      { name: 'role', selector: "textbox" },
      { name: 'css', selector: "input[type=checkbox]" },
    ],
  })

  readonly candidateRowCheckbox5 = this.smart({
    key: 'web-index-php-recruitment-viewCandidates:unnamed-input-60',
    description: "unnamed-input-60",
    strategies: [
      { name: 'role', selector: "textbox" },
      { name: 'css', selector: "input[type=checkbox]" },
    ],
  })

  readonly candidateRow1Checkbox = this.smart({
    key: 'web-index-php-recruitment-viewCandidates:unnamed-input-64',
    description: "unnamed-input-64",
    strategies: [
      { name: 'role', selector: "textbox" },
      { name: 'css', selector: "input[type=checkbox]" },
    ],
  })

  readonly candidateRow2Checkbox = this.smart({
    key: 'web-index-php-recruitment-viewCandidates:unnamed-input-68',
    description: "unnamed-input-68",
    strategies: [
      { name: 'role', selector: "textbox" },
      { name: 'css', selector: "input[type=checkbox]" },
    ],
  })

  readonly candidateRow3Checkbox = this.smart({
    key: 'web-index-php-recruitment-viewCandidates:unnamed-input-71',
    description: "unnamed-input-71",
    strategies: [
      { name: 'role', selector: "textbox" },
      { name: 'css', selector: "input[type=checkbox]" },
    ],
  })

  readonly candidateRow4Checkbox = this.smart({
    key: 'web-index-php-recruitment-viewCandidates:unnamed-input-74',
    description: "unnamed-input-74",
    strategies: [
      { name: 'role', selector: "textbox" },
      { name: 'css', selector: "input[type=checkbox]" },
    ],
  })

  readonly candidateRow5Checkbox = this.smart({
    key: 'web-index-php-recruitment-viewCandidates:unnamed-input-77',
    description: "unnamed-input-77",
    strategies: [
      { name: 'role', selector: "textbox" },
      { name: 'css', selector: "input[type=checkbox]" },
    ],
  })

  readonly candidateRow6Checkbox = this.smart({
    key: 'web-index-php-recruitment-viewCandidates:unnamed-input-80',
    description: "unnamed-input-80",
    strategies: [
      { name: 'role', selector: "textbox" },
      { name: 'css', selector: "input[type=checkbox]" },
    ],
  })

  readonly candidateRow7Checkbox = this.smart({
    key: 'web-index-php-recruitment-viewCandidates:unnamed-input-83',
    description: "unnamed-input-83",
    strategies: [
      { name: 'role', selector: "textbox" },
      { name: 'css', selector: "input[type=checkbox]" },
    ],
  })

  readonly selectCandidateCheckbox1 = this.smart({
    key: 'web-index-php-recruitment-viewCandidates:unnamed-input-86',
    description: "unnamed-input-86",
    strategies: [
      { name: 'role', selector: "textbox" },
      { name: 'css', selector: "input[type=checkbox]" },
    ],
  })

  readonly selectCandidateCheckbox2 = this.smart({
    key: 'web-index-php-recruitment-viewCandidates:unnamed-input-89',
    description: "unnamed-input-89",
    strategies: [
      { name: 'role', selector: "textbox" },
      { name: 'css', selector: "input[type=checkbox]" },
    ],
  })

  readonly selectCandidateCheckbox3 = this.smart({
    key: 'web-index-php-recruitment-viewCandidates:unnamed-input-92',
    description: "unnamed-input-92",
    strategies: [
      { name: 'role', selector: "textbox" },
      { name: 'css', selector: "input[type=checkbox]" },
    ],
  })

  readonly selectCandidateCheckbox4 = this.smart({
    key: 'web-index-php-recruitment-viewCandidates:unnamed-input-95',
    description: "unnamed-input-95",
    strategies: [
      { name: 'role', selector: "textbox" },
      { name: 'css', selector: "input[type=checkbox]" },
    ],
  })

  readonly selectCandidateCheckbox5 = this.smart({
    key: 'web-index-php-recruitment-viewCandidates:unnamed-input-99',
    description: "unnamed-input-99",
    strategies: [
      { name: 'role', selector: "textbox" },
      { name: 'css', selector: "input[type=checkbox]" },
    ],
  })

  // ── Non-critical elements — plain locators ────────────────────────────────────────
  readonly candidateDetailsLink: Locator = this.page.locator("role=link")

  readonly addCandidateButton: Locator = this.page.locator("role=none")

  readonly searchButton: Locator = this.page.locator("role=button")

  readonly resetButton: Locator = this.page.locator("role=button")

  readonly viewCandidateButton1: Locator = this.page.locator("role=button")

  readonly editCandidateButton1: Locator = this.page.locator("role=button")

  readonly viewCandidateButton2: Locator = this.page.locator("role=button")

  readonly editCandidateButton2: Locator = this.page.locator("role=button")

  readonly deleteCandidateButton2: Locator = this.page.locator("role=button")

  readonly viewCandidateButton3: Locator = this.page.locator("role=button")

  readonly editCandidateButton3: Locator = this.page.locator("role=button")

  readonly deleteCandidateButton3: Locator = this.page.locator("role=button")

  readonly viewCandidateButton4: Locator = this.page.locator("role=button")

  readonly editCandidateButton4: Locator = this.page.locator("role=button")

  readonly deleteCandidateButton4: Locator = this.page.locator("role=button")

  readonly candidateViewButton1: Locator = this.page.locator("role=button")

  readonly candidateEditButton1: Locator = this.page.locator("role=button")

  readonly candidateDeleteButton1: Locator = this.page.locator("role=button")

  readonly candidateViewButton2: Locator = this.page.locator("role=button")

  readonly candidateEditButton2: Locator = this.page.locator("role=button")

  readonly candidateDeleteButton2: Locator = this.page.locator("role=button")

  readonly candidateViewButton3: Locator = this.page.locator("role=button")

  readonly candidateEditButton3: Locator = this.page.locator("role=button")

  readonly candidateDeleteButton3: Locator = this.page.locator("role=button")

  readonly candidateViewButton4: Locator = this.page.locator("role=button")

  readonly candidateEditButton4: Locator = this.page.locator("role=button")

  readonly candidateDeleteButton4: Locator = this.page.locator("role=button")

  readonly candidateViewButton5: Locator = this.page.locator("role=button")

  readonly candidateEditButton5: Locator = this.page.locator("role=button")

  readonly candidateDeleteButton5: Locator = this.page.locator("role=button")

  readonly candidateRow1ViewButton: Locator = this.page.locator("role=button")

  readonly candidateRow1EditButton: Locator = this.page.locator("role=button")

  readonly candidateRow1DeleteButton: Locator = this.page.locator("role=button")

  readonly candidateRow2ViewButton: Locator = this.page.locator("role=button")

  readonly candidateRow2EditButton: Locator = this.page.locator("role=button")

  readonly candidateRow3ViewButton: Locator = this.page.locator("role=button")

  readonly candidateRow3EditButton: Locator = this.page.locator("role=button")

  readonly candidateRow4ViewButton: Locator = this.page.locator("role=button")

  readonly candidateRow4EditButton: Locator = this.page.locator("role=button")

  readonly candidateRow5ViewButton: Locator = this.page.locator("role=button")

  readonly candidateRow5EditButton: Locator = this.page.locator("role=button")

  readonly candidateRow6ViewButton: Locator = this.page.locator("role=button")

  readonly candidateRow6EditButton: Locator = this.page.locator("role=button")

  readonly candidateActionButton1: Locator = this.page.locator("role=button")

  readonly candidateActionButton2: Locator = this.page.locator("role=button")

  readonly candidateActionButton3: Locator = this.page.locator("role=button")

  readonly candidateActionButton4: Locator = this.page.locator("role=button")

  readonly candidateActionButton5: Locator = this.page.locator("role=button")

  readonly candidateActionButton6: Locator = this.page.locator("role=button")

  readonly candidateActionButton7: Locator = this.page.locator("role=button")

  readonly candidateActionButton8: Locator = this.page.locator("role=button")

  readonly candidateActionButton9: Locator = this.page.locator("role=button")

  readonly candidateActionButton10: Locator = this.page.locator("role=button")

  readonly candidateActionButton11: Locator = this.page.locator("role=button")

  // ── Actions ────────────────────────────────────────────────────────────
  async submit(search: string, typeForHints: string, enterCommaSeperatedWords: string, from: string, to: string): Promise<void> {
    await (await this.search.resolve({ assertionType: 'fill', expectedValue: search })).fill(search)
    await (await this.typeForHints.resolve({ assertionType: 'fill', expectedValue: typeForHints })).fill(typeForHints)
    await (await this.enterCommaSeperatedWords.resolve({ assertionType: 'fill', expectedValue: enterCommaSeperatedWords })).fill(enterCommaSeperatedWords)
    await (await this.from.resolve({ assertionType: 'fill', expectedValue: from })).fill(from)
    await (await this.to.resolve({ assertionType: 'fill', expectedValue: to })).fill(to)
    await (await this.upgrade_2.resolve({ assertionType: 'click' })).click()
  }
}
