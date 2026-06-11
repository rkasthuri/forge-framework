# Performance
This directory is reserved for load, stress, and performance test assets.
Structure when populated:
  {targetName}/
    tests/      ← Load test specifications
    data/       ← Test scenarios and thresholds
    generated/  ← Onboarder output
Onboard a new performance target:
  npm run onboard -- --app={targetName} --platform=performance --type=load
