# Test Multi-Portal Access Functionality
Write-Host "Testing Multi-Portal Access Functionality" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Green
Write-Host ""

$baseUrl = "http://localhost:3000"

# Test with admin credentials (who should be able to access both admin and student portals)
$testEmail = "admin@gmcpnalanda.com"
$testPassword = "AdminGMCP@2025"

Write-Host "Step 1: Testing admin login from admin portal..." -ForegroundColor Yellow

# Create session for admin portal
$session1 = New-Object Microsoft.PowerShell.Commands.WebRequestSession

$adminLoginBody = @{
    email = $testEmail
    password = $testPassword
} | ConvertTo-Json

try {
    $adminResponse = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" -Method POST -Body $adminLoginBody -ContentType "application/json" -WebSession $session1 -Headers @{ "Referer" = "$baseUrl/admin-portal.html" }
    
    if ($adminResponse.success) {
        Write-Host "SUCCESS: Admin portal login successful" -ForegroundColor Green
        Write-Host "Session ID: $($adminResponse.sessionId)" -ForegroundColor Cyan
        Write-Host "Portal URL: $($adminResponse.redirectUrl)" -ForegroundColor Cyan
    } else {
        Write-Host "FAILED: Admin portal login failed - $($adminResponse.error)" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "ERROR: Admin portal login request failed - $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host ""

Write-Host "Step 2: Testing same user login from student portal (should work)..." -ForegroundColor Yellow

# Create separate session for student portal
$session2 = New-Object Microsoft.PowerShell.Commands.WebRequestSession

try {
    $studentResponse = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" -Method POST -Body $adminLoginBody -ContentType "application/json" -WebSession $session2 -Headers @{ "Referer" = "$baseUrl/student-portal.html" }
    
    if ($studentResponse.success) {
        Write-Host "SUCCESS: Student portal login successful (same user)" -ForegroundColor Green
        Write-Host "Session ID: $($studentResponse.sessionId)" -ForegroundColor Cyan
        Write-Host "Portal URL: $($studentResponse.redirectUrl)" -ForegroundColor Cyan
    } else {
        Write-Host "FAILED: Student portal login failed - $($studentResponse.error)" -ForegroundColor Red
        Write-Host "This indicates the multi-session fix is not working properly" -ForegroundColor Red
    }
} catch {
    Write-Host "ERROR: Student portal login request failed - $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

Write-Host "Step 3: Verifying both sessions are active..." -ForegroundColor Yellow

# Test admin portal session
try {
    $adminCheck = Invoke-RestMethod -Uri "$baseUrl/api/auth/check" -Method GET -WebSession $session1
    
    if ($adminCheck.authenticated) {
        Write-Host "SUCCESS: Admin portal session is active" -ForegroundColor Green
        Write-Host "User: $($adminCheck.user.name), Role: $($adminCheck.user.role)" -ForegroundColor Cyan
    } else {
        Write-Host "FAILED: Admin portal session is not active" -ForegroundColor Red
    }
} catch {
    Write-Host "ERROR: Admin portal session check failed - $($_.Exception.Message)" -ForegroundColor Red
}

# Test student portal session
try {
    $studentCheck = Invoke-RestMethod -Uri "$baseUrl/api/auth/check" -Method GET -WebSession $session2
    
    if ($studentCheck.authenticated) {
        Write-Host "SUCCESS: Student portal session is active" -ForegroundColor Green
        Write-Host "User: $($studentCheck.user.name), Role: $($studentCheck.user.role)" -ForegroundColor Cyan
    } else {
        Write-Host "FAILED: Student portal session is not active" -ForegroundColor Red
    }
} catch {
    Write-Host "ERROR: Student portal session check failed - $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

Write-Host "Step 4: Testing API access from both sessions..." -ForegroundColor Yellow

# Test admin API from admin session
try {
    $adminAPI = Invoke-RestMethod -Uri "$baseUrl/api/users/admin/all-users" -Method GET -WebSession $session1
    
    if ($adminAPI.success -or $adminAPI.users) {
        Write-Host "SUCCESS: Admin API accessible from admin session" -ForegroundColor Green
        Write-Host "Found $($adminAPI.users.Count) users" -ForegroundColor Cyan
    } else {
        Write-Host "FAILED: Admin API not accessible from admin session" -ForegroundColor Red
    }
} catch {
    Write-Host "ERROR: Admin API test failed - $($_.Exception.Message)" -ForegroundColor Red
}

# Test hostel API from student session (should work if session validation is fixed)
try {
    $hostelAPI = Invoke-RestMethod -Uri "$baseUrl/api/hostel/my-requests?email=$testEmail" -Method GET -WebSession $session2
    
    if ($hostelAPI.success -ne $false) {
        Write-Host "SUCCESS: Hostel API accessible from student session" -ForegroundColor Green
    } else {
        Write-Host "FAILED: Hostel API not accessible from student session" -ForegroundColor Red
    }
} catch {
    Write-Host "ERROR: Hostel API test failed - $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "This might indicate session validation issues in hostel routes" -ForegroundColor Yellow
}

Write-Host ""

Write-Host "Step 5: Testing selective logout..." -ForegroundColor Yellow

# Logout from admin session only
try {
    $adminLogout = Invoke-RestMethod -Uri "$baseUrl/api/auth/logout" -Method POST -WebSession $session1
    
    if ($adminLogout.success) {
        Write-Host "SUCCESS: Logged out from admin portal" -ForegroundColor Green
        Write-Host "Message: $($adminLogout.message)" -ForegroundColor Cyan
        if ($adminLogout.remainingSessions) {
            Write-Host "Remaining sessions: $($adminLogout.remainingSessions)" -ForegroundColor Cyan
        }
    } else {
        Write-Host "FAILED: Admin logout failed" -ForegroundColor Red
    }
} catch {
    Write-Host "ERROR: Admin logout failed - $($_.Exception.Message)" -ForegroundColor Red
}

# Check if student session is still active
try {
    Start-Sleep -Seconds 1
    $studentCheckAfter = Invoke-RestMethod -Uri "$baseUrl/api/auth/check" -Method GET -WebSession $session2
    
    if ($studentCheckAfter.authenticated) {
        Write-Host "SUCCESS: Student portal session still active after admin logout" -ForegroundColor Green
        Write-Host "This confirms multi-session functionality is working!" -ForegroundColor Green
    } else {
        Write-Host "FAILED: Student portal session was also logged out" -ForegroundColor Red
        Write-Host "This indicates sessions are still linked incorrectly" -ForegroundColor Red
    }
} catch {
    Write-Host "WARNING: Student session check after admin logout failed" -ForegroundColor Yellow
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Yellow
}

Write-Host ""

# Cleanup - logout from remaining session
try {
    $finalLogout = Invoke-RestMethod -Uri "$baseUrl/api/auth/logout" -Method POST -WebSession $session2
    Write-Host "Cleaned up remaining session" -ForegroundColor Cyan
} catch {
    # Ignore cleanup errors
}

Write-Host "=========================================" -ForegroundColor Green
Write-Host "Multi-Portal Access Test Completed!" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Green

Write-Host ""
Write-Host "Summary:" -ForegroundColor Yellow
Write-Host "- If both admin and student portal logins succeeded, multi-session is working" -ForegroundColor White
Write-Host "- If both sessions remained active independently, session isolation is working" -ForegroundColor White
Write-Host "- If selective logout worked, individual session management is working" -ForegroundColor White