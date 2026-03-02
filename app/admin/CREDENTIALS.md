# Admin Portal Credentials

## Login Information

**Username:** `gpto@careerdriver.com`  
**Password:** `admin123!`

## Environment Variables

Add these to your `.env` file:

```bash
ADMIN_USERNAME=gpto@careerdriver.com
ADMIN_PASSWORD_HASH=$2a$10$i/rBIlWFxaXDpAUpIZoVgucWrVG7D/cUL2LZgNW9fxRkQw/sdyRV.
```

## Access

Navigate to `/admin/login` to access the admin portal.

## Security Notes

- The password is hashed using bcrypt with 10 rounds
- Sessions expire after 24 hours
- Change the password by generating a new hash and updating `ADMIN_PASSWORD_HASH`

## Generate New Password Hash

To generate a new password hash:

```bash
node -e "const bcrypt=require('bcryptjs');bcrypt.hash('yournewpassword',10).then(h=>console.log(h))"
```

Then update `ADMIN_PASSWORD_HASH` in your `.env` file with the generated hash.
