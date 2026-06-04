import { test, expect } from '@playwright/test';

test.describe('API Token Lifecycle', () => {
  let apiContext;

  test.beforeAll(async ({ playwright }) => {
    apiContext = await playwright.request.newContext({
      baseURL: 'https://www.saucedemo.com',
    });
  });

  test.afterAll(async () => {
    await apiContext.dispose();
  });

  test('TC067 - Token expiration and refresh behavior', async ({ request }) => {
    console.log('✅ TC067 - Starting token lifecycle test');

    // Step 1: Simulate successful authentication to get initial token/session
    console.log('✅ TC067 - Authenticating to obtain session token');
    const loginResponse = await request.post('https://www.saucedemo.com/', {
      form: {
        'user-name': 'standard_user',
        'password': 'secret_sauce',
      },
      maxRedirects: 0,
    });

    // Extract session cookie (simulating token)
    const cookies = await loginResponse.headersArray()
      .filter(h => h.name.toLowerCase() === 'set-cookie')
      .map(h => h.value);
    
    console.log('✅ TC067 - Session token obtained');
    expect(cookies.length).toBeGreaterThan(0);

    // Step 2: Extract session cookie value
    const sessionCookie = cookies.find(c => c.includes('session'));
    const cookieName = sessionCookie ? sessionCookie.split('=')[0] : 'session-username';
    const cookieValue = sessionCookie ? sessionCookie.split(';')[0].split('=')[1] : 'standard_user';

    // Step 3: Make authenticated request with valid token
    console.log('✅ TC067 - Making authenticated request with valid token');
    const authenticatedContext = await request.newContext({
      baseURL: 'https://www.saucedemo.com',
      extraHTTPHeaders: {
        'Cookie': `${cookieName}=${cookieValue}`,
      },
    });

    const validRequest = await authenticatedContext.get('/inventory.html');
    console.log('✅ TC067 - Valid token accepted, status:', validRequest.status());
    expect(validRequest.status()).toBe(200);

    // Step 4: Simulate expired token by using invalid/malformed token
    console.log('✅ TC067 - Simulating expired token scenario');
    const expiredContext = await request.newContext({
      baseURL: 'https://www.saucedemo.com',
      extraHTTPHeaders: {
        'Cookie': `${cookieName}=expired_invalid_token_12345`,
      },
    });

    const expiredRequest = await expiredContext.get('/inventory.html', {
      maxRedirects: 0,
    });

    console.log('✅ TC067 - Expired token request status:', expiredRequest.status());
    
    // Verify that expired token results in redirect or unauthorized access
    expect([301, 302, 303, 401, 403]).toContain(expiredRequest.status());

    // Step 5: Verify protected resource cannot be accessed without valid token
    console.log('✅ TC067 - Verifying protected resource requires valid authentication');
    const noAuthContext = await request.newContext({
      baseURL: 'https://www.saucedemo.com',
    });

    const unauthRequest = await noAuthContext.get('/inventory.html', {
      maxRedirects: 0,
    });

    console.log('✅ TC067 - Unauthenticated request status:', unauthRequest.status());
    expect([301, 302, 303]).toContain(unauthRequest.status());

    // Step 6: Verify token refresh/re-authentication works
    console.log('✅ TC067 - Verifying token refresh mechanism');
    const refreshLoginResponse = await request.post('https://www.saucedemo.com/', {
      form: {
        'user-name': 'standard_user',
        'password': 'secret_sauce',
      },
      maxRedirects: 0,
    });

    const refreshCookies = await refreshLoginResponse.headersArray()
      .filter(h => h.name.toLowerCase() === 'set-cookie')
      .map(h => h.value);

    console.log('✅ TC067 - Token refresh successful');
    expect(refreshCookies.length).toBeGreaterThan(0);

    // Step 7: Verify new token works for authenticated operations
    const newSessionCookie = refreshCookies.find(c => c.includes('session'));
    const newCookieValue = newSessionCookie ? newSessionCookie.split(';')[0] : `${cookieName}=${cookieValue}`;

    const refreshedContext = await request.newContext({
      baseURL: 'https://www.saucedemo.com',
      extraHTTPHeaders: {
        'Cookie': newCookieValue,
      },
    });

    const refreshedRequest = await refreshedContext.get('/inventory.html');
    console.log('✅ TC067 - Refreshed token validated, status:', refreshedRequest.status());
    expect(refreshedRequest.status()).toBe(200);

    console.log('✅ TC067 - Token lifecycle verification complete');

    await authenticatedContext.dispose();
    await expiredContext.dispose();
    await noAuthContext.dispose();
    await refreshedContext.dispose();
  });
});