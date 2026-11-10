# VELoop Rewards � Security Documentation

## 1. Security Overview

VELoop Rewards backend implements authentication, authorization, input validation and protected database operations to protect user and administrative data.

## 2. Authentication

### User Authentication
- Users register and log in through the authentication API.
- Passwords are hashed using bcryptjs.
- User authentication uses JWT tokens.
- Protected user routes require a valid Bearer token.
- Token verification checks the configured user JWT secret, issuer and audience.
- Inactive accounts cannot access protected user operations.

### Admin Authentication
- Administrators authenticate through the admin login API.
- Admin routes require a valid Bearer token.
- Admin authorization checks the SUPER_ADMIN role.
- Admin account status is checked during authentication.
- Unauthorized and invalid sessions are rejected.

## 3. Password Security

- Passwords are not stored as plain text.
- bcryptjs is used for password hashing.
- Password hashing uses 12 salt rounds.
- Login errors avoid revealing whether an email address exists.
- Password hashes are excluded from normal user queries where configured.

## 4. Authorization and Access Control

- User-specific profile operations use the authenticated user ID.
- Wallet queries are scoped to the authenticated user.
- Wallet transaction history is scoped to the authenticated user.
- Withdrawal history and details are scoped to the authenticated user.
- User-supplied IDs must not be trusted as proof of ownership.
- Administrative endpoints require admin authentication.
- Admin actions are recorded through the audit logging module where implemented.

## 5. Input Validation

The backend uses request validation and service-level checks for supported inputs.

Examples include:
- Invalid user account statuses are rejected.
- Unsupported wallet currency types are rejected.
- Invalid withdrawal status filters are rejected.
- Invalid database identifiers are handled.
- Numeric values are checked against schema constraints.
- Unsupported administrative update fields are rejected where configured.

## 6. HTTP and Application Security

The Express application uses:
- Helmet for HTTP security headers.
- CORS configuration through CLIENT_ORIGIN.
- JSON request body size limit.
- Morgan for HTTP request logging.
- Authentication middleware on protected routes.
- Rate limiting on user registration and login routes.

## 7. Environment Variable Protection

Sensitive configuration is stored in the local .env file.

Important environment variables include:
- MONGO_URI
- JWT_SECRET
- USER_JWT_SECRET
- ADMIN_NAME
- ADMIN_EMAIL
- ADMIN_PASSWORD
- CLOUDINARY_API_KEY
- CLOUDINARY_API_SECRET

Security requirements:
- Never commit .env to Git.
- Never publish database credentials.
- Never expose JWT secrets.
- Use strong, unique production secrets.
- Keep .env.example limited to placeholder values.

## 8. File Upload Security

Profile image uploads use the configured upload middleware and Cloudinary integration.

Upload validation and size restrictions should remain enabled. Only supported image files should be accepted.

## 9. Financial Data Protection

- Wallet balances are stored separately by currency.
- Withdrawal processing uses database transactions where implemented.
- Withdrawal records maintain status history.
- User wallet and withdrawal data must remain restricted to the authenticated account.
- Administrative wallet adjustments require administrator authorization.

## 10. Error Handling

- Authentication failures return appropriate authorization errors.
- Invalid input is rejected.
- Missing records are handled without exposing sensitive database information.
- The application has centralized error handling.

## 11. Production Security Checklist

Before production deployment:

- [ ] Use strong production JWT secrets.
- [ ] Verify MongoDB Atlas network access restrictions.
- [ ] Verify database user permissions.
- [ ] Confirm .env is excluded from Git.
- [ ] Configure production CLIENT_ORIGIN.
- [ ] Review upload restrictions.
- [ ] Test authentication and authorization.
- [ ] Test user data ownership restrictions.
- [ ] Review administrative audit logging.
- [ ] Enable database backups.
- [ ] Review production error logging.
- [ ] Test rate limits and withdrawal processing.

---

This document describes implemented security controls and recommended production checks. Complete the production checklist before public deployment.
