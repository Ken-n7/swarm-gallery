# Spins until a local TCP port accepts connections (or times out).
# Usage: powershell -NoProfile -File tools\wait-port.ps1 -Msg "..." -Port 4000 -MaxWait 30
param(
    [string]$Msg     = "Waiting",
    [int]   $Port    = 3000,
    [int]   $MaxWait = 30
)

$spin = @('|', '/', '-', '\')
$i    = 0
$sw   = [System.Diagnostics.Stopwatch]::StartNew()

while ($sw.Elapsed.TotalSeconds -lt $MaxWait) {
    $s = [math]::Round($sw.Elapsed.TotalSeconds, 1)
    [Console]::Write("`r   $($spin[$i % 4])  $Msg  (${s}s)")
    $i++

    try {
        $tcp = New-Object System.Net.Sockets.TcpClient
        $tcp.Connect('127.0.0.1', $Port)
        $tcp.Close()

        $elapsed = [math]::Round($sw.Elapsed.TotalSeconds, 1)
        [Console]::Write("`r" + (" " * 80) + "`r")
        Write-Host "   [+]  $Msg" -ForegroundColor Green -NoNewline
        Write-Host "  (${elapsed}s)" -ForegroundColor DarkGray
        exit 0
    } catch {}

    Start-Sleep -Milliseconds 200
}

[Console]::Write("`r" + (" " * 80) + "`r")
Write-Host "   [!]  $Msg - timed out after ${MaxWait}s" -ForegroundColor Red
exit 1
