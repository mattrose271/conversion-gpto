# Admin Portal

Stripe Webhook Admin Portal for managing webhook events, payment leads, and webhook configuration.

## Setup

### 1. Database Migration

Run the migration to create the `admin_sessions` table:

```bash
npx prisma migrate deploy
# or for development:
npx prisma migrate dev
```

### 2. Environment Variables

Add the following environment variables to your `.env` file:

```bash
# Admin Portal Authentication
ADMIN_USERNAME=admin
ADMIN_PASSWORD_HASH=<hashed_password>
```

### 3. Generate Password Hash

To generate a password hash for `ADMIN_PASSWORD_HASH`, run:

```bash
node -e "const bcrypt=require('bcryptjs');bcrypt.hash('yourpassword',10).then(h=>console.log(h))"
```

Or create a temporary script:

```javascript
// hash-password.js
const bcrypt = require('bcryptjs');
const password = process.argv[2] || 'admin123';
bcrypt.hash(password, 10).then(hash => {
  console.log('Password:', password);
  console.log('Hash:', hash);
  console.log('\nAdd this to your .env:');
  console.log(`ADMIN_PASSWORD_HASH=${hash}`);
});
```

Run: `node hash-password.js yourpassword`

### 4. Install Dependencies

Make sure `bcryptjs` is installed:

```bash
npm install bcryptjs @types/bcryptjs
```

## Usage

1. Navigate to `/admin/login`
2. Enter your admin username and password
3. You'll be redirected to the dashboard

## Features

- **Dashboard**: Overview of webhook events, payment leads, and statistics
- **Webhook Events**: View and filter Stripe webhook events
- **Payment Leads**: Manage payment leads and subscriptions
- **Test Webhook**: Instructions for testing webhooks locally
- **Configuration**: Monitor webhook configuration status

## Security

- All admin routes are protected by middleware
- Sessions expire after 24 hours
- Passwords are hashed using bcrypt
- Session tokens are stored in the database

## API Routes

All admin API routes are protected and require authentication:
- `/api/admin/auth/login` - Login endpoint
- `/api/admin/auth/logout` - Logout endpoint
- `/api/admin/auth/session` - Check session status
- `/api/admin/stats` - Dashboard statistics
- `/api/admin/webhooks` - List webhook events
- `/api/admin/webhooks/[id]` - Get webhook event details
- `/api/admin/payment-leads` - List payment leads
- `/api/admin/payment-leads/[id]` - Get payment lead details
- `/api/admin/test-webhook` - Test webhook instructions
- `/api/admin/config` - Webhook configuration status
