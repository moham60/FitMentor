# Google OAuth Setup Guide for FitMentor

## Overview
This guide explains how to configure Google OAuth authentication for your FitMentor application using Supabase.

## Step 1: Create Google OAuth Credentials

### 1.1 Go to Google Cloud Console
- Visit [Google Cloud Console](https://console.cloud.google.com/)
- Sign in with your Google account

### 1.2 Create a New Project
- Click on the project dropdown at the top
- Click "NEW PROJECT"
- Enter project name: "FitMentor" (or any name you prefer)
- Click "CREATE"

### 1.3 Enable Google+ API
- In the left sidebar, go to "APIs & Services" > "Library"
- Search for "Google+ API"
- Click on it and press "ENABLE"

### 1.4 Create OAuth Consent Screen
- In the left sidebar, go to "APIs & Services" > "OAuth consent screen"
- Select "External" as the User Type
- Click "CREATE"
- Fill in the form:
  - App name: "FitMentor"
  - User support email: Your email
  - Developer contact: Your email
- Click "SAVE AND CONTINUE"
- For scopes, click "ADD OR REMOVE SCOPES" and ensure these are selected:
  - `userinfo.email`
  - `userinfo.profile`
- Click "SAVE AND CONTINUE"
- Click "SAVE AND CONTINUE" again (skip optional info)
- Click "BACK TO DASHBOARD"

### 1.5 Create OAuth 2.0 Credentials
- In the left sidebar, go to "APIs & Services" > "Credentials"
- Click "CREATE CREDENTIALS" > "OAuth client ID"
- Choose "Web application"
- Fill in the form:
  - Name: "FitMentor Web"
  - **Authorized JavaScript origins:**
    ```
    http://localhost:5173
    http://localhost:8081
    http://localhost:3000
    https://yourdomain.com
    ```
  - **Authorized redirect URIs:**
    ```
    http://localhost:5173/onboarding
    http://localhost:8081/onboarding
    https://yourdomain.com/onboarding
    https://syoxohhodkeyilztemwl.supabase.co/auth/v1/callback
    ```
- Click "CREATE"
- Copy your **Client ID** (you'll need this)

## Step 2: Configure Supabase

### 2.1 Go to Supabase Dashboard
- Visit [Supabase Dashboard](https://app.supabase.com/)
- Select your project: `syoxohhodkeyilztemwl`

### 2.2 Enable Google Provider
- In the left sidebar, go to "Authentication" > "Providers"
- Find "Google" and click on it
- Toggle "Enable Sign in with Google" ON
- Paste your **Google Client ID** from Step 1.5
- (Optional) Paste your Google Client Secret if you have it
- Click "Save"

## Step 3: Add Redirect URLs to Environment

### 3.1 Update `.env.local`
Make sure your environment variables are set:

```env
VITE_SUPABASE_URL=https://syoxohhodkeyilztemwl.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_published_key_here
```

## Step 4: Test Google OAuth

### 4.1 Start Development Server
```bash
npm run dev
```

### 4.2 Test Sign In
- Navigate to http://localhost:8081/signin
- Click the Google sign-in button
- You should be redirected to Google's login
- After successful login, you'll be redirected to `/onboarding`

## Troubleshooting

### Issue: "Failed to connect to Google"
- **Solution:** Ensure Google provider is enabled in Supabase dashboard
- Verify the Client ID is correct
- Check that redirect URLs match your local/production URLs

### Issue: "Redirect URI mismatch"
- **Solution:** Add the exact redirect URL to both:
  1. Google Cloud Console (Authorized redirect URIs)
  2. Supabase will automatically use `https://[your-project].supabase.co/auth/v1/callback`

### Issue: "Invalid Client ID"
- **Solution:** Double-check the Client ID is copied correctly without extra spaces

### Issue: OAuth works locally but not in production
- **Solution:** Add your production domain to authorized origins and redirect URIs in Google Cloud Console

## Production Deployment

When deploying to production:

1. Add your production URL to Google Cloud Console credentials
2. Update environment variables with production Supabase URL
3. The redirect URL format: `https://yourdomain.com/onboarding`

## References
- [Supabase Google OAuth Docs](https://supabase.com/docs/guides/auth/social-login/auth-google)
- [Google Cloud Console](https://console.cloud.google.com/)

