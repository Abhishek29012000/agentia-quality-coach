import {AgentiaCommand, getAgentiaHost} from '@copado/agentia-plugin-sdk'
import {Flags} from '@oclif/core'
import path from 'node:path'
import {runQualityScan} from '../../lib/scan.js'

export default class QualityCheck extends AgentiaCommand {
  static override description =
    'Scan local Apex, Flow, and LWC CSS/HTML for quality and responsive frontend issues before deploy'

  static override examples = [
    '<%= config.bin %> <%= command.id %>',
    '<%= config.bin %> <%= command.id %> --path ./force-app',
    '<%= config.bin %> <%= command.id %> --apex --no-flow --json',
    '<%= config.bin %> <%= command.id %> --path ./agentia-quality-coach/fixtures',
  ]

  static override flags = {
    path: Flags.string({
      char: 'p',
      description: 'Root folder to scan (defaults to current working directory)',
      default: undefined,
    }),
    apex: Flags.boolean({description: 'Include Apex checks', allowNo: true, default: true}),
    flow: Flags.boolean({description: 'Include Flow XML checks', allowNo: true, default: true}),
    lwc: Flags.boolean({description: 'Include LWC HTML/CSS checks', allowNo: true, default: true}),
    'fail-on-warn': Flags.boolean({
      description: 'Exit non-zero when warnings are present (errors always fail)',
      default: false,
    }),
  }

  public async run() {
    const {flags} = await this.parse(QualityCheck)
    const host = getAgentiaHost({requires: ['format.table']})
    const root = path.resolve(flags.path ?? process.cwd())

    const summary = await this.withSpinner(`Scanning ${root}`, async () =>
      runQualityScan({
        root,
        includeApex: flags.apex,
        includeFlow: flags.flow,
        includeLwc: flags.lwc,
      }),
    )

    this.display(() => {
      this.log(`Agentia Quality Coach — scan root: ${root}`)
      this.log(
        `Files: ${summary.scannedFiles} | errors: ${summary.errors} | warnings: ${summary.warnings} | info: ${summary.infos}`,
      )

      if (summary.findings.length === 0) {
        this.log('No findings. Quality gate passed.')
        return
      }

      this.log(
        host.format.table(
          [
            {field: 'severity', header: 'Sev'},
            {field: 'category', header: 'Category'},
            {field: 'rule', header: 'Rule'},
            {field: 'file', header: 'File'},
            {field: 'line', header: 'Line'},
            {field: 'message', header: 'Message'},
          ],
          summary.findings.map((f) => ({
            severity: f.severity,
            category: f.category,
            rule: f.rule,
            file: f.file,
            line: f.line ?? '',
            message: f.message,
          })),
        ),
      )

      this.log('\nSuggestions:')
      for (const finding of summary.findings) {
        this.log(`- [${finding.rule}] ${finding.suggestion}`)
      }

      this.log(summary.passed ? '\nQuality gate passed (no errors).' : '\nQuality gate FAILED (errors found).')
    })

    const shouldFail = !summary.passed || (flags['fail-on-warn'] && summary.warnings > 0)
    if (shouldFail) {
      this.exit(1)
    }

    return summary
  }
}
