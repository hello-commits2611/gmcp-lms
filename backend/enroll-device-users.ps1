Write-Host "Enrolling users with device PINs..." -ForegroundColor Cyan
Write-Host ""

# PIN 1093 - Roushan (assign to buddy@gmcpnalanda.com or create new user)
Write-Host "Enrolling user for PIN 1093 (Roushan)..." -ForegroundColor Yellow
$enroll1 = '{"templateId":"1093","deviceIds":["CUB7250700545"]}'
try {
    Invoke-RestMethod -Uri "http://localhost:3000/api/biometric/users/buddy@gmcpnalanda.com/enroll" -Method PUT -Body $enroll1 -ContentType "application/json"
    Write-Host "Enrolled buddy@gmcpnalanda.com with PIN 1093" -ForegroundColor Green
} catch {
    Write-Host "Failed to enroll PIN 1093" -ForegroundColor Red
}

Write-Host ""

# PIN 0001 - Card (assign to hi@gmcpnalanda.com)
Write-Host "Enrolling user for PIN 0001 (Card)..." -ForegroundColor Yellow
$enroll2 = '{"templateId":"0001","deviceIds":["CUB7250700545"]}'
try {
    Invoke-RestMethod -Uri "http://localhost:3000/api/biometric/users/hi@gmcpnalanda.com/enroll" -Method PUT -Body $enroll2 -ContentType "application/json"
    Write-Host "Enrolled hi@gmcpnalanda.com with PIN 0001" -ForegroundColor Green
} catch {
    Write-Host "Failed to enroll PIN 0001" -ForegroundColor Red
}

Write-Host ""

# Also try PIN 1 for admin (in case device sends it without leading zeros)
Write-Host "Re-enrolling admin with various PIN formats..." -ForegroundColor Yellow
$formats = @("1", "01", "001", "0001", "1093")
foreach ($pin in $formats) {
    $enrollBody = "{`"templateId`":`"$pin`",`"deviceIds`":[`"CUB7250700545`"]}"
    try {
        Invoke-RestMethod -Uri "http://localhost:3000/api/biometric/users/admin@gmcpnalanda.com/enroll" -Method PUT -Body $enrollBody -ContentType "application/json" -ErrorAction SilentlyContinue | Out-Null
        Write-Host "  Enrolled admin with PIN $pin" -ForegroundColor Gray
    } catch {}
}

Write-Host ""
Write-Host "Done! Now when users punch on the device, it should work!" -ForegroundColor Green
Write-Host ""
Write-Host "Device users detected:" -ForegroundColor Cyan
Write-Host "  PIN 1093 = Roushan (mapped to buddy@gmcpnalanda.com)" -ForegroundColor White
Write-Host "  PIN 0001 = Card (mapped to hi@gmcpnalanda.com)" -ForegroundColor White
