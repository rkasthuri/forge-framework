# TD-065 — Heal-correctness eval harness

Validates TD-065 Tier 1+2 heal correctness on **real SauceDemo selectors in a real
browser**. Closes TD-065b: the heal-store previously held only synthetic fixtures,
so the Heal → Learn loop was never exercised in production. This harness proves the
correctness machinery on genuine broken/healed selectors.

## Run

```
npx tsx --test experiments/td-065-healing/harness.ts
```

Requires: Playwright chromium installed, network access to `https://www.saucedemo.com`.
It is **not** part of the CI `test:unit` gate (that gate is fast, browser-free) — this
is an on-demand eval, like `experiments/td-063-taxonomy/`. Runs against a throwaway
DB + heal-store (never touches the real `reports/heal-store.json`).

## What each scenario proves

| Scenario | Setup | Proves |
|---|---|---|
| **S1 healthy** | primary `[data-test="login-button"]` resolves | no heal fires → no heal event / no DB row |
| **S2 verified** (smoking gun) | broken primary → `#login-button` (id) fallback + `toBeVisible` context | heal + post-heal re-assert passes → `assertion-verified` / `observed` |
| **S3 rejected** (smoking gun) | broken primary → `.login_logo` fallback (visible but WRONG element) + `toHaveText:'Add to cart'` context | fallback resolves but the assertion fails → `resolvability-only` / `unknown` — **a wrong-but-visible element no longer records green** |
| **S4 unverified** | broken primary → id fallback, NO assertionContext | honest default for un-threaded callers → `unverified` / `unknown` |
| **S5 vision** | all strategies broken (escalates to Vision) | if a Claude API key is present, a vision heal records the **model-returned** confidence (not the `-1` sentinel); skipped otherwise |

S3 is the core TD-065 proof: before TD-065, any selector that resolved to a visible
element recorded a successful (green) heal, regardless of whether it was the *correct*
element. Now correctness is re-verified against the original assertion, so a fallback
that lands on the wrong element is recorded `resolvability-only` / `unknown` instead of
a fabricated success.
