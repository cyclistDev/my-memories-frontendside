export type AuthMode = 'login' | 'register'

export interface AuthSession {
  id?: number | null
  username: string
  email: string
  token: string
}

export type AuthField = 'username' | 'email' | 'password'
export type AuthFieldErrors = Partial<Record<AuthField, string>>

export interface Memory {
  id: number
  title: string
  content: string | null
  memoryDate: string
  createdAt: string
  updatedAt: string
  tags: string[]
}

export interface MemoryPage {
  content: Memory[]
  number: number
  size: number
  totalElements: number
  totalPages: number
}

export interface MemoryFilters {
  q?: string
  from?: string
  to?: string
  tag?: string
  page?: number
  size?: number
  sort?: string[]
  signal?: AbortSignal
}

export interface MemoryInput {
  title: string
  content: string
  memoryDate: string
  tags: string[]
}

export interface MemoryTag {
  name: string
  memoryCount: number
}

export class ApiError extends Error {
  readonly fieldErrors: AuthFieldErrors
  readonly status: number

  constructor(message: string, status: number, fieldErrors: AuthFieldErrors = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
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

function getErrorMessage(payload: unknown, fallback: string): string {
  if (isRecord(payload) && typeof payload.message === 'string' && payload.message.trim()) {
    return payload.message
  }
  return fallback
}

async function request<T>(
  path: string,
  options: {
    token?: string
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
    body?: unknown
    signal?: AbortSignal
  } = {},
): Promise<T> {
  const headers = new Headers()
  if (options.body !== undefined) headers.set('Content-Type', 'application/json')
  if (options.token) headers.set('Authorization', `Bearer ${options.token}`)

  let response: Response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: options.method ?? 'GET',
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: options.signal,
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
      ? 'Your session has expired. Please log in again.'
      : 'We couldn’t complete your request. Please try again.'
    throw new ApiError(getErrorMessage(payload, fallback), response.status, getFieldErrors(payload))
  }

  return payload as T
}

function parseMemory(value: unknown): Memory {
  if (
    !isRecord(value) ||
    typeof value.id !== 'number' ||
    typeof value.title !== 'string' ||
    (typeof value.content !== 'string' && value.content !== null) ||
    typeof value.memoryDate !== 'string' ||
    typeof value.createdAt !== 'string' ||
    typeof value.updatedAt !== 'string' ||
    (value.tags !== undefined && (!Array.isArray(value.tags) || !value.tags.every((tag) => typeof tag === 'string')))
  ) {
    throw new Error('The server returned a memory in an unexpected format.')
  }

  return {
    id: value.id,
    title: value.title,
    content: value.content,
    memoryDate: value.memoryDate,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
    tags: Array.isArray(value.tags) ? value.tags : [],
  }
}

export async function authenticate(mode: AuthMode, credentials: AuthCredentials): Promise<AuthSession> {
  const isRegistration = mode === 'register'
  const payload: unknown = await request(
    `/api/auth/${isRegistration ? 'register' : 'login'}`,
    {
      method: 'POST',
      body: isRegistration
        ? { username: credentials.username, email: credentials.email, password: credentials.password }
        : { email: credentials.email, password: credentials.password },
    },
  )

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

export async function getMemories(token: string, filters: MemoryFilters = {}): Promise<MemoryPage> {
  const query = new URLSearchParams()
  if (filters.q) query.set('q', filters.q)
  if (filters.from) query.set('from', filters.from)
  if (filters.to) query.set('to', filters.to)
  if (filters.tag) query.append('tag', filters.tag)
  query.set('page', String(filters.page ?? 0))
  query.set('size', String(filters.size ?? 12))
  for (const sort of filters.sort ?? ['memoryDate,desc', 'createdAt,desc']) {
    query.append('sort', sort)
  }

  const payload: unknown = await request(`/api/memories?${query}`, { token, signal: filters.signal })
  if (
    !isRecord(payload) ||
    !Array.isArray(payload.content) ||
    typeof payload.number !== 'number' ||
    typeof payload.size !== 'number' ||
    typeof payload.totalElements !== 'number' ||
    typeof payload.totalPages !== 'number'
  ) {
    throw new Error('The server returned the memory list in an unexpected format.')
  }

  return {
    content: payload.content.map(parseMemory),
    number: payload.number,
    size: payload.size,
    totalElements: payload.totalElements,
    totalPages: payload.totalPages,
  }
}

export async function createMemory(token: string, memory: MemoryInput): Promise<Memory> {
  return parseMemory(await request('/api/memories', { token, method: 'POST', body: memory }))
}

export async function updateMemory(token: string, id: number, memory: MemoryInput): Promise<Memory> {
  return parseMemory(await request(`/api/memories/${id}`, { token, method: 'PUT', body: memory }))
}

export async function deleteMemory(token: string, id: number): Promise<void> {
  await request(`/api/memories/${id}`, { token, method: 'DELETE' })
}

export async function getTags(token: string, signal?: AbortSignal): Promise<MemoryTag[]> {
  const payload: unknown = await request('/api/tags', { token, signal })
  if (!Array.isArray(payload)) {
    throw new Error('The server returned the tags in an unexpected format.')
  }

  return payload.map((tag) => {
    if (!isRecord(tag) || typeof tag.name !== 'string' || typeof tag.memoryCount !== 'number') {
      throw new Error('The server returned the tags in an unexpected format.')
    }
    return { name: tag.name, memoryCount: tag.memoryCount }
  })
}
