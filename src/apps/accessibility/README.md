# Accessibility
This directory is reserved for WCAG compliance and accessibility test assets.
Structure when populated:
  {appName}/
    tests/      ← Accessibility test specifications
    data/       ← WCAG rules and configurations
    generated/  ← Onboarder output
Onboard a new accessibility target:
  npm run onboard -- --app={appName} --platform=accessibility --type=wcag
