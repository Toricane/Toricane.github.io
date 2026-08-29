import fs from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const src = path.join(root, ".githooks", "pre-commit")
const dest = path.join(root, ".git", "hooks", "pre-commit")

await fs.mkdir(path.dirname(dest), { recursive: true })
await fs.copyFile(src, dest)
await fs.chmod(dest, 0o755)
console.log("installed .git/hooks/pre-commit")
