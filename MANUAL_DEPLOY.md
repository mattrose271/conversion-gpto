# Manual Vercel Deployment Instructions

Since auto-deploy is not working, here are ways to manually trigger deployment:

## Option 1: Vercel Dashboard (Recommended)

1. Go to https://vercel.com/dashboard
2. Click on your project: `conversion-gpto`
3. Go to the **Deployments** tab
4. Click **"Create Deployment"** button (usually at the top right)
5. In the dialog:
   - **Commit or Branch Reference**: Enter `main` or `8ff00ffd`
   - Click **"Create Deployment"**

## Option 2: Vercel CLI

Run this command in your terminal:

```bash
cd "/Users/braiebook/CDHQ Projects/conversion-gpto"
vercel --prod
```

If you need to force it:
```bash
vercel --prod --force
```

## Option 3: Check Auto-Deploy Settings

If auto-deploy should be working but isn't:

1. Go to Vercel Dashboard → Your Project → Settings → Git
2. Verify:
   - GitHub repository is connected
   - "Production Branch" is set to `main`
   - "Auto-deploy" is enabled
3. If disabled, enable it and save

## Latest Commit Reference

Use this commit hash in the deployment dialog:
- **Commit**: `8ff00ffd`
- **Branch**: `main`
