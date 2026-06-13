// @generated from app-model.json v1.0.1 sha256:0022a49d108375f7
// DO NOT EDIT â regenerate with: npm run onboard:generate

import { test, expect, request as playwrightRequest, APIRequestContext } from '@playwright/test'
import { RestfulBookerApiClient } from './ApiClient'
import { newBooking, adminCredentials } from './fixtures'

test.describe('Authentication', () => {
  test('should create auth token with valid credentials', async ({ request }) => {
    const client = new RestfulBookerApiClient('https://restful-booker.herokuapp.com', request)
    const token  = await client.createToken(adminCredentials)
    expect(token).toBeTruthy()
    expect(typeof token).toBe('string')
  })
})

test.describe('Booking CRUD', () => {
  test.describe.configure({ mode: 'serial' })

  let apiContext: APIRequestContext
  let client:     RestfulBookerApiClient
  let bookingId:  number

  test.beforeAll(async () => {
    apiContext = await playwrightRequest.newContext({ baseURL: 'https://restful-booker.herokuapp.com' })
    client = new RestfulBookerApiClient('https://restful-booker.herokuapp.com', apiContext)
    await client.createToken(adminCredentials)
  })

  test.afterAll(async () => {
    await apiContext.dispose()
  })

  test('should get all booking ids', async () => {
    const ids = await client.getBookingIds()
    expect(Array.isArray(ids)).toBe(true)
  })

  test('should create a booking', async () => {
    const res = await client.createBooking(newBooking)
    expect(res).toHaveProperty('bookingid')
    bookingId = res.bookingid
  })

  test('should get booking by id', async () => {
    const res = await client.getBooking(String(bookingId))
    expect(res.firstname).toBe(newBooking.firstname)
  })

  test('should update a booking', async () => {
    const updated = { ...newBooking, firstname: 'UpdatedName' }
    const res = await client.updateBooking(String(bookingId), updated)
    expect(res.firstname).toBe('UpdatedName')
  })

  test('should partial update a booking', async () => {
    const res = await client.partialUpdateBooking(String(bookingId), { firstname: 'Updated' })
    expect(res.firstname).toBe('Updated')
  })

  test('should delete a booking', async () => {
    await client.deleteBooking(String(bookingId))
  })

  test('should return 404 for deleted booking', async () => {
    const res = await apiContext.get(`/booking/${bookingId}`)
    expect(res.status()).toBe(404)
  })
})

test.describe('Health Check', () => {
  test('should return healthy status', async ({ request }) => {
    const res = await request.get('https://restful-booker.herokuapp.com/ping')
    expect(res.status()).toBe(201)
  })
})
