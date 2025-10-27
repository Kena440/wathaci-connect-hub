#!/bin/bash
##
# Setup Smoke Test Monitoring
#
# This interactive script helps configure GitHub repository secrets
# needed for automated smoke tests and monitoring alerts.
#
# Prerequisites:
# - GitHub CLI (gh) installed and authenticated
# - Repository owner/admin permissions
#
# Usage:
#   bash scripts/setup-smoke-test-monitoring.sh
##

set -e

echo "=================================================="
echo "Smoke Test Monitoring Setup"
echo "=================================================="
echo ""
echo "This script will help you configure GitHub repository"
echo "secrets for automated smoke tests and monitoring alerts."
echo ""

# Check if gh is installed
if ! command -v gh &> /dev/null; then
    echo "❌ GitHub CLI (gh) is not installed"
    echo ""
    echo "Install it from: https://cli.github.com/"
    echo ""
    echo "Alternatively, set secrets manually via GitHub web interface:"
    echo "Settings → Secrets and variables → Actions → New repository secret"
    exit 1
fi

# Check if authenticated
if ! gh auth status &> /dev/null; then
    echo "❌ GitHub CLI is not authenticated"
    echo ""
    echo "Run: gh auth login"
    exit 1
fi

echo "✅ GitHub CLI is installed and authenticated"
echo ""

# Get current repository
REPO=$(gh repo view --json nameWithOwner -q .nameWithOwner 2>/dev/null || echo "")

if [ -z "$REPO" ]; then
    echo "⚠️  Could not detect repository"
    echo ""
    read -p "Enter repository (owner/repo): " REPO
fi

echo "Repository: $REPO"
echo ""

# Function to set secret
set_secret() {
    local secret_name=$1
    local secret_description=$2
    local secret_example=$3
    local is_optional=$4
    
    echo "---"
    echo "Secret: $secret_name"
    echo "Description: $secret_description"
    echo "Example: $secret_example"
    
    if [ "$is_optional" = "true" ]; then
        echo "(Optional - press Enter to skip)"
    fi
    
    echo ""
    read -s -p "Enter value (hidden): " secret_value
    echo ""  # Add newline after hidden input
    
    if [ -z "$secret_value" ]; then
        if [ "$is_optional" = "true" ]; then
            echo "⏭️  Skipped"
            return 0
        else
            echo "❌ Value required for $secret_name"
            return 1
        fi
    fi
    
    # Set the secret using --body flag to avoid exposing value in process list
    if gh secret set "$secret_name" --repo "$REPO" --body "$secret_value" 2>/dev/null; then
        echo "✅ Set $secret_name"
    else
        echo "❌ Failed to set $secret_name"
        return 1
    fi
    
    echo ""
}

echo "=================================================="
echo "Required Secrets"
echo "=================================================="
echo ""

# Required secrets
set_secret \
    "WEBHOOK_URL" \
    "Production webhook endpoint URL" \
    "https://nrjcbdrzaxqvomeogptf.supabase.co/functions/v1/payment-webhook" \
    "false"

set_secret \
    "WEBHOOK_SECRET" \
    "Webhook signing secret (matches Lenco dashboard)" \
    "your-webhook-secret" \
    "false"

echo "=================================================="
echo "Optional Alert Integration Secrets"
echo "=================================================="
echo ""

# Optional secrets
set_secret \
    "SLACK_WEBHOOK_URL" \
    "Slack incoming webhook URL for #oncall-apps channel" \
    "https://hooks.slack.com/services/T00/B00/XXX" \
    "true"

set_secret \
    "PAGERDUTY_INTEGRATION_KEY" \
    "PagerDuty Events API v2 integration key" \
    "R0123456789ABCDEF01234" \
    "true"

echo "=================================================="
echo "Setup Complete!"
echo "=================================================="
echo ""
echo "Next steps:"
echo ""
echo "1. Review the smoke test workflow:"
echo "   .github/workflows/smoke-tests.yml"
echo ""
echo "2. Enable Slack/PagerDuty alerts by uncommenting"
echo "   the notification steps in the workflow"
echo ""
echo "3. Test the smoke tests manually:"
echo "   gh workflow run smoke-tests.yml"
echo ""
echo "4. View workflow runs:"
echo "   gh run list --workflow=smoke-tests.yml"
echo ""
echo "5. Read the monitoring guide:"
echo "   docs/SMOKE_TEST_MONITORING.md"
echo ""

exit 0
