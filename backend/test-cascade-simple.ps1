# Test Cascade Delete Functionality
Write-Host "Testing Cascade Delete Functionality" -ForegroundColor Green
Write-Host "====================================" -ForegroundColor Green
Write-Host ""

$baseUrl = "http://localhost:3000"

# Test user details
$testEmail = "test-cascade-delete@example.com"
$testUsername = "testcascadeuser"
$testPassword = "Test123!"

Write-Host "Step 1: Creating test user..." -ForegroundColor Yellow
$createUserBody = @{
    username = $testUsername
    email = $testEmail
    password = $testPassword
    role = "student"
} | ConvertTo-Json

try {
    $createResponse = Invoke-RestMethod -Uri "$baseUrl/api/auth/register" -Method POST -Body $createUserBody -ContentType "application/json"
    Write-Host "Test user created successfully" -ForegroundColor Green
    Write-Host "User ID: $($createResponse.userId)" -ForegroundColor Cyan
} catch {
    Write-Host "Failed to create test user or user already exists: $($_.Exception.Message)" -ForegroundColor Yellow
}

Write-Host ""

# First, let's login as admin to get session cookies
Write-Host "Step 2: Logging in as admin..." -ForegroundColor Yellow
$adminLoginBody = @{
    email = "admin@gmcpnalanda.com"
    password = "AdminGMCP@2025"
} | ConvertTo-Json

try {
    # Create a session variable to maintain cookies
    $session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
    
    $adminLoginResponse = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" -Method POST -Body $adminLoginBody -ContentType "application/json" -WebSession $session
    Write-Host "Admin login successful" -ForegroundColor Green
} catch {
    Write-Host "Failed to login as admin: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Create some test data for the user
Write-Host "Step 3: Creating test profile data..." -ForegroundColor Yellow
$profileData = @{
    username = $testUsername
    email = $testEmail
    fullName = "Test Cascade User"
    phoneNumber = "1234567890"
    emergencyContactName = "Emergency Contact"
    emergencyContactPhone = "9876543210"
    address = "Test Address"
    studentId = "TEST123"
    course = "Computer Science"
    year = "2024"
} | ConvertTo-Json

try {
    $profileResponse = Invoke-RestMethod -Uri "$baseUrl/api/profile/create" -Method POST -Body $profileData -ContentType "application/json" -WebSession $session
    Write-Host "Test profile created successfully" -ForegroundColor Green
} catch {
    Write-Host "Profile creation failed or already exists: $($_.Exception.Message)" -ForegroundColor Yellow
}

Write-Host ""

# Create hostel data
Write-Host "Step 4: Creating test hostel data..." -ForegroundColor Yellow
$hostelData = @{
    email = $testEmail
    hostelName = "Test Hostel"
    roomNumber = "T101"
    blockName = "Test Block"
    floorNumber = "1"
} | ConvertTo-Json

try {
    $hostelResponse = Invoke-RestMethod -Uri "$baseUrl/api/hostel/admin/assign-hostel" -Method POST -Body $hostelData -ContentType "application/json" -WebSession $session
    Write-Host "Test hostel data created successfully" -ForegroundColor Green
} catch {
    Write-Host "Hostel data creation failed or already exists: $($_.Exception.Message)" -ForegroundColor Yellow
}

Write-Host ""

# Create a test request
Write-Host "Step 5: Creating test request..." -ForegroundColor Yellow

# Login as the test user to create a request
$testUserLoginBody = @{
    email = $testEmail
    password = $testPassword
} | ConvertTo-Json

try {
    $testUserSession = New-Object Microsoft.PowerShell.Commands.WebRequestSession
    $testUserLoginResponse = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" -Method POST -Body $testUserLoginBody -ContentType "application/json" -WebSession $testUserSession
    Write-Host "Test user login successful" -ForegroundColor Green
    
    # Create an outing request
    $requestData = @{
        email = $testEmail
        outingDate = (Get-Date).AddDays(1).ToString("yyyy-MM-dd")
        outingStartTime = "10:00"
        outingEndTime = "16:00"
        purposeOfOuting = "Testing cascade delete"
        placeOfVisit = "Test Location"
        contactNoDuringOuting = "1234567890"
        expectedReturnTime = "16:00"
    } | ConvertTo-Json
    
    $requestResponse = Invoke-RestMethod -Uri "$baseUrl/api/hostel/quick-action/outing" -Method POST -Body $requestData -ContentType "application/json" -WebSession $testUserSession
    Write-Host "Test request created successfully" -ForegroundColor Green
    Write-Host "Request ID: $($requestResponse.requestId)" -ForegroundColor Cyan
} catch {
    Write-Host "Failed to create test request: $($_.Exception.Message)" -ForegroundColor Yellow
}

Write-Host ""

# Now verify data exists before deletion
Write-Host "Step 6: Verifying data exists before deletion..." -ForegroundColor Yellow

# Check profile
try {
    $profileCheck = Invoke-RestMethod -Uri "$baseUrl/api/profile/admin/all-profiles" -Method GET -WebSession $session
    $userProfile = $profileCheck.profiles | Where-Object { $_.email -eq $testEmail }
    if ($userProfile) {
        Write-Host "Profile data found for test user" -ForegroundColor Green
    } else {
        Write-Host "No profile data found for test user" -ForegroundColor Yellow
    }
} catch {
    Write-Host "Error checking profile data: $($_.Exception.Message)" -ForegroundColor Red
}

# Check hostel data
try {
    $hostelCheck = Invoke-RestMethod -Uri "$baseUrl/api/hostel/admin/all-hostel-data" -Method GET -WebSession $session
    $userHostel = $hostelCheck.students | Where-Object { $_.email -eq $testEmail }
    if ($userHostel) {
        Write-Host "Hostel data found for test user" -ForegroundColor Green
    } else {
        Write-Host "No hostel data found for test user" -ForegroundColor Yellow
    }
} catch {
    Write-Host "Error checking hostel data: $($_.Exception.Message)" -ForegroundColor Red
}

# Check requests
try {
    $requestsCheck = Invoke-RestMethod -Uri "$baseUrl/api/hostel/admin/all-requests" -Method GET -WebSession $session
    $userRequests = $requestsCheck.requests | Where-Object { $_.email -eq $testEmail }
    if ($userRequests) {
        $requestCount = $userRequests.Count
        Write-Host "Request data found for test user ($requestCount requests)" -ForegroundColor Green
    } else {
        Write-Host "No request data found for test user" -ForegroundColor Yellow
    }
} catch {
    Write-Host "Error checking request data: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Now perform the cascade delete
Write-Host "Step 7: Performing cascade delete..." -ForegroundColor Yellow
Write-Host "This will delete the user and ALL associated data!" -ForegroundColor Red

try {
    $deleteResponse = Invoke-RestMethod -Uri "$baseUrl/api/users/delete-user/$testEmail" -Method DELETE -WebSession $session
    Write-Host "Cascade delete completed successfully" -ForegroundColor Green
    Write-Host "Response: $($deleteResponse.message)" -ForegroundColor Cyan
} catch {
    Write-Host "Failed to delete user: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Response body: $($_.ErrorDetails.Message)" -ForegroundColor Red
}

Write-Host ""

# Verify data has been deleted
Write-Host "Step 8: Verifying cascade delete worked..." -ForegroundColor Yellow

# Check if user account is deleted
try {
    $userCheck = Invoke-RestMethod -Uri "$baseUrl/api/users/admin/all-users" -Method GET -WebSession $session
    $deletedUser = $userCheck.users | Where-Object { $_.email -eq $testEmail }
    if ($deletedUser) {
        Write-Host "ERROR: User account still exists!" -ForegroundColor Red
    } else {
        Write-Host "SUCCESS: User account deleted" -ForegroundColor Green
    }
} catch {
    Write-Host "Error checking user account: $($_.Exception.Message)" -ForegroundColor Red
}

# Check profile deletion
try {
    $profileCheck = Invoke-RestMethod -Uri "$baseUrl/api/profile/admin/all-profiles" -Method GET -WebSession $session
    $userProfile = $profileCheck.profiles | Where-Object { $_.email -eq $testEmail }
    if ($userProfile) {
        Write-Host "ERROR: Profile data still exists!" -ForegroundColor Red
    } else {
        Write-Host "SUCCESS: Profile data deleted" -ForegroundColor Green
    }
} catch {
    Write-Host "Error checking profile data: $($_.Exception.Message)" -ForegroundColor Red
}

# Check hostel deletion
try {
    $hostelCheck = Invoke-RestMethod -Uri "$baseUrl/api/hostel/admin/all-hostel-data" -Method GET -WebSession $session
    $userHostel = $hostelCheck.students | Where-Object { $_.email -eq $testEmail }
    if ($userHostel) {
        Write-Host "ERROR: Hostel data still exists!" -ForegroundColor Red
    } else {
        Write-Host "SUCCESS: Hostel data deleted" -ForegroundColor Green
    }
} catch {
    Write-Host "Error checking hostel data: $($_.Exception.Message)" -ForegroundColor Red
}

# Check request deletion
try {
    $requestsCheck = Invoke-RestMethod -Uri "$baseUrl/api/hostel/admin/all-requests" -Method GET -WebSession $session
    $userRequests = $requestsCheck.requests | Where-Object { $_.email -eq $testEmail }
    if ($userRequests) {
        $remainingCount = $userRequests.Count
        Write-Host "ERROR: Request data still exists! ($remainingCount requests)" -ForegroundColor Red
    } else {
        Write-Host "SUCCESS: Request data deleted" -ForegroundColor Green
    }
} catch {
    Write-Host "Error checking request data: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "=====================================" -ForegroundColor Green
Write-Host "Cascade Delete Test Completed!" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Green