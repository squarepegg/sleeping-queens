# Supabase Keep-Alive Setup

This document explains how to prevent Supabase from pausing your project due to inactivity on the free tier.

## Overview

Supabase's free tier automatically pauses projects after 7 days of inactivity. This implementation provides a health check endpoint that can be pinged regularly by external monitoring services to keep your database active.

## What Was Implemented

### 1. Database Migration

**File:** `supabase/migrations/20251104000000_create_health_checks.sql`

Creates a `health_checks` table that stores timestamps of each health check ping. This lightweight table includes:
- `id`: Unique identifier for each health check
- `checked_at`: Timestamp of the health check
- `source`: Source of the ping (e.g., 'external', 'internal')

The migration also includes:
- Indexes for efficient queries
- Row Level Security (RLS) policies
- A cleanup function to prevent unlimited table growth (keeps last 100 records)

### 2. Health Check API Endpoint

**File:** `src/pages/api/health.ts`

A simple API endpoint that:
- Accepts GET and HEAD requests
- Inserts a record into the `health_checks` table
- Returns a JSON response with status and timestamp
- Includes proper error handling and logging

**Endpoint URL:** `https://your-domain.com/api/health`

**Response Example:**
```json
{
  "status": "healthy",
  "timestamp": "2025-11-04T12:34:56.789Z",
  "source": "external",
  "message": "Database is active"
}
```

## Setup Instructions

### Step 1: Apply Database Migration

Run the following command to apply the migration to your Supabase project:

```bash
npx supabase db push
```

This will create the `health_checks` table in your database.

### Step 2: Deploy Your Application

Ensure your application is deployed and accessible via a public URL. If you're using Vercel:

1. Push your changes to your git repository
2. Vercel will automatically deploy
3. Note your deployment URL (e.g., `https://sleeping-queens.vercel.app`)

### Step 3: Set Up UptimeRobot (Recommended)

[UptimeRobot](https://uptimerobot.com/) is a free service that can ping your health check endpoint regularly.

#### Create a Free Account

1. Go to [https://uptimerobot.com/](https://uptimerobot.com/)
2. Sign up for a free account
3. Verify your email address

#### Add a New Monitor

1. Click **"+ Add New Monitor"** in your dashboard
2. Fill in the monitor details:
   - **Monitor Type:** HTTP(s)
   - **Friendly Name:** Sleeping Queens Health Check
   - **URL:** `https://your-domain.com/api/health?source=uptimerobot`
   - **Monitoring Interval:** 5 minutes (recommended)
3. Click **"Create Monitor"**

#### Configure Alerts (Optional)

You can set up email or SMS alerts if your health check fails:
1. Go to **"My Settings"** → **"Alert Contacts"**
2. Add your email or phone number
3. Edit your monitor and enable alerts

### Step 4: Verify It's Working

After setting up UptimeRobot, verify that the health checks are working:

#### Check UptimeRobot Dashboard
- Your monitor should show "Up" status
- Response time should be displayed
- Uptime percentage should be 100%

#### Check Your Database
You can query your Supabase database to see health check records:

```sql
SELECT * FROM health_checks
ORDER BY checked_at DESC
LIMIT 10;
```

You should see entries every 5 minutes (or whatever interval you configured).

## Alternative Monitoring Services

If you prefer not to use UptimeRobot, here are other free alternatives:

### Cron-job.org
- Free service with flexible scheduling
- URL: [https://cron-job.org/](https://cron-job.org/)
- Supports cron-style scheduling
- Setup: Create a cron job that calls your `/api/health` endpoint

### Pingdom (Free Tier)
- URL: [https://www.pingdom.com/](https://www.pingdom.com/)
- Free tier includes 1 monitor with 1-minute intervals
- Setup similar to UptimeRobot

### StatusCake (Free Tier)
- URL: [https://www.statuscake.com/](https://www.statuscake.com/)
- Free tier includes unlimited tests
- 5-minute check intervals on free tier

### Render Cron Jobs (If Hosting on Render)
- If you're hosting on Render, you can use their built-in cron jobs
- Free tier includes cron job support
- Setup: Create a cron job service that calls your endpoint

## Manual Testing

You can manually test the health check endpoint using:

### cURL
```bash
curl https://your-domain.com/api/health
```

### Browser
Simply visit: `https://your-domain.com/api/health`

### Postman or Insomnia
- Method: GET
- URL: `https://your-domain.com/api/health`

## Maintenance

### Cleanup Old Records

The migration includes a cleanup function to prevent unlimited table growth. You can manually run it if needed:

```sql
SELECT cleanup_old_health_checks();
```

This will keep only the last 100 health check records.

### Optional: Automated Cleanup

If you're on a paid Supabase plan with pg_cron, you can automate cleanup:

```sql
-- Run cleanup daily at 3 AM
SELECT cron.schedule(
  'cleanup-health-checks',
  '0 3 * * *',
  'SELECT cleanup_old_health_checks();'
);
```

## Monitoring and Alerts

### Set Up Alerts

Configure your monitoring service to alert you if:
- Health check endpoint is down for 5+ minutes
- Response time exceeds 5 seconds
- HTTP status code is not 200

### Check Logs

You can monitor health check activity in your application logs:
- Look for log entries with `endpoint: 'health'`
- Check for any error messages or failed database operations

## Troubleshooting

### Health Check Returns 500 Error

**Possible Causes:**
- Database migration not applied
- Supabase connection issues
- RLS policy conflicts

**Solution:**
1. Verify migration is applied: `npx supabase db push`
2. Check Supabase project status in dashboard
3. Review application logs for specific error messages

### UptimeRobot Shows Monitor as "Down"

**Possible Causes:**
- Application not deployed
- Incorrect URL in UptimeRobot
- Network issues

**Solution:**
1. Test endpoint manually in browser
2. Check deployment status (Vercel/Netlify dashboard)
3. Verify URL in UptimeRobot matches your deployment

### Supabase Still Pausing Despite Health Checks

**Possible Causes:**
- Health check interval too long (>15 minutes)
- Database queries not being executed
- Supabase experiencing issues

**Solution:**
1. Reduce monitoring interval to 5 minutes
2. Check Supabase logs for database activity
3. Contact Supabase support if issue persists

## Cost Considerations

### Free Tier Limitations

- **Supabase Free Tier:** Pauses after 7 days of inactivity
- **UptimeRobot Free Tier:** 50 monitors, 5-minute intervals
- **Network Costs:** Health checks use minimal bandwidth

### Upgrading

If you need guaranteed uptime:
- **Supabase Pro:** $25/month - No automatic pausing
- **UptimeRobot Pro:** $7/month - 1-minute intervals, SMS alerts

## Best Practices

1. **Monitor Interval:** 5-15 minutes is optimal
   - Too frequent: Wastes resources
   - Too infrequent: May not prevent pausing

2. **Source Tracking:** Use query parameter to identify ping source
   - External monitors: `?source=uptimerobot`
   - Internal health checks: `?source=internal`

3. **Alerts:** Set up alerts to be notified of issues immediately

4. **Regular Testing:** Manually test the endpoint monthly

5. **Documentation:** Keep this documentation updated as your setup evolves

## Security Notes

- The health check endpoint is intentionally public
- It performs minimal database operations
- RLS policies prevent unauthorized data access
- No sensitive information is exposed in responses
- Rate limiting can be added if needed

## Future Enhancements

Potential improvements you might consider:

1. **Rate Limiting:** Add rate limiting to prevent abuse
2. **Authentication:** Add optional API key for internal checks
3. **Metrics:** Track health check performance over time
4. **Dashboard:** Create internal dashboard showing health status
5. **Multiple Checks:** Add checks for other services (Redis, APIs, etc.)

## Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [UptimeRobot Documentation](https://uptimerobot.com/api/)
- [Next.js API Routes](https://nextjs.org/docs/api-routes/introduction)
- [PostgreSQL Health Checks](https://www.postgresql.org/docs/current/monitoring.html)

## Support

If you encounter issues:
1. Check application logs in your deployment platform
2. Review Supabase project logs in the dashboard
3. Test the endpoint manually with cURL
4. Check UptimeRobot monitor logs for failures

---

**Last Updated:** November 4, 2025

**Status:** Production Ready ✅
