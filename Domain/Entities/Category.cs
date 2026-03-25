namespace FinOpsExpenseApi.Domain.Entities;

public class Category
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public string Name { get; set; } = string.Empty;
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;

    public User? User { get; set; }
    public ICollection<Expense> Expenses { get; set; } = new List<Expense>();
}
