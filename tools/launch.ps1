# Launches a Node.js process in the background with no console window.
# Avoids cmd.exe wrapper which dies when PowerShell exits due to console session
# close events propagating through the cmd -> node process chain.
param(
    [string]$Bin,      # path to node binary argument (e.g. "index.js" or "node_modules\next\dist\bin\next start")
    [string]$Dir,
    [string]$StdOut,
    [string]$StdErr,
    [string]$PidFile
)

$args = $Bin -split ' ', 2

$proc = Start-Process `
    -FilePath         'node' `
    -ArgumentList     $args `
    -WorkingDirectory $Dir `
    -RedirectStandardOutput $StdOut `
    -RedirectStandardError  $StdErr `
    -WindowStyle      Hidden `
    -PassThru

[System.IO.File]::WriteAllText($PidFile, "$($proc.Id)")
