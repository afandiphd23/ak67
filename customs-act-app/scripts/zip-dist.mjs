// Zip dist/ for cPanel upload. Produces customs-act-dist.zip in the project root.
// Usage: npm run deploy   (or: node scripts/zip-dist.mjs)
import { existsSync, statSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const APP_ROOT = fileURLToPath(new URL('..', import.meta.url))
const DIST = join(APP_ROOT, 'dist')
const OUT = join(APP_ROOT, 'customs-act-dist.zip')

if (!existsSync(join(DIST, 'index.html'))) {
  console.error('dist/index.html not found — run "npm run build" first.')
  process.exit(1)
}

// Native zip via PowerShell on Windows, `zip` elsewhere. Flattened paths so
// the archive extracts straight into the target folder (no dist/ wrapper).
const isWindows = process.platform === 'win32'
const psQuote = (p) => p.replace(/'/g, "''")
const cmd = isWindows
  ? [
      'powershell', '-NoProfile', '-Command',
      `$ErrorActionPreference='Stop'; ` +
      `if (Test-Path -LiteralPath '${psQuote(OUT)}') { Remove-Item -LiteralPath '${psQuote(OUT)}' }; ` +
      `Compress-Archive -Path '${psQuote(DIST)}\\*' -DestinationPath '${psQuote(OUT)}' -CompressionLevel Optimal`,
    ]
  : ['sh', '-c', `rm -f '${OUT}' && cd '${DIST}' && zip -r -q '${OUT}' .`]

console.log(`Zipping dist/ → customs-act-dist.zip`)
const res = spawnSync(cmd[0], cmd.slice(1), { stdio: 'pipe' })
if (res.error || res.status !== 0) {
  console.error(String(res.stderr ?? res.error ?? 'zip failed'))
  process.exit(res.status ?? 1)
}

const size = statSync(OUT).size
console.log(`✓ wrote customs-act-dist.zip (${(size / 1024).toFixed(0)} KB)`)

// Sanity check: index.html must exist at the archive root.
const checkCmd = isWindows
  ? [
      'powershell', '-NoProfile', '-Command',
      `Add-Type -AssemblyName System.IO.Compression.FileSystem; ` +
      `[bool][System.IO.Compression.ZipFile]::OpenRead('${psQuote(OUT)}').Entries['index.html']`,
    ]
  : ['sh', '-c', `unzip -l '${OUT}' | grep -q ' index.html'`]
const check = spawnSync(checkCmd[0], checkCmd.slice(1), { stdio: 'pipe' })
if (check.status !== 0) {
  console.error('WARNING: index.html not found at archive root — check zip contents before uploading.')
  process.exit(1)
}
console.log('✓ index.html at archive root — ready to upload to public_html/')
