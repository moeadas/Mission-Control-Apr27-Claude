import { Agent, Artifact, ArtifactExecutionStep, Mission, ProviderSettings } from '@/lib/types'
import { getAuditConnectorStatus, getAuditExecutionProfile } from '@/lib/audit-capabilities'

export interface LiveOfficeAgentState {
  agentId: string
  missionId: string
  stageLabel: string
  bubble: string
  showBubble: boolean
  mood: 'thinking' | 'working' | 'reviewing' | 'blocked'
}

export interface LiveMissionSnapshot {
  mission: Mission
  latestArtifact: Artifact | null
  stageLabel: string
  stageSummary: string
  activeSkills: string[]
  involvedAgentIds: string[]
  progress: number
  auditSummary?: string
}

export interface LeaderboardEntry {
  agentId: string
  agentName: string
  color: string
  avatar?: string
  photoUrl?: string
  score: number
  tasksCompleted: number
  leadWins: number
  supportWins: number
  currentHotStreak: number
}

function safeTime(value?: string | null) {
  if (!value) return 0
  const timestamp = new Date(value).getTime()
  return Number.isFinite(timestamp) ? timestamp : 0
}

function inferMissionTeam(mission: Mission) {
  const summary = `${mission.title || ''} ${mission.summary || ''}`.toLowerCase()
  const inferred = new Set<string>(['iris'])

  if (mission.deliverableType === 'content-calendar') {
    inferred.add('echo')
    inferred.add('maya')
    inferred.add('nova')
    inferred.add('lyra')
  } else if (mission.deliverableType === 'campaign-copy') {
    inferred.add('echo')
    inferred.add('maya')
    if (/(visual|image|creative|carousel|asset)/.test(summary)) {
      inferred.add('lyra')
    }
  } else if (mission.deliverableType === 'seo-audit') {
    inferred.add('atlas')
    inferred.add('maya')
    inferred.add('echo')
  } else if (mission.deliverableType === 'ui-audit') {
    inferred.add('finn')
    inferred.add('lyra')
    inferred.add('dex')
    inferred.add('echo')
  } else if (mission.deliverableType === 'campaign-strategy') {
    inferred.add('maya')
    inferred.add('atlas')
    inferred.add('echo')
  } else if (mission.deliverableType === 'media-plan') {
    inferred.add('nova')
    inferred.add('maya')
    inferred.add('atlas')
  }

  return Array.from(inferred)
}

function getMissionInvolvedAgentIds(mission: Mission, latestArtifact: Artifact | null) {
  const skillAssignedAgentIds = Object.keys(mission.skillAssignments || {})
  const inferredTeam = inferMissionTeam(mission)

  return Array.from(
    new Set([
      ...(mission.assignedAgentIds || []),
      mission.leadAgentId,
      ...(mission.collaboratorAgentIds || []),
      ...skillAssignedAgentIds,
      ...((latestArtifact?.executionSteps || []).map((step) => step.agentId)),
      ...inferredTeam,
    ].filter(Boolean) as string[])
  )
}

function isRecentlyActive(value?: string | null, withinMinutes = 12) {
  const timestamp = safeTime(value)
  if (!timestamp) return false
  return Date.now() - timestamp <= withinMinutes * 60 * 1000
}

function isRecentlyActiveSeconds(value?: string | null, withinSeconds = 15) {
  const timestamp = safeTime(value)
  if (!timestamp) return false
  return Date.now() - timestamp <= withinSeconds * 1000
}

function getLatestArtifactForMission(mission: Mission, artifacts: Artifact[]) {
  return (
    artifacts
      .filter((artifact) => artifact.missionId === mission.id)
      .sort((a, b) => safeTime(b.createdAt || b.updatedAt) - safeTime(a.createdAt || a.updatedAt))[0] || null
  )
}

function getLatestStepForAgent(executionSteps: ArtifactExecutionStep[], agentId: string) {
  for (let index = executionSteps.length - 1; index >= 0; index -= 1) {
    if (executionSteps[index]?.agentId === agentId) {
      return executionSteps[index]
    }
  }
  return null
}

function compactBubbleText(source: string) {
  const lower = source.toLowerCase()
  if (/analyz|fram|interpret|scope/.test(lower)) return 'Reading the brief.'
  if (/route|assign|team|handoff/.test(lower)) return 'Assigning the team.'
  if (/research|search|investigat|competitor|insight/.test(lower)) return 'Researching.'
  if (/draft|write|copy|caption|headline/.test(lower)) return 'Drafting copy.'
  if (/visual|design|layout|creative/.test(lower)) return 'Shaping visuals.'
  if (/seo|crawl|keyword|index/.test(lower)) return 'Checking search.'
  if (/review|qa|quality|proof/.test(lower)) return 'Reviewing.'
  if (/budget|kpi|forecast|media|channel/.test(lower)) return 'Planning media.'
  if (/save|packag|export|deliver/.test(lower)) return 'Saving output.'
  if (/block|issue|error/.test(lower)) return 'Blocked right now.'
  return source.length > 28 ? `${source.slice(0, 25)}...` : source
}

function summarizeStep(step: ArtifactExecutionStep | null) {
  if (!step) return null
  const source = step.title || step.summary
  if (!source) return null
  return compactBubbleText(source)
}

function deriveMissionStage(mission: Mission, latestArtifact: Artifact | null) {
  if (mission.status === 'blocked') {
    return { label: 'Blocked', summary: 'A blocker needs attention before the team can move forward.' }
  }

  if (latestArtifact && ['ready', 'delivered'].includes(latestArtifact.status)) {
    return { label: 'Saved Output', summary: 'The deliverable has been packaged and saved into the workspace.' }
  }

  if (mission.status === 'completed') {
    return { label: 'Complete', summary: 'Execution is complete and waiting for final review or export.' }
  }

  const hasExecutionEvidence = Boolean(latestArtifact?.executionSteps?.length)
  const hasRoutedSquad =
    Boolean(mission.leadAgentId && mission.leadAgentId !== 'iris') ||
    Boolean((mission.collaboratorAgentIds || []).length) ||
    Boolean(Object.keys(mission.skillAssignments || {}).length > 1) ||
    Boolean(mission.pipelineName)

  if (mission.status === 'review' || (latestArtifact && mission.status === 'in_progress')) {
    return { label: 'Review', summary: 'The output is being checked for quality, readiness, and final presentation.' }
  }

  if (!hasRoutedSquad && mission.progress <= 15) {
    return { label: 'Analyzing', summary: 'Iris is framing the request, validating the brief, and defining the work shape.' }
  }

  if (hasRoutedSquad && !hasExecutionEvidence && mission.progress <= 32) {
    return { label: 'Routing', summary: 'Iris is assigning the right specialists and locking the skill stack.' }
  }

  if (hasRoutedSquad || hasExecutionEvidence || mission.status === 'in_progress') {
    return { label: 'Execution', summary: 'The assigned specialists are producing, reviewing, and iterating on the deliverable.' }
  }

  return { label: 'Packaging', summary: 'The output is being assembled into a task-ready artifact and export set.' }
}

function skillBubble(skill: string) {
  if (/copy|headline|cta|content|social|email|landing/.test(skill)) return 'drafting copy'
  if (/visual|design|creative|art-direction/.test(skill)) return 'shaping visuals'
  if (/research|insight|benchmark|industry|consumer/.test(skill)) return 'researching inputs'
  if (/seo|keyword/.test(skill)) return 'auditing search visibility'
  if (/media|channel|budget|reach|frequency|kpi/.test(skill)) return 'planning channels'
  if (/quality|review|process|documentation/.test(skill)) return 'checking quality'
  return 'working the brief'
}

function defaultAgentBubble(agent: Agent, mission: Mission, skillAssignments: string[]) {
  if (mission.status === 'blocked') return 'Needs a quick fix.'

  if (mission.deliverableType === 'campaign-copy') {
    if (agent.id === 'echo') return 'Drafting copy.'
    if (agent.id === 'maya') return 'Sharpening the angle.'
    if (agent.id === 'lyra') return 'Pairing visuals.'
  }
  if (mission.deliverableType === 'content-calendar') {
    if (agent.id === 'echo') return 'Drafting posts.'
    if (agent.id === 'maya') return 'Picking angles.'
    if (agent.id === 'nova') return 'Placing the schedule.'
    if (agent.id === 'lyra') return 'Planning visuals.'
  }
  if (mission.deliverableType === 'seo-audit') {
    if (agent.id === 'atlas') return 'Checking search.'
    if (agent.id === 'maya') return 'Prioritising fixes.'
    if (agent.id === 'echo') return 'Reviewing language.'
  }
  if (mission.deliverableType === 'ui-audit') {
    if (agent.id === 'finn') return 'Reviewing UI.'
    if (agent.id === 'lyra') return 'Checking visuals.'
    if (agent.id === 'dex') return 'Checking conversion.'
    if (agent.id === 'echo') return 'Checking messaging.'
  }

  const topSkill = skillAssignments[0]
  if (topSkill) {
    const mapped = skillBubble(topSkill)
    return mapped.charAt(0).toUpperCase() + mapped.slice(1) + '.'
  }
  if (agent.id === mission.leadAgentId) return 'Assembling output.'
  return 'Supporting the task.'
}

export function getLiveMissionSnapshots(input: {
  missions: Mission[]
  artifacts: Artifact[]
  providerSettings?: ProviderSettings | null
}) {
  const activeMissions = input.missions
    .filter((mission) =>
      (mission.status === 'queued' && isRecentlyActiveSeconds(mission.updatedAt || mission.createdAt, 45)) ||
      (mission.status === 'in_progress' && isRecentlyActive(mission.updatedAt || mission.createdAt, 2)) ||
      (mission.status === 'blocked' && isRecentlyActiveSeconds(mission.updatedAt || mission.createdAt, 25))
    )
    .map((mission) => {
      const latestArtifact = getLatestArtifactForMission(mission, input.artifacts)
      const stage = deriveMissionStage(mission, latestArtifact)
      const activeSkills = Array.from(new Set(Object.values(mission.skillAssignments || {}).flat().filter(Boolean)))
      const involvedAgentIds = getMissionInvolvedAgentIds(mission, latestArtifact)
      const auditProfile = getAuditExecutionProfile(mission.summary || mission.title, mission.deliverableType)
      const connectorStatus = getAuditConnectorStatus(input.providerSettings || undefined)
      const auditSummary = auditProfile
        ? `${auditProfile.title} · ${auditProfile.requiredConnectors
            .map((connector) => `${connector.shortName}${connectorStatus[connector.id] ? ' ready' : ' pending'}`)
            .join(' · ')}`
        : undefined

      return {
        mission,
        latestArtifact,
        stageLabel: stage.label,
        stageSummary: stage.summary,
        activeSkills,
        involvedAgentIds,
        progress: mission.progress || (latestArtifact ? 100 : 0),
        auditSummary,
      }
    })
    .sort((a, b) => safeTime(b.mission.createdAt) - safeTime(a.mission.createdAt))

  return activeMissions
}

export function getLiveOfficeAgentStates(input: {
  agents: Agent[]
  missions: Mission[]
  artifacts: Artifact[]
}) {
  const states = new Map<string, LiveOfficeAgentState>()
  const liveMissions = getLiveMissionSnapshots({ missions: input.missions, artifacts: input.artifacts })

  for (const liveMission of liveMissions) {
    if (!['queued', 'in_progress', 'blocked'].includes(liveMission.mission.status)) {
      continue
    }
    const executionSteps = liveMission.latestArtifact?.executionSteps || []
    const activeAgentIds = getStageDrivenActiveAgents(liveMission)
    const bubbleAgentId = getPrimaryBubbleAgentId(liveMission)

    for (const agentId of activeAgentIds) {
      const agent = input.agents.find((entry) => entry.id === agentId)
      if (!agent) continue
      const step = getLatestStepForAgent(executionSteps, agentId)
      const skillAssignments = liveMission.mission.skillAssignments?.[agentId] || []
      const showBubble = bubbleAgentId === agentId
      const bubble = showBubble ? summarizeStep(step) || defaultAgentBubble(agent, liveMission.mission, skillAssignments) : ''
      const mood: LiveOfficeAgentState['mood'] =
        liveMission.mission.status === 'blocked'
          ? 'blocked'
          : liveMission.stageLabel === 'Review' || /review|qa|check/i.test(bubble)
          ? 'reviewing'
          : liveMission.stageLabel === 'Analyzing' || /think|brainstorm|frame/i.test(bubble)
            ? 'thinking'
            : 'working'

      states.set(agentId, {
        agentId,
        missionId: liveMission.mission.id,
        stageLabel: liveMission.stageLabel,
        bubble,
        showBubble,
        mood,
      })
    }
  }

  return states
}

function getStageDrivenActiveAgents(liveMission: LiveMissionSnapshot) {
  const executionSteps = liveMission.latestArtifact?.executionSteps || []
  const mission = liveMission.mission
  const involvedAgentIds = getMissionInvolvedAgentIds(mission, liveMission.latestArtifact)
  const assignedTeam = Array.from(
    new Set([
      mission.leadAgentId,
      ...(mission.assignedAgentIds || []),
      ...(mission.collaboratorAgentIds || []),
    ].filter(Boolean) as string[])
  )
  const recentAgentIds = Array.from(
    new Set(
      executionSteps
        .slice(-4)
        .map((step) => step.agentId)
        .filter(Boolean) as string[]
    )
  )

  if (liveMission.stageLabel === 'Analyzing' || liveMission.stageLabel === 'Routing') {
    return assignedTeam.length ? assignedTeam : mission.leadAgentId ? [mission.leadAgentId] : involvedAgentIds.slice(0, 1)
  }

  if (liveMission.stageLabel === 'Execution') {
    return assignedTeam.length ? assignedTeam : recentAgentIds.length ? recentAgentIds : involvedAgentIds
  }

  if (liveMission.stageLabel === 'Review' || liveMission.stageLabel === 'Packaging' || liveMission.stageLabel === 'Saved Output' || liveMission.stageLabel === 'Complete') {
    return recentAgentIds.length ? recentAgentIds : assignedTeam.length ? assignedTeam.slice(0, 2) : involvedAgentIds.slice(0, 2)
  }

  if (liveMission.stageLabel === 'Blocked') {
    if (recentAgentIds.length) return recentAgentIds.slice(0, 2)
    return mission.leadAgentId ? [mission.leadAgentId] : involvedAgentIds.slice(0, 1)
  }

  return recentAgentIds
}

function getPrimaryBubbleAgentId(liveMission: LiveMissionSnapshot) {
  const executionSteps = liveMission.latestArtifact?.executionSteps || []
  const recentAgentIds = Array.from(
    new Set(
      executionSteps
        .slice(-4)
        .map((step) => step.agentId)
        .filter(Boolean) as string[]
    )
  )

  if (recentAgentIds.length) {
    return recentAgentIds[recentAgentIds.length - 1]
  }

  return liveMission.mission.leadAgentId || liveMission.involvedAgentIds[0] || null
}

export function getMissionRecency(mission: Mission, artifacts: Artifact[]) {
  const latestArtifact = getLatestArtifactForMission(mission, artifacts)
  return Math.max(safeTime(mission.createdAt), safeTime(mission.updatedAt), safeTime(latestArtifact?.createdAt), safeTime(latestArtifact?.updatedAt))
}

export function buildAgentLeaderboard(input: {
  agents: Agent[]
  missions: Mission[]
  artifacts: Artifact[]
}) : LeaderboardEntry[] {
  return input.agents
    .map((agent) => {
      const relevantMissions = input.missions.filter((mission) => {
        const assigned = Array.isArray(mission.assignedAgentIds) ? mission.assignedAgentIds : []
        return mission.leadAgentId === agent.id || assigned.includes(agent.id)
      })
      const relevantArtifacts = input.artifacts.filter((artifact) =>
        artifact.agentId === agent.id || (artifact.executionSteps || []).some((step) => step.agentId === agent.id && step.status !== 'failed')
      )

      const tasksCompleted = relevantMissions.filter((mission) => ['completed', 'review'].includes(mission.status)).length
      const leadWins = relevantMissions.filter((mission) => mission.leadAgentId === agent.id && ['completed', 'review'].includes(mission.status)).length
      const supportWins = relevantArtifacts.filter((artifact) => (artifact.executionSteps || []).some((step) => step.agentId === agent.id && step.role === 'support')).length
      const recentMissionCount = relevantMissions.filter((mission) => {
        const age = Date.now() - safeTime(mission.createdAt)
        return age <= 7 * 24 * 60 * 60 * 1000
      }).length

      return {
        agentId: agent.id,
        agentName: agent.name,
        color: agent.color,
        avatar: agent.avatar,
        photoUrl: agent.photoUrl,
        tasksCompleted,
        leadWins,
        supportWins,
        currentHotStreak: recentMissionCount,
        score: tasksCompleted * 4 + leadWins * 3 + supportWins * 2 + recentMissionCount,
      }
    })
    .sort((a, b) => b.score - a.score)
}
