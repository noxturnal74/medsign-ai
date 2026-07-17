param(
    [Parameter(Mandatory = $true)]
    [string]$SignerId,

    [int]$TakesPerLabel = 10,
    [int]$CameraIndex = 0,
    [string]$SessionId = "",
    [switch]$DryRun,
    [switch]$SaveVideo,
    [switch]$NoPrompt,
    [switch]$TrainWhenReady
)

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$BackendDir = Split-Path -Parent $ScriptDir
$PythonExe = Join-Path $BackendDir "venv\Scripts\python.exe"

if (-not (Test-Path $PythonExe)) {
    $PythonExe = "python"
}

$ArgsList = @(
    (Join-Path $ScriptDir "collect_signer_dataset.py"),
    "--signer-id", $SignerId,
    "--takes-per-label", "$TakesPerLabel",
    "--camera-index", "$CameraIndex"
)

if ($SessionId -ne "") {
    $ArgsList += @("--session-id", $SessionId)
}
if ($DryRun) {
    $ArgsList += "--dry-run"
}
if ($SaveVideo) {
    $ArgsList += "--save-video"
}
if ($NoPrompt) {
    $ArgsList += "--no-prompt"
}
if ($TrainWhenReady) {
    $ArgsList += "--train-when-ready"
}

& $PythonExe @ArgsList
