# Build stage
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Copy csproj files and restore dependencies
COPY ["FinOpsExpenseApi.csproj", "."]
RUN dotnet restore "FinOpsExpenseApi.csproj"

# Copy everything else and build
COPY . .
RUN dotnet build "FinOpsExpenseApi.csproj" -c Release -o /app/build

# Publish stage
FROM build AS publish
RUN dotnet publish "FinOpsExpenseApi.csproj" -c Release -o /app/publish /p:UseAppHost=false

# Runtime stage
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app
COPY --from=publish /app/publish .

EXPOSE 80
EXPOSE 443

ENTRYPOINT ["dotnet", "FinOpsExpenseApi.dll"]