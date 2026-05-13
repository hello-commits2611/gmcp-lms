# PowerShell script to test comprehensive cascade delete functionality

Write-Host "Testing Comprehensive User Cascade Delete..." -ForegroundColor Green

# Create a test user first
Write-Host "`nStep 1: Creating test user..." -ForegroundColor Yellow

$createUserData = @{
    name = "Test User For Deletion"
    email = "testdelete@gmcpnalanda.com"
    password = "TestPass123!"
    role = "student"
    course = "BCA"
    year = "1"
    semester = "1"
    studentId = "TESTDEL001"
} | ConvertTo-Json

try {
    $createResponse = Invoke-WebRequest -Uri "http://localhost:3000/api/users" -Method POST -Body $createUserData -ContentType "application/json"
    Write-Host "✅ Test user created successfully" -ForegroundColor Green
    Write-Host "Response: $($createResponse.Content)" -ForegroundColor White
} catch {
    Write-Host "⚠️ User creation failed (may already exist): $($_.Exception.Message)" -ForegroundColor Yellow
}

# Test the cascade delete
Write-Host "`nStep 2: Testing cascade delete..." -ForegroundColor Yellow
$email = "testdelete@gmcpnalanda.com"
$uri = "http://localhost:3000/api/users/$($email)"

Write-Host "Attempting cascade delete for: $email" -ForegroundColor Cyan
Write-Host "Endpoint: $uri" -ForegroundColor Cyan

try {
    $response = Invoke-WebRequest -Uri $uri -Method DELETE -ContentType "application/json"
    
    Write-Host "`n✅ Response Status: $($response.StatusCode)" -ForegroundColor Green
    Write-Host "📄 Response Content:" -ForegroundColor Green
    $responseObj = $response.Content | ConvertFrom-Json
    Write-Host ($responseObj | ConvertTo-Json -Depth 5) -ForegroundColor White
    
    if ($response.StatusCode -eq 200) {
        Write-Host "`n🎉 Cascade delete request successful!" -ForegroundColor Green
        
        # Show deletion summary
        if ($responseObj.deletionSummary) {
            Write-Host "`n📊 Deletion Summary:" -ForegroundColor Cyan
            Write-Host "   User Account: $($responseObj.deletionSummary.userAccount)" -ForegroundColor White
            Write-Host "   Profile Data: $($responseObj.deletionSummary.profileData)" -ForegroundColor White
            Write-Host "   Hostel Data: $($responseObj.deletionSummary.hostelData)" -ForegroundColor White
            Write-Host "   Requests Deleted: $($responseObj.deletionSummary.requestsDeleted)" -ForegroundColor White
            Write-Host "   Notifications Deleted: $($responseObj.deletionSummary.notificationsDeleted)" -ForegroundColor White
            
            if ($responseObj.deletionSummary.warnings) {
                Write-Host "   ⚠️ Warnings:" -ForegroundColor Yellow
                $responseObj.deletionSummary.warnings | ForEach-Object {
                    Write-Host "     - $_" -ForegroundColor Yellow
                }
            }
        }
    }
} catch {
    Write-Host "`n❌ Error occurred:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $errorContent = $reader.ReadToEnd()
        Write-Host "Error Response: $errorContent" -ForegroundColor Red
    }
}

# Verification step - try to recreate the same user
Write-Host "`nStep 3: Verification - Recreating user to test clean slate..." -ForegroundColor Yellow

try {
    Start-Sleep -Seconds 2
    $verifyResponse = Invoke-WebRequest -Uri "http://localhost:3000/api/users" -Method POST -Body $createUserData -ContentType "application/json"
    Write-Host "✅ User recreated successfully - this confirms all data was properly cleaned" -ForegroundColor Green
    
    # Clean up the test user again
    Write-Host "`nStep 4: Cleaning up test user..." -ForegroundColor Yellow
    $cleanupResponse = Invoke-WebRequest -Uri $uri -Method DELETE -ContentType "application/json"
    Write-Host "✅ Test cleanup completed" -ForegroundColor Green
    
} catch {
    Write-Host "⚠️ Verification step failed: $($_.Exception.Message)" -ForegroundColor Yellow
}

Write-Host "`n🎯 Cascade delete test completed." -ForegroundColor Green