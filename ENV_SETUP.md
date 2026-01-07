# Environment Variables Setup

To use JWT authentication, you need to set up the following environment variables in your `.env` file:

## Required Variables

```env
# Database Connection (already configured)
DATABASE_URL="your-postgresql-connection-string"

# JWT Secret (NEW - Add this)
JWT_SECRET="your-super-secret-jwt-key-change-this-to-a-random-string"
```

## How to Set Up

1. Create a `.env` file in the root of your project if it doesn't exist
2. Add the `JWT_SECRET` variable with a strong, random secret key
3. You can generate a random secret using Node.js:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

## Security Notes

- **Never** commit your `.env` file to version control
- Use a strong, random secret for `JWT_SECRET`
- Change the default secret in production
- Keep your environment variables secure
