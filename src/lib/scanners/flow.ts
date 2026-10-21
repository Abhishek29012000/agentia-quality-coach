import type {Finding} from '../types.js'
import {readText, toPosix, walkFiles} from '../fs-utils.js'

export function scanFlows(root: string): Finding[] {
  const files = walkFiles(root, ['.flow-meta.xml', '.xml']).filter(
    (f) => f.includes(`${'\\'}flows${'\\'}`) || f.includes('/flows/') || f.endsWith('.flow-meta.xml'),
  )
  const findings: Finding[] = []

  for (const file of files) {
    const rel = toPosix(file, root)
    const content = readText(file)

    if (!content.includes('<Flow') && !content.includes('xmlns="http://soap.sforce.com/2006/04/metadata"')) {
      continue
    }

    const recordCreates = (content.match(/<recordCreates>/g) || []).length
    const recordUpdates = (content.match(/<recordUpdates>/g) || []).length
    const loops = (content.match(/<loops>/g) || []).length

    if (loops > 0 && recordCreates + recordUpdates > 0) {
      findings.push({
        severity: 'error',
        category: 'flow',
        file: rel,
        rule: 'flow-no-dml-in-loop',
        message: 'Flow contains loops and record create/update elements (possible DML-in-loop).',
        suggestion: 'Collect records in the loop, then perform a single create/update after the loop.',
      })
    }

    const hardcodedIds = content.match(/\b[a-zA-Z0-9]{15}\b|\b[a-zA-Z0-9]{18}\b/g) || []
    const suspicious = hardcodedIds.filter((id) => /^[a-zA-Z0-9]{15,18}$/.test(id) && /[A-Z]/.test(id) && /[0-9]/.test(id))
    if (suspicious.length > 0) {
      findings.push({
        severity: 'warn',
        category: 'flow',
        file: rel,
        rule: 'flow-no-hardcoded-ids',
        message: `Possible hardcoded Salesforce Id(s) in Flow XML (${suspicious.slice(0, 3).join(', ')}).`,
        suggestion: 'Prefer Get Records, Custom Metadata, or labels instead of hardcoding record Ids.',
      })
    }

    if (!content.includes('<faultConnector>') && (recordCreates > 0 || recordUpdates > 0)) {
      findings.push({
        severity: 'warn',
        category: 'flow',
        file: rel,
        rule: 'flow-fault-path',
        message: 'DML elements found without a faultConnector path.',
        suggestion: 'Add fault paths to surface errors to users or a logging subflow.',
      })
    }

    if (/<status>InvalidDraft<\/status>|<status>Obsolete<\/status>/i.test(content)) {
      findings.push({
        severity: 'error',
        category: 'flow',
        file: rel,
        rule: 'flow-active-status',
        message: 'Flow status is InvalidDraft or Obsolete.',
        suggestion: 'Activate a valid Flow version before promotion.',
      })
    }
  }

  return findings
}
