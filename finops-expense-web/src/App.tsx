import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import './App.css'
import { ApiError, api } from './lib/api'
import { loadStoredAuth, saveStoredAuth } from './lib/storage'
import type { AuthResponse, Category, Expense, StatusTone } from './types'

type StatusState = {
  tone: StatusTone
  message: string
}

const initialStatus: StatusState = {
  tone: 'neutral',
  message: 'Sign in to manage categories and expenses.',
}

function formatMoney(value: number) {
  return new Intl.NumberFormat('en-DE', {
    style: 'currency',
    currency: 'EUR',
  }).format(value)
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString()
}

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10)
}

function App() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [auth, setAuth] = useState<AuthResponse | null>(() => loadStoredAuth())

  const [categories, setCategories] = useState<Category[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])

  const [newCategoryName, setNewCategoryName] = useState('')
  const [newExpenseCategoryId, setNewExpenseCategoryId] = useState('')
  const [newExpenseAmount, setNewExpenseAmount] = useState('')
  const [newExpenseDescription, setNewExpenseDescription] = useState('')
  const [newExpenseDate, setNewExpenseDate] = useState(todayIsoDate)

  const [status, setStatus] = useState<StatusState>(initialStatus)
  const [isAuthSubmitting, setIsAuthSubmitting] = useState(false)
  const [isCategorySubmitting, setIsCategorySubmitting] = useState(false)
  const [isExpenseSubmitting, setIsExpenseSubmitting] = useState(false)
  const [isRefreshingData, setIsRefreshingData] = useState(false)

  useEffect(() => {
    saveStoredAuth(auth)
  }, [auth])

  useEffect(() => {
    if (!auth) {
      setCategories([])
      setExpenses([])
      return
    }

    void refreshDashboard(auth.accessToken, false)
  }, [auth])

  const totalSpend = useMemo(
    () => expenses.reduce((sum, expense) => sum + expense.amount, 0),
    [expenses],
  )

  const latestExpenses = useMemo(() => expenses.slice(0, 5), [expenses])

  function updateStatus(message: string, tone: StatusTone = 'info') {
    setStatus({ message, tone })
  }

  function getErrorMessage(error: unknown, fallback: string) {
    if (error instanceof ApiError) {
      return `${fallback} (${error.status}): ${error.message}`
    }

    if (error instanceof Error) {
      return `${fallback}: ${error.message}`
    }

    return fallback
  }

  async function refreshDashboard(token: string, announce = true) {
    setIsRefreshingData(true)

    try {
      const [categoryData, expenseData] = await Promise.all([
        api.getCategories(token),
        api.getExpenses(token),
      ])

      setCategories(categoryData)
      setExpenses(expenseData.items)
      setNewExpenseCategoryId((current) => current || categoryData[0]?.id || '')

      if (announce) {
        updateStatus(
          `Dashboard refreshed: ${categoryData.length} categories and ${expenseData.items.length} expenses loaded.`,
          'success',
        )
      }
    } catch (error) {
      updateStatus(getErrorMessage(error, 'Failed to refresh dashboard'), 'error')
    } finally {
      setIsRefreshingData(false)
    }
  }

  async function register(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!email.trim() || !password.trim() || !fullName.trim()) {
      updateStatus('Register failed: email, password and full name are required.', 'error')
      return
    }

    setIsAuthSubmitting(true)
    updateStatus('Creating your account...', 'info')

    try {
      const data = await api.register({
        email: email.trim(),
        password,
        fullName: fullName.trim(),
      })
      setAuth(data)
      updateStatus(`Welcome ${data.fullName}, your account is ready.`, 'success')
    } catch (error) {
      updateStatus(getErrorMessage(error, 'Register failed'), 'error')
    } finally {
      setIsAuthSubmitting(false)
    }
  }

  async function login() {
    if (!email.trim() || !password.trim()) {
      updateStatus('Login failed: email and password are required.', 'error')
      return
    }

    setIsAuthSubmitting(true)
    updateStatus('Signing you in...', 'info')

    try {
      const data = await api.login({ email: email.trim(), password })
      setAuth(data)
      updateStatus(`Logged in as ${data.email}.`, 'success')
    } catch (error) {
      updateStatus(getErrorMessage(error, 'Login failed'), 'error')
    } finally {
      setIsAuthSubmitting(false)
    }
  }

  async function createCategory(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!auth) return
    if (!newCategoryName.trim()) {
      updateStatus('Category name is required.', 'error')
      return
    }

    setIsCategorySubmitting(true)
    updateStatus('Creating category...', 'info')

    try {
      const created = await api.createCategory(auth.accessToken, { name: newCategoryName.trim() })

      setCategories((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)))
      setNewCategoryName('')
      if (!newExpenseCategoryId) {
        setNewExpenseCategoryId(created.id)
      }
      updateStatus(`Category created: ${created.name}`, 'success')
    } catch (error) {
      updateStatus(getErrorMessage(error, 'Create category failed'), 'error')
    } finally {
      setIsCategorySubmitting(false)
    }
  }

  async function createExpense(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!auth) return
    if (!newExpenseCategoryId) {
      updateStatus('Select a category before creating an expense.', 'error')
      return
    }

    if (Number(newExpenseAmount) <= 0) {
      updateStatus('Expense amount must be greater than zero.', 'error')
      return
    }

    setIsExpenseSubmitting(true)
    updateStatus('Creating expense...', 'info')

    const payload = {
      categoryId: newExpenseCategoryId,
      amount: Number(newExpenseAmount),
      description: newExpenseDescription.trim(),
      expenseDateUtc: new Date(`${newExpenseDate}T12:00:00`).toISOString(),
    }

    try {
      const created = await api.createExpense(auth.accessToken, payload)
      setExpenses((prev) => [created, ...prev])
      setNewExpenseAmount('')
      setNewExpenseDescription('')
      setNewExpenseDate(todayIsoDate())
      updateStatus(`Expense created: ${formatMoney(created.amount)} in ${created.categoryName}.`, 'success')
    } catch (error) {
      updateStatus(getErrorMessage(error, 'Create expense failed'), 'error')
    } finally {
      setIsExpenseSubmitting(false)
    }
  }

  function logout() {
    setAuth(null)
    setEmail('')
    setPassword('')
    setFullName('')
    setNewCategoryName('')
    setNewExpenseAmount('')
    setNewExpenseDescription('')
    setNewExpenseCategoryId('')
    setNewExpenseDate(todayIsoDate())
    updateStatus('Signed out successfully.', 'info')
  }

  return (
    <main className="app-shell">
      <section className="hero card">
        <div>
          <p className="eyebrow">FinOps Expense Dashboard</p>
          <h1>Track personal spending with a cleaner auth and expense workflow.</h1>
          <p className="hero-copy">
            This frontend now keeps your session, centralizes API access, validates forms,
            and gives you a quick summary of categories and recent expenses.
          </p>
        </div>

        <div className="hero-meta">
          <div>
            <span className="hero-label">API</span>
            <strong>{api.baseUrl}</strong>
          </div>
          <div>
            <span className="hero-label">Session</span>
            <strong>{auth ? 'Authenticated' : 'Guest'}</strong>
          </div>
        </div>
      </section>

      <p className={`status status-${status.tone}`}>{status.message}</p>

      <section className="layout">
        <section className="card auth-card">
          <div className="section-header">
            <div>
              <h2>Authentication</h2>
              <p className="muted">Register a new account or log into an existing one.</p>
            </div>

            {auth && (
              <button type="button" className="button-secondary" onClick={logout}>
                Sign out
              </button>
            )}
          </div>

          <form className="grid" onSubmit={register}>
            <label>
              Email
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
            </label>

            <label>
              Password
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 1 character"
                required
              />
            </label>

            <label>
              Full Name (for register)
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Pushpa Choudhary"
              />
            </label>

            <div className="row">
              <button type="submit" disabled={isAuthSubmitting}>
                {isAuthSubmitting ? 'Working...' : 'Register'}
              </button>
              <button
                type="button"
                onClick={() => void login()}
                className="button-secondary"
                disabled={!email.trim() || !password.trim() || isAuthSubmitting}
              >
                Login
              </button>
            </div>
          </form>

          {auth && (
            <div className="auth-summary">
              <p className="muted">
                Logged in as <strong>{auth.email}</strong>
              </p>
              <p className="muted">Welcome back, {auth.fullName}.</p>
            </div>
          )}

          {!auth && <p className="hint">Your session will be stored locally after a successful login.</p>}
        </section>

        <section className="card metrics-card">
          <div className="section-header">
            <div>
              <h2>Overview</h2>
              <p className="muted">A quick snapshot of your current expense data.</p>
            </div>
            <button
              type="button"
              className="button-secondary"
              onClick={() => auth && void refreshDashboard(auth.accessToken)}
              disabled={!auth || isRefreshingData}
            >
              {isRefreshingData ? 'Refreshing...' : 'Refresh dashboard'}
            </button>
          </div>

          <div className="metric-grid">
            <article className="metric-tile">
              <span className="hero-label">Categories</span>
              <strong>{categories.length}</strong>
            </article>
            <article className="metric-tile">
              <span className="hero-label">Expenses</span>
              <strong>{expenses.length}</strong>
            </article>
            <article className="metric-tile">
              <span className="hero-label">Tracked spend</span>
              <strong>{formatMoney(totalSpend)}</strong>
            </article>
          </div>

          <div>
            <h3>Recent activity</h3>
            {latestExpenses.length === 0 ? (
              <p className="muted">No expenses yet. Create one below to see recent activity here.</p>
            ) : (
              <ul className="list plain-list">
                {latestExpenses.map((expense) => (
                  <li key={expense.id} className="list-item compact">
                    <div>
                      <strong>{expense.categoryName}</strong>
                      <p className="muted">{expense.description || 'No description provided'}</p>
                    </div>
                    <div className="expense-meta">
                      <strong>{formatMoney(expense.amount)}</strong>
                      <span className="muted">{formatDate(expense.expenseDateUtc)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </section>

      <section className="layout">
        <section className="card">
          <div className="section-header">
            <div>
              <h2>Categories</h2>
              <p className="muted">Create and review your personal category list.</p>
            </div>
          </div>

          <form className="row" onSubmit={createCategory}>
            <input
              placeholder="Category name"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              required
            />
            <button type="submit" disabled={!auth || isCategorySubmitting}>
              {isCategorySubmitting ? 'Saving...' : 'Add Category'}
            </button>
            <button
              type="button"
              className="button-secondary"
              onClick={() => auth && void refreshDashboard(auth.accessToken)}
              disabled={!auth || isRefreshingData}
            >
              Refresh Categories
            </button>
          </form>

          {categories.length === 0 ? (
            <p className="muted empty-state">No categories yet. Add your first one to start organizing expenses.</p>
          ) : (
            <ul className="list plain-list">
              {categories.map((c) => (
                <li key={c.id} className="list-item">
                  <span>{c.name}</span>
                  <span className="muted">Created {formatDate(c.createdAtUtc)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card">
          <div className="section-header">
            <div>
              <h2>Expenses</h2>
              <p className="muted">Capture new spend entries with better form feedback.</p>
            </div>
          </div>

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
              Expense Date
              <input
                type="date"
                value={newExpenseDate}
                onChange={(e) => setNewExpenseDate(e.target.value)}
                required
              />
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
              <button type="submit" disabled={!auth || categories.length === 0 || isExpenseSubmitting}>
                {isExpenseSubmitting ? 'Saving...' : 'Add Expense'}
              </button>
              <button
                type="button"
                className="button-secondary"
                onClick={() => auth && void refreshDashboard(auth.accessToken)}
                disabled={!auth || isRefreshingData}
              >
                Refresh Expenses
              </button>
            </div>
          </form>

          {expenses.length === 0 ? (
            <p className="muted empty-state">No expenses found yet. Once you add entries, they’ll show up here.</p>
          ) : (
            <ul className="list plain-list">
              {expenses.map((expense: Expense) => (
                <li key={expense.id} className="list-item expense-item">
                  <div>
                    <strong>{expense.categoryName}</strong>
                    <p className="muted">{expense.description || '(no description)'}</p>
                  </div>
                  <div className="expense-meta">
                    <strong>{formatMoney(expense.amount)}</strong>
                    <span className="muted">{formatDate(expense.expenseDateUtc)}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </section>
    </main>
  )
}

export default App
