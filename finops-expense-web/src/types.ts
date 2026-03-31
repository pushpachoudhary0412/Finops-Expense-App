export type AuthResponse = {
  userId: string
  email: string
  fullName: string
  accessToken: string
}

export type Category = {
  id: string
  name: string
  createdAtUtc: string
}

export type Expense = {
  id: string
  categoryId: string
  categoryName: string
  amount: number
  description: string
  expenseDateUtc: string
  createdAtUtc: string
}

export type ExpenseListResponse = {
  page: number
  pageSize: number
  totalCount: number
  items: Expense[]
}

export type StatusTone = 'neutral' | 'success' | 'error' | 'info'