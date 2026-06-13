import { OnboardingConfig } from '../../../../core/onboarding/types'

const config: OnboardingConfig = {
  app: {
    name:    'orangehrm',
    baseUrl: 'https://opensource-demo.orangehrmlive.com',
    appType: 'web-ui',
  },
  appType: 'web-ui',
  roles: [
    {
      id:                'adminUser',
      displayName:       'Admin',
      authFlow:          'form-login',
      credentialsEnvKey: 'ORANGEHRM_ADMIN_CREDENTIALS',
    },
    {
      id:                'employeeUser',
      displayName:       'Employee',
      authFlow:          'form-login',
      credentialsEnvKey: 'ORANGEHRM_EMPLOYEE_CREDENTIALS',
    },
  ],
  flows: [
    {
      id:          'admin-login',
      hint:        'Admin logs in and lands on dashboard',
      startPageId: 'auth/login',
      roleId:      'adminUser',
    },
    {
      id:          'employee-login',
      hint:        'Employee logs in and lands on dashboard',
      startPageId: 'auth/login',
      roleId:      'employeeUser',
    },
  ],
  budgets: {
    maxPages: 30,
    maxDepth: 3,
    aiCalls:  30,
  },
}

export default config
