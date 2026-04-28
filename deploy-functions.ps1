# ORION-V3 Edge Functions Deploy Script
# Execute no terminal como: .\deploy-functions.ps1

Write-Host "Deploying ORION-V3 Edge Functions..." -ForegroundColor Cyan

$functions = @(
    "ai-orchestrator",
    "generate-embeddings",
    "neural-search",
    "queue-worker"
)

foreach ($func in $functions) {
    Write-Host "Deploying $func..." -ForegroundColor Yellow
    npx supabase functions deploy $func --project-ref dlwafedtlvbvuoaopvsl
    Write-Host "$func deployed!" -ForegroundColor Green
}

Write-Host "All functions deployed!" -ForegroundColor Cyan