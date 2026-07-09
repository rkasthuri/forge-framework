/**
 * Client-side app-name derivation for the Onboard form auto-fill. Mirrors the
 * engine's deriveAppName (Bootstrap.ts): strip `www.`, take the registrable
 * second-level label, lowercase, alphanumeric only.
 *   https://www.saucedemo.com                    → saucedemo
 *   https://opensource-demo.orangehrmlive.com    → orangehrmlive
 */
export function deriveAppName(url: string): string {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '')
    const parts = host.split('.')
    const label = parts.length > 1 ? parts[parts.length - 2] : parts[0]
    return label.toLowerCase().replace(/[^a-z0-9]/g, '')
  } catch {
    return ''
  }
}
