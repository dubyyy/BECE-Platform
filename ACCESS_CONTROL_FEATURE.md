# Access Control Feature

## Overview
This feature implements LGA, school code, and access PIN authentication before users can access the home page.

## Components Created

### 1. Access Page (`/app/access/page.tsx`)
- Authentication form with three fields:
  - LGA Code
  - School Code
  - Access PIN
- Beautiful UI with gradient background
- Error handling and loading states
- Redirects to home page upon successful authentication

### 2. Access Verification API (`/app/api/access/verify/route.ts`)
- Validates LGA code and school code against `data.json`
- Checks if school is registered in database
- Generates JWT token for authenticated sessions
- Allows both registered and unregistered schools to access

### 3. Access Guard Component (`/app/(public)/components/AccessGuard.tsx`)
- Client-side authentication check
- Redirects to `/access` page if no token found
- Shows loading state during authentication check
- Wraps protected pages

### 4. Logout Button (`/components/LogoutButton.tsx`)
- Clears access token and school info from localStorage
- Redirects to access page
- Integrated into header

### 5. Updated Header (`/app/(public)/components/Header.tsx`)
- Now a client component
- Displays school information (name, LGA code, school code)
- Includes logout button
- Shows school info on desktop devices

## How It Works

1. **Initial Access**: Users visiting the home page are automatically redirected to `/access`
2. **Authentication**: Users enter their LGA code, school code, and access PIN
3. **Validation**: The system validates credentials against the school database
4. **Token Generation**: Upon success, a JWT token is generated and stored in localStorage
5. **Protected Access**: The home page checks for the token via `AccessGuard`
6. **Logout**: Users can logout anytime, which clears their session

## Authentication Flow

```
User visits home page (/)
  ↓
AccessGuard checks for token
  ↓
No token? → Redirect to /access
  ↓
User enters credentials
  ↓
API validates against data.json
  ↓
Generate JWT token
  ↓
Store token in localStorage
  ↓
Redirect to home page (/)
  ↓
AccessGuard allows access
```

## Security Features

- JWT token authentication
- Session stored in localStorage
- Token expires in 7 days
- Validates against master school data
- Protected API endpoints

## Usage

To access the portal:
1. Navigate to the application
2. Enter valid LGA code (e.g., "1420256700" for Aniocha North)
3. Enter valid school code
4. Enter access PIN
5. Click "Access Portal"

## Technical Details

- **Token Storage**: localStorage
- **Token Expiry**: 7 days
- **Authentication Method**: JWT
- **Protected Routes**: All routes under `/(public)`
- **Public Routes**: `/access`, `/auth/*`

## Future Enhancements

- Add PIN validation logic
- Implement refresh token mechanism
- Add rate limiting for authentication attempts
- Add multi-factor authentication
- Store access logs
