// @generated from app-model.json v1.0.1 sha256:0022a49d108375f7
// DO NOT EDIT — regenerate with: npm run onboard:generate

import * as dotenv from 'dotenv'
dotenv.config()

import type { CreateBookingRequest, CreateTokenRequest } from './ApiClient'

export const newBooking: CreateBookingRequest = {
  firstname:       'John',
  lastname:        'Doe',
  totalprice:      100,
  depositpaid:     true,
  bookingdates:    { checkin: '2026-01-01', checkout: '2026-01-10' },
  additionalneeds: 'None',
}

export const adminCredentials: CreateTokenRequest = {
  username: process.env.BOOKER_CREDENTIALS?.split(':')[0] ?? '',
  password: process.env.BOOKER_CREDENTIALS?.split(':')[1] ?? '',
}
