export type AuthMode = 'login' | 'register'

export interface AuthSession {
  id?: number | null
  username: string
  email: string
  token: string
}

export type AuthField = 'username' | 'email' | 'password'
export type AuthFieldErrors = Partial<Record<AuthField, string>>

export class AuthApiError extends Error {
  readonly fieldErrors: AuthFieldErrors

  constructor(message: string, fieldErrors: AuthFieldErrors = {}) {
    super(message)
    this.name = 'AuthApiError'
    this.fieldErrors = fieldErrors
  }
}

interface AuthCredentials {
  username: string
  email: string
  password: string
}

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080').replace(/\/+$/, '')

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function getFieldErrors(payload: unknown): AuthFieldErrors {
  if (!isRecord(payload) || !isRecord(payload.fieldErrors)) return {}

  const fieldErrors: AuthFieldErrors = {}
  for (const field of ['username', 'email', 'password'] as const) {
    const value = payload.fieldErrors[field]
    if (typeof value === 'string' && value.trim()) fieldErrors[field] = value
  }
  return fieldErrors
}

function getErrorMessage(payload: unknown, fieldErrors: AuthFieldErrors, fallback: string): string {
  if (isRecord(payload)) {
    if (typeof payload.message === 'string' && payload.message.trim()) return payload.message

    for (const field of ['username', 'email', 'password'] as const) {
      if (fieldErrors[field]) return fieldErrors[field]
    }
  }

  return fallback
}

export async function authenticate(mode: AuthMode, credentials: AuthCredentials): Promise<AuthSession> {
  const isRegistration = mode === 'register'
  let response: Response
  try {
    response = await fetch(`${API_BASE_URL}/api/auth/${isRegistration ? 'register' : 'login'}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(isRegistration
        ? { username: credentials.username, email: credentials.email, password: credentials.password }
        : { email: credentials.email, password: credentials.password }),
    })
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error('We couldn’t reach MyMemories. Check that the backend is running and try again.', { cause: error })
    }
    throw error
  }

  const responseText = await response.text()
  let payload: unknown = null
  if (responseText) {
    try {
      payload = JSON.parse(responseText)
    } catch {
      if (response.ok) throw new Error('The server returned an unreadable response. Please try again.')
    }
  }

  if (!response.ok) {
    const fallback = response.status === 401
      ? 'That email and password combination doesn’t look right.'
      : 'We couldn’t complete your request. Please try again.'
    const fieldErrors = getFieldErrors(payload)
    throw new AuthApiError(getErrorMessage(payload, fieldErrors, fallback), fieldErrors)
  }

  if (!isRecord(payload) || typeof payload.token !== 'string' || !payload.token) {
    throw new Error('The server response was missing your sign-in token. Please try again.')
  }

  return {
    id: typeof payload.id === 'number' ? payload.id : null,
    username: typeof payload.username === 'string' && payload.username
      ? payload.username
      : credentials.username || credentials.email.split('@')[0],
    email: typeof payload.email === 'string' && payload.email ? payload.email : credentials.email,
    token: payload.token,
  }
}
