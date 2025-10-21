#!/usr/bin/env bash
set -euo pipefail

# Supabase CLI Login Helper Script
# This script helps you authenticate and link your local project to Supabase

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="${SCRIPT_DIR}/.."

infer_project_ref() {
    local candidate
    local double_quote="\""
    local single_quote="'"

    if [[ -n "${SUPABASE_PROJECT_REF:-}" ]]; then
        echo "$SUPABASE_PROJECT_REF"
        return
    fi

    if [[ -f "$PROJECT_DIR/.env" ]]; then
        candidate=$(grep -E '^SUPABASE_PROJECT_REF=' "$PROJECT_DIR/.env" | tail -n1 | cut -d'=' -f2-)
        candidate=${candidate//$double_quote/}
        candidate=${candidate//$single_quote/}
        if [[ -n "$candidate" ]]; then
            echo "$candidate"
            return
        fi

        candidate=$(grep -E '^(SUPABASE_URL|VITE_SUPABASE_URL|VITE_SUPABASE_PROJECT_URL)=' "$PROJECT_DIR/.env" | tail -n1 | cut -d'=' -f2-)
        candidate=${candidate//$double_quote/}
        candidate=${candidate//$single_quote/}
        if [[ -n "$candidate" ]]; then
            candidate=${candidate#https://}
            candidate=${candidate%%.supabase.co*}
            if [[ -n "$candidate" ]]; then
                echo "$candidate"
                return
            fi
        fi
    fi

    echo "YOUR_PROJECT_REF"
}

PROJECT_REF="$(infer_project_ref)"

if [[ "$PROJECT_REF" == "YOUR_PROJECT_REF" ]]; then
    echo "⚠️  Project reference not set. Update SUPABASE_PROJECT_REF or your .env file before linking."
fi

echo "🔐 Supabase CLI Login Helper"
echo "================================"
echo ""

# Check if supabase CLI is installed
if ! command -v supabase >/dev/null 2>&1; then
    echo "❌ Error: Supabase CLI is not installed."
    echo ""
    echo "To install on Linux/macOS, run:"
    echo "  cd /tmp"
    echo "  curl -LO https://github.com/supabase/cli/releases/latest/download/supabase_linux_amd64.tar.gz"
    echo "  tar -xzf supabase_linux_amd64.tar.gz"
    echo "  sudo mv supabase /usr/local/bin/"
    echo ""
    echo "Or visit: https://supabase.com/docs/guides/cli#installation"
    exit 1
fi

echo "✅ Supabase CLI $(supabase --version | grep -oP '\d+\.\d+\.\d+') found"
echo ""

# Check if access token is already set
if [[ -n "${SUPABASE_ACCESS_TOKEN:-}" ]]; then
    echo "✅ SUPABASE_ACCESS_TOKEN environment variable is set"
    echo ""
else
    echo "⚠️  SUPABASE_ACCESS_TOKEN environment variable is not set"
    echo ""
    echo "To authenticate with Supabase CLI, you need an access token."
    echo ""
    echo "📋 Steps to generate an access token:"
    echo "  1. Go to: https://supabase.com/dashboard/account/tokens"
    echo "  2. Click 'Generate new token'"
    echo "  3. Give it a name (e.g., 'CLI Access')"
    echo "  4. Copy the generated token"
    echo ""
    echo "Then, you can either:"
    echo ""
    echo "  Option A: Set it as an environment variable (recommended for CI/CD):"
    echo "    export SUPABASE_ACCESS_TOKEN='your_token_here'"
    echo ""
    echo "  Option B: Login using the CLI:"
    echo "    supabase login --token YOUR_TOKEN"
    echo ""
    
    read -p "Do you have an access token ready? (y/n): " -n 1 -r
    echo ""
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo ""
        read -p "Enter your Supabase access token: " -s ACCESS_TOKEN
        echo ""
        
        if [[ -z "$ACCESS_TOKEN" ]]; then
            echo "❌ No token provided. Exiting."
            exit 1
        fi
        
        echo "🔑 Attempting to login..."
        if supabase login --token "$ACCESS_TOKEN"; then
            echo "✅ Successfully logged in!"
            export SUPABASE_ACCESS_TOKEN="$ACCESS_TOKEN"
        else
            echo "❌ Login failed. Please check your token and try again."
            exit 1
        fi
    else
        echo ""
        echo "Please generate an access token first and run this script again."
        echo "Or set the SUPABASE_ACCESS_TOKEN environment variable and run:"
        echo "  supabase link --project-ref $PROJECT_REF"
        exit 0
    fi
fi

echo ""
echo "🔗 Linking to Supabase project..."
echo "   Project Ref: $PROJECT_REF"
echo ""

# Check if project is already linked
cd "$PROJECT_DIR"
if supabase status >/dev/null 2>&1; then
    echo "✅ Project is already linked to Supabase"
    echo ""
    supabase status
else
    echo "Attempting to link project..."
    
    # Source the database password from environment or .env if available
    DB_PASSWORD="${SUPABASE_DB_PASSWORD:-}"
    double_quote="\""
    single_quote="'"

    if [[ -z "$DB_PASSWORD" && -f "$PROJECT_DIR/.env" ]]; then
        DB_PASSWORD=$(grep -E '^SUPABASE_DB_PASSWORD=' "$PROJECT_DIR/.env" | tail -n1 | cut -d'=' -f2-)
        DB_PASSWORD=${DB_PASSWORD//$double_quote/}
        DB_PASSWORD=${DB_PASSWORD//$single_quote/}
    fi

    if [[ -z "$DB_PASSWORD" && -f "$PROJECT_DIR/.env" ]]; then
        DB_PASSWORD=$(grep -E '^SUPABASE_PASSWORD=' "$PROJECT_DIR/.env" | tail -n1 | cut -d'=' -f2-)
        DB_PASSWORD=${DB_PASSWORD//$double_quote/}
        DB_PASSWORD=${DB_PASSWORD//$single_quote/}
    fi

    if [[ -z "$DB_PASSWORD" && -n "${SUPABASE_PASSWORD:-}" ]]; then
        DB_PASSWORD="$SUPABASE_PASSWORD"
    fi

    if [[ -z "$DB_PASSWORD" && -f "$PROJECT_DIR/.env" ]]; then
        db_url=$(grep -E '^SUPABASE_DB_URL=' "$PROJECT_DIR/.env" | tail -n1 | cut -d'=' -f2-)
        db_url=${db_url//$double_quote/}
        db_url=${db_url//$single_quote/}
        if [[ -n "$db_url" ]]; then
            DB_PASSWORD=$(printf '%s' "$db_url" | sed -E 's#^postgres://[^:]+:([^@]+)@.*$#\1#')
        fi
    fi

    if [[ -z "$DB_PASSWORD" ]]; then
        read -p "Enter your Supabase database password: " -s DB_PASSWORD
        echo ""
    fi
    
    if [[ -z "$DB_PASSWORD" ]]; then
        echo "❌ No database password provided. Exiting."
        exit 1
    fi
    
    if supabase link --project-ref "$PROJECT_REF" --password "$DB_PASSWORD"; then
        echo "✅ Successfully linked to Supabase project!"
        echo ""
        echo "📊 Project status:"
        supabase status
    else
        echo "❌ Failed to link project. Please check your credentials."
        exit 1
    fi
fi

echo ""
echo "✅ Setup complete! You can now use Supabase CLI commands."
echo ""
echo "📚 Common commands:"
echo "  • supabase status          - Check project status"
echo "  • supabase db pull         - Pull remote schema changes"
echo "  • supabase db push         - Push local migrations"
echo "  • supabase functions deploy - Deploy edge functions"
echo ""
echo "For more information, see: SUPABASE_CLI_SETUP.md"
