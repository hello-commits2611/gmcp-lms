# Test Cascade Delete on Existing User
Write-Host "Testing Cascade Delete on Existing User" -ForegroundColor Green
Write-Host "=======================================" -ForegroundColor Green
Write-Host ""

$baseUrl = "http://localhost:3000"

# Check current user data
Write-Host "Step 1: Checking current user data..." -ForegroundColor Yellow

$testEmail = "ayush@gmcpnalanda.com"  # Using the existing student from users.json

# Make API calls without session first to see current state
try {
    Write-Host "Current users in the system:" -ForegroundColor Cyan
    $curl = "curl -X GET '$baseUrl/api/users/admin/all-users' -H 'Content-Type: application/json'"
    $result = Invoke-Expression $curl | ConvertFrom-Json
    
    $user = $result.users | Where-Object { $_.email -eq $testEmail }
    if ($user) {
        Write-Host "Found user: $($user.name) ($($user.email))" -ForegroundColor Green
        Write-Host "Role: $($user.role), Status: $($user.status)" -ForegroundColor Green
    } else {
        Write-Host "User not found" -ForegroundColor Red
    }
    
} catch {
    Write-Host "Could not check users without authentication" -ForegroundColor Yellow
}

Write-Host ""

# Try using curl for delete request (bypass session issues)
Write-Host "Step 2: Attempting cascade delete using curl..." -ForegroundColor Yellow
Write-Host "Target user: $testEmail" -ForegroundColor Cyan
Write-Host "WARNING: This will delete all data for this user!" -ForegroundColor Red

# Perform the delete
try {
    $curlDelete = "curl -X DELETE '$baseUrl/api/users/delete-user/$testEmail' -H 'Content-Type: application/json'"
    $deleteResult = Invoke-Expression $curlDelete
    Write-Host "Delete response: $deleteResult" -ForegroundColor Green
} catch {
    Write-Host "Delete failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "=======================================" -ForegroundColor Green
Write-Host "Test completed. Check server logs for detailed cascade delete operations." -ForegroundColor Green
Write-Host "=======================================" -ForegroundColor Green