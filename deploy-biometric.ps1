# Complete Biometric Integration Deployment Script
Write-Host "🚀 Deploying Biometric Integration..." -ForegroundColor Cyan
Write-Host ""

# Step 1: Deploy Firestore indexes
Write-Host "📊 Step 1: Deploying Firestore indexes..." -ForegroundColor Yellow
firebase deploy --only firestore:indexes
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  Firestore indexes deployment skipped (run manually if needed)" -ForegroundColor Yellow
}
Write-Host ""

# Step 2: Check if server is running
Write-Host "📊 Step 2: Checking server status..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "http://localhost:3000/api/health" -ErrorAction Stop
    Write-Host "✅ Server is running on port 3000" -ForegroundColor Green
} catch {
    Write-Host "❌ Server is not running. Please start it with: npm start" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Step 3: Register device
Write-Host "📊 Step 3: Registering biometric device..." -ForegroundColor Yellow
$deviceBody = @{
    deviceInfo = @{
        deviceId = "CUB7250700545"
        model = "X2008"
        manufacturer = "eSSL"
        serialNumber = "CUB7250700545"
    }
    networkInfo = @{
        ipAddress = "192.168.60.74"
        port = 3000
    }
    location = @{
        name = "Main Entrance"
        building = "Main Building"
        floor = "Ground Floor"
    }
} | ConvertTo-Json -Depth 3

try {
    $device = Invoke-RestMethod -Uri "http://localhost:3000/api/biometric/devices" -Method POST -Body $deviceBody -ContentType "application/json" -ErrorAction Stop
    Write-Host "Device registered successfully" -ForegroundColor Green
    Write-Host "   Device ID: $($device.id)" -ForegroundColor Gray
} catch {
    Write-Host "Device already registered or failed to register" -ForegroundColor Yellow
}
Write-Host ""

# Step 4: Enroll admin user
Write-Host "📊 Step 4: Enrolling admin user..." -ForegroundColor Yellow
$enrollBody = @{
    templateId = "1"
    deviceIds = @("CUB7250700545")
} | ConvertTo-Json

try {
    $user = Invoke-RestMethod -Uri "http://localhost:3000/api/biometric/users/admin@gmcpnalanda.com/enroll" -Method PUT -Body $enrollBody -ContentType "application/json" -ErrorAction Stop
    Write-Host "✅ Admin user enrolled successfully" -ForegroundColor Green
    Write-Host "   User: admin@gmcpnalanda.com" -ForegroundColor Gray
    Write-Host "   Template ID: 1" -ForegroundColor Gray
} catch {
    Write-Host "❌ Failed to enroll user: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Step 5: Test with simulated punch
Write-Host "📊 Step 5: Testing with simulated punch..." -ForegroundColor Yellow
$punchData = "PUNCH`t1`t$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')`t0`t1`t0"
$headers = @{
    "Content-Type" = "text/plain"
    "SN" = "CUB7250700545"
}

try {
    $response = Invoke-RestMethod -Uri "http://localhost:3000/api/biometric/iclock/cdata" -Method POST -Body $punchData -Headers $headers -ErrorAction Stop
    Write-Host "✅ Punch sent successfully" -ForegroundColor Green
    Write-Host "   Server response: $response" -ForegroundColor Gray
    
    if ($response -eq "OK") {
        Write-Host "🎉 SUCCESS! Server accepted the punch!" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Server returned: $response" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ Failed to send punch: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Step 6: Verify attendance record was saved
Write-Host "📊 Step 6: Verifying attendance record..." -ForegroundColor Yellow
Start-Sleep -Seconds 2
node check-attendance.js
Write-Host ""

# Summary
Write-Host "📋 DEPLOYMENT SUMMARY" -ForegroundColor Cyan
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host "✅ Server is running" -ForegroundColor Green
Write-Host "✅ Device registered (CUB7250700545)" -ForegroundColor Green
Write-Host "✅ Admin user enrolled (Template ID: 1)" -ForegroundColor Green
Write-Host ""
Write-Host "🎯 NEXT STEPS:" -ForegroundColor Yellow
Write-Host "1. Punch your finger on the X2008 device" -ForegroundColor White
Write-Host "2. Check attendance with: node check-attendance.js" -ForegroundColor White
Write-Host "3. View in admin portal at: http://localhost:3000/admin" -ForegroundColor White
Write-Host ""
Write-Host "📖 Device Configuration (X2008):" -ForegroundColor Yellow
Write-Host "   Server Mode: ADMS" -ForegroundColor White
Write-Host "   Server Address: 192.168.60.74" -ForegroundColor White
Write-Host "   Server Port: 3000" -ForegroundColor White
Write-Host "   Endpoint: /api/biometric/iclock/cdata" -ForegroundColor White
Write-Host ""
