import { useState } from 'react'
import type { FormEvent } from 'react'
import './App.css'

type AuthResponse = {
  userId: string
  email: string
  fullName: string
  accessToken: string
}

type Category = {
  id: string
  name: string
  createdAtUtc: string
}

type Expense = {
  id: string
  categoryId: string
  categoryName: string
  amount: number
  description: string
  expenseDateUtc: string
  createdAtUtc: string
}

type ExpenseListResponse = {
  page: number
  pageSize: number
  totalCount: number
  items: Expense[]
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5012'

async function getErrorMessage(res: Response) {
  const raw = await res.text()
  if (!raw) {
    return res.statusText || 'Request failed'
  }

  try {
    const parsed = JSON.parse(raw) as { message?: string; Message?: string }
    return parsed.message ?? parsed.Message ?? raw
  } catch {
    return raw
  }
}

function App() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [auth, setAuth] = useState<AuthResponse | null>(null)

  const [categories, setCategories] = useState<Category[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])

  const [newCategoryName, setNewCategoryName] = useState('')
  const [newExpenseCategoryId, setNewExpenseCategoryId] = useState('')
  const [newExpenseAmount, setNewExpenseAmount] = useState('')
  const [newExpenseDescription, setNewExpenseDescription] = useState('')

  const [status, setStatus] = useState('Ready')

  async function register(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!email.trim() || !password.trim() || !fullName.trim()) {
      setStatus('Register failed: email, password and full name are required')
      return
    }

    setStatus('Registering...')

    try {
      const res = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password, fullName: fullName.trim() }),
      })

      if (!res.ok) {
        const message = await getErrorMessage(res)
        setStatus(`Register failed (${res.status}): ${message}`)
        return
      }

      const data = (await res.json()) as AuthResponse
      setAuth(data)
      setStatus(`Registered + logged in as ${data.email}`)
    } catch (error) {
      setStatus(`Register failed: ${(error as Error).message}`)
    }
  }

  async function login() {
    if (!email.trim() || !password.trim()) {
      setStatus('Login failed: email and password are required')
      return
    }

    setStatus('Logging in...')

    try {
      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      })

      if (!res.ok) {
        const message = await getErrorMessage(res)
        setStatus(`Login failed (${res.status}): ${message}`)
        return
      }

      const data = (await res.json()) as AuthResponse
      setAuth(data)
      setStatus(`Logged in as ${data.email}`)
    } catch (error) {
      setStatus(`Login failed: ${(error as Error).message}`)
    }
  }

  async function loadCategories() {
    if (!auth) return
    setStatus('Loading categories...')

    const res = await fetch(`${API_BASE_URL}/categories`, {
      headers: {
        Authorization: `Bearer ${auth.accessToken}`,
      },
    })

    if (!res.ok) {
      const text = await res.text()
      setStatus(`Load categories failed: ${text}`)
      return
    }

    const data = (await res.json()) as Category[]
    setCategories(data)
    if (data.length > 0 && !newExpenseCategoryId) {
      setNewExpenseCategoryId(data[0].id)
    }
    setStatus(`Loaded ${data.length} categories`)
  }

  async function createCategory(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!auth) return
    setStatus('Creating category...')

    const res = await fetch(`${API_BASE_URL}/categories`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${auth.accessToken}`,
      },
      body: JSON.stringify({ name: newCategoryName }),
    })

    if (!res.ok) {
      const text = await res.text()
      setStatus(`Create category failed: ${text}`)
      return
    }

    const created = (await res.json()) as Category
    setCategories((prev) => [...prev, created])
    setNewCategoryName('')
    if (!newExpenseCategoryId) {
      setNewExpenseCategoryId(created.id)
    }
    setStatus(`Category created: ${created.name}`)
  }

  async function loadExpenses() {
    if (!auth) return
    setStatus('Loading expenses...')

    const res = await fetch(`${API_BASE_URL}/expenses?page=1&pageSize=20`, {
      headers: {
        Authorization: `Bearer ${auth.accessToken}`,
      },
    })

    if (!res.ok) {
      const text = await res.text()
      setStatus(`Load expenses failed: ${text}`)
      return
    }

    const data = (await res.json()) as ExpenseListResponse
    setExpenses(data.items)
    setStatus(`Loaded ${data.items.length} expenses`)
  }

  async function createExpense(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!auth) return
    setStatus('Creating expense...')

    const payload = {
      categoryId: newExpenseCategoryId,
      amount: Number(newExpenseAmount),
      description: newExpenseDescription,
      expenseDateUtc: new Date().toISOString(),
    }

    const res = await fetch(`${API_BASE_URL}/expenses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${auth.accessToken}`,
      },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      const text = await res.text()
      setStatus(`Create expense failed: ${text}`)
      return
    }

    const created = (await res.json()) as Expense
    setExpenses((prev) => [created, ...prev])
    setNewExpenseAmount('')
    setNewExpenseDescription('')
    setStatus(`Expense created: €${created.amount} (${created.categoryName})`)
  }

  return (
    <main className="app-shell">
      <h1>FinOps Expense Web</h1>
      <p className="status">Status: {status}</p>

      <section className="card">
        <h2>Auth</h2>
        <form className="grid" onSubmit={register}>
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>

          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>

          <label>
            Full Name (for register)
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </label>

          <div className="row">
            <button type="submit">Register</button>
            <button
              type="button"
              onClick={() => void login()}
              disabled={!email.trim() || !password.trim()}
            >
              Login
            </button>
          </div>
        </form>

        {auth && (
          <p className="muted">
            Logged in as <strong>{auth.email}</strong>
          </p>
        )}
      </section>

      <section className="card">
        <h2>Categories</h2>
        <form className="row" onSubmit={createCategory}>
          <input
            placeholder="Category name"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            required
          />
          <button type="submit" disabled={!auth}>
            Add Category
          </button>
          <button type="button" onClick={loadCategories} disabled={!auth}>
            Refresh Categories
          </button>
        </form>

        <ul>
          {categories.map((c) => (
            <li key={c.id}>{c.name}</li>
          ))}
        </ul>
      </section>

      <section className="card">
        <h2>Expenses</h2>
        <form className="grid" onSubmit={createExpense}>
          <label>
            Category
            <select
              value={newExpenseCategoryId}
              onChange={(e) => setNewExpenseCategoryId(e.target.value)}
              required
            >
              <option value="" disabled>
                Select category
              </option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            Amount
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={newExpenseAmount}
              onChange={(e) => setNewExpenseAmount(e.target.value)}
              required
            />
          </label>

          <label>
            Description
            <input
              value={newExpenseDescription}
              onChange={(e) => setNewExpenseDescription(e.target.value)}
            />
          </label>

          <div className="row">
            <button type="submit" disabled={!auth || categories.length === 0}>
              Add Expense
            </button>
            <button type="button" onClick={loadExpenses} disabled={!auth}>
              Refresh Expenses
            </button>
          </div>
        </form>

        <ul>
          {expenses.map((e) => (
            <li key={e.id}>
              {e.categoryName} — €{e.amount.toFixed(2)} — {e.description || '(no description)'}
            </li>
          ))}
        </ul>
      </section>
    </main>
  )
}

export default App
