# Smoke Test Monitoring & Alert Integration Guide

This guide describes how to configure monitoring alerts for the automated smoke tests that verify production health.

## Overview

Smoke tests are scheduled to run automatically via GitHub Actions:

- **HTTPS Health Check**: Verifies `https://<domain>/health` endpoint availability, SSL certificate validity, and response time
- **Webhook Smoke Test**: Sends a properly signed test webhook payload to verify payment webhook processing

Tests run:
- Every 15 minutes during business hours (8am-8pm UTC) for critical monitoring
- Every hour for continuous coverage
- On-demand via GitHub Actions workflow dispatch

## Alert Channels

When smoke tests fail, alerts should be sent to:

1. **Slack** - `#oncall-apps` channel (primary notification)
2. **PagerDuty** - `Wathaci-Core` service (escalation for critical failures)
3. **Email** - On-call engineer rotation list
4. **GitHub Actions** - Workflow summary and status badges

## Configuration Steps

### 1. GitHub Repository Secrets

Configure the following secrets in your GitHub repository settings:

**Settings → Secrets and variables → Actions → New repository secret**

| Secret Name | Description | Example Value |
|------------|-------------|---------------|
| `WEBHOOK_URL` | Production webhook endpoint | `https://nrjcbdrzaxqvomeogptf.supabase.co/functions/v1/payment-webhook` |
| `WEBHOOK_SECRET` | Webhook signing secret (matches Lenco) | `your-webhook-secret` |
| `SLACK_WEBHOOK_URL` | Slack incoming webhook URL | `https://hooks.slack.com/services/T00/B00/XXX` |
| `PAGERDUTY_INTEGRATION_KEY` | PagerDuty Events API v2 key | `R0123456789ABCDEF01234` |

To set these:

```bash
# Via GitHub CLI (if available)
gh secret set WEBHOOK_URL --body "https://your-project.supabase.co/functions/v1/payment-webhook"
gh secret set WEBHOOK_SECRET --body "your-webhook-secret"
gh secret set SLACK_WEBHOOK_URL --body "https://hooks.slack.com/services/..."
gh secret set PAGERDUTY_INTEGRATION_KEY --body "your-integration-key"
```

Or set them manually via the GitHub web interface.

### 2. Slack Integration

#### 2.1 Create Slack Incoming Webhook

1. Go to your Slack workspace settings
2. Navigate to **Apps → Incoming Webhooks**
3. Click **Add to Slack**
4. Select `#oncall-apps` channel
5. Copy the webhook URL
6. Add it as `SLACK_WEBHOOK_URL` secret in GitHub

#### 2.2 Enable Slack Notifications

Uncomment the Slack notification section in `.github/workflows/smoke-tests.yml`:

```yaml
- name: Send Slack notification
  if: failure()
  env:
    SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
  run: |
    curl -X POST -H 'Content-type: application/json' \
      --data "{
        \"text\": \"🚨 Smoke Test Failure Alert\",
        \"blocks\": [
          {
            \"type\": \"header\",
            \"text\": {
              \"type\": \"plain_text\",
              \"text\": \"🚨 Production Smoke Test Failed\"
            }
          },
          {
            \"type\": \"section\",
            \"fields\": [
              {
                \"type\": \"mrkdwn\",
                \"text\": \"*Repository:*\\n${{ github.repository }}\"
              },
              {
                \"type\": \"mrkdwn\",
                \"text\": \"*Workflow:*\\n${{ github.workflow }}\"
              },
              {
                \"type\": \"mrkdwn\",
                \"text\": \"*Run:*\\n<${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}|View Details>\"
              },
              {
                \"type\": \"mrkdwn\",
                \"text\": \"*Time:*\\n$(date -u +'%Y-%m-%d %H:%M:%S UTC')\"
              }
            ]
          },
          {
            \"type\": \"section\",
            \"text\": {
              \"type\": \"mrkdwn\",
              \"text\": \"*Action Required:* Investigate immediately and escalate if critical.\"
            }
          }
        ]
      }" \
      "$SLACK_WEBHOOK_URL"
```

### 3. PagerDuty Integration

#### 3.1 Create PagerDuty Service Integration

1. Log in to PagerDuty
2. Navigate to **Services → Service Directory**
3. Find or create the `Wathaci-Core` service
4. Click **Integrations** tab
5. Add **Events API V2** integration
6. Copy the integration key
7. Add it as `PAGERDUTY_INTEGRATION_KEY` secret in GitHub

#### 3.2 Enable PagerDuty Alerts

Add this step to the `notify-on-failure` job in `.github/workflows/smoke-tests.yml`:

```yaml
- name: Send PagerDuty alert
  if: failure()
  env:
    PAGERDUTY_KEY: ${{ secrets.PAGERDUTY_INTEGRATION_KEY }}
  run: |
    curl -X POST https://events.pagerduty.com/v2/enqueue \
      -H 'Content-Type: application/json' \
      -d "{
        \"routing_key\": \"$PAGERDUTY_KEY\",
        \"event_action\": \"trigger\",
        \"payload\": {
          \"summary\": \"Production smoke test failure in ${{ github.repository }}\",
          \"source\": \"github-actions\",
          \"severity\": \"error\",
          \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",
          \"custom_details\": {
            \"workflow\": \"${{ github.workflow }}\",
            \"run_id\": \"${{ github.run_id }}\",
            \"run_url\": \"${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}\"
          }
        }
      }"
```

### 4. Email Notifications

Configure GitHub Actions to send email notifications:

1. Go to repository **Settings → Notifications**
2. Enable **Actions** notifications
3. Select notification recipients
4. Configure email preferences

Alternatively, use a third-party email service:

```yaml
- name: Send email alert
  if: failure()
  uses: dawidd6/action-send-mail@v3
  with:
    server_address: smtp.gmail.com
    server_port: 465
    username: ${{ secrets.EMAIL_USERNAME }}
    password: ${{ secrets.EMAIL_PASSWORD }}
    subject: '🚨 Production Smoke Test Failure - ${{ github.repository }}'
    to: oncall@wathaci.com
    from: alerts@wathaci.com
    body: |
      Production smoke tests have failed.
      
      Repository: ${{ github.repository }}
      Workflow: ${{ github.workflow }}
      Run: ${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}
      Time: $(date -u)
      
      Please investigate immediately.
```

### 5. Observability Dashboard Integration

#### 5.1 Grafana/Prometheus

Export smoke test metrics to Prometheus:

```yaml
- name: Export metrics
  if: always()
  run: |
    # Push metrics to Pushgateway
    cat <<EOF | curl --data-binary @- http://pushgateway:9091/metrics/job/smoke_tests
    # HELP smoke_test_success Smoke test success (1) or failure (0)
    # TYPE smoke_test_success gauge
    smoke_test_success{test="https_health"} ${{ steps.https-test.outcome == 'success' && '1' || '0' }}
    smoke_test_success{test="webhook"} ${{ steps.webhook-test.outcome == 'success' && '1' || '0' }}
    
    # HELP smoke_test_duration_seconds Smoke test duration
    # TYPE smoke_test_duration_seconds gauge
    smoke_test_duration_seconds{test="https_health"} ${{ steps.https-test.duration }}
    smoke_test_duration_seconds{test="webhook"} ${{ steps.webhook-test.duration }}
    EOF
```

#### 5.2 Datadog

Use Datadog GitHub Action:

```yaml
- name: Send metrics to Datadog
  if: always()
  uses: masci/datadog@v1
  with:
    api-key: ${{ secrets.DATADOG_API_KEY }}
    metrics: |
      - type: "count"
        name: "smoke_test.run"
        value: 1
        tags:
          - "test:https_health"
          - "result:${{ steps.https-test.outcome }}"
      - type: "count"  
        name: "smoke_test.run"
        value: 1
        tags:
          - "test:webhook"
          - "result:${{ steps.webhook-test.outcome }}"
```

### 6. GitHub Status Badges

Add smoke test status badges to your README:

```markdown
## System Status

[![Smoke Tests](https://github.com/Kena440/WATHACI-CONNECT.-V1/actions/workflows/smoke-tests.yml/badge.svg)](https://github.com/Kena440/WATHACI-CONNECT.-V1/actions/workflows/smoke-tests.yml)
```

## Alert Response Procedures

### Response Times

| Priority | Response Time | Escalation |
|----------|--------------|------------|
| **Critical** (All tests failing) | 5 minutes | Immediate PagerDuty page |
| **High** (HTTPS health failing) | 10 minutes | Slack alert + email |
| **Medium** (Webhook failing) | 15 minutes | Slack alert |
| **Low** (Intermittent failures) | 30 minutes | Monitor for patterns |

### Response Checklist

When a smoke test alert fires:

1. **Acknowledge** the alert within 5 minutes
2. **Check** the workflow run logs for specific failure details
3. **Verify** production system status:
   - Check application logs
   - Review recent deployments
   - Verify infrastructure health
4. **Investigate** root cause:
   - Is the application down?
   - Certificate expired?
   - Webhook endpoint misconfigured?
   - Network issues?
5. **Remediate** the issue:
   - Roll back if recent deployment caused failure
   - Fix configuration if misconfigured
   - Restart services if needed
6. **Document** in incident ticket:
   - What failed
   - Root cause
   - Resolution steps
   - Prevention measures
7. **Close** the alert once verified healthy

## Testing the Alert Integration

### Test Slack Notifications

```bash
curl -X POST -H 'Content-type: application/json' \
  --data '{"text":"🧪 Test alert from smoke test monitoring"}' \
  YOUR_SLACK_WEBHOOK_URL
```

### Test PagerDuty Integration

```bash
curl -X POST https://events.pagerduty.com/v2/enqueue \
  -H 'Content-Type: application/json' \
  -d '{
    "routing_key": "YOUR_INTEGRATION_KEY",
    "event_action": "trigger",
    "payload": {
      "summary": "Test alert from smoke test monitoring",
      "source": "manual-test",
      "severity": "warning"
    }
  }'
```

### Trigger Manual Smoke Test

Test the smoke tests themselves:

```bash
# Via GitHub CLI
gh workflow run smoke-tests.yml

# Or via GitHub web interface:
# Actions → Smoke Tests → Run workflow
```

## Monitoring Best Practices

1. **Review alert thresholds** quarterly to reduce false positives
2. **Maintain on-call rotation** with clear handoff procedures
3. **Document all incidents** for pattern analysis
4. **Update runbooks** based on common failure scenarios
5. **Test alert system** monthly to ensure notifications work
6. **Review smoke test coverage** after major changes
7. **Monitor alert fatigue** - adjust sensitivity if needed

## Troubleshooting

### Alerts not sending

1. Verify secrets are configured in GitHub repository
2. Check webhook URLs are accessible
3. Review workflow run logs for error messages
4. Test integrations manually using curl commands above

### Too many false positives

1. Adjust smoke test timeouts
2. Review network reliability
3. Consider adding retry logic
4. Adjust alert thresholds

### Alerts missing critical failures

1. Increase test frequency during critical periods
2. Add more comprehensive health checks
3. Review smoke test coverage
4. Consider adding synthetic monitoring

## Reference

- **Workflow File**: `.github/workflows/smoke-tests.yml`
- **HTTPS Test Script**: `scripts/smoke-test-https.sh`
- **Webhook Test Script**: `scripts/smoke-test-webhook.js`
- **Schedule Documentation**: `docs/POST_LAUNCH_SMOKE_TEST_SCHEDULE.md`
- **GitHub Actions Docs**: https://docs.github.com/en/actions

## Support

For issues with:
- **Smoke test scripts**: Review script output and error messages
- **GitHub Actions**: Check workflow logs and GitHub Actions status
- **Slack integration**: Verify webhook URL and channel permissions
- **PagerDuty**: Confirm integration key and service configuration
- **Alert routing**: Review on-call schedule and escalation policies
