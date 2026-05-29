# Kills the process listening on a port, then spins until the port is free.
# Usage: powershell -NoProfile -File tools\kill-port.ps1 -Port 4000
param(
    [int]$Port
)

$conn = Get-NetTCPConnection -LocalPort $Port -State Listen -EA SilentlyContinue |
        Select-Object -First 1

if (-not $conn) { exit 0 }

Write-Host "   [~]  Port $Port in use (pid $($conn.OwningProcess)) - clearing..." -ForegroundColor Yellow
Stop-Process -Id $conn.OwningProcess -Force -EA SilentlyContinue

$spin = @('|', '/', '-', '\')
$i    = 0
$sw   = [System.Diagnostics.Stopwatch]::StartNew()

while ($sw.Elapsed.TotalSeconds -lt 5) {
    try {
        $tcp = New-Object System.Net.Sockets.TcpClient
        $tcp.Connect('127.0.0.1', $Port)
        $tcp.Close()
        # still listening - keep waiting
    } catch {
        # port is free
        [Console]::Write("`r" + (" " * 60) + "`r")
        Write-Host "   [+]  Port $Port cleared" -ForegroundColor Green
        exit 0
    }
    [Console]::Write("`r   $($spin[$i % 4])  Waiting for port $Port to release...")
    $i++
    Start-Sleep -Milliseconds 150
}

[Console]::Write("`r" + (" " * 60) + "`r")
Write-Host "   [!]  Port $Port still in use after 5s - proceeding anyway" -ForegroundColor Yellow
exit 0
