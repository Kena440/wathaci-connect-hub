param(
    # Change this if your project folder ever moves
    [string]$ProjectPath = "C:\Users\amuke\OneDrive\Documents\Wathaci Connect Project Folder\WATHACI-CONNECT.-V1"
)

Write-Host "=== Wathaci Supabase Sync (Remote → Local) ===" -ForegroundColor Cyan
Write-Host ""

if (!(Test-Path $ProjectPath)) {
    Write-Host "Project path not found:" -ForegroundColor Red
    Write-Host "  $ProjectPath" -ForegroundColor Red
    exit 1
}

Write-Host "Switching to project folder:"
Write-Host "  $ProjectPath" -ForegroundColor Yellow
Set-Location $ProjectPath

# 1. Stop Supabase (if running)
Write-Host ""
Write-Host "Step 1/4: Stopping local Supabase (if running)..." -ForegroundColor Cyan
try {
    supabase stop
} catch {
    Write-Host "supabase stop reported an error (it may not have been running). Continuing..." -ForegroundColor DarkYellow
}

# 2. Pull remote schema into migrations
Write-Host ""
Write-Host "Step 2/4: Pulling remote schema (supabase db pull)..." -ForegroundColor Cyan
supabase db pull
if ($LASTEXITCODE -ne 0) {
    Write-Host "supabase db pull failed. Fix this before continuing." -ForegroundColor Red
    exit $LASTEXITCODE
}

# 3. Confirm before resetting local DB
Write-Host ""
Write-Host "Step 3/4: Resetting local DB to match remote schema." -ForegroundColor Cyan
Write-Host "WARNING: 'supabase db reset' will ERASE your LOCAL database data." -ForegroundColor Red
$answer = Read-Host "Type YES to continue, or anything else to cancel"

if ($answer -ne "YES") {
    Write-Host "Cancelled by user. Local database was NOT reset." -ForegroundColor Yellow
    exit 0
}

supabase db reset
if ($LASTEXITCODE -ne 0) {
    Write-Host "supabase db reset failed. Check the error above." -ForegroundColor Red
    exit $LASTEXITCODE
}

# 4. Start local Supabase again
Write-Host ""
Write-Host "Step 4/4: Starting local Supabase (supabase start)..." -ForegroundColor Cyan
supabase start
if ($LASTEXITCODE -ne 0) {
    Write-Host "supabase start failed. Check the error above." -ForegroundColor Red
    exit $LASTEXITCODE
}

Write-Host ""
Write-Host "✅ Done. Local Supabase is now synced to the remote project schema." -ForegroundColor Green
