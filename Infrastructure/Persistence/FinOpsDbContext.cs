using FinOpsExpenseApi.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace FinOpsExpenseApi.Infrastructure.Persistence;

public class FinOpsDbContext(DbContextOptions<FinOpsDbContext> options) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();
    public DbSet<Category> Categories => Set<Category>();
    public DbSet<Expense> Expenses => Set<Expense>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<User>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.HasIndex(x => x.Email).IsUnique();
            entity.Property(x => x.Email).HasMaxLength(256).IsRequired();
            entity.Property(x => x.PasswordHash).HasMaxLength(512).IsRequired();
            entity.Property(x => x.FullName).HasMaxLength(200).IsRequired();
        });

        modelBuilder.Entity<Category>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Name).HasMaxLength(100).IsRequired();

            entity.HasOne(x => x.User)
                .WithMany(u => u.Categories)
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(x => new { x.UserId, x.Name }).IsUnique();
        });

        modelBuilder.Entity<Expense>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Amount).HasPrecision(18, 2);
            entity.Property(x => x.Description).HasMaxLength(500);

            entity.HasOne(x => x.User)
                .WithMany(u => u.Expenses)
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(x => x.Category)
                .WithMany(c => c.Expenses)
                .HasForeignKey(x => x.CategoryId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasIndex(x => new { x.UserId, x.ExpenseDateUtc });
            entity.HasIndex(x => x.CategoryId);
        });
    }
}
