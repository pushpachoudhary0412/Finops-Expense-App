# FinOps Expense Tracker

FinOps Expense Tracker is a full-stack expense management application built with a **.NET minimal API**, **PostgreSQL**, and a **React + TypeScript + Vite** frontend.

It is designed to help users manage personal or small-team expenses with secure authentication and simple expense organization.

## Features

- user registration and login with JWT authentication
- personal expense categories
- create, update, delete, and list expenses
- filtering expenses by category and date range
- Swagger/OpenAPI support for the backend API

## Tech Stack

- **Backend:** .NET 10, Entity Framework Core, PostgreSQL, JWT
- **Frontend:** React, TypeScript, Vite

## Project Structure

```text
finops-expense-api/
├── Common/
├── Contracts/
├── Domain/Entities/
├── Infrastructure/
├── Migrations/
├── Program.cs
├── FinOpsExpenseApi.csproj
└── finops-expense-web/
```

## Notes

- Docker instructions are available in `README-Docker.md`.
- The project includes both backend and frontend code in a single repository.