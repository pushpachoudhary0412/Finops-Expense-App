namespace FinOpsExpenseApi.Contracts.Expenses;

public record CreateExpenseRequest(
    Guid CategoryId,
    decimal Amount,
    string? Description,
    DateTime ExpenseDateUtc);
