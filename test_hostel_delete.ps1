# PowerShell script to test hostel delete functionality

Write-Host "Testing Hostel Delete Endpoint..." -ForegroundColor Green

# Test with DELETE request to the API
$email = "naman@gmcpnalanda.com"
$uri = "http://localhost:3000/api/hostel/admin/delete-student-hostel/$($email)"

Write-Host "Attempting to delete hostel record for: $email" -ForegroundColor Yellow
Write-Host "Endpoint: $uri" -ForegroundColor Cyan

try {
    $response = Invoke-WebRequest -Uri $uri -Method DELETE -ContentType "application/json"
    
    Write-Host "Response Status: $($response.StatusCode)" -ForegroundColor Green
    Write-Host "Response Content:" -ForegroundColor Green
    Write-Host $response.Content -ForegroundColor White
    
    if ($response.StatusCode -eq 200) {
        Write-Host "Delete request successful!" -ForegroundColor Green
    } else {
        Write-Host "Delete request failed with status: $($response.StatusCode)" -ForegroundColor Red
    }
} catch {
    Write-Host "Error occurred:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $errorContent = $reader.ReadToEnd()
        Write-Host "Error Response: $errorContent" -ForegroundColor Red
    }
}

Write-Host "`nTest completed." -ForegroundColor Green