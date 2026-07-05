// @generated from app-model.json v1.0.26 sha256:9ab1f1a9e33a2f16
// DO NOT EDIT — regenerate with: npm run onboard:generate

import { Page, Locator } from '@playwright/test'
import { BasePage } from '../../pages/BasePage'

export class WebIndexPhpRecruitmentViewRecruitmentModulePage extends BasePage {

  constructor(page: Page) {
    super(page)
  }

  // ── Abstract contract ────────────────────────────────────────────────────
  readonly pageUrl = "/web/index.php/recruitment/viewRecruitmentModule"
  async isLoaded(): Promise<boolean> { return this.page.url().includes("/web/index.php/recruitment/viewRecruitmentModule") }

  // ── Navigation ────────────────────────────────────────────────────────────
  async navigateTo(): Promise<void> {
    await this.page.goto("/web/index.php/recruitment/viewRecruitmentModule")
  }

  // ── Critical elements — SmartLocator wired ────────────────────────────────────────
  readonly search = this.smart({
    key: 'web-index-php-recruitment-viewRecruitmentModule:search',
    description: "Search",
    strategies: [
      { name: 'role', selector: "textbox", accessibleName: "Search" },
      { name: 'css', selector: "input[placeholder='Search']" },
    ],
  })

  readonly admin = this.smart({
    key: 'web-index-php-recruitment-viewRecruitmentModule:admin',
    description: "Admin",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Admin" },
      { name: 'text', selector: "text=Admin" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly pIM = this.smart({
    key: 'web-index-php-recruitment-viewRecruitmentModule:pIM',
    description: "PIM",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "PIM" },
      { name: 'text', selector: "text=PIM" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly leave = this.smart({
    key: 'web-index-php-recruitment-viewRecruitmentModule:leave',
    description: "Leave",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Leave" },
      { name: 'text', selector: "text=Leave" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly time = this.smart({
    key: 'web-index-php-recruitment-viewRecruitmentModule:time',
    description: "Time",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Time" },
      { name: 'text', selector: "text=Time" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly recruitment = this.smart({
    key: 'web-index-php-recruitment-viewRecruitmentModule:recruitment',
    description: "Recruitment",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Recruitment" },
      { name: 'text', selector: "text=Recruitment" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly myInfo = this.smart({
    key: 'web-index-php-recruitment-viewRecruitmentModule:myInfo',
    description: "My Info",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "My Info" },
      { name: 'text', selector: "text=My Info" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly performance = this.smart({
    key: 'web-index-php-recruitment-viewRecruitmentModule:performance',
    description: "Performance",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Performance" },
      { name: 'text', selector: "text=Performance" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly dashboard = this.smart({
    key: 'web-index-php-recruitment-viewRecruitmentModule:dashboard',
    description: "Dashboard",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Dashboard" },
      { name: 'text', selector: "text=Dashboard" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly directory = this.smart({
    key: 'web-index-php-recruitment-viewRecruitmentModule:directory',
    description: "Directory",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Directory" },
      { name: 'text', selector: "text=Directory" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly maintenance = this.smart({
    key: 'web-index-php-recruitment-viewRecruitmentModule:maintenance',
    description: "Maintenance",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Maintenance" },
      { name: 'text', selector: "text=Maintenance" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly claim = this.smart({
    key: 'web-index-php-recruitment-viewRecruitmentModule:claim',
    description: "Claim",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Claim" },
      { name: 'text', selector: "text=Claim" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly buzz = this.smart({
    key: 'web-index-php-recruitment-viewRecruitmentModule:buzz',
    description: "Buzz",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Buzz" },
      { name: 'text', selector: "text=Buzz" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly upgrade = this.smart({
    key: 'web-index-php-recruitment-viewRecruitmentModule:upgrade',
    description: "Upgrade",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Upgrade" },
      { name: 'text', selector: "text=Upgrade" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly upgrade_2 = this.smart({
    key: 'web-index-php-recruitment-viewRecruitmentModule:upgrade_2',
    description: "Upgrade",
    strategies: [
      { name: 'role', selector: "button", accessibleName: "Upgrade" },
      { name: 'text', selector: "text=Upgrade" },
      { name: 'css', selector: "button[type=button]" },
    ],
  })

  readonly candidates = this.smart({
    key: 'web-index-php-recruitment-viewRecruitmentModule:candidates',
    description: "Candidates",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Candidates" },
      { name: 'text', selector: "text=Candidates" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly vacancies = this.smart({
    key: 'web-index-php-recruitment-viewRecruitmentModule:vacancies',
    description: "Vacancies",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Vacancies" },
      { name: 'text', selector: "text=Vacancies" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly typeForHints = this.smart({
    key: 'web-index-php-recruitment-viewRecruitmentModule:typeForHints',
    description: "Type for hints...",
    strategies: [
      { name: 'role', selector: "textbox", accessibleName: "Type for hints..." },
      { name: 'css', selector: "input[placeholder='Type for hints...']" },
    ],
  })

  readonly enterCommaSeperatedWords = this.smart({
    key: 'web-index-php-recruitment-viewRecruitmentModule:enterCommaSeperatedWords',
    description: "Enter comma seperated words...",
    strategies: [
      { name: 'role', selector: "textbox", accessibleName: "Enter comma seperated words..." },
      { name: 'css', selector: "input[placeholder='Enter comma seperated words...']" },
    ],
  })

  readonly from = this.smart({
    key: 'web-index-php-recruitment-viewRecruitmentModule:from',
    description: "From",
    strategies: [
      { name: 'role', selector: "textbox", accessibleName: "From" },
      { name: 'css', selector: "input[placeholder='From']" },
    ],
  })

  readonly to = this.smart({
    key: 'web-index-php-recruitment-viewRecruitmentModule:to',
    description: "To",
    strategies: [
      { name: 'role', selector: "textbox", accessibleName: "To" },
      { name: 'css', selector: "input[placeholder='To']" },
    ],
  })

  readonly reset = this.smart({
    key: 'web-index-php-recruitment-viewRecruitmentModule:reset',
    description: "Reset",
    strategies: [
      { name: 'role', selector: "button", accessibleName: "Reset" },
      { name: 'text', selector: "text=Reset" },
      { name: 'css', selector: "button[type=reset]" },
    ],
  })

  readonly search_2 = this.smart({
    key: 'web-index-php-recruitment-viewRecruitmentModule:search_2',
    description: "Search",
    strategies: [
      { name: 'role', selector: "button", accessibleName: "Search" },
      { name: 'text', selector: "text=Search" },
      { name: 'css', selector: "button[type=submit]" },
    ],
  })

  readonly add = this.smart({
    key: 'web-index-php-recruitment-viewRecruitmentModule:add',
    description: "Add",
    strategies: [
      { name: 'role', selector: "button", accessibleName: "Add" },
      { name: 'text', selector: "text=Add" },
      { name: 'css', selector: "button[type=button]" },
    ],
  })

  readonly selectAllCheckbox = this.smart({
    key: 'web-index-php-recruitment-viewRecruitmentModule:unnamed-input-28',
    description: "unnamed-input-28",
    strategies: [
      { name: 'role', selector: "textbox" },
      { name: 'css', selector: "input[type=checkbox]" },
    ],
  })

  readonly candidateRow1Checkbox = this.smart({
    key: 'web-index-php-recruitment-viewRecruitmentModule:unnamed-input-29',
    description: "unnamed-input-29",
    strategies: [
      { name: 'role', selector: "textbox" },
      { name: 'css', selector: "input[type=checkbox]" },
    ],
  })

  readonly candidateRow2Checkbox = this.smart({
    key: 'web-index-php-recruitment-viewRecruitmentModule:unnamed-input-32',
    description: "unnamed-input-32",
    strategies: [
      { name: 'role', selector: "textbox" },
      { name: 'css', selector: "input[type=checkbox]" },
    ],
  })

  readonly candidateRow3Checkbox = this.smart({
    key: 'web-index-php-recruitment-viewRecruitmentModule:unnamed-input-36',
    description: "unnamed-input-36",
    strategies: [
      { name: 'role', selector: "textbox" },
      { name: 'css', selector: "input[type=checkbox]" },
    ],
  })

  readonly candidateRow4Checkbox = this.smart({
    key: 'web-index-php-recruitment-viewRecruitmentModule:unnamed-input-40',
    description: "unnamed-input-40",
    strategies: [
      { name: 'role', selector: "textbox" },
      { name: 'css', selector: "input[type=checkbox]" },
    ],
  })

  readonly candidateCheckbox1 = this.smart({
    key: 'web-index-php-recruitment-viewRecruitmentModule:unnamed-input-44',
    description: "unnamed-input-44",
    strategies: [
      { name: 'role', selector: "textbox" },
      { name: 'css', selector: "input[type=checkbox]" },
    ],
  })

  readonly candidateCheckbox2 = this.smart({
    key: 'web-index-php-recruitment-viewRecruitmentModule:unnamed-input-48',
    description: "unnamed-input-48",
    strategies: [
      { name: 'role', selector: "textbox" },
      { name: 'css', selector: "input[type=checkbox]" },
    ],
  })

  readonly candidateCheckbox3 = this.smart({
    key: 'web-index-php-recruitment-viewRecruitmentModule:unnamed-input-52',
    description: "unnamed-input-52",
    strategies: [
      { name: 'role', selector: "textbox" },
      { name: 'css', selector: "input[type=checkbox]" },
    ],
  })

  readonly candidateCheckbox4 = this.smart({
    key: 'web-index-php-recruitment-viewRecruitmentModule:unnamed-input-56',
    description: "unnamed-input-56",
    strategies: [
      { name: 'role', selector: "textbox" },
      { name: 'css', selector: "input[type=checkbox]" },
    ],
  })

  readonly candidateCheckbox5 = this.smart({
    key: 'web-index-php-recruitment-viewRecruitmentModule:unnamed-input-60',
    description: "unnamed-input-60",
    strategies: [
      { name: 'role', selector: "textbox" },
      { name: 'css', selector: "input[type=checkbox]" },
    ],
  })

  readonly recruitmentRowCheckbox1 = this.smart({
    key: 'web-index-php-recruitment-viewRecruitmentModule:unnamed-input-64',
    description: "unnamed-input-64",
    strategies: [
      { name: 'role', selector: "textbox" },
      { name: 'css', selector: "input[type=checkbox]" },
    ],
  })

  readonly recruitmentRowCheckbox2 = this.smart({
    key: 'web-index-php-recruitment-viewRecruitmentModule:unnamed-input-68',
    description: "unnamed-input-68",
    strategies: [
      { name: 'role', selector: "textbox" },
      { name: 'css', selector: "input[type=checkbox]" },
    ],
  })

  readonly recruitmentRowCheckbox3 = this.smart({
    key: 'web-index-php-recruitment-viewRecruitmentModule:unnamed-input-71',
    description: "unnamed-input-71",
    strategies: [
      { name: 'role', selector: "textbox" },
      { name: 'css', selector: "input[type=checkbox]" },
    ],
  })

  readonly recruitmentRowCheckbox4 = this.smart({
    key: 'web-index-php-recruitment-viewRecruitmentModule:unnamed-input-74',
    description: "unnamed-input-74",
    strategies: [
      { name: 'role', selector: "textbox" },
      { name: 'css', selector: "input[type=checkbox]" },
    ],
  })

  readonly recruitmentRowCheckbox5 = this.smart({
    key: 'web-index-php-recruitment-viewRecruitmentModule:unnamed-input-77',
    description: "unnamed-input-77",
    strategies: [
      { name: 'role', selector: "textbox" },
      { name: 'css', selector: "input[type=checkbox]" },
    ],
  })

  readonly recruitmentRowCheckbox6 = this.smart({
    key: 'web-index-php-recruitment-viewRecruitmentModule:unnamed-input-80',
    description: "unnamed-input-80",
    strategies: [
      { name: 'role', selector: "textbox" },
      { name: 'css', selector: "input[type=checkbox]" },
    ],
  })

  readonly recruitmentRowCheckbox7 = this.smart({
    key: 'web-index-php-recruitment-viewRecruitmentModule:unnamed-input-83',
    description: "unnamed-input-83",
    strategies: [
      { name: 'role', selector: "textbox" },
      { name: 'css', selector: "input[type=checkbox]" },
    ],
  })

  readonly recruitmentSelectCheckbox1 = this.smart({
    key: 'web-index-php-recruitment-viewRecruitmentModule:unnamed-input-86',
    description: "unnamed-input-86",
    strategies: [
      { name: 'role', selector: "textbox" },
      { name: 'css', selector: "input[type=checkbox]" },
    ],
  })

  readonly recruitmentSelectCheckbox2 = this.smart({
    key: 'web-index-php-recruitment-viewRecruitmentModule:unnamed-input-89',
    description: "unnamed-input-89",
    strategies: [
      { name: 'role', selector: "textbox" },
      { name: 'css', selector: "input[type=checkbox]" },
    ],
  })

  readonly recruitmentSelectCheckbox3 = this.smart({
    key: 'web-index-php-recruitment-viewRecruitmentModule:unnamed-input-92',
    description: "unnamed-input-92",
    strategies: [
      { name: 'role', selector: "textbox" },
      { name: 'css', selector: "input[type=checkbox]" },
    ],
  })

  readonly recruitmentSelectCheckbox4 = this.smart({
    key: 'web-index-php-recruitment-viewRecruitmentModule:unnamed-input-95',
    description: "unnamed-input-95",
    strategies: [
      { name: 'role', selector: "textbox" },
      { name: 'css', selector: "input[type=checkbox]" },
    ],
  })

  readonly recruitmentSelectCheckbox5 = this.smart({
    key: 'web-index-php-recruitment-viewRecruitmentModule:unnamed-input-99',
    description: "unnamed-input-99",
    strategies: [
      { name: 'role', selector: "textbox" },
      { name: 'css', selector: "input[type=checkbox]" },
    ],
  })

  // ── Non-critical elements — plain locators ────────────────────────────────────────
  readonly recruitmentModuleLink: Locator = this.page.locator("role=link")

  readonly addCandidateButton: Locator = this.page.locator("role=none")

  readonly searchButton: Locator = this.page.locator("role=button")

  readonly resetButton: Locator = this.page.locator("role=button")

  readonly viewCandidate1Button: Locator = this.page.locator("role=button")

  readonly editCandidate1Button: Locator = this.page.locator("role=button")

  readonly viewCandidate2Button: Locator = this.page.locator("role=button")

  readonly editCandidate2Button: Locator = this.page.locator("role=button")

  readonly deleteCandidate2Button: Locator = this.page.locator("role=button")

  readonly viewCandidate3Button: Locator = this.page.locator("role=button")

  readonly editCandidate3Button: Locator = this.page.locator("role=button")

  readonly deleteCandidate3Button: Locator = this.page.locator("role=button")

  readonly viewCandidate4Button: Locator = this.page.locator("role=button")

  readonly editCandidate4Button: Locator = this.page.locator("role=button")

  readonly deleteCandidate4Button: Locator = this.page.locator("role=button")

  readonly viewCandidateButton1: Locator = this.page.locator("role=button")

  readonly editCandidateButton1: Locator = this.page.locator("role=button")

  readonly deleteCandidateButton1: Locator = this.page.locator("role=button")

  readonly viewCandidateButton2: Locator = this.page.locator("role=button")

  readonly editCandidateButton2: Locator = this.page.locator("role=button")

  readonly deleteCandidateButton2: Locator = this.page.locator("role=button")

  readonly viewCandidateButton3: Locator = this.page.locator("role=button")

  readonly editCandidateButton3: Locator = this.page.locator("role=button")

  readonly deleteCandidateButton3: Locator = this.page.locator("role=button")

  readonly viewCandidateButton4: Locator = this.page.locator("role=button")

  readonly editCandidateButton4: Locator = this.page.locator("role=button")

  readonly deleteCandidateButton4: Locator = this.page.locator("role=button")

  readonly viewCandidateButton5: Locator = this.page.locator("role=button")

  readonly editCandidateButton5: Locator = this.page.locator("role=button")

  readonly deleteCandidateButton5: Locator = this.page.locator("role=button")

  readonly recruitmentRowEditButton1: Locator = this.page.locator("role=button")

  readonly recruitmentRowDeleteButton1: Locator = this.page.locator("role=button")

  readonly recruitmentRowViewButton1: Locator = this.page.locator("role=button")

  readonly recruitmentRowEditButton2: Locator = this.page.locator("role=button")

  readonly recruitmentRowDeleteButton2: Locator = this.page.locator("role=button")

  readonly recruitmentRowEditButton3: Locator = this.page.locator("role=button")

  readonly recruitmentRowDeleteButton3: Locator = this.page.locator("role=button")

  readonly recruitmentRowEditButton4: Locator = this.page.locator("role=button")

  readonly recruitmentRowDeleteButton4: Locator = this.page.locator("role=button")

  readonly recruitmentRowEditButton5: Locator = this.page.locator("role=button")

  readonly recruitmentRowDeleteButton5: Locator = this.page.locator("role=button")

  readonly recruitmentRowEditButton6: Locator = this.page.locator("role=button")

  readonly recruitmentRowDeleteButton6: Locator = this.page.locator("role=button")

  readonly recruitmentActionButton1: Locator = this.page.locator("role=button")

  readonly recruitmentActionButton2: Locator = this.page.locator("role=button")

  readonly recruitmentActionButton3: Locator = this.page.locator("role=button")

  readonly recruitmentActionButton4: Locator = this.page.locator("role=button")

  readonly recruitmentActionButton5: Locator = this.page.locator("role=button")

  readonly recruitmentActionButton6: Locator = this.page.locator("role=button")

  readonly recruitmentActionButton7: Locator = this.page.locator("role=button")

  readonly recruitmentActionButton8: Locator = this.page.locator("role=button")

  readonly recruitmentActionButton9: Locator = this.page.locator("role=button")

  readonly recruitmentActionButton10: Locator = this.page.locator("role=button")

  readonly recruitmentActionButton11: Locator = this.page.locator("role=button")

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
