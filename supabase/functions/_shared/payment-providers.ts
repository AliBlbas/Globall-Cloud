export type PaymentProvider = 'qicard' | 'fib'
export type ProviderStatus = 'pending' | 'succeeded' | 'failed' | 'cancelled' | 'expired'
export type ProviderPayment = {
  provider: PaymentProvider
  providerRequestId?: string
  providerPaymentId?: string
  providerStatus?: string
  checkoutUrl?: string
  qrCode?: string
  readableCode?: string
  validUntil?: string
  amount?: number
  currency?: string
  raw: Record<string, unknown>
}

const jsonHeaders = { Accept: 'application/json', 'Content-Type': 'application/json' }
const timeoutSignal = (ms = 15000) => AbortSignal.timeout(ms)

const envRequired = (name: string) => {
  const value = Deno.env.get(name)?.trim()
  if (!value) throw new Error(`${name} is not configured`)
  return value
}

const baseUrlRequired = (name: string) => {
  const value = envRequired(name)
  if (!/^https:\/\//i.test(value)) throw new Error(`${name} must use HTTPS`)
  return value.replace(/\/$/, '')
}

const readJson = async (response: Response) => {
  const raw = await response.text()
  let body: Record<string, unknown> = {}
  try { body = raw ? JSON.parse(raw) : {} } catch { body = { raw: raw.slice(0, 1000) } }
  if (!response.ok) {
    const detail = typeof body.error === 'string' ? body.error : typeof body.message === 'string' ? body.message : `provider response ${response.status}`
    throw new Error(detail)
  }
  return body
}

const qicardAuth = () => {
  const username = envRequired('QICARD_USERNAME')
  const password = envRequired('QICARD_PASSWORD')
  return `Basic ${btoa(`${username}:${password}`)}`
}

const qicardHeaders = () => ({
  ...jsonHeaders,
  Authorization: qicardAuth(),
  'X-Terminal-Id': envRequired('QICARD_TERMINAL_ID'),
})

const qicardBase = () => baseUrlRequired('QICARD_API_BASE_URL')

export const qicardCreate = async (input: {
  requestId: string
  amount: number
  currency: string
  finishPaymentUrl: string
  notificationUrl: string
  description?: string
}): Promise<ProviderPayment> => {
  const response = await fetch(`${qicardBase()}/api/v1/payment`, {
    method: 'POST',
    headers: qicardHeaders(),
    signal: timeoutSignal(),
    body: JSON.stringify({
      requestId: input.requestId,
      amount: Number(input.amount.toFixed(3)),
      currency: input.currency,
      locale: 'en_US',
      finishPaymentUrl: input.finishPaymentUrl,
      notificationUrl: input.notificationUrl,
      additionalInfo: { globallPaymentSession: input.requestId, description: (input.description || '').slice(0, 120) },
      appChannel: false,
    }),
  })
  const body = await readJson(response)
  return {
    provider: 'qicard',
    providerRequestId: String(body.requestId || input.requestId),
    providerPaymentId: String(body.paymentId || ''),
    providerStatus: String(body.status || 'CREATED'),
    checkoutUrl: typeof body.formUrl === 'string' ? body.formUrl : undefined,
    amount: Number(body.amount ?? input.amount),
    currency: String(body.currency || input.currency),
    raw: body,
  }
}

export const qicardStatus = async (paymentId: string): Promise<ProviderPayment> => {
  const response = await fetch(`${qicardBase()}/api/v1/payment/${encodeURIComponent(paymentId)}/status`, {
    method: 'GET',
    headers: qicardHeaders(),
    signal: timeoutSignal(),
  })
  const body = await readJson(response)
  return {
    provider: 'qicard',
    providerRequestId: typeof body.requestId === 'string' ? body.requestId : undefined,
    providerPaymentId: paymentId,
    providerStatus: String(body.status || ''),
    amount: Number(body.amount || 0),
    currency: String(body.currency || ''),
    raw: body,
  }
}

export const qicardCancel = async (paymentId: string) => {
  const response = await fetch(`${qicardBase()}/api/v1/payment/${encodeURIComponent(paymentId)}/cancel`, {
    method: 'POST',
    headers: qicardHeaders(),
    signal: timeoutSignal(),
  })
  await readJson(response).catch((error) => { if (response.status !== 204) throw error })
}

let fibTokenCache: { token: string; expiresAt: number } | null = null
const fibBase = () => baseUrlRequired('FIB_API_BASE_URL')

const fibAccessToken = async () => {
  if (fibTokenCache && fibTokenCache.expiresAt > Date.now() + 10000) return fibTokenCache.token
  const clientId = envRequired('FIB_CLIENT_ID')
  const clientSecret = envRequired('FIB_CLIENT_SECRET')
  const form = new URLSearchParams({ grant_type: 'client_credentials', client_id: clientId, client_secret: clientSecret })
  const response = await fetch(`${fibBase()}/auth/realms/fib-online-shop/protocol/openid-connect/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body: form,
    signal: timeoutSignal(),
  })
  const body = await readJson(response)
  const token = String(body.access_token || '')
  if (!token) throw new Error('FIB access token was not returned')
  const expiresIn = Math.max(30, Number(body.expires_in || 60))
  fibTokenCache = { token, expiresAt: Date.now() + expiresIn * 1000 }
  return token
}

const fibHeaders = async () => ({ ...jsonHeaders, Authorization: `Bearer ${await fibAccessToken()}` })

export const fibCreate = async (input: {
  amount: number
  currency: string
  callbackUrl: string
  description?: string
}): Promise<ProviderPayment> => {
  const response = await fetch(`${fibBase()}/protected/v1/payments`, {
    method: 'POST',
    headers: await fibHeaders(),
    signal: timeoutSignal(),
    body: JSON.stringify({
      monetaryValue: { amount: input.amount.toFixed(2), currency: input.currency },
      statusCallbackUrl: input.callbackUrl,
      description: (input.description || 'Globall Cloud payment').slice(0, 50),
    }),
  })
  const body = await readJson(response)
  return {
    provider: 'fib',
    providerPaymentId: String(body.paymentId || ''),
    providerStatus: 'UNPAID',
    checkoutUrl: typeof body.personalAppLink === 'string' ? body.personalAppLink : typeof body.businessAppLink === 'string' ? body.businessAppLink : undefined,
    qrCode: typeof body.qrCode === 'string' ? body.qrCode : undefined,
    readableCode: typeof body.readableCode === 'string' ? body.readableCode : undefined,
    validUntil: typeof body.validUntil === 'string' ? body.validUntil : undefined,
    amount: input.amount,
    currency: input.currency,
    raw: body,
  }
}

export const fibStatus = async (paymentId: string): Promise<ProviderPayment> => {
  const response = await fetch(`${fibBase()}/protected/v1/payments/${encodeURIComponent(paymentId)}/status`, {
    method: 'GET',
    headers: await fibHeaders(),
    signal: timeoutSignal(),
  })
  const body = await readJson(response)
  const amountBody = body.amount && typeof body.amount === 'object' ? body.amount as Record<string, unknown> : {}
  return {
    provider: 'fib',
    providerPaymentId: paymentId,
    providerStatus: String(body.status || ''),
    amount: Number(amountBody.amount || 0),
    currency: String(amountBody.currency || ''),
    validUntil: typeof body.validUntil === 'string' ? body.validUntil : undefined,
    raw: body,
  }
}

export const fibCancel = async (paymentId: string) => {
  const response = await fetch(`${fibBase()}/protected/v1/payments/${encodeURIComponent(paymentId)}/cancel`, {
    method: 'POST',
    headers: await fibHeaders(),
    signal: timeoutSignal(),
  })
  if (!response.ok && response.status !== 204) await readJson(response)
}

export const createProviderPayment = (provider: PaymentProvider, input: {
  requestId: string
  amount: number
  currency: string
  finishPaymentUrl: string
  notificationUrl: string
  description?: string
}) => provider === 'qicard'
  ? qicardCreate(input)
  : fibCreate({ amount: input.amount, currency: input.currency, callbackUrl: input.notificationUrl, description: input.description })

export const getProviderPayment = (provider: PaymentProvider, paymentId: string) => provider === 'qicard' ? qicardStatus(paymentId) : fibStatus(paymentId)
export const cancelProviderPayment = (provider: PaymentProvider, paymentId: string) => provider === 'qicard' ? qicardCancel(paymentId) : fibCancel(paymentId)

export const normalizeProviderStatus = (provider: PaymentProvider, status: string): ProviderStatus => {
  const normalized = status.trim().toUpperCase()
  if (provider === 'qicard') {
    if (normalized === 'SUCCESS') return 'succeeded'
    if (normalized === 'FAILED' || normalized === 'AUTHENTICATION_FAILED') return 'failed'
    if (normalized === 'CANCELLED' || normalized === 'CANCELED') return 'cancelled'
    return 'pending'
  }
  if (normalized === 'PAID') return 'succeeded'
  if (normalized === 'DECLINED') return 'failed'
  if (normalized === 'CANCELLED' || normalized === 'CANCELED') return 'cancelled'
  return 'pending'
}
