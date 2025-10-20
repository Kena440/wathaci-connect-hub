# Quick Start: Smoke Test Monitoring

This guide will get you up and running with automated smoke tests in 5 minutes.

## Prerequisites

- GitHub repository with admin access
- GitHub CLI (`gh`) installed (optional, but recommended)
- Production webhook endpoint deployed
- Webhook signing secret from Lenco dashboard

## Step 1: Configure GitHub Secrets

### Option A: Automated Setup (Recommended)

```bash
# Run the interactive setup script
bash scripts/setup-smoke-test-monitoring.sh
```

The script will prompt you for:
- Production webhook URL
- Webhook signing secret
- Optional: Slack webhook URL
- Optional: PagerDuty integration key

### Option B: Manual Setup

Via GitHub web interface:
1. Go to **Settings → Secrets and variables → Actions**
2. Click **New repository secret**
3. Add the following secrets:
   - `WEBHOOK_URL` = `https://your-project.supabase.co/functions/v1/payment-webhook`
   - `WEBHOOK_SECRET` = Your webhook signing secret

Via GitHub CLI:
```bash
gh secret set WEBHOOK_URL --body "https://your-project.supabase.co/functions/v1/payment-webhook"
gh secret set WEBHOOK_SECRET --body "your-webhook-secret"
```

## Step 2: Verify Workflow is Active

```bash
# Check workflow status
gh workflow list

# Should show: smoke-tests.yml (active)
```

The workflow will automatically run:
- Every 15 minutes during business hours (8am-8pm UTC)
- Every hour for continuous coverage
- On push to main (for testing workflow changes)

## Step 3: Test Manually

Trigger a manual test run to verify everything works:

```bash
# Via GitHub CLI
gh workflow run smoke-tests.yml

# View the running workflow
gh run watch

# List recent runs
gh run list --workflow=smoke-tests.yml
```

Via GitHub web interface:
1. Go to **Actions** tab
2. Select **Smoke Tests** workflow
3. Click **Run workflow** button
4. Monitor the run

## Step 4: Configure Alerts (Optional but Recommended)

### Slack Integration

1. Create incoming webhook in Slack for `#oncall-apps` channel
2. Add secret: `SLACK_WEBHOOK_URL`
3. Uncomment Slack notification step in `.github/workflows/smoke-tests.yml`

### PagerDuty Integration

1. Create Events API v2 integration in PagerDuty for `Wathaci-Core` service
2. Add secret: `PAGERDUTY_INTEGRATION_KEY`
3. Uncomment PagerDuty alert step in `.github/workflows/smoke-tests.yml`

## Step 5: Monitor Results

### View Test Results

```bash
# View latest run
gh run view

# View logs for a specific run
gh run view <run-id> --log

# View failed runs only
gh run list --workflow=smoke-tests.yml --status=failure
```

### Check Health Status

Add a status badge to your README:

```markdown
[![Smoke Tests](https://github.com/Kena440/WATHACI-CONNECT.-V1/actions/workflows/smoke-tests.yml/badge.svg)](https://github.com/Kena440/WATHACI-CONNECT.-V1/actions/workflows/smoke-tests.yml)
```

## Testing Locally

Before relying on automated tests, verify scripts work locally:

### Test HTTPS Health Check

```bash
# Test against your production domain
npm run smoke:https app.wathaci.com

# Or directly
bash scripts/smoke-test-https.sh app.wathaci.com
```

Expected output:
```
==================================================
HTTPS Health Check Smoke Test
==================================================
✅ PASS: Certificate is valid
✅ PASS: Health endpoint returned 200
✅ PASS: Response time below threshold
✅ ALL SMOKE TESTS PASSED
==================================================
```

### Test Webhook Integration

```bash
# Set environment variables
export WEBHOOK_URL="https://your-project.supabase.co/functions/v1/payment-webhook"
export WEBHOOK_SECRET="your-webhook-secret"

# Run test
npm run smoke:webhook

# Or directly
node scripts/smoke-test-webhook.js "$WEBHOOK_URL" "$WEBHOOK_SECRET"
```

Expected output:
```
==================================================
Webhook Smoke Test
==================================================
📤 Sending webhook request...
📥 Response received:
   Status: 200 OK
✅ WEBHOOK SMOKE TEST PASSED
==================================================
```

## Troubleshooting

### "Secrets not configured"

Make sure you've set `WEBHOOK_URL` and `WEBHOOK_SECRET` in GitHub repository secrets.

```bash
# Check secrets are set (names only, values are hidden)
gh secret list
```

### "Test failed immediately"

Check the workflow logs for details:

```bash
gh run view --log
```

Common issues:
- Wrong webhook URL (check for typos)
- Wrong webhook secret (must match Lenco dashboard)
- Webhook endpoint not deployed
- Domain not accessible

### "Certificate invalid"

Your SSL certificate may be expired or not properly configured. Check:
```bash
openssl s_client -connect your-domain.com:443 -servername your-domain.com < /dev/null 2>/dev/null | openssl x509 -noout -dates
```

### "Webhook returns 401"

The webhook signature is invalid. Verify:
1. `WEBHOOK_SECRET` matches what's configured in Lenco dashboard
2. Secret is set correctly in GitHub (no extra spaces or newlines)
3. Webhook endpoint has the correct secret in Supabase secrets

```bash
# Check Supabase secrets
supabase secrets list
```

## Next Steps

1. **Enable Alerts**: Set up Slack/PagerDuty for immediate failure notification
2. **Monitor Trends**: Watch for patterns in failures over time
3. **Tune Thresholds**: Adjust response time limits if needed
4. **Add Tests**: Extend smoke tests for additional critical paths
5. **Document Incidents**: Keep runbook updated with resolution procedures

## Reference

- **Full Guide**: [docs/SMOKE_TEST_MONITORING.md](SMOKE_TEST_MONITORING.md)
- **Scripts Documentation**: [scripts/README.md](../scripts/README.md)
- **Post-Launch Schedule**: [docs/POST_LAUNCH_SMOKE_TEST_SCHEDULE.md](POST_LAUNCH_SMOKE_TEST_SCHEDULE.md)
- **Workflow**: [.github/workflows/smoke-tests.yml](../.github/workflows/smoke-tests.yml)

## Support

- **GitHub Issues**: Report problems or request features
- **Slack**: `#oncall-apps` for operational issues
- **PagerDuty**: Critical production incidents

---

**Time to Deploy**: ~5 minutes  
**Maintenance**: ~5 minutes/month (review alerts, update thresholds)  
**Cost**: $0 (runs on GitHub Actions free tier)
