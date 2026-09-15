import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'

const url = process.env.TEFETE_URL ?? 'http://localhost:5173/?mode=play&app=1'
const browsers = [
  process.env['PROGRAMFILES(X86)'] && `${process.env['PROGRAMFILES(X86)']}\\Microsoft\\Edge\\Application\\msedge.exe`,
  process.env.PROGRAMFILES && `${process.env.PROGRAMFILES}\\Microsoft\\Edge\\Application\\msedge.exe`,
  process.env.LOCALAPPDATA && `${process.env.LOCALAPPDATA}\\Microsoft\\Edge\\Application\\msedge.exe`,
  process.env.PROGRAMFILES && `${process.env.PROGRAMFILES}\\Google\\Chrome\\Application\\chrome.exe`,
  process.env.LOCALAPPDATA && `${process.env.LOCALAPPDATA}\\Google\\Chrome\\Application\\chrome.exe`,
].filter(Boolean)

const exe = browsers.find((path) => existsSync(path))
if (!exe) {
  console.error('No encontré Edge ni Chrome.')
  process.exit(1)
}

const args = [
  `--app=${url}`,
  '--window-position=6,36',
  '--window-size=272,840',
  '--disable-features=Translate',
]

console.log(`Abriendo overlay: ${exe}`)
spawn(exe, args, { detached: true, stdio: 'ignore' }).unref()

const pin = `
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class TefeteWin {
  [DllImport("user32.dll")] public static extern bool SetWindowPos(IntPtr hWnd, IntPtr insert, int X, int Y, int cx, int cy, uint flags);
  public static readonly IntPtr HWND_TOPMOST = new IntPtr(-1);
}
"@
$flags = 0x0003
for ($i = 0; $i -lt 25; $i++) {
  Start-Sleep -Milliseconds 400
  $proc = Get-Process | Where-Object { $_.MainWindowTitle -match 'tefete' } | Select-Object -First 1
  if ($proc -and $proc.MainWindowHandle -ne [IntPtr]::Zero) {
    [TefeteWin]::SetWindowPos($proc.MainWindowHandle, [TefeteWin]::HWND_TOPMOST, 0, 0, 0, 0, $flags) | Out-Null
    Write-Output ("pinned:" + $proc.MainWindowTitle)
    break
  }
}
`
spawn('powershell', ['-NoProfile', '-Command', pin], { stdio: 'inherit' })
