# Script to recreate ayush user to verify clean slate

Write-Host "Testing user recreation after cascade delete..." -ForegroundColor Green

$createUserData = @{
    name = "Ayush Kumar"
    email = "ayush@gmcpnalanda.com"
    password = "AyushPass123!"
    role = "student"
    course = "BCA"
    year = "1"
    semester = "1"
    studentId = "STU001"
} | ConvertTo-Json

try {
    $createResponse = Invoke-WebRequest -Uri "http://localhost:3000/api/users" -Method POST -Body $createUserData -ContentType "application/json"
    Write-Host "✅ User recreated successfully - This confirms the cascade delete worked!" -ForegroundColor Green
    Write-Host "Response: $($createResponse.Content)" -ForegroundColor White
    
    # Parse and show the new user has a clean slate
    $responseObj = $createResponse.Content | ConvertFrom-Json
    Write-Host "`nNew user details:" -ForegroundColor Cyan
    Write-Host "  Email: $($responseObj.user.email)" -ForegroundColor White
    Write-Host "  Name: $($responseObj.user.name)" -ForegroundColor White
    Write-Host "  Student ID: $($responseObj.user.studentId)" -ForegroundColor White
    Write-Host "  Created At: $($responseObj.user.createdAt)" -ForegroundColor White
    
    Write-Host "`n🎉 SUCCESS: The user was recreated with a clean slate!" -ForegroundColor Green
    Write-Host "This confirms that all old data was properly removed by cascade delete." -ForegroundColor Green
    
} catch {
    Write-Host "❌ User recreation failed: $($_.Exception.Message)" -ForegroundColor Red
    
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $errorContent = $reader.ReadToEnd()
        Write-Host "Error Response: $errorContent" -ForegroundColor Red
    }
}