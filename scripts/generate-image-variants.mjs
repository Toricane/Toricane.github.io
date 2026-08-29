import fs from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"
import sharp from "sharp"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const tabPanels = path.join(root, "content", "assets", "tab-panels")
const variants = [
  { dir: "small", width: 800 },
  { dir: "preview", width: 256 },
]
const force = process.argv.includes("--force")

async function exists(file) {
  try {
    await fs.access(file)
    return true
  } catch {
    return false
  }
}

async function listFullImages() {
  const entries = await fs.readdir(tabPanels, { withFileTypes: true })
  return entries
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".webp"))
    .map((entry) => entry.name)
}

async function writeVariant(src, dest, width) {
  await fs.mkdir(path.dirname(dest), { recursive: true })
  await sharp(src)
    .resize({ width, withoutEnlargement: true })
    .webp({ quality: 80 })
    .toFile(dest)
}

const names = await listFullImages()
let written = 0
let skipped = 0

for (const name of names) {
  const src = path.join(tabPanels, name)
  for (const { dir, width } of variants) {
    const dest = path.join(tabPanels, dir, name)
    if (!force && (await exists(dest))) {
      skipped += 1
      continue
    }
    await writeVariant(src, dest, width)
    written += 1
    console.log(`${dir}/${name} (${width}w)`)
  }
}

console.log(`image variants: ${written} written, ${skipped} already exist`)
