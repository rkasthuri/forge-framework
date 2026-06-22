// @generated from app-model.json v1.0.21 sha256:9ab1f1a9e33a2f16
// DO NOT EDIT — regenerate with: npm run onboard:generate

import { Page, Locator } from '@playwright/test'
import { BasePage } from '../../pages/BasePage'

export class WebIndexPhpAdminNationalityPage extends BasePage {

  constructor(page: Page) {
    super(page)
  }

  // ── Abstract contract ────────────────────────────────────────────────────
  readonly pageUrl = "/web/index.php/admin/nationality"
  async isLoaded(): Promise<boolean> { return this.page.url().includes("/web/index.php/admin/nationality") }

  // ── Navigation ────────────────────────────────────────────────────────────
  async navigateTo(): Promise<void> {
    await this.page.goto("/web/index.php/admin/nationality")
  }



  // ── Non-critical elements — plain locators ────────────────────────────────────────
  readonly addNationalityLink: Locator = this.page.locator("role=link")

  readonly search: Locator = this.page.locator("role=textbox[name=\"Search\"]")

  readonly searchButton: Locator = this.page.locator("role=none")

  readonly admin: Locator = this.page.locator("role=link[name=\"Admin\"]")

  readonly pIM: Locator = this.page.locator("role=link[name=\"PIM\"]")

  readonly leave: Locator = this.page.locator("role=link[name=\"Leave\"]")

  readonly time: Locator = this.page.locator("role=link[name=\"Time\"]")

  readonly recruitment: Locator = this.page.locator("role=link[name=\"Recruitment\"]")

  readonly myInfo: Locator = this.page.locator("role=link[name=\"My Info\"]")

  readonly performance: Locator = this.page.locator("role=link[name=\"Performance\"]")

  readonly dashboard: Locator = this.page.locator("role=link[name=\"Dashboard\"]")

  readonly directory: Locator = this.page.locator("role=link[name=\"Directory\"]")

  readonly maintenance: Locator = this.page.locator("role=link[name=\"Maintenance\"]")

  readonly claim: Locator = this.page.locator("role=link[name=\"Claim\"]")

  readonly buzz: Locator = this.page.locator("role=link[name=\"Buzz\"]")

  readonly upgrade: Locator = this.page.locator("role=link[name=\"Upgrade\"]")

  readonly upgrade_2: Locator = this.page.locator("role=button[name=\"Upgrade\"]")

  readonly nationalities: Locator = this.page.locator("role=link[name=\"Nationalities\"]")

  readonly corporateBranding: Locator = this.page.locator("role=link[name=\"Corporate Branding\"]")

  readonly deleteSelectedButton: Locator = this.page.locator("role=button")

  readonly add: Locator = this.page.locator("role=button[name=\"Add\"]")

  readonly selectAllCheckbox: Locator = this.page.locator("role=textbox")

  readonly nationalityRow1Checkbox: Locator = this.page.locator("role=textbox")

  readonly editNationalityRow1Button: Locator = this.page.locator("role=button")

  readonly deleteNationalityRow1Button: Locator = this.page.locator("role=button")

  readonly nationalityRow2Checkbox: Locator = this.page.locator("role=textbox")

  readonly editNationalityRow2Button: Locator = this.page.locator("role=button")

  readonly deleteNationalityRow2Button: Locator = this.page.locator("role=button")

  readonly nationalityRow3Checkbox: Locator = this.page.locator("role=textbox")

  readonly editNationalityRow3Button: Locator = this.page.locator("role=button")

  readonly deleteNationalityRow3Button: Locator = this.page.locator("role=button")

  readonly nationalityRow4Checkbox: Locator = this.page.locator("role=textbox")

  readonly editNationalityRow4Button: Locator = this.page.locator("role=button")

  readonly deleteNationalityRow4Button: Locator = this.page.locator("role=button")

  readonly nationalityRow5Checkbox: Locator = this.page.locator("role=textbox")

  readonly editNationalityRow5Button: Locator = this.page.locator("role=button")

  readonly deleteNationalityRow5Button: Locator = this.page.locator("role=button")

  readonly nationalityRow6Checkbox: Locator = this.page.locator("role=textbox")

  readonly editNationalityButton1: Locator = this.page.locator("role=button")

  readonly deleteNationalityButton1: Locator = this.page.locator("role=button")

  readonly selectNationalityCheckbox1: Locator = this.page.locator("role=textbox")

  readonly editNationalityButton2: Locator = this.page.locator("role=button")

  readonly deleteNationalityButton2: Locator = this.page.locator("role=button")

  readonly selectNationalityCheckbox2: Locator = this.page.locator("role=textbox")

  readonly editNationalityButton3: Locator = this.page.locator("role=button")

  readonly deleteNationalityButton3: Locator = this.page.locator("role=button")

  readonly selectNationalityCheckbox3: Locator = this.page.locator("role=textbox")

  readonly editNationalityButton4: Locator = this.page.locator("role=button")

  readonly deleteNationalityButton4: Locator = this.page.locator("role=button")

  readonly selectNationalityCheckbox4: Locator = this.page.locator("role=textbox")

  readonly editNationalityButton5: Locator = this.page.locator("role=button")

  readonly deleteNationalityButton5: Locator = this.page.locator("role=button")

  readonly selectNationalityCheckbox5: Locator = this.page.locator("role=textbox")

  readonly editNationalityButton6: Locator = this.page.locator("role=button")

  readonly deleteNationalityButton6: Locator = this.page.locator("role=button")

  readonly selectNationalityCheckbox6: Locator = this.page.locator("role=textbox")

  readonly editNationalityButton7: Locator = this.page.locator("role=button")

  readonly deleteNationalityButton7: Locator = this.page.locator("role=button")

  readonly nationalityCheckbox1: Locator = this.page.locator("role=textbox")

  readonly nationalityEditButton1: Locator = this.page.locator("role=button")

  readonly nationalityDeleteButton1: Locator = this.page.locator("role=button")

  readonly nationalityCheckbox2: Locator = this.page.locator("role=textbox")

  readonly nationalityEditButton2: Locator = this.page.locator("role=button")

  readonly nationalityDeleteButton2: Locator = this.page.locator("role=button")

  readonly nationalityCheckbox3: Locator = this.page.locator("role=textbox")

  readonly nationalityEditButton3: Locator = this.page.locator("role=button")

  readonly nationalityDeleteButton3: Locator = this.page.locator("role=button")

  readonly nationalityCheckbox4: Locator = this.page.locator("role=textbox")

  readonly nationalityEditButton4: Locator = this.page.locator("role=button")

  readonly nationalityDeleteButton4: Locator = this.page.locator("role=button")

  readonly nationalityCheckbox5: Locator = this.page.locator("role=textbox")

  readonly nationalityEditButton5: Locator = this.page.locator("role=button")

  readonly nationalityDeleteButton5: Locator = this.page.locator("role=button")

  readonly nationalityCheckbox6: Locator = this.page.locator("role=textbox")

  readonly nationalityEditButton6: Locator = this.page.locator("role=button")

  readonly nationalityDeleteButton6: Locator = this.page.locator("role=button")

  readonly nationalityCheckbox7: Locator = this.page.locator("role=textbox")

  readonly nationalityEditButton7: Locator = this.page.locator("role=button")

  readonly nationalityRowEditButton60: Locator = this.page.locator("role=button")

  readonly nationalityRowCheckbox61: Locator = this.page.locator("role=textbox")

  readonly nationalityRowDeleteButton62: Locator = this.page.locator("role=button")

  readonly nationalityRowEditButton63: Locator = this.page.locator("role=button")

  readonly nationalityRowCheckbox64: Locator = this.page.locator("role=textbox")

  readonly nationalityRowDeleteButton65: Locator = this.page.locator("role=button")

  readonly nationalityRowEditButton66: Locator = this.page.locator("role=button")

  readonly nationalityRowCheckbox67: Locator = this.page.locator("role=textbox")

  readonly nationalityRowDeleteButton68: Locator = this.page.locator("role=button")

  readonly nationalityRowEditButton69: Locator = this.page.locator("role=button")

  readonly nationalityRowCheckbox70: Locator = this.page.locator("role=textbox")

  readonly nationalityRowDeleteButton71: Locator = this.page.locator("role=button")

  readonly nationalityRowEditButton72: Locator = this.page.locator("role=button")

  readonly nationalityRowCheckbox73: Locator = this.page.locator("role=textbox")

  readonly nationalityRowDeleteButton74: Locator = this.page.locator("role=button")

  readonly nationalityRowEditButton75: Locator = this.page.locator("role=button")

  readonly nationalityRowCheckbox76: Locator = this.page.locator("role=textbox")

  readonly nationalityRowDeleteButton77: Locator = this.page.locator("role=button")

  readonly nationalityRowEditButton78: Locator = this.page.locator("role=button")

  readonly nationalityRowCheckbox79: Locator = this.page.locator("role=textbox")

  readonly addNationalityButton: Locator = this.page.locator("role=button")

  readonly saveNationalityButton: Locator = this.page.locator("role=button")

}
