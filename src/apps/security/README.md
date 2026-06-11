# Security
This directory is reserved for security and penetration test assets.
Structure when populated:
  {targetName}/
    tests/      ← DAST and auth flow test specifications
    data/       ← Payloads and test vectors
    generated/  ← Onboarder output
Onboard a new security target:
  npm run onboard -- --app={targetName} --platform=security --type=dast
