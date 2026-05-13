Write-Host "Biometric Integration Setup" -ForegroundColor Cyan
Write-Host ""

# Step 1: Check server
Write-Host "Step 1: Checking server..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "http://localhost:3000/api/health"
    Write-Host "Server is running" -ForegroundColor Green
} catch {
    Write-Host "Server not running. Start it with: npm start" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Step 2: Register device
Write-Host "Step 2: Registering device..." -ForegroundColor Yellow
$deviceBody = '{"deviceInfo":{"deviceId":"CUB7250700545","model":"X2008","manufacturer":"eSSL","serialNumber":"CUB7250700545"},"networkInfo":{"ipAddress":"192.168.60.74","port":3000},"location":{"name":"Main Entrance","building":"Main Building","floor":"Ground Floor"}}'

try {
    $result = Invoke-RestMethod -Uri "http://localhost:3000/api/biometric/devices" -Method POST -Body $deviceBody -ContentType "application/json"
    Write-Host "Device registered" -ForegroundColor Green
} catch {
    Write-Host "Device already registered or error occurred" -ForegroundColor Yellow
}
Write-Host ""

# Step 3: Enroll admin
Write-Host "Step 3: Enrolling admin..." -ForegroundColor Yellow
$enrollBody = '{"templateId":"1","deviceIds":["CUB7250700545"]}'

try {
    $result = Invoke-RestMethod -Uri "http://localhost:3000/api/biometric/users/admin@gmcpnalanda.com/enroll" -Method PUT -Body $enrollBody -ContentType "application/json"
    Write-Host "Admin enrolled (Template ID: 1)" -ForegroundColor Green
} catch {
    Write-Host "Enrollment failed or already enrolled" -ForegroundColor Yellow
}
Write-Host ""

# Step 4: Test punch
Write-Host "Step 4: Testing punch..." -ForegroundColor Yellow
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
$punchBody = "PUNCH`t1`t$timestamp`t0`t1`t0"
$headers = @{"Content-Type"="text/plain"; "SN"="CUB7250700545"}

try {
    $response = Invoke-RestMethod -Uri "http://localhost:3000/api/biometric/iclock/cdata" -Method POST -Body $punchBody -Headers $headers
    Write-Host "Server response: $response" -ForegroundColor Cyan
    
    if ($response -like "*OK*") {
        Write-Host "SUCCESS! Punch accepted!" -ForegroundColor Green
    } else {
        Write-Host "Punch sent but got error" -ForegroundColor Yellow
    }
} catch {
    Write-Host "Failed to send punch" -ForegroundColor Red
}
Write-Host ""

# Step 5: Check database
Write-Host "Step 5: Checking database..." -ForegroundColor Yellow
Start-Sleep -Seconds 1
node check-attendance.js

Write-Host ""
Write-Host "SETUP COMPLETE!" -ForegroundColor Green
Write-Host "Now punch your finger on the X2008 device" -ForegroundColor Cyan
