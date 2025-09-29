# GitHub OAuth Setup Guide

This guide will walk you through setting up GitHub OAuth authentication for your AZ Labs Research application.

## Overview

Setting up GitHub logins for your application consists of 3 parts:

1. **Create and configure a GitHub OAuth App on GitHub**
2. **Add your GitHub OAuth keys to your Supabase Project**
3. **Test the integration**

## Step 1: Find your Supabase callback URL

The next step requires a callback URL, which looks like this: `https://<project-ref>.supabase.co/auth/v1/callback`

To find your callback URL:
1. Go to your [Supabase Project Dashboard](https://supabase.com/dashboard)
2. Click on the **Authentication** icon in the left sidebar
3. Click on **Providers** under the Configuration section
4. Click on **GitHub** from the accordion list to expand and you'll find your Callback URL
5. You can click **Copy** to copy it to the clipboard

For local development, your callback URL will be: `http://localhost:3000/auth/v1/callback`

## Step 2: Create a GitHub OAuth Application

1. **Navigate to GitHub OAuth Apps**
   - Go to [GitHub OAuth Apps page](https://github.com/settings/developers)
   - Or go to GitHub → Settings → Developer settings → OAuth Apps

2. **Create New Application**
   - Click **Register a new application** (or **New OAuth App** if you've created apps before)

3. **Fill in Application Details**
   - **Application name**: `AZ Labs Research` (or your preferred name)
   - **Homepage URL**: 
     - For development: `http://localhost:3000`
     - For production: `https://your-domain.com`
   - **Authorization callback URL**: Use the callback URL from Step 1
     - For development: `http://localhost:3000/auth/v1/callback`
     - For production: `https://<project-ref>.supabase.co/auth/v1/callback`
   - **Leave "Enable Device Flow" unchecked**

4. **Register the Application**
   - Click **Register Application**

5. **Save OAuth Credentials**
   - Copy and save your **Client ID**
   - Click **Generate a new client secret**
   - Copy and save your **Client Secret** (keep this secure!)

## Step 3: Configure Supabase

### Option A: Using Supabase Dashboard (Recommended)

1. **Go to your Supabase Project Dashboard**
2. **Navigate to Authentication**
   - Click the **Authentication** icon in the left sidebar
   - Click on **Providers** under the Configuration section
3. **Configure GitHub Provider**
   - Click on **GitHub** from the accordion list to expand
   - Turn **GitHub Enabled** to **ON**
   - Enter your **GitHub Client ID** from Step 2
   - Enter your **GitHub Client Secret** from Step 2
   - Click **Save**

### Option B: Using Management API

```bash
# Get your access token from https://supabase.com/dashboard/account/tokens
export SUPABASE_ACCESS_TOKEN="your-access-token"
export PROJECT_REF="your-project-ref"

# Configure GitHub auth provider
curl -X PATCH "https://api.supabase.com/v1/projects/$PROJECT_REF/config/auth" \\
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "external_github_enabled": true,
    "external_github_client_id": "your-github-client-id",
    "external_github_secret": "your-github-client-secret"
  }'
```

## Step 4: Update Environment Variables

Make sure your `.env.local` file contains the correct Supabase configuration:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

You can find these values in your Supabase project dashboard under **Settings** → **API**.

## Step 5: Test the Integration

1. **Start your development server**
   ```bash
   npm run dev
   ```

2. **Navigate to the login page**
   - Go to `http://localhost:3000/auth/login`

3. **Test GitHub OAuth**
   - Click the **Continue with GitHub** button
   - You should be redirected to GitHub for authentication
   - After authorizing, you should be redirected back to your application
   - Check that the user session is properly created

## Troubleshooting

### Common Issues

1. **"Invalid redirect URI"**
   - Ensure the callback URL in your GitHub OAuth app matches exactly what Supabase expects
   - Check for trailing slashes or missing protocols

2. **"OAuth app not found"**
   - Verify your Client ID is correct in Supabase
   - Ensure the OAuth app is created under the correct GitHub account

3. **"Client secret mismatch"**
   - Regenerate the client secret in GitHub
   - Update the secret in Supabase immediately

4. **User gets stuck on callback page**
   - Check browser console for errors
   - Verify environment variables are set correctly
   - Ensure the callback route is working properly

### Testing in Production

When deploying to production:

1. **Update GitHub OAuth App**
   - Add your production domain to Homepage URL
   - Update Authorization callback URL to your production Supabase URL

2. **Update Supabase Redirect URLs**
   - Go to Authentication → URL Configuration
   - Add your production domain to the allow list

3. **Test thoroughly**
   - Test the complete OAuth flow in production
   - Verify user data is being stored correctly
   - Check that redirects work as expected

## Security Notes

- **Never commit your GitHub Client Secret to version control**
- **Use environment variables for sensitive configuration**
- **Regularly rotate your OAuth credentials**
- **Monitor your GitHub OAuth app for suspicious activity**

## Additional Resources

- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [GitHub OAuth Documentation](https://docs.github.com/en/developers/apps/building-oauth-apps)
- [Next.js Authentication Best Practices](https://nextjs.org/docs/authentication)

---

**Need Help?**
If you encounter any issues during setup, check the troubleshooting section above or refer to the official documentation links provided.
