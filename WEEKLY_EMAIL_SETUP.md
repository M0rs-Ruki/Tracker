# Weekly Email Reports - Setup Guide

This guide explains how to set up and use the automated weekly email reports feature.

## Overview

The system automatically sends weekly email summaries every Sunday at 23:59, containing:

- Budget overview with fixed expenses
- Weekly spending totals and status
- AI-powered analysis and recommendations
- Category breakdowns and spending patterns

## Setup Steps

### 1. Install Dependencies

```bash
npm install nodemailer @radix-ui/react-switch
npm install -D @types/nodemailer
```

### 2. Configure Mail Server in .env.local

Add your SMTP mail server settings to `.env.local`:

```env
# Mail server settings
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USER=your-email@gmail.com
MAIL_PASSWORD=your-app-password-here
```

**For Gmail users:**

- Use `smtp.gmail.com` as MAIL_HOST
- Use port `587` (TLS) or `465` (SSL)
- Use your Gmail address as MAIL_USER
- **Important:** Create a Google App Password for MAIL_PASSWORD (not your regular password)

### 3. Create Google App Password (Gmail only)

**Important:** Never use your regular Google password. You must create an App Password:

1. Go to your Google Account: https://myaccount.google.com/
2. Navigate to **Security** → **2-Step Verification** (enable if not already)
3. Scroll to **App passwords**
4. Click **Select app** → Choose **Mail**
5. Click **Select device** → Choose **Other** and name it "Budget Tracker"
6. Click **Generate**
7. Copy the 16-character password (no spaces)
8. Add it to your `.env.local` as `MAIL_PASSWORD`

### 4. Enable Email Reports in App

1. Open the app and go to **Settings**
2. Navigate to the **Email** tab
3. Toggle **Weekly Email Reports** to **ON**
4. Click **Save Email Settings**

### 5. Set Vercel Cron Secret (Production Only)

For security, add a cron secret to your Vercel environment:

```bash
# Generate a random secret
openssl rand -base64 32

# Add to Vercel dashboard or CLI
vercel env add CRON_SECRET
```

**Also add your mail server settings to Vercel:**

```bash
vercel env add MAIL_HOST
vercel env add MAIL_PORT
vercel env add MAIL_USER
vercel env add MAIL_PASSWORD
```

### 6. Deploy to Vercel

The `vercel.json` file is already configured to run the cron job every Sunday at 23:59.

```bash
git add .
git commit -m "Add weekly email reports"
git push
vercel --prod
```

## Testing

### Test Locally (Manual Trigger)

Since cron jobs don't run in local development, test the email manually:

1. Start your dev server: `npm run dev`
2. Get your session token from browser cookies
3. Make a request:

```bash
curl -X GET "http://localhost:3000/api/cron/weekly-email" \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

### Test on Vercel

After deployment, you can manually trigger the cron:

1. Go to Vercel Dashboard → Your Project → Cron Jobs
2. Find the `/api/cron/weekly-email` job
3. Click **Run** to test immediately

## Email Content

The weekly email includes:

1. **Budget Overview**

   - Monthly budget
   - Fixed expenses total
   - Real monthly budget (after fixed expenses)
   - Weekly budget target

2. **This Week's Spending**

   - Total spent
   - Difference from weekly budget
   - Status (Over/Under budget)

3. **AI Analysis** (powered by your selected AI provider)
   - Spending patterns
   - Warnings if overspending
   - Daily spending recommendations for next week
   - Predicted budget status
   - Category insights

## Troubleshooting

### Emails Not Sending

1. **Check Environment Variables**: Ensure MAIL_HOST, MAIL_PORT, MAIL_USER, and MAIL_PASSWORD are set correctly
2. **Check App Password**: If using Gmail, ensure you're using a 16-character App Password, not your regular password
3. **2-Step Verification**: Must be enabled on your Google account (for Gmail)
4. **AI Keys**: Make sure you have AI keys configured (required for AI analysis)
5. **Cron Status**: Check Vercel dashboard for cron job execution logs
6. **Port Settings**: Try port 587 (TLS) or 465 (SSL) depending on your mail server

### Test Email Manually

To verify your SMTP settings work:

```typescript
// In browser console on your app
await fetch("/api/cron/weekly-email", {
  method: "GET",
  headers: {
    Authorization: "Bearer YOUR_CRON_SECRET",
  },
})
  .then((r) => r.json())
  .then(console.log);
```

### Check Logs

View cron execution logs in Vercel:

- Dashboard → Project → Deployments → Select deployment → Functions
- Look for `/api/cron/weekly-email` execution logs

## Security Notes

- **Mail credentials are stored in environment variables** (not in database)
- **Never commit .env.local** to version control
- **Never use your regular Google password** - always create App Passwords
- **Cron secret** prevents unauthorized access to the endpoint
- **AI keys are encrypted** before storage in MongoDB

## Disabling Reports

To stop receiving weekly emails:

1. Go to **Settings** → **Email** tab
2. Toggle **Weekly Email Reports** to **OFF**
3. Click **Save Email Settings**

## Customization

### Change Schedule

Edit `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/weekly-email",
      "schedule": "59 23 * * 0" // Sunday 23:59
    }
  ]
}
```

Cron format: `minute hour day month weekday`

- `0 9 * * 1` = Monday 9:00 AM
- `0 18 * * 5` = Friday 6:00 PM

### Customize Email Template

Edit `src/lib/email.ts` → `generateEmailHtml()` function to modify the email design.

## Rate Limits

- Maximum: 1 email per user per week
- Gmail SMTP limit: 500 emails/day (more than enough for typical usage)

## Support

If you encounter issues:

1. Check the cron logs in Vercel
2. Verify your App Password is correct
3. Ensure 2-Step Verification is enabled
4. Test with the manual trigger endpoint

For Gmail App Password help: https://support.google.com/accounts/answer/185833
