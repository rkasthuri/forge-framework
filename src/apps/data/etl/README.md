# Data / ETL
This directory is reserved for data pipeline and ETL validation test assets.
Structure when populated:
  {pipelineName}/
    tests/      ← Test specifications
    data/       ← Input/output datasets
    generated/  ← Onboarder output
Onboard a new data pipeline:
  npm run onboard -- --app={pipelineName} --platform=data --type=etl
