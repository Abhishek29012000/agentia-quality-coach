import path from 'node:path'
import {scanApex} from './scanners/apex.js'
import {scanFlows} from './scanners/flow.js'
import {scanLwc} from './scanners/lwc.js'
import type {Finding, ScanSummary} from './types.js'
import {walkFiles} from './fs-utils.js'

export type ScanOptions = {
  root: string
  includeApex?: boolean
  includeFlow?: boolean
  includeLwc?: boolean
}

export function runQualityScan(options: ScanOptions): ScanSummary {
  const root = path.resolve(options.root)
  const includeApex = options.includeApex !== false
  const includeFlow = options.includeFlow !== false
  const includeLwc = options.includeLwc !== false

  const findings: Finding[] = []
  if (includeApex) findings.push(...scanApex(root))
  if (includeFlow) findings.push(...scanFlows(root))
  if (includeLwc) findings.push(...scanLwc(root))

  const scannedFiles =
    (includeApex ? walkFiles(root, ['.cls']).length : 0) +
    (includeFlow
      ? walkFiles(root, ['.flow-meta.xml', '.xml']).filter(
          (f) => f.includes(`${path.sep}flows${path.sep}`) || f.endsWith('.flow-meta.xml'),
        ).length
      : 0) +
    (includeLwc
      ? walkFiles(root, ['.html', '.css']).filter((f) => f.includes('lwc') || f.includes('aura')).length
      : 0)

  const errors = findings.filter((f) => f.severity === 'error').length
  const warnings = findings.filter((f) => f.severity === 'warn').length
  const infos = findings.filter((f) => f.severity === 'info').length

  return {
    scannedFiles,
    errors,
    warnings,
    infos,
    passed: errors === 0,
    findings,
  }
}
