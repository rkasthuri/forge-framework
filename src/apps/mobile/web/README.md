# Mobile / Web
This directory is reserved for mobile browser (responsive) test assets.
Structure when populated:
  {appName}/
    tests/      ← Test specifications
    fixtures/   ← User contexts and roles
    data/       ← Test data
    generated/  ← Onboarder output
Onboard a new mobile web app:
  npm run onboard -- --app={appName} --platform=mobile --type=web
