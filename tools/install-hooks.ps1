# Installs the repository git hooks (docs/DECISIONS.md DEC-66).
#
# Why a script: git hooks are NOT tracked by version control, so the hook bodies live in
# tools/hooks/ and get copied into .git/hooks/ by this script. Re-run it after editing them.
#
# This file must stay pure ASCII: PowerShell 5.1 decodes BOM-less UTF-8 as ANSI and any
# non-ASCII character (e.g. Chinese comments) breaks the parser.
#
# Usage:  powershell -ExecutionPolicy Bypass -File tools/install-hooks.ps1

$ErrorActionPreference = 'Stop'

$root = (& git rev-parse --show-toplevel).Trim()
if (-not $root) { throw 'Not inside a git repository.' }

$source = Join-Path $root 'tools/hooks'
$target = Join-Path $root '.git/hooks'

if (-not (Test-Path $source)) { throw "Hook source directory not found: $source" }
if (-not (Test-Path $target)) { throw "Git hooks directory not found: $target" }

Get-ChildItem -Path $source -File | ForEach-Object {
    $destination = Join-Path $target $_.Name
    Copy-Item -Path $_.FullName -Destination $destination -Force
    Write-Output "installed: .git/hooks/$($_.Name)"
}

# Keep the workspace away from core.hooksPath: hooks are installed natively (DEC-66 option D).
$current = (& git config --local --get core.hooksPath) 2>$null
if ($current) {
    Write-Output "note: core.hooksPath is set to '$current' - hooks copied here will be ignored."
    Write-Output "      run: git config --local --unset core.hooksPath"
}

Write-Output 'done.'
