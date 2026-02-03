# Vercel Deployment Instructions

## Option 1: Via Vercel Dashboard (Easiest)

1. Go to https://vercel.com/dashboard
2. Click on your project: `conversion-gpto`
3. Go to the **Deployments** tab
4. Find the latest deployment (should show commit `b027c055`)
5. Click the **"..."** (three dots) menu next to the deployment
6. Click **"Redeploy"**
7. Confirm the redeploy

## Option 2: Via Vercel CLI

Run these commands in your terminal:

```bash
# Navigate to project directory
cd "/Users/braiebook/CDHQ Projects/conversion-gpto"

# Trigger production deployment
vercel --prod

# Or if you want to force it without prompts:
vercel --prod --yes
```

## Option 3: Force a new commit (if auto-deploy is enabled)

If Vercel is connected to GitHub and auto-deploy is enabled, you can trigger a deployment by making a small change:

```bash
cd "/Users/braiebook/CDHQ Projects/conversion-gpto"

# Make a small change to trigger deployment
echo "// Deployment trigger $(date)" >> app/audit/page.tsx

# Commit and push
git add app/audit/page.tsx
git commit -m "Trigger deployment"
git push origin main
```

## Verify Deployment

After triggering deployment:

1. Check Vercel dashboard for deployment status
2. Wait 1-3 minutes for build to complete
3. Once deployed, hard refresh your browser (Cmd+Shift+R or Ctrl+Shift+R)
4. Check that the Performance Summary Table shows:
   - Tier selector buttons (With Bronze/Silver/Gold)
   - Updated grades (B-, B+, A)
   - Updated descriptions

## Troubleshooting

If deployment still doesn't trigger:

1. **Check Vercel project settings:**
   - Go to Project Settings → Git
   - Verify GitHub repository is connected
   - Check that "Production Branch" is set to `main`

2. **Check deployment logs:**
   - Go to Deployments tab
   - Click on latest deployment
   - Check "Build Logs" for any errors

3. **Manual deployment via CLI:**
   ```bash
   vercel --prod --force
   ```
