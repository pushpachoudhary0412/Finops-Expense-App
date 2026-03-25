# FinOps Expense Tracker

FinOps Expense Tracker is a full-stack expense management application built with a **.NET minimal API**, **PostgreSQL**, and a **React + TypeScript + Vite** frontend.

The app allows users to:
- register and log in with JWT authentication
- create and manage their own expense categories
- add, update, delete, and list expenses
- filter expenses by date range and category

## Tech Stack

### Backend
- .NET 10 minimal API
- Entity Framework Core
- PostgreSQL
- JWT authentication
- Swagger / OpenAPI

### Frontend
- React
- TypeScript
- Vite

## Project Structure

```text
finops-expense-api/
├── Common/                  # auth helpers and shared backend utilities
├── Contracts/               # request/response DTOs
├── Domain/Entities/         # core domain models
├── Infrastructure/          # EF Core DbContext and persistence setup
├── Migrations/              # database migrations
├── Program.cs               # API endpoints and app setup
├── FinOpsExpenseApi.csproj  # backend project
├── finops-expense-web/      # React frontend
└── README-Docker.md         # Docker-based setup instructions
```

## Features

### Authentication
- user registration
- user login
- JWT token generation

### Categories
- create category
- list categories for the current user
- unique category names per user

### Expenses
- create expense
- update expense
- delete expense
- list expenses with pagination
- optional filtering by:
  - from date
  - to date
  - category

## Local Development Setup

## Prerequisites
- .NET SDK 10
- Node.js + npm
- PostgreSQL running locally

## Database Configuration

The backend is configured to use this local PostgreSQL connection by default:

```json
"DefaultConnection": "Host=localhost;Port=5432;Database=finops_expense_db;Username=postgres;Password=postgres"
```

Make sure PostgreSQL is running and that the following database exists:

- Database: `finops_expense_db`
- Username: `postgres`
- Password: `postgres`

If your local PostgreSQL credentials are different, update `appsettings.Development.json`.

## Run the Backend

From the project root:

```bash
dotnet restore
dotnet run --project /Volumes/Pushpa_SSD/finops-expense-api/FinOpsExpenseApi.csproj
```

Backend URLs:
- API: `http://localhost:5012`
- Swagger: `http://localhost:5012/swagger`

## Run the Frontend

In another terminal:

```bash
cd /Volumes/Pushpa_SSD/finops-expense-api/finops-expense-web
npm install
npm run dev
```

Frontend URL:
- `http://localhost:5173`

## Example UI Test Data

You can use this sample data after PostgreSQL is running:

### Register / Login
- Email: `demo@finops.local`
- Password: `Password@123`
- Full Name: `Demo User`

### Categories
- `Travel`
- `Food`
- `Software`
- `Cloud`
- `Office`

### Expense examples
- Category: `Travel` | Amount: `125.50` | Description: `Taxi from airport`
- Category: `Food` | Amount: `18.90` | Description: `Team lunch`
- Category: `Software` | Amount: `49.99` | Description: `Design tool subscription`

## Notes

- The backend starts even if PostgreSQL is not running, but database-backed endpoints will fail until the database is available.
- Swagger is enabled in Development mode.
- A Docker setup guide is available in `README-Docker.md`.
- The project file excludes macOS `._*` AppleDouble files from compilation to avoid build errors on macOS.

## Build

### Backend
```bash
dotnet build /Volumes/Pushpa_SSD/finops-expense-api/finops-expense-api.sln
```

### Frontend
```bash
cd /Volumes/Pushpa_SSD/finops-expense-api/finops-expense-web
npm run build
```

## API Endpoints Overview

### Auth
- `POST /auth/register`
- `POST /auth/login`

### Categories
- `GET /categories`
- `POST /categories`

### Expenses
- `GET /expenses`
- `POST /expenses`
- `PUT /expenses/{id}`
- `DELETE /expenses/{id}`