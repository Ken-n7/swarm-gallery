param([int]$ServerPort = 4000, [int]$ClientPort = 3000)
try {
    $r = Invoke-RestMethod "http://localhost:$ServerPort/admin/network" -ErrorAction Stop
    if ($r.liveIp) {
        Write-Output "http://$($r.liveIp):$ClientPort/event/demo"
    }
} catch {}
