$ErrorActionPreference = 'Stop'
Write-Host 'This installs Blender, Ollama, and Python using the Windows package manager.'
Write-Host 'It then shows how to download the local Qwen3 8B model (several GB). No paid API is used.'
$answer = Read-Host 'Continue? Type yes'
if ($answer -ne 'yes') { exit }
foreach ($package in @('BlenderFoundation.Blender','Ollama.Ollama','Python.Python.3.12')) {
    & winget install --id $package --exact --source winget --accept-source-agreements --accept-package-agreements
    if ($LASTEXITCODE -ne 0) { Write-Host "Installation did not complete for $package. Check the message above before continuing."; exit 1 }
}
[Environment]::SetEnvironmentVariable('OLLAMA_NO_CLOUD','1','User')
Write-Host 'Cloud inference has been disabled for future Ollama sessions.'
Write-Host 'Close and reopen Ollama so this setting takes effect.'
Write-Host 'Open a new terminal and run: ollama pull qwen3:8b'
Write-Host 'After the model download finishes, double-click Start workshop.'
Read-Host 'Press Enter to close'
