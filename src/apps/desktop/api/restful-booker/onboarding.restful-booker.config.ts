import { OnboardingConfig } from '../../../../core/onboarding/types'

const config: OnboardingConfig = {
  app: {
    name:    'restful-booker',
    baseUrl: 'https://restful-booker.herokuapp.com',
    appType: 'api',
  },
  roles: [
    {
      id:                'adminUser',
      displayName:       'Admin User',
      authFlow:          'form-login',
      credentialsEnvKey: 'BOOKER_CREDENTIALS',
    },
    {
      id:          'guestUser',
      displayName: 'Guest',
      authFlow:    'none',
    },
  ],
  flows: [
    {
      id:          'create-booking',
      hint:        'Create a new booking and verify it appears in the booking list',
      startPageId: 'booking',
      roleId:      'guestUser',
    },
    {
      id:          'auth-and-update',
      hint:        'Authenticate then update an existing booking',
      startPageId: 'auth',
      roleId:      'adminUser',
    },
  ],
  budgets: {
    maxPages: 20,
    maxDepth: 3,
    aiCalls:  20,
  },
}

export default config
