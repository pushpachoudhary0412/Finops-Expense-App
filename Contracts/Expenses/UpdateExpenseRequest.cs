namespace FinOpsExpenseApi.Contracts.Expenses;

public record UpdateExpenseRequest(
    Guid CategoryId,
    decimal Amount,
    string? Description,
    DateTime ExpenseDateUtc);
