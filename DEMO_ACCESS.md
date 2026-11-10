# VELoop Rewards � Demo Access Guide

## 1. Project Information

Project: VELoop Rewards
Backend: Node.js, Express.js
Database: MongoDB Atlas
Default local URL: http://localhost:5000

## 2. Prerequisites

Install the following:

- Node.js
- npm
- MongoDB Atlas account or configured MongoDB connection
- PowerShell

## 3. Local Setup

Open the backend folder in PowerShell.

Install dependencies:

```powershell
npm install
```

Create your local `.env` file using `.env.example` as a reference.

Configure your own:

- MongoDB connection string.
- JWT secrets.
- Admin credentials.
- Cloudinary credentials if image upload is enabled.

Do not share your `.env` file.

## 4. Start the Backend

```powershell
npm run dev
```

Default URL:

http://localhost:5000

Health check:

```powershell
Invoke-RestMethod -Method GET -Uri "http://localhost:5000/"
```

## 5. Admin Demo Access

Admin login endpoint:

POST http://localhost:5000/api/admin/auth/login

Request body:

```json
{
  "email": "YOUR_CONFIGURED_ADMIN_EMAIL",
  "password": "YOUR_CONFIGURED_ADMIN_PASSWORD"
}
```

Use the administrator account created through the project's admin setup utility.

Admin credentials must be provided privately by the project owner during an authorized demonstration.

No default or public admin password is provided in this document.

## 6. Protected Admin APIs

After successful login, use the returned JWT token as a Bearer token.

Example:

```powershell
$headers = @{
    Authorization = "Bearer YOUR_ADMIN_TOKEN"
}

Invoke-RestMethod `
    -Method GET `
    -Uri "http://localhost:5000/api/admin/dashboard" `
    -Headers $headers
```

## 7. User Demo

Create a user through:

POST /api/auth/register

Log in through:

POST /api/auth/login

Use the returned user token to access protected user profile, wallet and withdrawal APIs.

## 8. API Documentation

Refer to:

- README.md
- API_DOCUMENTATION.md
- DATABASE.md
- SECURITY.md
- ADMIN_GUIDE.md
- TESTING.md

## 9. Security Notice

- Never commit `.env`.
- Never publish admin passwords.
- Never publish JWT tokens.
- Use private demo credentials.
- Use test accounts and test data during demonstrations.
- Do not expose production database credentials.

---

This document provides local demonstration instructions. A public demo URL should only be added after successful deployment and verification.
