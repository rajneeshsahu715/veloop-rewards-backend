# VELoop Rewards � Database Documentation

## 1. Database Overview

VELoop Rewards backend uses MongoDB Atlas as its database and Mongoose for schema definition, validation, relationships and database operations.

The database stores user profiles, wallets, transactions, XP, levels, achievements, referrals, withdrawals and administrative records.

## 2. Database Models

The project currently contains 13 Mongoose models.

| Model | Responsibility |
|---|---|
| User | Stores user account and profile information |
| Wallet | Stores user balances for VE, SVE, GEMS and TOKENS |
| WalletTransaction | Records wallet credit and debit transactions |
| Withdrawal | Stores withdrawal requests, statuses and history |
| XPTransaction | Records XP-related transactions |
| Level | Stores level definitions and XP thresholds |
| UserLevel | Stores a user's level and progress |
| Achievement | Stores achievement definitions and requirements |
| UserAchievement | Tracks user achievement progress and unlocks |
| Referral | Stores referral relationships and their statuses |
| ActivityLog | Records user activity and reward-related events |
| AdminUser | Stores administrator accounts and roles |
| AdminAuditLog | Records administrative actions for auditing |

## 3. Main Relationships

### User and Wallet
- A user can have multiple wallet records.
- Wallet records are associated with a user through userId.
- Each user has separate currency wallet records.

### User and Wallet Transactions
- Wallet transactions are associated with users.
- Transactions record wallet-related credit and debit activity.

### User and Withdrawals
- A user can submit withdrawal requests.
- Withdrawal records track amount, currency, status and status history.

### User and Levels
- UserLevel stores the user's level and progress.
- Level stores the available level definitions and XP thresholds.

### User and Achievements
- Achievement stores achievement definitions.
- UserAchievement tracks achievement progress for individual users.

### User and Referrals
- Referral records identify the referrer and referred user.
- Referral status can be PENDING, COMPLETED or CANCELLED.

### User and Activity
- ActivityLog records reward, XP, referral, withdrawal and other supported activity events.

### Admin and Audit Logs
- AdminUser stores administrator account information.
- AdminAuditLog records administrative actions and related details.

## 4. Wallet Currency Types

Supported wallet currencies:

- VE
- SVE
- GEMS
- TOKENS

Wallet balances include:
- availableBalance
- reservedBalance

Wallet records use a unique combination of userId and currencyType.

## 5. Withdrawal Statuses

Supported withdrawal statuses:

- PENDING
- APPROVED
- REJECTED
- COMPLETED

Withdrawal processing maintains status history and related wallet transaction references.

## 6. Referral Statuses

Supported referral statuses:

- PENDING
- COMPLETED
- CANCELLED

Referral records use a unique combination of referrerUserId and referredUserId.

## 7. User Account Status

Supported account statuses:

- ACTIVE
- SUSPENDED
- DEACTIVATED

User accounts contain unique user IDs and email addresses.

## 8. Important Database Validation and Indexes

The User model includes:
- Unique userId
- Unique email
- Unique sparse referralCode

The Wallet model includes:
- Unique compound index on userId and currencyType.

The Referral model includes:
- Unique compound index on referrerUserId and referredUserId.

Mongoose schema validation is used for required fields, supported enum values and numeric constraints.

## 9. Database Transactions

MongoDB sessions and transactions are used in important multi-document operations where implemented, including user registration and withdrawal processing.

These operations help maintain consistency when related records must be updated together.

## 10. Database Security

- Passwords are stored as bcrypt hashes, not plain text.
- User-specific database operations are scoped to the authenticated user.
- Admin routes require administrator authentication.
- Database credentials are stored in environment variables.
- Sensitive environment files must never be committed to source control.

## 11. Database Configuration

Configure the MongoDB connection through the MONGO_URI environment variable.

Example placeholder:

MONGO_URI=mongodb+srv://YOUR_USERNAME:YOUR_PASSWORD@YOUR_CLUSTER.mongodb.net/veloop_rewards

Never put real database credentials in this documentation.

## 12. Maintenance Notes

- Keep database credentials private.
- Back up important database data.
- Validate schema changes before deployment.
- Review indexes when query patterns change.
- Test database transactions before production deployment.

---

Documentation describes the current project model structure at a high level. Refer to the Mongoose model files for exact field definitions and validation rules.
