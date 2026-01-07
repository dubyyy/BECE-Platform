# Admin Password Protection Setup

## Overview
The admin section is now protected with an additional password layer to prevent unauthorized access.

## Setup Instructions

1. **Add the password to your environment file:**
   
   Add the following line to your `.env` file (or `.env.local`):
   ```
   ADMIN_PASSWORD="zuwa2"
   ```
   
   Replace `"zuwa2"` with your preferred admin password.

2. **Restart your development server:**
   ```bash
   npm run dev
   ```

## How It Works

- When users try to access any route under `/admin/*`, they will first be prompted for the admin password
- The password verification is stored in a secure HTTP-only cookie that expires after 24 hours
- After 24 hours, users will need to re-enter the password
- This provides an additional security layer on top of the existing NextAuth authentication

## Security Features

- Password is stored only in environment variables (never in code)
- Uses HTTP-only cookies (not accessible via JavaScript)
- Secure flag enabled in production
- SameSite strict policy
- 24-hour session expiration

## Default Password

If no `ADMIN_PASSWORD` is set in the environment, the system defaults to `"zuwa2"` for development purposes. **Make sure to set a custom password in production.**

## Changing the Password

To change the admin password:
1. Update the `ADMIN_PASSWORD` value in your `.env` file
2. Restart the server
3. All users will need to re-authenticate with the new password
