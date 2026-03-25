# Docker Setup for FinOps Expense API

This document explains how to run the complete FinOps expense tracking application using Docker.

## Architecture

The application consists of three services:
- **PostgreSQL Database** (finops-postgres) - Port 5432
- **.NET API** (finops-api) - Port 8080
- **React Web App** (finops-web) - Port 3000

All services communicate through a shared Docker network.

## Prerequisites

- Docker and Docker Compose installed
- At least 4GB of available RAM (recommended)

## Quick Start

1. **Clone and navigate to the project:**
   ```bash
   cd finops-expense-api
   ```

2. **Build and start all services:**
   ```bash
   docker-compose up --build
   ```

   Or build first, then run:
   ```bash
   docker-compose build
   docker-compose up
   ```

3. **Access the application:**
   - Web App: http://localhost:3000
   - API: http://localhost:8080
   - Database: localhost:5432 (from host machine)

## Individual Service Commands

### Start only the database:
```bash
docker-compose up postgres
```

### Start API and database:
```bash
docker-compose up api postgres
```

### Start everything in background:
```bash
docker-compose up -d
```

### View logs:
```bash
docker-compose logs -f [service-name]
# Examples:
docker-compose logs -f api
docker-compose logs -f web
```

### Stop services:
```bash
docker-compose down
```

### Rebuild after code changes:
```bash
docker-compose build --no-cache
docker-compose up
```

## Database

- **Host:** postgres (within Docker network) or localhost:5432 (from host)
- **Database:** finops_expense_db
- **Username:** postgres
- **Password:** postgres
- **Data persistence:** Stored in Docker volume `finops_pg_data`

## Development

For development, you might want to run the API and web app locally while keeping the database in Docker:

```bash
# Start only database
docker-compose up postgres

# In another terminal, run API locally
cd finops-expense-api
dotnet run

# In another terminal, run web app locally
cd finops-expense-web
npm run dev
```

## Troubleshooting

### Build Issues
- Ensure you have enough disk space
- Clear Docker cache: `docker system prune -a`

### Port Conflicts
- Change ports in docker-compose.yml if 3000, 8080, or 5432 are in use

### Database Connection Issues
- Ensure postgres service is healthy: `docker-compose ps`
- Check logs: `docker-compose logs postgres`

### Permission Issues
- On Linux/Mac, you might need `sudo` for Docker commands

## Environment Variables

The API uses these environment variables (configured in docker-compose.yml):
- `ASPNETCORE_ENVIRONMENT=Development`
- `ConnectionStrings__DefaultConnection=Host=postgres;Database=finops_expense_db;Username=postgres;Password=postgres`

## Volumes

- `finops_pg_data` - PostgreSQL data persistence

## Networks

- `finops-network` - Bridge network for service communication