# Cloud / API Gateway
This directory is reserved for cloud API gateway and microservice test assets.
Structure when populated:
  {serviceName}/
    tests/      ← Test specifications
    fixtures/   ← Auth contexts
    data/       ← Request/response fixtures
    generated/  ← Onboarder output
Onboard a new cloud service:
  npm run onboard -- --app={serviceName} --platform=cloud --type=api-gateway
