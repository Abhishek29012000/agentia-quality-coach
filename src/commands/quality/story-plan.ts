import {AgentiaCommand, getAgentiaHost} from '@copado/agentia-plugin-sdk'
import {Args, Flags} from '@oclif/core'
import {buildStoryPlan} from '../../lib/story-plan.js'

export default class QualityStoryPlan extends AgentiaCommand {
  static override description =
    'Read a Copado user story and suggest solution steps (Apex / Flow / LWC) to implement it'

  static override examples = [
    '<%= config.bin %> <%= command.id %>',
    '<%= config.bin %> <%= command.id %> US-0000001',
    '<%= config.bin %> <%= command.id %> --json',
  ]

  static override args = {
    story: Args.string({
      description: 'User story Id or name (defaults to active work item)',
      required: false,
    }),
  }

  static override flags = {
    demo: Flags.boolean({
      description: 'Use a local demo story when Copado work item is unavailable',
      default: false,
    }),
  }

  public async run() {
    const {args, flags} = await this.parse(QualityStoryPlan)
    const host = getAgentiaHost({requires: ['format.table', 'work.getWorkItem']})

    let story
    if (flags.demo) {
      story = {
        id: 'demo-story',
        name: 'US-DEMO-001',
        title: 'Build responsive Account card LWC with Apex controller and validation Flow',
        projectName: 'Hackathon',
        sprint: 'Sprint 1',
        status: 'In Progress',
        functionalRequirements:
          'Create an LWC account summary card that is responsive on phone, tablet, laptop and monitor. Provide an Apex controller and a screen Flow for validation.',
        acceptanceCriteria:
          'No inline CSS; CSS uses media queries; Apex uses with sharing; Flow has fault path.',
        technicalSpecifications: 'LWC + Apex + Flow metadata in source format repo.',
      }
    } else {
      story = await this.withSpinner('Reading Copado user story', async () =>
        host.work.getWorkItem(args.story),
      )
    }

    const plan = buildStoryPlan(story)

    this.display(() => {
      this.log(`Agentia Quality Coach — story plan`)
      this.log(
        host.format.table(
          [
            {field: 'storyName', header: 'Story'},
            {field: 'title', header: 'Title'},
            {field: 'projectName', header: 'Project'},
            {field: 'sprint', header: 'Sprint'},
            {field: 'status', header: 'Status'},
          ],
          [
            {
              storyName: plan.storyName ?? plan.storyId,
              title: plan.title ?? '-',
              projectName: plan.projectName ?? '-',
              sprint: plan.sprint ?? '-',
              status: plan.status ?? '-',
            },
          ],
        ),
      )
      this.log(`\n${plan.summary}\n`)
      this.log(
        host.format.table(
          [
            {field: 'order', header: '#'},
            {field: 'area', header: 'Area'},
            {field: 'action', header: 'Action'},
          ],
          plan.steps,
        ),
      )
      this.log('\nQuality checklist before promote/deploy:')
      for (const item of plan.qualityChecklist) {
        this.log(`- [ ] ${item}`)
      }
      this.log('\nNext: implement changes, then run `agentia quality check`.')
    })

    return plan
  }
}
