#!/usr/bin/env node
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..')
const distDir = path.join(repoRoot, 'dist')
const publishDir = path.join(repoRoot, 'publish')

if (!existsSync(distDir)) {
  console.error('[publish] dist/ not found. Run a build first.')
  process.exit(1)
}

rmSync(publishDir, { recursive: true, force: true })
mkdirSync(publishDir, { recursive: true })

for (const name of readdirSync(distDir)) {
  cpSync(path.join(distDir, name), path.join(publishDir, name), { recursive: true })
}

console.log('[publish] publish/ refreshed from dist/.')
