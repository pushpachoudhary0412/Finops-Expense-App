import type { AuthResponse, Category, Expense, ExpenseListResponse } from '../types'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5012'

type RequestOptions = {
  method?: string
  token?: string
  body?: unknown
}

export class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

async function parseError(response: Response) {
  const raw = await response.text()

  if (!raw) {
    return response.statusText || 'Request failed'
  }

  try {
    const parsed = JSON.parse(raw) as { message?: string; Message?: string; title?: string }
    return parsed.message ?? parsed.Message ?? parsed.title ?? raw
  } catch {
    return raw
  }
}

async function request<T>(path: string, options: RequestOptions = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? 'GET',
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  })

  if (!response.ok) {
    throw new ApiError(await parseError(response), response.status)
  }

  if (response.status === 204) {
    return undefined as T
  }

  return (await response.json()) as T
}

export const api = {
  baseUrl: API_BASE_URL,
  register: (payload: { email: string; password: string; fullName: string }) =>
    request<AuthResponse>('/auth/register', { method: 'POST', body: payload }),
  login: (payload: { email: string; password: string }) =>
    request<AuthResponse>('/auth/login', { method: 'POST', body: payload }),
  getCategories: (token: string) => request<Category[]>('/categories', { token }),
  createCategory: (token: string, payload: { name: string }) =>
    request<Category>('/categories', { method: 'POST', token, body: payload }),
  getExpenses: (token: string) => request<ExpenseListResponse>('/expenses?page=1&pageSize=20', { token }),
  createExpense: (
    token: string,
    payload: { categoryId: string; amount: number; description: string; expenseDateUtc: string },
  ) => request<Expense>('/expenses', { method: 'POST', token, body: payload }),
}