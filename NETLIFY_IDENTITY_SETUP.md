# Netlify Identity Setup Guide

## Overview
This project is now configured with Netlify Identity for admin authentication. Only you (the site owner) can log in to access the admin dashboard at `/admin`.

## What's Been Added

1. **Authentication System** (`lib/auth.ts`)
   - Zustand store for managing auth state
   - Netlify Identity integration functions

2. **Admin Pages**
   - `/admin` - Protected admin dashboard (requires login)
   - `/admin/login` - Login page

3. **Components**
   - `AuthProvider` - Wraps the app and initializes Identity
   - `AuthGuard` - (Optional) Can be used to protect specific routes

4. **Configuration**
   - `netlify.toml` - Netlify build configuration
   - Netlify Identity script loaded in HTML head

## Setup Steps

### 1. Install Dependencies (Local Development)
```bash
npm install zustand netlify-identity-widget
```

### 2. Enable Netlify Identity on Your Site

Go to your Netlify site dashboard:

1. Navigate to **Site Settings** → **Identity**
2. Click **Enable Identity** if not already enabled
3. Under **Registration preferences**, select:
   - **Invite only** (so only you can sign up)
   - You may want to disable email confirmations for faster setup

### 3. Invite Yourself to the Site

1. In Netlify Identity settings, click **Invite users**
2. Enter your email address
3. You'll receive an invite email - click the link to set your password
4. You're now registered!

### 4. Local Development

Run your app locally:
```bash
npm run dev
```

Visit `http://localhost:3000/admin/login` and click "Login with Netlify Identity" to test authentication.

### 5. Deploy to Netlify

```bash
git add .
git commit -m "Add Netlify Identity admin authentication"
git push
```

Your site will deploy with Netlify Identity enabled.

## Using the Admin Dashboard

- **Login**: Visit `/admin/login` and click the login button
- **Dashboard**: After login, you'll see `/admin` with user information
- **Logout**: Click the logout button on the admin page

## Restricting to Only You

Netlify Identity has been configured with "Invite only" registration. This means:
- Only invited users can create accounts
- No public signup form
- You control who has access

## Adding More Admin Users (Optional)

If you want to invite other admins later:
1. Go to Netlify site settings → Identity
2. Click **Invite users**
3. Enter the email and send an invite

## Troubleshooting

### Login widget not appearing
- Check browser console for errors
- Verify Netlify Identity is enabled in site settings
- Clear browser cache and try again

### "Invite Only" not working
- Make sure "Open" registration is NOT selected in Identity settings
- Go to **Registration preferences** and select **Invite only**

### Password reset not working
- Go to Netlify site settings → Identity → Users
- Find your user account and use admin controls to reset password

## Adding Admin Features

The `/admin/page.tsx` contains a template dashboard. You can extend it with:
- Content management tools
- Site configuration controls
- Analytics or insights
- Any other admin-specific features

Use the `useAuthStore` hook to check if a user is authenticated:

```tsx
import { useAuthStore } from '@/lib/auth';

export default function AdminFeature() {
  const { user, isAuthenticated } = useAuthStore();
  
  if (!isAuthenticated) return null;
  
  return <div>Welcome {user?.email}</div>;
}
```

## Security Notes

- All authentication happens through Netlify's secure servers
- Tokens are stored securely by the Netlify Identity widget
- The admin routes are protected client-side (you may want to add server-side validation for truly sensitive operations)
- Never commit credentials or API keys to your repository
