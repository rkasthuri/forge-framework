# Mobile / Native / Android
This directory is reserved for Android native app test assets.
Structure when populated:
  {appName}/
    tests/      ← Test specifications
    fixtures/   ← Device contexts and roles
    data/       ← Test data
    generated/  ← Onboarder output
Onboard a new Android app:
  npm run onboard -- --app={appName} --platform=mobile --type=android
