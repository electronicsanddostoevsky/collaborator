$ErrorActionPreference = 'Stop'
Write-Host 'Choose only the software you need for your missions.'
Write-Host 'Python is required for the workshop. Ollama is optional for local AI. Blender is optional for 3D work.'
$localAI = Read-Host 'Install Ollama for local AI? Type yes, or press Enter to skip'
$threeD = Read-Host 'Install Blender for 3D work? Type yes, or press Enter to skip'
$packages = @('Python.Python.3.12')
if ($localAI -eq 'yes') { $packages += 'Ollama.Ollama' }
if ($threeD -eq 'yes') { $packages += 'BlenderFoundation.Blender' }
Write-Host ('Selected: ' + ($packages -join ', '))
$answer = Read-Host 'Install these packages? Type yes'
if ($answer -ne 'yes') { exit }
foreach ($package in $packages) {
    & winget install --id $package --exact --source winget --accept-source-agreements --accept-package-agreements
    if ($LASTEXITCODE -ne 0) { Write-Host "Installation did not complete for $package. Check the message above before continuing."; exit 1 }
}
if ($localAI -eq 'yes') {
    [Environment]::SetEnvironmentVariable('OLLAMA_NO_CLOUD','1','User')
    Write-Host 'Cloud inference has been disabled for future Ollama sessions. Restart Ollama.'
    Write-Host 'Download a local model suited to your computer. Example: ollama pull qwen3:8b (several GB).'
}
Write-Host 'For ChatGPT-connected Codex, follow the official setup: https://developers.openai.com/codex/cli/'
Write-Host 'Then open Start workshop.cmd. Your account sign-in happens through the official Codex flow.'
Read-Host 'Press Enter to close'
