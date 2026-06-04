import { test, expect } from '@playwright/test';

test.describe('API Authorization Tests', () => {
  const BASE_URL = 'https://restful-booker.herokuapp.com';
  let bookingId: number;

  test.beforeEach(async ({ request }) => {
    // Create a booking first to have an ID to delete
    const response = await request.post(`${BASE_URL}/booking`, {
      data: {
        firstname: 'Test',
        lastname: 'User',
        totalprice: 100,
        depositpaid: true,
        bookingdates: {
          checkin: '2024-01-01',
          checkout: '2024-01-02'
        },
        additionalneeds: 'Breakfast'
      }
    });
    const responseData = await response.json();
    bookingId = responseData.bookingid;
    console.log(`✅ TC063 - Created booking with ID: ${bookingId}`);
  });

  test('TC063 - DELETE operation without authorization token should be rejected', async ({ request }) => {
    console.log('✅ TC063 - Attempting DELETE without Authorization header');
    
    // Attempt to delete booking without Authorization header
    const deleteResponse = await request.delete(`${BASE_URL}/booking/${bookingId}`, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log(`✅ TC063 - DELETE response status: ${deleteResponse.status()}`);
    
    // Verify that the request is rejected with 403 Forbidden
    expect(deleteResponse.status()).toBe(403);
    console.log('✅ TC063 - Verified unauthorized DELETE returns 403 Forbidden');

    // Verify the booking still exists by attempting to retrieve it
    const getResponse = await request.get(`${BASE_URL}/booking/${bookingId}`);
    expect(getResponse.status()).toBe(200);
    console.log('✅ TC063 - Verified booking was not deleted and still exists');

    const bookingData = await getResponse.json();
    expect(bookingData.firstname).toBe('Test');
    expect(bookingData.lastname).toBe('User');
    console.log('✅ TC063 - Authorization enforcement on DELETE verified successfully');
  });
});
