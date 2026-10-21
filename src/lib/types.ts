export type Severity = 'error' | 'warn' | 'info'

export type Finding = {
  severity: Severity
  category: 'apex' | 'flow' | 'lwc-css' | 'lwc-html' | 'story'
  file: string
  line?: number
  rule: string
  message: string
  suggestion: string
}

export type ScanSummary = {
  scannedFiles: number
  errors: number
  warnings: number
  infos: number
  passed: boolean
  findings: Finding[]
}
