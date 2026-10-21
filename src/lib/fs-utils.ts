import fs from 'node:fs'
import path from 'node:path'

export function walkFiles(root: string, extensions: string[]): string[] {
  const results: string[] = []
  if (!fs.existsSync(root)) return results

  const stack = [root]
  while (stack.length > 0) {
    const current = stack.pop()!
    let entries: fs.Dirent[]
    try {
      entries = fs.readdirSync(current, {withFileTypes: true})
    } catch {
      continue
    }

    for (const entry of entries) {
      const full = path.join(current, entry.name)
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'dist') {
          continue
        }
        stack.push(full)
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase()
        if (extensions.includes(ext)) results.push(full)
      }
    }
  }

  return results.sort()
}

export function readText(filePath: string): string {
  return fs.readFileSync(filePath, 'utf8')
}

export function toPosix(filePath: string, root: string): string {
  return path.relative(root, filePath).split(path.sep).join('/')
}
