// Copies the canonical user documentation (docs/rm-nexus-documentation.html) into public/ so the
// running app can serve it at /rm-nexus-documentation.html and link to it from the nav.
// docs/ stays the single source of truth; the served copy is generated and gitignored.
// Runs automatically on `predev` / `prebuild` (see package.json). Tolerant if the source is absent.
import { copyFileSync, existsSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const src = resolve(here, '..', '..', 'docs', 'rm-nexus-documentation.html')
const destDir = resolve(here, '..', 'public')
const dest = resolve(destDir, 'rm-nexus-documentation.html')

if (!existsSync(src)) {
  console.warn(`[copy-docs] source not found, skipping: ${src}`)
  process.exit(0)
}

mkdirSync(destDir, { recursive: true })
copyFileSync(src, dest)
console.log('[copy-docs] documentation -> public/rm-nexus-documentation.html')
