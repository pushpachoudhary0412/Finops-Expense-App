using System.Security.Claims;
using System.Text;
using FinOpsExpenseApi.Common.Auth;
using FinOpsExpenseApi.Contracts.Auth;
using FinOpsExpenseApi.Contracts.Categories;
using FinOpsExpenseApi.Contracts.Expenses;
using FinOpsExpenseApi.Domain.Entities;
using FinOpsExpenseApi.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi;

var builder = WebApplication.CreateBuilder(args);

const string FrontendCorsPolicy = "FrontendCors";

// Add services to the container.
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "FinOps Expense API",
        Version = "v1"
    });

    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Description = "Enter: Bearer {your JWT token}",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT"
    });

});

builder.Services.Configure<JwtOptions>(builder.Configuration.GetSection(JwtOptions.SectionName));

var jwtOptions = builder.Configuration
    .GetSection(JwtOptions.SectionName)
    .Get<JwtOptions>() ?? new JwtOptions();

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwtOptions.Issuer,
            ValidAudience = jwtOptions.Audience,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtOptions.SigningKey))
        };
    });

builder.Services.AddAuthorization();
builder.Services.AddCors(options =>
{
    options.AddPolicy(FrontendCorsPolicy, policy =>
    {
        policy
            .WithOrigins("http://localhost:5173")
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});
builder.Services.AddDbContext<FinOpsDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));
builder.Services.AddScoped<IJwtTokenService, JwtTokenService>();

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.UseSwagger();
    app.UseSwaggerUI();
}

using (var scope = app.Services.CreateScope())
{
    try
    {
        var dbContext = scope.ServiceProvider.GetRequiredService<FinOpsDbContext>();
        dbContext.Database.Migrate();
    }
    catch (Exception ex)
    {
        app.Logger.LogWarning(ex, "Database migration at startup failed. Ensure PostgreSQL is running.");
    }
}

app.UseHttpsRedirection();
app.UseCors(FrontendCorsPolicy);
app.UseAuthentication();
app.UseAuthorization();

app.MapGet("/", () => Results.Ok(new
{
    Name = "FinOpsExpenseApi",
    Status = "Running",
    TimestampUtc = DateTime.UtcNow
}));

app.MapGet("/health", () => Results.Ok(new
{
    Status = "Healthy",
    TimestampUtc = DateTime.UtcNow
}))
.WithName("HealthCheck");

app.MapGet("/health/db", async (FinOpsDbContext dbContext, CancellationToken cancellationToken) =>
{
    var canConnect = await dbContext.Database.CanConnectAsync(cancellationToken);
    return canConnect
        ? Results.Ok(new { Status = "Healthy", Database = "Reachable", TimestampUtc = DateTime.UtcNow })
        : Results.Problem(title: "Database Unreachable", statusCode: StatusCodes.Status503ServiceUnavailable);
})
.WithName("DatabaseHealthCheck");

var authGroup = app.MapGroup("/auth");

authGroup.MapPost("/register", async (
    RegisterRequest request,
    FinOpsDbContext dbContext,
    IJwtTokenService jwtTokenService,
    CancellationToken cancellationToken) =>
{
    if (string.IsNullOrWhiteSpace(request.Email) ||
        string.IsNullOrWhiteSpace(request.Password) ||
        string.IsNullOrWhiteSpace(request.FullName))
    {
        return Results.BadRequest(new { Message = "Email, password and fullName are required." });
    }

    var normalizedEmail = request.Email.Trim().ToLowerInvariant();
    var existing = await dbContext.Users
        .AnyAsync(u => u.Email == normalizedEmail, cancellationToken);

    if (existing)
    {
        return Results.Conflict(new { Message = "Email already registered." });
    }

    var user = new User
    {
        Email = normalizedEmail,
        PasswordHash = PasswordHasher.Hash(request.Password),
        FullName = request.FullName.Trim()
    };

    dbContext.Users.Add(user);
    await dbContext.SaveChangesAsync(cancellationToken);

    var token = jwtTokenService.CreateToken(user);
    return Results.Created($"/users/{user.Id}", new AuthResponse(user.Id, user.Email, user.FullName, token));
});

authGroup.MapPost("/login", async (
    LoginRequest request,
    FinOpsDbContext dbContext,
    IJwtTokenService jwtTokenService,
    CancellationToken cancellationToken) =>
{
    if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Password))
    {
        return Results.BadRequest(new { Message = "Email and password are required." });
    }

    var normalizedEmail = request.Email.Trim().ToLowerInvariant();
    var user = await dbContext.Users
        .FirstOrDefaultAsync(u => u.Email == normalizedEmail, cancellationToken);

    if (user is null || !PasswordHasher.Verify(request.Password, user.PasswordHash))
    {
        return Results.Unauthorized();
    }

    var token = jwtTokenService.CreateToken(user);
    return Results.Ok(new AuthResponse(user.Id, user.Email, user.FullName, token));
});

var categoriesGroup = app.MapGroup("/categories")
    .RequireAuthorization();

categoriesGroup.MapGet("/", async (
    ClaimsPrincipal currentUser,
    FinOpsDbContext dbContext,
    CancellationToken cancellationToken) =>
{
    var userId = currentUser.GetUserId();
    if (userId is null)
    {
        return Results.Unauthorized();
    }

    var categories = await dbContext.Categories
        .Where(c => c.UserId == userId)
        .OrderBy(c => c.Name)
        .Select(c => new CategoryResponse(c.Id, c.Name, c.CreatedAtUtc))
        .ToListAsync(cancellationToken);

    return Results.Ok(categories);
});

categoriesGroup.MapPost("/", async (
    CreateCategoryRequest request,
    ClaimsPrincipal currentUser,
    FinOpsDbContext dbContext,
    CancellationToken cancellationToken) =>
{
    var userId = currentUser.GetUserId();
    if (userId is null)
    {
        return Results.Unauthorized();
    }

    if (string.IsNullOrWhiteSpace(request.Name))
    {
        return Results.BadRequest(new { Message = "Category name is required." });
    }

    var categoryName = request.Name.Trim();
    var exists = await dbContext.Categories.AnyAsync(
        c => c.UserId == userId && c.Name.ToLower() == categoryName.ToLower(),
        cancellationToken);

    if (exists)
    {
        return Results.Conflict(new { Message = "Category already exists." });
    }

    var category = new Category
    {
        UserId = userId.Value,
        Name = categoryName
    };

    dbContext.Categories.Add(category);
    await dbContext.SaveChangesAsync(cancellationToken);

    return Results.Created($"/categories/{category.Id}", new CategoryResponse(category.Id, category.Name, category.CreatedAtUtc));
});

var expensesGroup = app.MapGroup("/expenses")
    .RequireAuthorization();

expensesGroup.MapGet("/", async (
    ClaimsPrincipal currentUser,
    FinOpsDbContext dbContext,
    DateTime? from,
    DateTime? to,
    Guid? categoryId,
    int page = 1,
    int pageSize = 20,
    CancellationToken cancellationToken = default) =>
{
    var userId = currentUser.GetUserId();
    if (userId is null)
    {
        return Results.Unauthorized();
    }

    page = page < 1 ? 1 : page;
    pageSize = pageSize is < 1 or > 100 ? 20 : pageSize;

    var query = dbContext.Expenses
        .AsNoTracking()
        .Include(e => e.Category)
        .Where(e => e.UserId == userId);

    if (from is not null)
    {
        query = query.Where(e => e.ExpenseDateUtc >= from.Value);
    }

    if (to is not null)
    {
        query = query.Where(e => e.ExpenseDateUtc <= to.Value);
    }

    if (categoryId is not null)
    {
        query = query.Where(e => e.CategoryId == categoryId.Value);
    }

    var totalCount = await query.CountAsync(cancellationToken);

    var expenses = await query
        .OrderByDescending(e => e.ExpenseDateUtc)
        .Skip((page - 1) * pageSize)
        .Take(pageSize)
        .Select(e => new ExpenseResponse(
            e.Id,
            e.CategoryId,
            e.Category != null ? e.Category.Name : string.Empty,
            e.Amount,
            e.Description,
            e.ExpenseDateUtc,
            e.CreatedAtUtc))
        .ToListAsync(cancellationToken);

    return Results.Ok(new
    {
        Page = page,
        PageSize = pageSize,
        TotalCount = totalCount,
        Items = expenses
    });
});

expensesGroup.MapPost("/", async (
    CreateExpenseRequest request,
    ClaimsPrincipal currentUser,
    FinOpsDbContext dbContext,
    CancellationToken cancellationToken) =>
{
    var userId = currentUser.GetUserId();
    if (userId is null)
    {
        return Results.Unauthorized();
    }

    if (request.Amount <= 0)
    {
        return Results.BadRequest(new { Message = "Amount must be greater than zero." });
    }

    var category = await dbContext.Categories
        .FirstOrDefaultAsync(c => c.Id == request.CategoryId && c.UserId == userId, cancellationToken);

    if (category is null)
    {
        return Results.BadRequest(new { Message = "Category not found for current user." });
    }

    var expense = new Expense
    {
        UserId = userId.Value,
        CategoryId = request.CategoryId,
        Amount = request.Amount,
        Description = request.Description?.Trim() ?? string.Empty,
        ExpenseDateUtc = request.ExpenseDateUtc == default ? DateTime.UtcNow : request.ExpenseDateUtc
    };

    dbContext.Expenses.Add(expense);
    await dbContext.SaveChangesAsync(cancellationToken);

    return Results.Created($"/expenses/{expense.Id}", new ExpenseResponse(
        expense.Id,
        expense.CategoryId,
        category.Name,
        expense.Amount,
        expense.Description,
        expense.ExpenseDateUtc,
        expense.CreatedAtUtc));
});

expensesGroup.MapPut("/{id:guid}", async (
    Guid id,
    UpdateExpenseRequest request,
    ClaimsPrincipal currentUser,
    FinOpsDbContext dbContext,
    CancellationToken cancellationToken) =>
{
    var userId = currentUser.GetUserId();
    if (userId is null)
    {
        return Results.Unauthorized();
    }

    if (request.Amount <= 0)
    {
        return Results.BadRequest(new { Message = "Amount must be greater than zero." });
    }

    var expense = await dbContext.Expenses
        .FirstOrDefaultAsync(e => e.Id == id && e.UserId == userId, cancellationToken);

    if (expense is null)
    {
        return Results.NotFound();
    }

    var category = await dbContext.Categories
        .FirstOrDefaultAsync(c => c.Id == request.CategoryId && c.UserId == userId, cancellationToken);

    if (category is null)
    {
        return Results.BadRequest(new { Message = "Category not found for current user." });
    }

    expense.CategoryId = request.CategoryId;
    expense.Amount = request.Amount;
    expense.Description = request.Description?.Trim() ?? string.Empty;
    expense.ExpenseDateUtc = request.ExpenseDateUtc;

    await dbContext.SaveChangesAsync(cancellationToken);

    return Results.Ok(new ExpenseResponse(
        expense.Id,
        expense.CategoryId,
        category.Name,
        expense.Amount,
        expense.Description,
        expense.ExpenseDateUtc,
        expense.CreatedAtUtc));
});

expensesGroup.MapDelete("/{id:guid}", async (
    Guid id,
    ClaimsPrincipal currentUser,
    FinOpsDbContext dbContext,
    CancellationToken cancellationToken) =>
{
    var userId = currentUser.GetUserId();
    if (userId is null)
    {
        return Results.Unauthorized();
    }

    var expense = await dbContext.Expenses
        .FirstOrDefaultAsync(e => e.Id == id && e.UserId == userId, cancellationToken);

    if (expense is null)
    {
        return Results.NotFound();
    }

    dbContext.Expenses.Remove(expense);
    await dbContext.SaveChangesAsync(cancellationToken);

    return Results.NoContent();
});

app.Run();
