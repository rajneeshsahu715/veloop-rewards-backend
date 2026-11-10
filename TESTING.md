# VELoop Rewards � Testing Documentation

## 1. Testing Overview

The VELoop Rewards backend has been tested using Windows PowerShell HTTP requests and direct Node.js checks.

Testing covers API responses, authentication, validation, authorization and selected business logic.

These are manual tests. A complete automated test suite has not yet been configured.

## 2. Test Environment

- Runtime: Node.js
- Backend: Express.js
- Database: MongoDB Atlas
- API testing: Windows PowerShell
- Default backend URL: http://localhost:5000

## 3. Start the Backend

Run:

```powershell
npm install
npm run dev
```

Confirm that the server starts and MongoDB connects successfully.

## 4. Health Check

```powershell
Invoke-RestMethod -Method GET -Uri "http://localhost:5000/"
```

Expected result: successful backend health response.

## 5. Admin Authentication Tests

Endpoint:

POST /api/admin/auth/login

Test scenarios:

- Valid admin credentials.
- Missing authorization token on protected routes.
- Invalid JWT token.
- Expired JWT token.
- User-role token accessing admin routes.
- Inactive admin account.

Previously verified outcomes:

| Scenario | Expected result |
|---|---|
| Missing admin token | HTTP 401 |
| Invalid token | HTTP 401 |
| Expired token | HTTP 401 |
| User-role token | HTTP 403 |
| Inactive admin | HTTP 403 |

## 6. Admin API Validation Tests

Previously tested scenarios include:

| Module | Test | Result |
|---|---|---|
| Users | Invalid account status | Validation error |
| User details | Invalid user ID | Validation error |
| Wallet | Invalid currency | Validation error |
| Withdrawals | Invalid status filter | Validation error |
| Withdrawals | Invalid status action | Validation error |
| Referrals | Invalid status filter | HTTP 400 |
| Referrals | Invalid referral ID | HTTP 400 |
| Referrals | Valid-format but nonexistent ID | HTTP 404 |
| Audit logs | Invalid target type | Validation error |

## 7. Admin Listing Tests

The following listing endpoints have been manually checked:

- GET /api/admin/users?page=1&limit=10
- GET /api/admin/withdrawals?page=1&limit=10
- GET /api/admin/referrals?page=1&limit=10
- GET /api/admin/audit-logs?page=1&limit=10

Referral status filtering, referral code search and referral details have also been checked.

## 8. User API Security Tests

The following areas have been reviewed:

- User authentication middleware.
- Profile access using the authenticated user ID.
- Profile update ownership.
- Wallet access scoped to the authenticated user.
- Withdrawal history and details scoped to the authenticated user.
- Withdrawal creation using the authenticated user ID rather than trusting a submitted user ID.

## 9. PowerShell Testing Example

Admin login:

```powershell
$loginResponse = Invoke-RestMethod `
    -Method POST `
    -Uri "http://localhost:5000/api/admin/auth/login" `
    -ContentType "application/json" `
    -Body (@{
        email = "YOUR_ADMIN_EMAIL"
        password = "YOUR_ADMIN_PASSWORD"
    } | ConvertTo-Json)

$adminToken = $loginResponse.data.token

$headers = @{
    Authorization = "Bearer $adminToken"
}
```

Test the admin dashboard:

```powershell
Invoke-RestMethod `
    -Method GET `
    -Uri "http://localhost:5000/api/admin/dashboard" `
    -Headers $headers
```

Use your own configured admin credentials. Never commit credentials or tokens.

## 10. Additional Tests Recommended Before Submission

- Register a new user with valid data.
- Test duplicate email registration.
- Test invalid login credentials.
- Test profile retrieval and update.
- Test profile image upload with valid and invalid files.
- Verify wallet creation and balance calculations.
- Test withdrawal creation and status transitions.
- Test wallet and withdrawal ownership using two different users.
- Test level and achievement create/update operations.
- Test pagination boundaries and invalid query parameters.
- Test referral records with multiple users.
- Verify audit log creation for administrative actions.
- Run the complete API regression test after final changes.

## 11. Testing Limitations

- Tests documented as previously verified are manual checks, not automated regression tests.
- Empty database results do not prove every business workflow.
- Concurrent withdrawal requests and production load have not been fully stress-tested.
- Production deployment and integration testing should be completed separately.

---

Testing documentation should be updated whenever new test cases are executed or API behavior changes.
