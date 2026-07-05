// @generated from app-model.json v1.0.26 sha256:9ab1f1a9e33a2f16
// DO NOT EDIT — regenerate with: npm run onboard:generate

import { Page, Locator } from '@playwright/test'
import { BasePage } from '../../pages/BasePage'

export class WebIndexPhpRecruitmentViewJobVacancyPage extends BasePage {

  constructor(page: Page) {
    super(page)
  }

  // ── Abstract contract ────────────────────────────────────────────────────
  readonly pageUrl = "/web/index.php/recruitment/viewJobVacancy"
  async isLoaded(): Promise<boolean> { return this.page.url().includes("/web/index.php/recruitment/viewJobVacancy") }

  // ── Navigation ────────────────────────────────────────────────────────────
  async navigateTo(): Promise<void> {
    await this.page.goto("/web/index.php/recruitment/viewJobVacancy")
  }

  // ── Critical elements — SmartLocator wired ────────────────────────────────────────
  readonly search = this.smart({
    key: 'web-index-php-recruitment-viewJobVacancy:search',
    description: "Search",
    strategies: [
      { name: 'role', selector: "textbox", accessibleName: "Search" },
      { name: 'css', selector: "input[placeholder='Search']" },
    ],
  })

  readonly admin = this.smart({
    key: 'web-index-php-recruitment-viewJobVacancy:admin',
    description: "Admin",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Admin" },
      { name: 'text', selector: "text=Admin" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly pIM = this.smart({
    key: 'web-index-php-recruitment-viewJobVacancy:pIM',
    description: "PIM",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "PIM" },
      { name: 'text', selector: "text=PIM" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly leave = this.smart({
    key: 'web-index-php-recruitment-viewJobVacancy:leave',
    description: "Leave",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Leave" },
      { name: 'text', selector: "text=Leave" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly time = this.smart({
    key: 'web-index-php-recruitment-viewJobVacancy:time',
    description: "Time",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Time" },
      { name: 'text', selector: "text=Time" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly recruitment = this.smart({
    key: 'web-index-php-recruitment-viewJobVacancy:recruitment',
    description: "Recruitment",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Recruitment" },
      { name: 'text', selector: "text=Recruitment" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly myInfo = this.smart({
    key: 'web-index-php-recruitment-viewJobVacancy:myInfo',
    description: "My Info",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "My Info" },
      { name: 'text', selector: "text=My Info" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly performance = this.smart({
    key: 'web-index-php-recruitment-viewJobVacancy:performance',
    description: "Performance",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Performance" },
      { name: 'text', selector: "text=Performance" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly dashboard = this.smart({
    key: 'web-index-php-recruitment-viewJobVacancy:dashboard',
    description: "Dashboard",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Dashboard" },
      { name: 'text', selector: "text=Dashboard" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly directory = this.smart({
    key: 'web-index-php-recruitment-viewJobVacancy:directory',
    description: "Directory",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Directory" },
      { name: 'text', selector: "text=Directory" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly maintenance = this.smart({
    key: 'web-index-php-recruitment-viewJobVacancy:maintenance',
    description: "Maintenance",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Maintenance" },
      { name: 'text', selector: "text=Maintenance" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly claim = this.smart({
    key: 'web-index-php-recruitment-viewJobVacancy:claim',
    description: "Claim",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Claim" },
      { name: 'text', selector: "text=Claim" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly buzz = this.smart({
    key: 'web-index-php-recruitment-viewJobVacancy:buzz',
    description: "Buzz",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Buzz" },
      { name: 'text', selector: "text=Buzz" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly upgrade = this.smart({
    key: 'web-index-php-recruitment-viewJobVacancy:upgrade',
    description: "Upgrade",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Upgrade" },
      { name: 'text', selector: "text=Upgrade" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly upgrade_2 = this.smart({
    key: 'web-index-php-recruitment-viewJobVacancy:upgrade_2',
    description: "Upgrade",
    strategies: [
      { name: 'role', selector: "button", accessibleName: "Upgrade" },
      { name: 'text', selector: "text=Upgrade" },
      { name: 'css', selector: "button[type=button]" },
    ],
  })

  readonly candidates = this.smart({
    key: 'web-index-php-recruitment-viewJobVacancy:candidates',
    description: "Candidates",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Candidates" },
      { name: 'text', selector: "text=Candidates" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly vacancies = this.smart({
    key: 'web-index-php-recruitment-viewJobVacancy:vacancies',
    description: "Vacancies",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Vacancies" },
      { name: 'text', selector: "text=Vacancies" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly reset = this.smart({
    key: 'web-index-php-recruitment-viewJobVacancy:reset',
    description: "Reset",
    strategies: [
      { name: 'role', selector: "button", accessibleName: "Reset" },
      { name: 'text', selector: "text=Reset" },
      { name: 'css', selector: "button[type=button]" },
    ],
  })

  readonly search_2 = this.smart({
    key: 'web-index-php-recruitment-viewJobVacancy:search_2',
    description: "Search",
    strategies: [
      { name: 'role', selector: "button", accessibleName: "Search" },
      { name: 'text', selector: "text=Search" },
      { name: 'css', selector: "button[type=submit]" },
    ],
  })

  readonly add = this.smart({
    key: 'web-index-php-recruitment-viewJobVacancy:add',
    description: "Add",
    strategies: [
      { name: 'role', selector: "button", accessibleName: "Add" },
      { name: 'text', selector: "text=Add" },
      { name: 'css', selector: "button[type=button]" },
    ],
  })

  readonly selectAllCheckbox = this.smart({
    key: 'web-index-php-recruitment-viewJobVacancy:unnamed-input-24',
    description: "unnamed-input-24",
    strategies: [
      { name: 'role', selector: "textbox" },
      { name: 'css', selector: "input[type=checkbox]" },
    ],
  })

  readonly vacancyRow1Checkbox = this.smart({
    key: 'web-index-php-recruitment-viewJobVacancy:unnamed-input-25',
    description: "unnamed-input-25",
    strategies: [
      { name: 'role', selector: "textbox" },
      { name: 'css', selector: "input[type=checkbox]" },
    ],
  })

  readonly vacancyRow2Checkbox = this.smart({
    key: 'web-index-php-recruitment-viewJobVacancy:unnamed-input-28',
    description: "unnamed-input-28",
    strategies: [
      { name: 'role', selector: "textbox" },
      { name: 'css', selector: "input[type=checkbox]" },
    ],
  })

  readonly vacancyRow3Checkbox = this.smart({
    key: 'web-index-php-recruitment-viewJobVacancy:unnamed-input-31',
    description: "unnamed-input-31",
    strategies: [
      { name: 'role', selector: "textbox" },
      { name: 'css', selector: "input[type=checkbox]" },
    ],
  })

  readonly vacancyRow4Checkbox = this.smart({
    key: 'web-index-php-recruitment-viewJobVacancy:unnamed-input-34',
    description: "unnamed-input-34",
    strategies: [
      { name: 'role', selector: "textbox" },
      { name: 'css', selector: "input[type=checkbox]" },
    ],
  })

  readonly vacancyRow5Checkbox = this.smart({
    key: 'web-index-php-recruitment-viewJobVacancy:unnamed-input-37',
    description: "unnamed-input-37",
    strategies: [
      { name: 'role', selector: "textbox" },
      { name: 'css', selector: "input[type=checkbox]" },
    ],
  })

  readonly selectJobVacancyCheckbox = this.smart({
    key: 'web-index-php-recruitment-viewJobVacancy:unnamed-input-40',
    description: "unnamed-input-40",
    strategies: [
      { name: 'role', selector: "textbox" },
      { name: 'css', selector: "input[type=checkbox]" },
    ],
  })

  readonly selectJobVacancyCheckboxAlt = this.smart({
    key: 'web-index-php-recruitment-viewJobVacancy:unnamed-input-43',
    description: "unnamed-input-43",
    strategies: [
      { name: 'role', selector: "textbox" },
      { name: 'css', selector: "input[type=checkbox]" },
    ],
  })

  readonly orangeHRMInc = this.smart({
    key: 'web-index-php-recruitment-viewJobVacancy:orangeHRMInc',
    description: "OrangeHRM, Inc",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "OrangeHRM, Inc" },
      { name: 'text', selector: "text=OrangeHRM, Inc" },
      { name: 'css', selector: "a" },
    ],
  })

  // ── Non-critical elements — plain locators ────────────────────────────────────────
  readonly addJobVacancyLink: Locator = this.page.locator("role=link")

  readonly searchButton: Locator = this.page.locator("role=none")

  readonly resetButton: Locator = this.page.locator("role=button")

  readonly deleteSelectedButton: Locator = this.page.locator("role=button")

  readonly editVacancyRow1Button: Locator = this.page.locator("role=button")

  readonly deleteVacancyRow1Button: Locator = this.page.locator("role=button")

  readonly editVacancyRow2Button: Locator = this.page.locator("role=button")

  readonly deleteVacancyRow2Button: Locator = this.page.locator("role=button")

  readonly editVacancyRow3Button: Locator = this.page.locator("role=button")

  readonly deleteVacancyRow3Button: Locator = this.page.locator("role=button")

  readonly editVacancyRow4Button: Locator = this.page.locator("role=button")

  readonly deleteVacancyRow4Button: Locator = this.page.locator("role=button")

  readonly editVacancyRow5Button: Locator = this.page.locator("role=button")

  readonly deleteVacancyRow5Button: Locator = this.page.locator("role=button")

  readonly editJobVacancyButton: Locator = this.page.locator("role=button")

  readonly deleteJobVacancyButton: Locator = this.page.locator("role=button")

  readonly editJobVacancyButtonAlt: Locator = this.page.locator("role=button")

  readonly deleteJobVacancyButtonAlt: Locator = this.page.locator("role=button")

  // ── Actions ────────────────────────────────────────────────────────────
  async submit(search: string): Promise<void> {
    await (await this.search.resolve({ assertionType: 'fill', expectedValue: search })).fill(search)
    await (await this.upgrade_2.resolve({ assertionType: 'click' })).click()
  }
}
