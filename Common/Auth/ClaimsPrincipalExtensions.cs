using System.Security.Claims;

namespace FinOpsExpenseApi.Common.Auth;

public static class ClaimsPrincipalExtensions
{
    public static Guid? GetUserId(this ClaimsPrincipal user)
    {
        var raw = user.FindFirstValue(ClaimTypes.NameIdentifier)
                  ?? user.FindFirstValue("sub");

        return Guid.TryParse(raw, out var parsed) ? parsed : null;
    }
}
