# Post-Launch Smoke Test Schedule

## Overview
Immediately after a production release, run the following smoke checks to confirm the core platform paths are healthy. All times are measured relative to the deployment finishing (`T0`). If any check fails, escalate in the `#oncall-apps` Slack channel and open an incident ticket.

## Schedule & Assignments
| Time (relative) | Check | Owner | Procedure |
| --- | --- | --- | --- |
| T0 + 5 min | HTTPS availability | Priya Natarajan | Use the status dashboard or run `curl -I https://wathaci.com` to verify a 200/301 response. Confirm certificate validity and that the response time is below 500 ms. |
| T0 + 10 min | Webhook trigger path | Mateo Ruiz | From the staging workspace, send the `order.created` test payload to production via the admin console. Confirm the webhook endpoint returns HTTP 202 and that the downstream fulfillment service logs the event. |

## Monitoring During Stabilization Window
- Duration: T0 to T0 + 2 hours.
- Alert Channels: `#oncall-apps` (primary), PagerDuty service **Wathaci-Core**, and the observability dashboard alerts view.
- Rotation: Priya covers the first hour; Mateo covers the second hour. Hand off in Slack with a quick status note.
- Response Expectations: acknowledge any automated alert within 5 minutes, and document follow-up actions in the deployment log.
