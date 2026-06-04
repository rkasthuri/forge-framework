import { test, expect } from '@playwright/test';

test.describe('API - Update Booking by Non-Existent ID', () => {
  const baseURL = 'https://restful-booker.herokuapp.com';
  const nonExistentBookingId = 99999;

  test('TC065 - Update booking by ID that does not exist returns appropriate error', async ({ request }) => {
    console.log('✅ TC065 - Starting test: Update non-existent booking');

    const updatePayload = {
      firstname: 'John',
      lastname: 'Doe',
      totalprice: 150,
      depositpaid: true,
      bookingdates: {
        checkin: '2024-01-01',
        checkout: '2024-01-05'
      },
      additionalneeds: 'Breakfast'
    };

    console.log(`✅ TC065 - Attempting PUT request to /booking/${nonExistentBookingId}`);

    const response = await request.put(`${baseURL}/booking/${nonExistentBookingId}`, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': 'Basic YWRtaW46cGFzc3dvcmQxMjM='
      },
      data: updatePayload
    });

    console.log(`✅ TC065 - Received response with status: ${response.status()}`);

    expect(response.status()).toBeGreaterThanOrEqual(400);
    expect([404, 405, 500].includes(response.status())).toBeTruthy();

    console.log('✅ TC065 - Verified error response status code is in expected range');

    const responseBody = await response.text();
    console.log(`✅ TC065 - Response body length: ${responseBody.length}`);

    if (response.status() === 405) {
      console.log('✅ TC065 - Received 405 Method Not Allowed - expected for non-existent resource');
    } else if (response.status() === 404) {
      console.log('✅ TC065 - Received 404 Not Found - expected for non-existent resource');
    }

    console.log('✅ TC065 - Test completed: Update non-existent booking handled correctly');
  });
});
