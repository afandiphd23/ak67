// Packs dist/ into customs-reg-dist.zip at the project root.
// Zero dependencies: raw-deflate via node:zlib + a hand-rolled ZIP writer
// (local headers + central directory + EOCD, compression method 8).
import { createWriteStream } from 'node:fs'
import { readdir, readFile, stat, rm } from 'node:fs/promises'
import { deflateRawSync } from 'node:zlib'
import { join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const DIST = fileURLToPath(new URL('../dist/', import.meta.url))
const OUT = fileURLToPath(new URL('../customs-reg-dist.zip', import.meta.url))

// ---- CRC-32 (table-based, IEEE 802.3 polynomial) ---------------------------
const CRC_TABLE = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()

function crc32(buf) {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

// ---- MS-DOS timestamp (2-second resolution, local time) --------------------
function dosDateTime(date) {
  const time =
    (date.getHours() << 11) | (date.getMinutes() << 5) | (date.getSeconds() >> 1)
  const day =
    ((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate()
  return { time, day }
}

// ---- Collect files under dist/ ----------------------------------------------
async function walk(dir) {
  const out = []
  for (const name of await readdir(dir)) {
    const full = join(dir, name)
    const s = await stat(full)
    if (s.isDirectory()) out.push(...(await walk(full)))
    else out.push({ full, size: s.size, mtime: s.mtime })
  }
  return out
}

// Little-endian writers
const u16 = (v) => Buffer.from([v & 0xff, (v >> 8) & 0xff])
const u32 = (v) =>
  Buffer.from([v & 0xff, (v >> 8) & 0xff, (v >> 16) & 0xff, (v >>> 24) & 0xff])

async function main() {
  // A leftover zip from a previous run inside dist/ would otherwise include itself.
  await rm(OUT, { force: true })

  const files = (await walk(DIST)).sort((a, b) =>
    a.full.localeCompare(b.full),
  )
  if (files.length === 0) {
    console.error('dist/ is empty — run `npm run build` first.')
    process.exit(1)
  }

  const chunks = []
  const central = []
  let offset = 0

  for (const f of files) {
    const name = relative(DIST, f.full).split(sep).join('/')
    const nameBuf = Buffer.from(name, 'utf8')
    const data = await readFile(f.full)
    const compressed = deflateRawSync(data, { level: 9 })
    const { time, day } = dosDateTime(f.mtime)
    const crc = crc32(data)

    const local = Buffer.concat([
      u32(0x04034b50), // local file header signature
      u16(20), // version needed to extract (2.0)
      u16(0), // flags
      u16(8), // method: deflate
      u16(time),
      u16(day),
      u32(crc),
      u32(compressed.length),
      u32(data.length),
      u16(nameBuf.length),
      u16(0), // extra field length
      nameBuf,
      compressed,
    ])
    chunks.push(local)

    central.push(
      Buffer.concat([
        u32(0x02014b50), // central directory signature
        u16(20), // version made by
        u16(20), // version needed
        u16(0), // flags
        u16(8), // method
        u16(time),
        u16(day),
        u32(crc),
        u32(compressed.length),
        u32(data.length),
        u16(nameBuf.length),
        u16(0), // extra len
        u16(0), // comment len
        u16(0), // disk number start
        u16(0), // internal attrs
        u32(0), // external attrs
        u32(offset),
        nameBuf,
      ]),
    )
    offset += local.length
  }

  const centralBuf = Buffer.concat(central)
  const eocd = Buffer.concat([
    u32(0x06054b50), // EOCD signature
    u16(0),
    u16(0),
    u16(files.length),
    u16(files.length),
    u32(centralBuf.length),
    u32(offset),
    u16(0), // comment len
  ])

  await new Promise((resolve, reject) => {
    const ws = createWriteStream(OUT)
    ws.on('error', reject)
    ws.on('finish', resolve)
    ws.end(Buffer.concat([...chunks, centralBuf, eocd]))
  })

  const zipSize = (await stat(OUT)).size
  const totalUncompressed = files.reduce((n, f) => n + f.size, 0)
  console.log(
    `Packed ${files.length} files → ${relative(process.cwd(), OUT)} ` +
      `(${(zipSize / 1024).toFixed(0)} kB, ` +
      `${((1 - zipSize / totalUncompressed) * 100).toFixed(0)}% smaller than ` +
      `${(totalUncompressed / 1024).toFixed(0)} kB)`,
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
