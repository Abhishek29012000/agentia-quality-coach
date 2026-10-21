import type {PluginWorkItem} from '@copado/agentia-plugin-sdk'

export type PlanStep = {
  order: number
  area: string
  action: string
}

export type StoryPlan = {
  storyId: string
  storyName?: string
  title?: string
  projectName?: string
  sprint?: string
  status?: string
  summary: string
  steps: PlanStep[]
  qualityChecklist: string[]
}

function textBlob(story: PluginWorkItem): string {
  return [
    story.title,
    story.functionalRequirements,
    story.acceptanceCriteria,
    story.technicalSpecifications,
  ]
    .filter(Boolean)
    .join('\n')
    .toLowerCase()
}

export function buildStoryPlan(story: PluginWorkItem): StoryPlan {
  const blob = textBlob(story)
  const steps: PlanStep[] = []
  let order = 1

  const push = (area: string, action: string) => {
    steps.push({order: order++, area, action})
  }

  push('Clarify', 'Confirm acceptance criteria and in-scope orgs/environments with the story owner.')
  push('Branch', 'Create/checkout the user story feature branch from the pipeline base branch.')

  if (/lwc|lightning web|ui|frontend|css|responsive|component/.test(blob)) {
    push('LWC', 'Scaffold or update LWC component(s); keep styles in .css (no inline style attributes).')
    push(
      'Responsive CSS',
      'Add media queries / SLDS grid so layout works on phone, tablet, laptop, and monitor.',
    )
  }

  if (/apex|trigger|batch|queueable|class|soql|dml|api/.test(blob)) {
    push('Apex', 'Implement Apex with explicit sharing, bulk-safe SOQL/DML, and no hardcoded secrets.')
    push('Apex Tests', 'Add/adjust Apex tests covering happy path and governor-safe bulk scenarios.')
  }

  if (/flow|automation|approval|screen flow|record-triggered/.test(blob)) {
    push('Flow', 'Build/update Flow XML; avoid DML-in-loop and hardcoded record Ids; add fault paths.')
  }

  if (/integration|callout|named credential|rest|platform event/.test(blob)) {
    push('Integration', 'Use Named Credentials / platform events; avoid embedding secrets in code.')
  }

  if (steps.length <= 2) {
    push('Implement', 'Break the requirement into metadata changes (Apex/Flow/LWC/objects) and implement iteratively.')
    push('Validate', 'Run local tests and deploy to the story source environment for validation.')
  }

  push('Quality Gate', 'Run `agentia quality check` on the repo and fix all error-level findings.')
  push('Commit / Promote', 'Commit to the story and promote through the Copado pipeline when gates pass.')

  const qualityChecklist = [
    'No inline CSS in LWC HTML templates',
    'LWC CSS includes responsive @media (or SLDS responsive utilities)',
    'Apex declares sharing and avoids SOQL-in-loop',
    'Flows avoid DML-in-loop and include fault handling where DML exists',
    'No hardcoded secrets or obvious hardcoded Salesforce Ids',
  ]

  const summary = story.title
    ? `Solution plan for "${story.title}" based on Copado user story requirements.`
    : 'Solution plan based on Copado user story requirements.'

  return {
    storyId: story.id,
    storyName: story.name,
    title: story.title,
    projectName: story.projectName,
    sprint: story.sprint,
    status: story.status,
    summary,
    steps,
    qualityChecklist,
  }
}
