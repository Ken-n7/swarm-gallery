# Runs a CLI command with an animated spinner, elapsed time, and coloured result.
# Usage: powershell -NoProfile -File tools\run.ps1 -Msg "..." -Cmd "npm install" -Dir "server" -Log "path.log"
param(
    [string]$Msg,
    [string]$Cmd,
    [string]$Dir = ".",
    [string]$Log = ""
)

$spin = @('|', '/', '-', '\')
$i    = 0
$sw   = [System.Diagnostics.Stopwatch]::StartNew()

$psi                        = New-Object System.Diagnostics.ProcessStartInfo
$psi.FileName               = 'cmd.exe'
$psi.Arguments              = "/c $Cmd"
$psi.WorkingDirectory       = (Resolve-Path $Dir).Path
$psi.CreateNoWindow         = $true
$psi.UseShellExecute        = $false
$psi.RedirectStandardOutput = $true
$psi.RedirectStandardError  = $true

$proc    = [System.Diagnostics.Process]::Start($psi)
$outTask = $proc.StandardOutput.ReadToEndAsync()
$errTask = $proc.StandardError.ReadToEndAsync()

while (!$proc.HasExited) {
    $s = [math]::Round($sw.Elapsed.TotalSeconds, 1)
    [Console]::Write("`r   $($spin[$i % 4])  $Msg  (${s}s)")
    $i++
    Start-Sleep -Milliseconds 100
}
$proc.WaitForExit()
$sw.Stop()

$out = $outTask.GetAwaiter().GetResult()
$err = $errTask.GetAwaiter().GetResult()
if ($Log) { [System.IO.File]::WriteAllText($Log, "$out`n$err") }

$elapsed  = [math]::Round($sw.Elapsed.TotalSeconds, 1)
$exitCode = $proc.ExitCode

[Console]::Write("`r" + (" " * 80) + "`r")

if ($exitCode -eq 0) {
    Write-Host "   [+]  $Msg" -ForegroundColor Green -NoNewline
    Write-Host "  (${elapsed}s)" -ForegroundColor DarkGray
    exit 0
} else {
    Write-Host "   [!]  $Msg failed" -ForegroundColor Red -NoNewline
    Write-Host "  (${elapsed}s)" -ForegroundColor DarkGray
    exit 1
}
