# Desktop / Batch
This directory is reserved for desktop batch and ETL test assets.
Structure when populated:
  {jobName}/
    tests/      ← Test specifications
    data/       ← Test data and fixtures
    generated/  ← Onboarder output
Onboard a new batch job:
  npm run onboard -- --app={jobName} --platform=desktop --type=batch
