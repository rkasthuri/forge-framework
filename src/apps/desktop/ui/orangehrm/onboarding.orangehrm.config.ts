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
      credentialsEnvKey: 'ORANGEHRM_ADMINUSER_CREDENTIALS',
      loginUrl:          'https://opensource-demo.orangehrmlive.com/web/index.php/auth/login',
      selectors: {
        username: 'input[name=username]',
        password: 'input[name=password]',
        submit:   '.orangehrm-login-button',
      },
      successUrl: '/web/index.php/dashboard/index',
    },
  ],
  flows: [
    {
      id:          'admin-login',
      hint:        'Admin logs in and lands on dashboard',
      startPageId: 'auth/login',
      roleId:      'adminUser',
    },
  ],
  budgets: {
    maxPages: 30,
    maxDepth: 3,
    aiCalls:  30,
  },
}

export default config
