# VELoop Rewards � Admin Guide

## 1. Overview

The VELoop Rewards Admin API provides administrative functionality for managing users, wallets, withdrawals, levels, achievements, referrals and audit logs.

All admin endpoints require administrator authentication except the admin login endpoint.

## 2. Start the Backend

Open PowerShell in the backend project directory.

Install dependencies:

```powershell
npm install
```

Start the development server:

```powershell
npm run dev
```

Default backend URL:

http://localhost:5000

Health check:

GET /

## 3. Admin Login

Endpoint:

POST /api/admin/auth/login

Request body:

```json
{
  "email": "YOUR_ADMIN_EMAIL",
  "password": "YOUR_ADMIN_PASSWORD"
}
```

On successful login, the API returns an admin authentication token.

Store the token in PowerShell:

```powershell
$adminToken = $loginResponse.data.token

$headers = @{
    Authorization = "Bearer $adminToken"
}
```

Never share or publish the token.

## 4. Admin Profile

GET /api/admin/auth/me

Required header:

Authorization: Bearer YOUR_ADMIN_TOKEN

Returns the authenticated administrator profile.

## 5. Admin Dashboard

GET /api/admin/dashboard

Provides available dashboard statistics such as user counts, withdrawal counts and referral information.

## 6. User Management

List users:

GET /api/admin/users?page=1&limit=10

Get user details:

GET /api/admin/user-details/USER_ID

Update user account status:

PATCH /api/admin/users/USER_ID/status

Refer to API_DOCUMENTATION.md for request body details.

## 7. Wallet Management

Adjust a user's wallet:

PATCH /api/admin/wallet/USER_ID/adjust

Wallet currency types:
- VE
- SVE
- GEMS
- TOKENS

Only authorized administrators should perform wallet adjustments.

## 8. Withdrawal Management

List withdrawals:

GET /api/admin/withdrawals?page=1&limit=10

Update withdrawal status:

PATCH /api/admin/withdrawals/WITHDRAWAL_ID/status

Supported statuses:
- PENDING
- APPROVED
- REJECTED
- COMPLETED

Review withdrawal details before performing administrative actions.

## 9. Level Management

List levels:

GET /api/admin/levels

Get a level:

GET /api/admin/levels/LEVEL_ID

Create a level:

POST /api/admin/levels

Update a level:

PATCH /api/admin/levels/LEVEL_ID

## 10. Achievement Management

List achievements:

GET /api/admin/achievements

Get achievement details:

GET /api/admin/achievements/ACHIEVEMENT_ID

Create an achievement:

POST /api/admin/achievements

Update an achievement:

PATCH /api/admin/achievements/ACHIEVEMENT_ID

## 11. Referral Management

List referrals:

GET /api/admin/referrals?page=1&limit=10

Filter referrals:

GET /api/admin/referrals?status=PENDING

Search referrals:

GET /api/admin/referrals?search=REFERRAL_CODE

Get referral details:

GET /api/admin/referrals/REFERRAL_ID

Referral status values:
- PENDING
- COMPLETED
- CANCELLED

The current admin referral API supports listing and viewing referral records. Do not assume that referral reward issuance or status updates are available through this module.

## 12. Audit Logs

List audit logs:

GET /api/admin/audit-logs?page=1&limit=10

Filter audit logs:

GET /api/admin/audit-logs?targetType=LEVEL

Audit logs help review administrative activity.

## 13. PowerShell API Testing Example

```powershell
$adminToken = $loginResponse.data.token

$headers = @{
    Authorization = "Bearer $adminToken"
}

Invoke-RestMethod `
    -Method GET `
    -Uri "http://localhost:5000/api/admin/dashboard" `
    -Headers $headers
```

## 14. Admin Security Guidelines

- Never share admin credentials.
- Use a strong admin password.
- Do not expose JWT tokens.
- Re-authenticate when the admin session expires.
- Verify user and withdrawal details before changes.
- Review audit logs regularly.
- Keep production credentials outside source control.

---

This guide documents the available admin API workflows. Refer to API_DOCUMENTATION.md for endpoint details and request formats.
