# Calendly Setup Guide

This guide will help you set up Calendly integration for your ConversionGPTO application.

## Step 1: Create a Calendly Account

1. Go to [https://calendly.com](https://calendly.com)
2. Click **"Sign up free"** or **"Get started"**
3. Create your account using your email address
4. Complete the initial setup wizard

## Step 2: Create an Event Type

1. Once logged in, click **"Event Types"** in the left sidebar
2. Click **"+ New Event Type"**
3. Choose the type of meeting:
   - **One-on-One**: For individual sales calls
   - **Group**: For group meetings
   - **Collective**: For round-robin scheduling
4. Fill in the event details:
   - **Name**: e.g., "GPTO Sales Consultation" or "Schedule a Call with Sales"
   - **Duration**: e.g., 30 minutes or 60 minutes
   - **Description**: Add details about what the call will cover
   - **Location**: Choose "Phone call" or "Video call" (Zoom, Google Meet, etc.)
5. Click **"Continue"** and complete the setup

## Step 3: Get Your Calendly URL

1. After creating your event type, you'll see your Calendly link
2. It will look like: `https://calendly.com/your-username/event-name`
3. Copy this URL

**Example URLs:**
- `https://calendly.com/john-doe/gpto-consultation`
- `https://calendly.com/conversionia/sales-call`
- `https://calendly.com/your-username/30min`

## Step 4: Add to Environment Variables

1. Open your `.env` file in the project root
2. Find the line: `NEXT_PUBLIC_CALENDLY_URL=`
3. Add your Calendly URL:

```env
NEXT_PUBLIC_CALENDLY_URL=https://calendly.com/your-username/event-name
```

**Important Notes:**
- The variable name must be `NEXT_PUBLIC_CALENDLY_URL` (with `NEXT_PUBLIC_` prefix)
- This prefix is required for Next.js to expose the variable to client-side code
- Do NOT include a trailing slash at the end of the URL

## Step 5: Update Vercel (if deployed)

If your site is deployed on Vercel:

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add or update the variable:
   - **Key**: `NEXT_PUBLIC_CALENDLY_URL`
   - **Value**: Your Calendly URL (e.g., `https://calendly.com/your-username/event-name`)
   - **Environment**: Select all (Production, Preview, Development)
4. Click **"Save"**
5. Redeploy your application for changes to take effect

## Step 6: Test the Integration

1. Restart your development server if running locally:
   ```bash
   npm run dev
   ```

2. Test the Calendly links:
   - **Welcome Email**: Check that the "Schedule a Call" button links to Calendly
   - **Tier Deliverables**: Click "Schedule a Call with Sales" button
   - **Contact Form**: Submit the form and verify it redirects to Calendly

## Optional: Customize Calendly Settings

### Add Pre-filled Information

Calendly can automatically pre-fill information from URL parameters. Your application already passes:
- `tier` - The recommended tier (Bronze, Silver, Gold)
- `website` - The user's website URL
- `email` - The user's email address
- `name` - The user's name

To use these in Calendly:

1. Go to your Calendly event type settings
2. Click **"Additional settings"**
3. Enable **"Pre-fill invitee information"**
4. Map the URL parameters to Calendly fields:
   - `email` → Email field
   - `name` → Name field
   - You can also add custom questions that use `tier` and `website`

### Add Custom Questions

1. In your event type settings, go to **"Questions"**
2. Add questions like:
   - "What tier are you interested in?" (pre-filled from `tier` parameter)
   - "What's your website URL?" (pre-filled from `website` parameter)

### Set Availability

1. Go to **"Availability"** in your event type settings
2. Set your working hours
3. Set your timezone
4. Add buffer time between meetings if needed

## Troubleshooting

### Calendly link not working

1. **Check the URL format**: Make sure it's a complete URL starting with `https://`
2. **Verify environment variable**: Check that `NEXT_PUBLIC_CALENDLY_URL` is set correctly
3. **Restart dev server**: Environment variables are loaded at startup
4. **Check browser console**: Look for any JavaScript errors

### Redirect not happening

1. **Check if URL is configured**: The code checks if `calendlyUrl` exists before redirecting
2. **Verify form submission**: Make sure the form submits successfully first
3. **Check browser console**: Look for any errors during redirect

### URL parameters not working

1. **Verify Calendly settings**: Make sure "Pre-fill invitee information" is enabled
2. **Check parameter names**: The code uses `tier`, `website`, `email`, `name`
3. **Test URL manually**: Try visiting the URL with parameters directly:
   ```
   https://calendly.com/your-username/event-name?tier=Bronze&website=https://example.com
   ```

## Example Configuration

**`.env` file:**
```env
NEXT_PUBLIC_CALENDLY_URL=https://calendly.com/conversionia/gpto-sales-call
```

**Result:**
- Welcome email will have a "Schedule a Call" button linking to this URL
- Tier deliverables will have "Schedule a Call with Sales" button
- Contact form will redirect to this URL after submission
- All links will include relevant query parameters (tier, website, etc.)

## Support

- **Calendly Help Center**: [https://help.calendly.com](https://help.calendly.com)
- **Calendly Community**: [https://community.calendly.com](https://community.calendly.com)
