// @generated from app-model.json v1.0.1 sha256:0022a49d108375f7
// DO NOT EDIT — regenerate with: npm run onboard:generate

import { test, expect } from '@playwright/test'
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
  let token:     string
  let bookingId: number

  test.beforeAll(async ({ request }) => {
    const client = new RestfulBookerApiClient('https://restful-booker.herokuapp.com', request)
    token = await client.createToken(adminCredentials)
  })

  test('should get all booking ids', async ({ request }) => {
    const client = new RestfulBookerApiClient('https://restful-booker.herokuapp.com', request)
    const ids = await client.getBookingIds()
    expect(Array.isArray(ids)).toBe(true)
  })

  test('should create a booking', async ({ request }) => {
    const client = new RestfulBookerApiClient('https://restful-booker.herokuapp.com', request)
    const res = await client.createBooking(newBooking)
    expect(res).toHaveProperty('bookingid')
    bookingId = res.bookingid
  })

  test('should get booking by id', async ({ request }) => {
    const client = new RestfulBookerApiClient('https://restful-booker.herokuapp.com', request)
    const res = await client.getBooking(String(bookingId))
    expect(res.firstname).toBe(newBooking.firstname)
  })

  test('should update a booking', async ({ request }) => {
    const client = new RestfulBookerApiClient('https://restful-booker.herokuapp.com', request)
    client['token'] = token
    const updated = { ...newBooking, firstname: 'UpdatedName' }
    const res = await client.updateBooking(String(bookingId), updated)
    expect(res.firstname).toBe('UpdatedName')
  })

  test('should partial update a booking', async ({ request }) => {
    const client = new RestfulBookerApiClient('https://restful-booker.herokuapp.com', request)
    client['token'] = token
    const res = await client.partialUpdateBooking(String(bookingId), { firstname: 'Updated' })
    expect(res.firstname).toBe('Updated')
  })

  test('should delete a booking', async ({ request }) => {
    const client = new RestfulBookerApiClient('https://restful-booker.herokuapp.com', request)
    client['token'] = token
    await client.deleteBooking(String(bookingId))
  })

  test('should return 404 for deleted booking', async ({ request }) => {
    const res = await request.get(`https://restful-booker.herokuapp.com/booking/${bookingId}`)
    expect(res.status()).toBe(404)
  })
})

test.describe('Health Check', () => {
  test('should return healthy status', async ({ request }) => {
    const res = await request.get(`https://restful-booker.herokuapp.com/ping`)
    expect(res.status()).toBe(201)
  })
})
