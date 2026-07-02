$ErrorActionPreference = "Stop"

$projectDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$launcherPath = Join-Path $projectDir "Start-Mai.cmd"
$desktopPath = [Environment]::GetFolderPath("Desktop")
$shortcutPath = Join-Path $desktopPath "Mai Desktop Companion.lnk"

if (-not (Test-Path $launcherPath)) {
    throw "Launcher not found: $launcherPath"
}

$wsh = New-Object -ComObject WScript.Shell
$shortcut = $wsh.CreateShortcut($shortcutPath)
$shortcut.TargetPath = $launcherPath
$shortcut.WorkingDirectory = $projectDir
$shortcut.IconLocation = "$env:SystemRoot\System32\shell32.dll,220"
$shortcut.Description = "Launch Mai Desktop Companion"
$shortcut.Save()

Write-Host "Shortcut created at: $shortcutPath"
