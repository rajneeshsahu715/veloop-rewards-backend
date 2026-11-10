# VELoop Rewards Backend

Backend API for the VELoop Rewards User Profile and Admin Management System.

## Technology Stack

- Node.js
- Express.js
- MongoDB
- Mongoose
- JWT Authentication
- bcryptjs
- Cloudinary
- Multer
- Helmet
- CORS

## Features

### User
- User registration and login
- JWT-based authentication
- Profile viewing and updating
- Profile image upload
- Wallet and transaction history
- Withdrawal requests and history
- XP and level progression
- Achievement tracking
- Referral records

### Admin
- Admin authentication
- Dashboard statistics
- User management
- Wallet management
- Withdrawal management
- Level management
- Achievement management
- Referral management
- Audit logs

## Installation

1. Install Node.js and MongoDB access.
2. Clone or copy this repository.
3. Open the backend directory.
4. Install dependencies:

   npm install

5. Create your environment file:

   Copy-Item .env.example .env

6. Update `.env` with your own credentials.

## Environment Variables

See `.env.example` for the required configuration keys.

Never commit the real `.env` file or expose secrets.

## Run the Backend

Development:

    npm run dev

Production:

    npm start

Default development URL:

    http://localhost:5000

## Main API Routes

| Module | Base URL |
|---|---|
| User Authentication | /api/auth |
| User Profile | /api/profile |
| User Wallet | /api/wallets |
| User Withdrawals | /api/withdrawals |
| Admin Authentication | /api/admin/auth |
| Admin Dashboard | /api/admin/dashboard |
| Admin Users | /api/admin/users |
| Admin User Details | /api/admin/user-details |
| Admin Wallet | /api/admin/wallet |
| Admin Withdrawals | /api/admin/withdrawals |
| Admin Levels | /api/admin/levels |
| Admin Achievements | /api/admin/achievements |
| Admin Referrals | /api/admin/referrals |
| Admin Audit Logs | /api/admin/audit-logs |

## Security

- Passwords are hashed using bcryptjs.
- User and admin authentication use JWT.
- Protected routes verify authentication.
- User data access is scoped to the authenticated user.
- Helmet security headers are enabled.
- Login and registration routes use rate limiting.
- Environment secrets are excluded through `.gitignore`.

## Project Status

Core user and admin backend modules have been implemented. Final integration testing, documentation review and deployment configuration should be completed before production release.
