import type {Finding} from '../types.js'
import {readText, toPosix, walkFiles} from '../fs-utils.js'

export function scanApex(root: string): Finding[] {
  const files = walkFiles(root, ['.cls'])
  const findings: Finding[] = []

  for (const file of files) {
    const rel = toPosix(file, root)
    const content = readText(file)
    const lines = content.split(/\r?\n/)

    const classMatch = content.match(/\b(global|public|private)\s+(?:with\s+sharing|without\s+sharing|inherited\s+sharing)?\s*class\b/i)
    if (classMatch && !/\b(with|without|inherited)\s+sharing\b/i.test(classMatch[0])) {
      findings.push({
        severity: 'warn',
        category: 'apex',
        file: rel,
        rule: 'apex-sharing-declared',
        message: 'Apex class does not declare a sharing keyword.',
        suggestion: 'Add "with sharing", "without sharing", or "inherited sharing" explicitly.',
      })
    }

    lines.forEach((line, index) => {
      const lineNo = index + 1
      if (/System\.debug\s*\(/i.test(line) && !/^\s*\/\//.test(line)) {
        findings.push({
          severity: 'warn',
          category: 'apex',
          file: rel,
          line: lineNo,
          rule: 'apex-no-system-debug',
          message: 'System.debug found in Apex.',
          suggestion: 'Remove debug statements or replace with a proper logging framework before promote/deploy.',
        })
      }

      if (/(password|secret|apikey|api_key)\s*=\s*['"][^'"]+['"]/i.test(line)) {
        findings.push({
          severity: 'error',
          category: 'apex',
          file: rel,
          line: lineNo,
          rule: 'apex-no-hardcoded-secrets',
          message: 'Possible hardcoded secret in Apex.',
          suggestion: 'Move secrets to Named Credentials, Custom Metadata, or Protected Custom Settings.',
        })
      }
    })

    // Empty catch blocks (including multi-line)
    const emptyCatch = /catch\s*\([^)]*\)\s*\{\s*(\/\/[^\n]*)?\s*\}/gim
    let catchMatch: RegExpExecArray | null
    while ((catchMatch = emptyCatch.exec(content)) !== null) {
      const line = content.slice(0, catchMatch.index).split(/\r?\n/).length
      findings.push({
        severity: 'error',
        category: 'apex',
        file: rel,
        line,
        rule: 'apex-no-empty-catch',
        message: 'Empty catch block swallows exceptions.',
        suggestion: 'Log the error, rethrow, or handle the failure explicitly.',
      })
    }

    // SOQL inside for-loop (heuristic across a few lines)
    for (let i = 0; i < lines.length; i++) {
      if (/\bfor\s*\(/.test(lines[i])) {
        const window = lines.slice(i, Math.min(lines.length, i + 12)).join('\n')
        if (/\[(?:\s*SELECT|\s*FIND)/i.test(window) || /Database\.(query|queryLocator)\s*\(/i.test(window)) {
          findings.push({
            severity: 'error',
            category: 'apex',
            file: rel,
            line: i + 1,
            rule: 'apex-no-soql-in-loop',
            message: 'SOQL appears inside a for-loop (governor risk).',
            suggestion: 'Bulkify: query once outside the loop and process collections in memory.',
          })
          break
        }
      }
    }
  }

  return findings
}
