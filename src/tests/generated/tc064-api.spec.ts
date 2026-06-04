import { test, expect } from '@playwright/test';

test.describe('API - Invalid Booking Payload Validation', () => {
  const BASE_URL = 'https://restful-booker.herokuapp.com';

  test('TC064 - Create booking with invalid/malformed payload data', async ({ request }) => {
    console.log('✅ TC064 - Testing API with missing required fields');

    // Test 1: Missing firstname
    const payloadMissingFirstname = {
      lastname: 'Brown',
      totalprice: 111,
      depositpaid: true,
      bookingdates: {
        checkin: '2024-01-01',
        checkout: '2024-01-02'
      },
      additionalneeds: 'Breakfast'
    };

    const responseMissingFirstname = await request.post(`${BASE_URL}/booking`, {
      data: payloadMissingFirstname,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ TC064 - Verified response for missing firstname field');
    expect([400, 500].includes(responseMissingFirstname.status())).toBeTruthy();

    // Test 2: Missing bookingdates
    const payloadMissingDates = {
      firstname: 'Jim',
      lastname: 'Brown',
      totalprice: 111,
      depositpaid: true,
      additionalneeds: 'Breakfast'
    };

    const responseMissingDates = await request.post(`${BASE_URL}/booking`, {
      data: payloadMissingDates,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ TC064 - Verified response for missing bookingdates field');
    expect([400, 500].includes(responseMissingDates.status())).toBeTruthy();

    // Test 3: Invalid data type for totalprice
    const payloadInvalidType = {
      firstname: 'Jim',
      lastname: 'Brown',
      totalprice: 'invalid_string',
      depositpaid: true,
      bookingdates: {
        checkin: '2024-01-01',
        checkout: '2024-01-02'
      }
    };

    const responseInvalidType = await request.post(`${BASE_URL}/booking`, {
      data: payloadInvalidType,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ TC064 - Verified response for invalid data type');
    expect([400, 500].includes(responseInvalidType.status())).toBeTruthy();

    // Test 4: Completely empty payload
    const responseEmptyPayload = await request.post(`${BASE_URL}/booking`, {
      data: {},
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ TC064 - Verified response for empty payload');
    expect([400, 500].includes(responseEmptyPayload.status())).toBeTruthy();

    console.log('✅ TC064 - All invalid payload scenarios validated successfully');
  });
});