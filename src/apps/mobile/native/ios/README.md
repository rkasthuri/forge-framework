# Mobile / Native / iOS
This directory is reserved for iOS native app test assets.
Structure when populated:
  {appName}/
    tests/      ← Test specifications
    fixtures/   ← Device contexts and roles
    data/       ← Test data
    generated/  ← Onboarder output
Onboard a new iOS app:
  npm run onboard -- --app={appName} --platform=mobile --type=ios
