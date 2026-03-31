import type { AuthResponse } from '../types'

const AUTH_STORAGE_KEY = 'finops-expense.auth'

export function loadStoredAuth() {
  const raw = localStorage.getItem(AUTH_STORAGE_KEY)

  if (!raw) {
    return null
  }

  try {
    return JSON.parse(raw) as AuthResponse
  } catch {
    localStorage.removeItem(AUTH_STORAGE_KEY)
    return null
  }
}

export function saveStoredAuth(auth: AuthResponse | null) {
  if (!auth) {
    localStorage.removeItem(AUTH_STORAGE_KEY)
    return
  }

  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(auth))
}