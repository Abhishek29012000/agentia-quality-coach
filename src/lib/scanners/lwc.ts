import type {Finding} from '../types.js'
import {readText, toPosix, walkFiles} from '../fs-utils.js'

export function scanLwc(root: string): Finding[] {
  const htmlFiles = walkFiles(root, ['.html']).filter((f) => f.includes('lwc') || f.includes('aura'))
  const cssFiles = walkFiles(root, ['.css']).filter((f) => f.includes('lwc') || f.includes('aura'))
  const findings: Finding[] = []

  for (const file of htmlFiles) {
    const rel = toPosix(file, root)
    const lines = readText(file).split(/\r?\n/)
    lines.forEach((line, index) => {
      if (/style\s*=\s*["'][^"']+["']/i.test(line)) {
        findings.push({
          severity: 'error',
          category: 'lwc-html',
          file: rel,
          line: index + 1,
          rule: 'lwc-no-inline-css',
          message: 'Inline CSS found in LWC HTML template.',
          suggestion:
            'Move styles into the component .css file. Example: replace style="color:red" with a CSS class like .title { color: var(--lwc-colorTextDefault, #181818); }',
        })
      }
    })
  }

  for (const file of cssFiles) {
    const rel = toPosix(file, root)
    const content = readText(file)
    const lines = content.split(/\r?\n/)
    const hasMedia = /@media\b/i.test(content)
    let hardcodedPx = 0

    lines.forEach((line, index) => {
      if (/!important/i.test(line)) {
        findings.push({
          severity: 'warn',
          category: 'lwc-css',
          file: rel,
          line: index + 1,
          rule: 'lwc-avoid-important',
          message: 'CSS uses !important.',
          suggestion: 'Prefer higher specificity or SLDS utility classes instead of !important.',
        })
      }

      if (/#[0-9a-fA-F]{3,8}\b/.test(line) && !/--/.test(line)) {
        findings.push({
          severity: 'info',
          category: 'lwc-css',
          file: rel,
          line: index + 1,
          rule: 'lwc-prefer-design-tokens',
          message: 'Hardcoded hex color in CSS.',
          suggestion: 'Prefer SLDS design tokens / CSS variables for theme consistency across devices.',
        })
      }

      const pxMatches = line.match(/\b\d{2,}px\b/g)
      if (pxMatches) hardcodedPx += pxMatches.length
    })

    if (!hasMedia) {
      findings.push({
        severity: 'error',
        category: 'lwc-css',
        file: rel,
        rule: 'lwc-responsive-media-queries',
        message: 'No @media queries found — layout may not adapt across phone, tablet, laptop, and monitor.',
        suggestion:
          'Add responsive breakpoints, e.g.\n@media (max-width: 480px) { .container { flex-direction: column; } }\n@media (min-width: 768px) and (max-width: 1024px) { ... }\n@media (min-width: 1280px) { ... }',
      })
    }

    if (hardcodedPx >= 3 && !hasMedia) {
      findings.push({
        severity: 'warn',
        category: 'lwc-css',
        file: rel,
        rule: 'lwc-hardcoded-px',
        message: `Multiple hardcoded px values (${hardcodedPx}) without responsive rules.`,
        suggestion:
          'Use relative units (rem, %, clamp()) and media queries so UI scales on phone, tablet, laptop, and monitor.',
      })
    }

    if (!/slds-|display:\s*flex|grid-template|flex-wrap|minmax\(/i.test(content)) {
      findings.push({
        severity: 'info',
        category: 'lwc-css',
        file: rel,
        rule: 'lwc-responsive-layout',
        message: 'No clear flexible/grid/SLDS layout patterns detected.',
        suggestion:
          'Use flex/grid or SLDS grid (slds-grid, slds-size_*) so content reflows across devices.',
      })
    }
  }

  return findings
}
