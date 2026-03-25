namespace FinOpsExpenseApi.Contracts.Expenses;

public record ExpenseResponse(
    Guid Id,
    Guid CategoryId,
    string CategoryName,
    decimal Amount,
    string Description,
    DateTime ExpenseDateUtc,
    DateTime CreatedAtUtc);
