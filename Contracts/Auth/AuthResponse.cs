namespace FinOpsExpenseApi.Contracts.Auth;

public record AuthResponse(Guid UserId, string Email, string FullName, string AccessToken);
