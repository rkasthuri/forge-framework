// @generated from app-model.json v1.0.2 sha256:0022a49d108375f7
// DO NOT EDIT — regenerate with: npm run onboard:generate

import { APIRequestContext } from '@playwright/test'

export interface CreateTokenRequest {
  username: string
  password: string
}

export interface CreateTokenResponse {
  token: string
}

export interface CreateBookingRequest {
  firstname:       string
  lastname:        string
  totalprice:      number
  depositpaid:     boolean
  bookingdates:    { checkin: string; checkout: string }
  additionalneeds: string
}

export interface CreateBookingResponse {
  bookingid: number
  booking:   CreateBookingRequest
}

export interface UpdateBookingRequest {
  firstname:       string
  lastname:        string
  totalprice:      number
  depositpaid:     boolean
  bookingdates:    { checkin: string; checkout: string }
  additionalneeds: string
}

export interface PartialUpdateBookingRequest {
  firstname?: string
  lastname?: string
  totalprice?: number
}

export class RestfulBookerApiClient {

  private token: string = ''

  constructor(
    private baseUrl: string,
    private request: APIRequestContext
  ) {}

  async createToken(body: CreateTokenRequest): Promise<string> {
    const res = await this.request.post(`${this.baseUrl}/auth`, {
      data: body,
    })
    const data = await res.json()
    this.token = data.token
    return data.token
  }

  async getBookingIds(): Promise<any> {
    const res = await this.request.get(`${this.baseUrl}/booking`)
    return res.json()
  }

  async getBooking(id: string): Promise<any> {
    const res = await this.request.get(`${this.baseUrl}/booking/${id}`)
    return res.json()
  }

  async createBooking(body: CreateBookingRequest): Promise<CreateBookingResponse> {
    const res = await this.request.post(`${this.baseUrl}/booking`, {
      data: body,
    })
    return res.json()
  }

  async updateBooking(id: string, body: UpdateBookingRequest): Promise<UpdateBookingRequest> {
    const res = await this.request.put(`${this.baseUrl}/booking/${id}`, {
      headers: { Cookie: `token=${this.token}` },
      data: body,
    })
    return res.json()
  }

  async partialUpdateBooking(id: string, body: PartialUpdateBookingRequest): Promise<PartialUpdateBookingRequest> {
    const res = await this.request.patch(`${this.baseUrl}/booking/${id}`, {
      headers: { Cookie: `token=${this.token}` },
      data: body,
    })
    return res.json()
  }

  async deleteBooking(id: string): Promise<void> {
    await this.request.delete(`${this.baseUrl}/booking/${id}`, {
      headers: { Cookie: `token=${this.token}` },
    })
  }

  async healthCheck(): Promise<any> {
    const res = await this.request.get(`${this.baseUrl}/ping`)
    return res.json()
  }
}
