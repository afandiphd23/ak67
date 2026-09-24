// Assembles the deployable suite into site/:
//
//   site/
//   ├── index.html              ← landing (app selector), copied as-is
//   ├── customs-act-app/        ← built Customs Act 1967 reader (dist/)
//   ├── customs-reg-app/        ← built Customs Regulations 2019 reader (dist/)
//   ├── free-zones-app/         ← built Free Zones Act 1990 reader (dist/)
//   └── free-zones-reg-app/     ← built Free Zones Regulations 1991 reader (dist/)
//
// The landing page links to the readers via relative paths
// (customs-act-app/, customs-reg-app/, free-zones-app/, free-zones-reg-app/),
// so this layout is exactly what it expects. Renders as one Render static
// site from a single repo push.
import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { cp, mkdir, readdir, rm, stat } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const SITE = join(ROOT, 'site')

function run(cmd, cwd) {
  console.log(`\n$ ${cmd}  (cwd: ${cwd})`)
  const res = spawnSync(cmd, {
    cwd,
    stdio: 'inherit',
    shell: true,
  })
  if (res.status !== 0 || res.error) {
    if (res.error) console.error(res.error)
    console.error(`\n✗ failed: ${cmd} (in ${cwd})`)
    process.exit(res.status ?? 1)
  }
}

async function dirSizeKB(dir) {
  let total = 0
  for (const name of await readdir(dir, { recursive: true })) {
    const s = await stat(join(dir, name)).catch(() => null)
    if (s?.isFile()) total += s.size
  }
  return (total / 1024).toFixed(0)
}

// 1. Install + build the three reader apps (landing needs no build step —
//    it's a single dependency-free index.html).
for (const app of ['customs-act-app', 'customs-reg-app', 'free-zones-app', 'free-zones-reg-app']) {
  const dir = join(ROOT, app)
  if (!existsSync(join(dir, 'node_modules'))) run('npm install', dir)
  run('npm run build', dir)
}

// 2. Assemble site/.
await rm(SITE, { recursive: true, force: true })
await mkdir(SITE, { recursive: true })
await cp(join(ROOT, 'index.html'), join(SITE, 'index.html'))
await cp(join(ROOT, 'customs-act-app', 'dist'), join(SITE, 'customs-act-app'), {
  recursive: true,
})
await cp(join(ROOT, 'customs-reg-app', 'dist'), join(SITE, 'customs-reg-app'), {
  recursive: true,
})
await cp(join(ROOT, 'free-zones-app', 'dist'), join(SITE, 'free-zones-app'), {
  recursive: true,
})
await cp(join(ROOT, 'free-zones-reg-app', 'dist'), join(SITE, 'free-zones-reg-app'), {
  recursive: true,
})

console.log(
  `\n✓ site/ assembled — total ${await dirSizeKB(SITE)} kB, ` +
    `act ${await dirSizeKB(join(SITE, 'customs-act-app'))} kB, ` +
    `reg ${await dirSizeKB(join(SITE, 'customs-reg-app'))} kB, ` +
    `fz ${await dirSizeKB(join(SITE, 'free-zones-app'))} kB, ` +
    `fzreg ${await dirSizeKB(join(SITE, 'free-zones-reg-app'))} kB`,
)
