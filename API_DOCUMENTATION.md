# VELoop Rewards Backend - API Documentation

Base URL: `http://localhost:5000`

All request and response bodies use JSON unless file upload is specified.

## 1. User Authentication

Base path: `/api/auth`

| Method | Endpoint | Authentication | Purpose |
|---|---|---|---|
| POST | `/register` | Public | Register user |
| POST | `/login` | Public | User login |

### Register

Request:
```json
{
  "name": "Test User",
  "email": "user@example.com",
  "password": "YourPassword123"
}
```

### Login

Request:
```json
{
  "email": "user@example.com",
  "password": "YourPassword123"
}
```

Successful authentication returns a user JWT. Use it as:

`Authorization: Bearer USER_TOKEN`

## 2. User Profile

Base path: `/api/profile`

| Method | Endpoint | Authentication | Purpose |
|---|---|---|---|
| GET | `/me` | User | Fetch own profile |
| PATCH | `/me` | User | Update own profile |

Profile update supports `multipart/form-data` when uploading `profileImage`.

## 3. User Wallet

Base path: `/api/wallets`

| Method | Endpoint | Authentication | Purpose |
|---|---|---|---|
| GET | `/` | User | Fetch own wallets |
| GET | `/transactions` | User | Fetch own wallet transactions |

Supported currencies: `VE`, `SVE`, `GEMS`, `TOKENS`.

## 4. User Withdrawals

Base path: `/api/withdrawals`

| Method | Endpoint | Authentication | Purpose |
|---|---|---|---|
| POST | `/` | User | Create withdrawal request |
| GET | `/` | User | Fetch own withdrawal history |
| GET | `/:withdrawalId` | User | Fetch own withdrawal details |

Create request:
```json
{
  "amount": 10,
  "currencyType": "VE"
}
```

## 5. Admin Authentication

Base path: `/api/admin/auth`

| Method | Endpoint | Authentication | Purpose |
|---|---|---|---|
| POST | `/login` | Public | Admin login |
| GET | `/me` | Admin | Fetch authenticated admin profile |

Use the returned admin JWT:

`Authorization: Bearer ADMIN_TOKEN`

## 6. Admin Dashboard

Base path: `/api/admin/dashboard`

| Method | Endpoint | Authentication | Purpose |
|---|---|---|---|
| GET | `/` | Admin | Fetch dashboard statistics |

## 7. Admin User Management

Base path: `/api/admin/users`

| Method | Endpoint | Authentication | Purpose |
|---|---|---|---|
| GET | `/` | Admin | List users |
| PATCH | `/:userId/status` | Admin | Change user account status |

User details base path: `/api/admin/user-details`

| Method | Endpoint | Authentication | Purpose |
|---|---|---|---|
| GET | `/:userId` | Admin | Fetch user details |

## 8. Admin Wallet

Base path: `/api/admin/wallet`

| Method | Endpoint | Authentication | Purpose |
|---|---|---|---|
| PATCH | `/:userId/adjust` | Admin | Adjust user wallet |

## 9. Admin Withdrawals

Base path: `/api/admin/withdrawals`

| Method | Endpoint | Authentication | Purpose |
|---|---|---|---|
| GET | `/` | Admin | List withdrawal requests |
| PATCH | `/:withdrawalId/status` | Admin | Update withdrawal status |

## 10. Admin Levels

Base path: `/api/admin/levels`

| Method | Endpoint | Authentication | Purpose |
|---|---|---|---|
| GET | `/` | Admin | List levels |
| GET | `/:levelId` | Admin | Fetch level details |
| POST | `/` | Admin | Create level |
| PATCH | `/:levelId` | Admin | Update level |

## 11. Admin Achievements

Base path: `/api/admin/achievements`

| Method | Endpoint | Authentication | Purpose |
|---|---|---|---|
| GET | `/` | Admin | List achievements |
| GET | `/:achievementId` | Admin | Fetch achievement |
| POST | `/` | Admin | Create achievement |
| PATCH | `/:achievementId` | Admin | Update achievement |

## 12. Admin Referrals

Base path: `/api/admin/referrals`

| Method | Endpoint | Authentication | Purpose |
|---|---|---|---|
| GET | `/` | Admin | List and search referrals |
| GET | `/:referralId` | Admin | Fetch referral and reward records |

## 13. Admin Audit Logs

Base path: `/api/admin/audit-logs`

| Method | Endpoint | Authentication | Purpose |
|---|---|---|---|
| GET | `/` | Admin | Fetch audit logs |

## 14. Common HTTP Status Codes

| Status | Meaning |
|---|---|
| 200 | Request successful |
| 201 | Resource created |
| 400 | Validation error |
| 401 | Authentication required or invalid |
| 403 | Access forbidden |
| 404 | Resource not found |
| 409 | Duplicate resource or conflict |
| 500 | Internal server error |

## Security Notes

- Never share user or admin JWT tokens.
- Protected routes require the correct authentication token.
- Users can access only their own protected resources.
- Admin endpoints require admin authentication.
- Never expose `.env` credentials in source control.

---
