# Vercel Deployment Fix Guide

## Quick Fix Steps:

### 1. Set Environment Variables in Vercel
Go to your Vercel dashboard → Project → Settings → Environment Variables

Add these variables:
```
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 2. Redeploy
After setting the environment variables, trigger a new deployment:
- Push a new commit to your repository, OR
- Go to Vercel dashboard → Deployments → Click "Redeploy" on the latest deployment

### 3. Files Added/Modified for Fix:
- ✅ `vercel.json` - Added routing configuration for SPA
- ✅ `src/components/ErrorBoundary.jsx` - Added error handling
- ✅ Modified `src/main.jsx` - Added error boundary wrapper
- ✅ Modified `src/App.jsx` - Added configuration validation
- ✅ Modified `src/lib/supabaseClient.js` - Added fallback handling

## Common Issues:

### White Screen = Usually Missing Environment Variables
1. Check Vercel environment variables are set correctly
2. Make sure variable names match exactly: `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
3. Redeploy after setting variables

### 404 on Page Refresh = Missing Routing Config
- ✅ Fixed with `vercel.json` file

### JavaScript Errors = Build Issues  
- ✅ Fixed with ErrorBoundary component

## Test Your Deployment:
1. Visit your Vercel URL
2. If you see "Configuration Required" - set environment variables
3. If you see error boundary message - check browser console for details
4. If you see login page - success! 🎉

## Get Your Supabase Credentials:
1. Go to https://supabase.com/dashboard
2. Select your project
3. Go to Settings → API
4. Copy "Project URL" and "anon public" key