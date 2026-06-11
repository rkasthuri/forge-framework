# IoT / Embedded
This directory is reserved for IoT device and embedded system test assets.
Structure when populated:
  {deviceName}/
    tests/      ← Test specifications
    data/       ← Device configs and test data
    generated/  ← Onboarder output
Onboard a new IoT target:
  npm run onboard -- --app={deviceName} --platform=iot --type=embedded
