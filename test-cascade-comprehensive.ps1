# Comprehensive Cascade Delete Test
Write-Host "Comprehensive Cascade Delete Test" -ForegroundColor Green
Write-Host "=================================" -ForegroundColor Green
Write-Host ""

$baseUrl = "http://localhost:3000"

# Test user details
$testEmail = "comprehensive-test@example.com"
$testUsername = "comprehensiveuser"
$testPassword = "CompTest123!"

Write-Host "Step 1: Cleaning up any existing test data..." -ForegroundColor Yellow

# Login as admin first
$adminLoginBody = @{
    email = "admin@gmcpnalanda.com"
    password = "AdminGMCP@2025"
} | ConvertTo-Json

$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
try {
    $adminLoginResponse = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" -Method POST -Body $adminLoginBody -ContentType "application/json" -WebSession $session
    Write-Host "Admin login successful" -ForegroundColor Green
    
    # Try to delete any existing test user
    try {
        $cleanupResponse = Invoke-RestMethod -Uri "$baseUrl/api/users/delete-user/$testEmail" -Method DELETE -WebSession $session
        Write-Host "Cleaned up existing test data" -ForegroundColor Cyan
    } catch {
        # Ignore cleanup errors
    }
} catch {
    Write-Host "Failed to login as admin: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host ""

Write-Host "Step 2: Creating comprehensive test user..." -ForegroundColor Yellow
$createUserBody = @{
    username = $testUsername
    email = $testEmail
    password = $testPassword
    role = "student"
} | ConvertTo-Json

try {
    $createResponse = Invoke-RestMethod -Uri "$baseUrl/api/auth/register" -Method POST -Body $createUserBody -ContentType "application/json"
    Write-Host "Test user created successfully" -ForegroundColor Green
} catch {
    Write-Host "Failed to create test user: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host ""

Write-Host "Step 3: Creating comprehensive profile data..." -ForegroundColor Yellow
$profileData = @{
    username = $testUsername
    email = $testEmail
    fullName = "Comprehensive Test User"
    phoneNumber = "1234567890"
    emergencyContactName = "Emergency Contact Person"
    emergencyContactPhone = "9876543210"
    address = "123 Test Street, Test City, Test State"
    studentId = "COMP123"
    course = "Computer Science"
    year = "2024"
    dateOfBirth = "2000-01-01"
    gender = "Male"
    bloodGroup = "O+"
    fatherName = "Test Father"
    motherName = "Test Mother"
    guardianName = "Test Guardian"
    guardianRelation = "Father"
    guardianPhone = "9999999999"
    permanentAddress = "456 Permanent Street, Permanent City"
    category = "General"
    nationality = "Indian"
    religion = "Hindu"
    caste = "General"
    admissionDate = "2024-01-01"
    previousSchool = "Test High School"
    percentage = "85.5"
} | ConvertTo-Json

try {
    $profileResponse = Invoke-RestMethod -Uri "$baseUrl/api/profile/create" -Method POST -Body $profileData -ContentType "application/json" -WebSession $session
    Write-Host "Comprehensive profile created successfully" -ForegroundColor Green
} catch {
    Write-Host "Failed to create profile: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

Write-Host "Step 4: Creating detailed hostel data..." -ForegroundColor Yellow
$hostelData = @{
    email = $testEmail
    hostelName = "Comprehensive Test Hostel"
    roomNumber = "C101"
    blockName = "Comprehensive Block"
    floorNumber = "1"
    bedNumber = "B1"
    hostelType = "Boys"
    messType = "Veg"
    allotmentDate = "2024-01-01"
    feesPaid = "true"
    securityDeposit = "5000"
    wardenName = "Test Warden"
    wardenContact = "8888888888"
    wardenEmail = "warden@test.com"
    facilityAccess = "WiFi,Library,Gym"
    roomType = "Shared"
    acFacility = "true"
    remarks = "Test hostel assignment for comprehensive testing"
} | ConvertTo-Json

try {
    $hostelResponse = Invoke-RestMethod -Uri "$baseUrl/api/hostel/admin/assign-hostel" -Method POST -Body $hostelData -ContentType "application/json" -WebSession $session
    Write-Host "Detailed hostel data created successfully" -ForegroundColor Green
} catch {
    Write-Host "Failed to create hostel data: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

Write-Host "Step 5: Creating multiple requests..." -ForegroundColor Yellow

# Login as the test user
$testUserLoginBody = @{
    email = $testEmail
    password = $testPassword
} | ConvertTo-Json

$testUserSession = New-Object Microsoft.PowerShell.Commands.WebRequestSession
try {
    $testUserLoginResponse = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" -Method POST -Body $testUserLoginBody -ContentType "application/json" -WebSession $testUserSession
    Write-Host "Test user login successful" -ForegroundColor Green
    
    # Create multiple requests
    Write-Host "Creating Outing Request 1..." -ForegroundColor Cyan
    $outingRequest1 = @{
        email = $testEmail
        outingDate = (Get-Date).AddDays(1).ToString("yyyy-MM-dd")
        outingStartTime = "10:00"
        outingEndTime = "16:00"
        purposeOfOuting = "Comprehensive testing - shopping"
        placeOfVisit = "City Mall"
        contactNoDuringOuting = "1111111111"
        expectedReturnTime = "16:00"
    } | ConvertTo-Json
    
    $outingResponse1 = Invoke-RestMethod -Uri "$baseUrl/api/hostel/quick-action/outing" -Method POST -Body $outingRequest1 -ContentType "application/json" -WebSession $testUserSession
    Write-Host "Outing Request 1 created: ID $($outingResponse1.requestId)" -ForegroundColor Green
    
    Start-Sleep -Seconds 1
    
    Write-Host "Creating Outing Request 2..." -ForegroundColor Cyan
    $outingRequest2 = @{
        email = $testEmail
        outingDate = (Get-Date).AddDays(2).ToString("yyyy-MM-dd")
        outingStartTime = "14:00"
        outingEndTime = "20:00"
        purposeOfOuting = "Comprehensive testing - medical"
        placeOfVisit = "Hospital"
        contactNoDuringOuting = "2222222222"
        expectedReturnTime = "20:00"
    } | ConvertTo-Json
    
    $outingResponse2 = Invoke-RestMethod -Uri "$baseUrl/api/hostel/quick-action/outing" -Method POST -Body $outingRequest2 -ContentType "application/json" -WebSession $testUserSession
    Write-Host "Outing Request 2 created: ID $($outingResponse2.requestId)" -ForegroundColor Green
    
    Start-Sleep -Seconds 1
    
    Write-Host "Creating Leave Hostel Request..." -ForegroundColor Cyan
    $leaveRequest = @{
        email = $testEmail
        leaveStartDate = (Get-Date).AddDays(5).ToString("yyyy-MM-dd")
        leaveEndDate = (Get-Date).AddDays(10).ToString("yyyy-MM-dd")
        purposeOfLeave = "Comprehensive testing - family visit"
        placeOfVisit = "Home Town"
        contactNoDuringLeave = "3333333333"
        parentApproval = "true"
        emergencyContact = "Emergency Contact"
        emergencyContactNumber = "4444444444"
        transportMode = "Bus"
        expectedDepartureTime = "08:00"
        expectedArrivalTime = "18:00"
    } | ConvertTo-Json
    
    $leaveResponse = Invoke-RestMethod -Uri "$baseUrl/api/hostel/quick-action/leave_hostel" -Method POST -Body $leaveRequest -ContentType "application/json" -WebSession $testUserSession
    Write-Host "Leave Request created: ID $($leaveResponse.requestId)" -ForegroundColor Green
    
} catch {
    Write-Host "Failed to create requests: $($_.Exception.Message)" -ForegroundColor Yellow
}

Write-Host ""

Write-Host "Step 6: Comprehensive data verification BEFORE deletion..." -ForegroundColor Yellow

# Check user account
$userCheck = Invoke-RestMethod -Uri "$baseUrl/api/users/admin/all-users" -Method GET -WebSession $session
$testUser = $userCheck.users | Where-Object { $_.email -eq $testEmail }
if ($testUser) {
    Write-Host "User Account: FOUND - Email: $($testUser.email), Role: $($testUser.role)" -ForegroundColor Green
} else {
    Write-Host "User Account: NOT FOUND" -ForegroundColor Red
}

# Check profile
$profileCheck = Invoke-RestMethod -Uri "$baseUrl/api/profile/admin/all-profiles" -Method GET -WebSession $session
$testProfile = $profileCheck.profiles | Where-Object { $_.email -eq $testEmail }
if ($testProfile) {
    Write-Host "Profile Data: FOUND - Name: $($testProfile.fullName), Student ID: $($testProfile.studentId)" -ForegroundColor Green
} else {
    Write-Host "Profile Data: NOT FOUND" -ForegroundColor Red
}

# Check hostel data
$hostelCheck = Invoke-RestMethod -Uri "$baseUrl/api/hostel/admin/all-hostel-data" -Method GET -WebSession $session
$testHostel = $hostelCheck.students | Where-Object { $_.email -eq $testEmail }
if ($testHostel) {
    Write-Host "Hostel Data: FOUND - Room: $($testHostel.roomNumber), Hostel: $($testHostel.hostelName)" -ForegroundColor Green
} else {
    Write-Host "Hostel Data: NOT FOUND" -ForegroundColor Red
}

# Check requests
$requestsCheck = Invoke-RestMethod -Uri "$baseUrl/api/hostel/admin/all-requests" -Method GET -WebSession $session
$testRequests = $requestsCheck.requests | Where-Object { $_.email -eq $testEmail }
if ($testRequests) {
    Write-Host "Requests: FOUND - $($testRequests.Count) request(s)" -ForegroundColor Green
    foreach ($request in $testRequests) {
        Write-Host "  - $($request.type) request (ID: $($request.id), Status: $($request.status))" -ForegroundColor Cyan
    }
} else {
    Write-Host "Requests: NOT FOUND" -ForegroundColor Red
}

Write-Host ""

Write-Host "Step 7: PERFORMING COMPREHENSIVE CASCADE DELETE..." -ForegroundColor Red
Write-Host "WARNING: This will permanently delete ALL user data!" -ForegroundColor Red
Write-Host ""

Start-Sleep -Seconds 2

try {
    $deleteResponse = Invoke-RestMethod -Uri "$baseUrl/api/users/delete-user/$testEmail" -Method DELETE -WebSession $session
    Write-Host "CASCADE DELETE COMPLETED SUCCESSFULLY!" -ForegroundColor Green
    if ($deleteResponse.message) {
        Write-Host "Server Response: $($deleteResponse.message)" -ForegroundColor Cyan
    }
    if ($deleteResponse.deletedFrom) {
        Write-Host "Deleted from databases: $($deleteResponse.deletedFrom -join ', ')" -ForegroundColor Cyan
    }
} catch {
    Write-Host "CASCADE DELETE FAILED: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Response body: $($_.ErrorDetails.Message)" -ForegroundColor Red
    exit 1
}

Write-Host ""

Write-Host "Step 8: COMPREHENSIVE VERIFICATION AFTER CASCADE DELETE..." -ForegroundColor Yellow

$allDataDeleted = $true

# Verify user account deletion
$userCheckAfter = Invoke-RestMethod -Uri "$baseUrl/api/users/admin/all-users" -Method GET -WebSession $session
$deletedUser = $userCheckAfter.users | Where-Object { $_.email -eq $testEmail }
if ($deletedUser) {
    Write-Host "FAIL: User account still exists!" -ForegroundColor Red
    $allDataDeleted = $false
} else {
    Write-Host "PASS: User account successfully deleted" -ForegroundColor Green
}

# Verify profile deletion
$profileCheckAfter = Invoke-RestMethod -Uri "$baseUrl/api/profile/admin/all-profiles" -Method GET -WebSession $session
$deletedProfile = $profileCheckAfter.profiles | Where-Object { $_.email -eq $testEmail }
if ($deletedProfile) {
    Write-Host "FAIL: Profile data still exists!" -ForegroundColor Red
    $allDataDeleted = $false
} else {
    Write-Host "PASS: Profile data successfully deleted" -ForegroundColor Green
}

# Verify hostel deletion
$hostelCheckAfter = Invoke-RestMethod -Uri "$baseUrl/api/hostel/admin/all-hostel-data" -Method GET -WebSession $session
$deletedHostel = $hostelCheckAfter.students | Where-Object { $_.email -eq $testEmail }
if ($deletedHostel) {
    Write-Host "FAIL: Hostel data still exists!" -ForegroundColor Red
    $allDataDeleted = $false
} else {
    Write-Host "PASS: Hostel data successfully deleted" -ForegroundColor Green
}

# Verify request deletion
$requestsCheckAfter = Invoke-RestMethod -Uri "$baseUrl/api/hostel/admin/all-requests" -Method GET -WebSession $session
$deletedRequests = $requestsCheckAfter.requests | Where-Object { $_.email -eq $testEmail }
if ($deletedRequests) {
    Write-Host "FAIL: Request data still exists! ($($deletedRequests.Count) requests remain)" -ForegroundColor Red
    foreach ($request in $deletedRequests) {
        Write-Host "  - Remaining: $($request.type) request (ID: $($request.id))" -ForegroundColor Red
    }
    $allDataDeleted = $false
} else {
    Write-Host "PASS: Request data successfully deleted" -ForegroundColor Green
}

Write-Host ""
Write-Host "=============================================" -ForegroundColor Green
if ($allDataDeleted) {
    Write-Host "COMPREHENSIVE CASCADE DELETE TEST: SUCCESS!" -ForegroundColor Green
    Write-Host "All user data was completely removed from the system." -ForegroundColor Green
} else {
    Write-Host "COMPREHENSIVE CASCADE DELETE TEST: FAILED!" -ForegroundColor Red
    Write-Host "Some user data was not properly deleted." -ForegroundColor Red
}
Write-Host "=============================================" -ForegroundColor Green