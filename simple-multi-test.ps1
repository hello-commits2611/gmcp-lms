# Simple Multi-Session Test
Write-Host "Simple Multi-Session Test" -ForegroundColor Green
Write-Host "=========================" -ForegroundColor Green

$baseUrl = "http://localhost:3000"
$testEmail = "admin@gmcpnalanda.com"
$testPassword = "AdminGMCP@2025"

# First, let's clean up any existing sessions by logging out
Write-Host "Step 1: Cleaning up existing sessions..." -ForegroundColor Yellow

$cleanupSession = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$loginForCleanup = @{
    email = $testEmail
    password = $testPassword
} | ConvertTo-Json

try {
    # Login to get a session
    $cleanupLogin = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" -Method POST -Body $loginForCleanup -ContentType "application/json" -WebSession $cleanupSession
    
    if ($cleanupLogin.success) {
        # Logout from all sessions
        $logoutAll = Invoke-RestMethod -Uri "$baseUrl/api/auth/logout-all" -Method POST -WebSession $cleanupSession
        Write-Host "Cleaned up existing sessions: $($logoutAll.message)" -ForegroundColor Cyan
    }
} catch {
    Write-Host "Cleanup completed (or no sessions to clean)" -ForegroundColor Cyan
}

Write-Host ""

Write-Host "Step 2: Testing first session (Admin Portal)..." -ForegroundColor Yellow

$session1 = New-Object Microsoft.PowerShell.Commands.WebRequestSession

try {
    $response1 = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" -Method POST -Body $loginForCleanup -ContentType "application/json" -WebSession $session1 -Headers @{ "Referer" = "$baseUrl/admin-portal.html" }
    
    if ($response1.success) {
        Write-Host "SUCCESS: First session created" -ForegroundColor Green
        Write-Host "Session ID: $($response1.sessionId)" -ForegroundColor Cyan
    } else {
        Write-Host "FAILED: $($response1.error)" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host ""

Write-Host "Step 3: Testing second session (Student Portal)..." -ForegroundColor Yellow

$session2 = New-Object Microsoft.PowerShell.Commands.WebRequestSession

try {
    $response2 = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" -Method POST -Body $loginForCleanup -ContentType "application/json" -WebSession $session2 -Headers @{ "Referer" = "$baseUrl/student-portal.html" }
    
    if ($response2.success) {
        Write-Host "SUCCESS: Second session created" -ForegroundColor Green
        Write-Host "Session ID: $($response2.sessionId)" -ForegroundColor Cyan
    } else {
        Write-Host "FAILED: $($response2.error)" -ForegroundColor Red
        Write-Host "Code: $($response2.code)" -ForegroundColor Red
    }
} catch {
    Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

Write-Host "Step 4: Verifying both sessions are active..." -ForegroundColor Yellow

# Check session 1
try {
    $check1 = Invoke-RestMethod -Uri "$baseUrl/api/auth/check" -Method GET -WebSession $session1
    if ($check1.authenticated) {
        Write-Host "Session 1 is active: $($check1.user.name)" -ForegroundColor Green
    } else {
        Write-Host "Session 1 is NOT active" -ForegroundColor Red
    }
} catch {
    Write-Host "Session 1 check failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Check session 2
try {
    $check2 = Invoke-RestMethod -Uri "$baseUrl/api/auth/check" -Method GET -WebSession $session2
    if ($check2.authenticated) {
        Write-Host "Session 2 is active: $($check2.user.name)" -ForegroundColor Green
    } else {
        Write-Host "Session 2 is NOT active" -ForegroundColor Red
    }
} catch {
    Write-Host "Session 2 check failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "=========================" -ForegroundColor Green
Write-Host "Test completed!" -ForegroundColor Green
Write-Host "=========================" -ForegroundColor Green