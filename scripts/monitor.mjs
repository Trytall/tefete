import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'

const url = process.env.TEFETE_URL ?? 'http://localhost:5173/?mode=desk'
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

const bounds = await secondScreen()
const args = [
  `--app=${url}`,
  `--window-position=${bounds.x},${bounds.y}`,
  `--window-size=${bounds.w},${bounds.h}`,
  '--disable-features=Translate',
  '--start-maximized',
]

console.log(`Abriendo monitor: ${exe} @ ${bounds.x},${bounds.y} ${bounds.w}x${bounds.h}`)
spawn(exe, args, { detached: true, stdio: 'ignore' }).unref()

async function secondScreen() {
  const script = `
Add-Type -AssemblyName System.Windows.Forms
$screens = [System.Windows.Forms.Screen]::AllScreens
$pick = $screens | Where-Object { -not $_.Primary } | Select-Object -First 1
if (-not $pick) { $pick = $screens | Select-Object -First 1 }
$area = $pick.WorkingArea
Write-Output ($area.X.ToString() + "," + $area.Y.ToString() + "," + $area.Width.ToString() + "," + $area.Height.ToString())
`
  const text = await powershell(script)
  const [x, y, w, h] = text.trim().split(',').map((value) => Number(value))
  if (![x, y, w, h].every(Number.isFinite)) {
    return { x: 0, y: 0, w: 1400, h: 900 }
  }
  return { x, y, w, h }
}

function powershell(command) {
  return new Promise((resolve, reject) => {
    const child = spawn('powershell', ['-NoProfile', '-Command', command])
    let out = ''
    let err = ''
    child.stdout.on('data', (chunk) => {
      out += chunk
    })
    child.stderr.on('data', (chunk) => {
      err += chunk
    })
    child.on('close', (code) => {
      if (code === 0) resolve(out)
      else reject(new Error(err || `powershell ${code}`))
    })
  })
}
