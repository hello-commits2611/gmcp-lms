Write-Host "FINAL BIOMETRIC TEST" -ForegroundColor Cyan
Write-Host ""

# Test the new simple endpoint
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
$body = "PUNCH`t1`t$timestamp`t0`t1`t0"
$headers = @{"Content-Type"="text/plain"; "SN"="CUB7250700545"}

Write-Host "Sending punch data..." -ForegroundColor Yellow
Write-Host "Endpoint: /api/biometric-simple/punch" -ForegroundColor Gray
Write-Host "Data: $body" -ForegroundColor Gray
Write-Host ""

try {
    $response = Invoke-RestMethod -Uri "http://localhost:3000/api/biometric-simple/punch" -Method POST -Body $body -Headers $headers
    
    Write-Host "Response: $response" -ForegroundColor Cyan
    
    if ($response -like "*OK*") {
        Write-Host ""
        Write-Host "SUCCESS! Punch accepted!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Checking database..." -ForegroundColor Yellow
        Start-Sleep -Seconds 1
        node check-attendance.js
    } else {
        Write-Host ""
        Write-Host "Got error response" -ForegroundColor Red
        Write-Host "Check server logs for details" -ForegroundColor Yellow
    }
} catch {
    Write-Host "Failed to send punch" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Gray
}
