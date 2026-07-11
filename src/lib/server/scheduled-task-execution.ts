import { v4 as uuidv4 } from 'uuid'

import type { AuthContext } from '@/lib/auth/server'
import { getDb } from '@/lib/db/client'
import { inferDeliverableType } from '@/lib/intents/intent-classifier'
import type { DeliverableType } from '@/lib/types'
import { runTaskExecution } from '@/lib/server/task-execution'

const SCHEDULED_TYPE_MAP: Record<string, DeliverableType> = {
  'competitor-research': 'research-brief',
  'seo-audit': 'seo-audit',
  'content-calendar': 'content-calendar',
  'performance-report': 'data-analysis',
  'social-posts': 'campaign-copy',
  'campaign-brief': 'campaign-strategy',
  'email-campaign': 'email-campaign',
}

async function resolveScheduledClientId(tenantId: string, prompt: string) {
  const db = getDb()
  const clients = await db`
    SELECT id, name
    FROM clients
    WHERE agency_id = ${tenantId}::uuid
    ORDER BY length(name) DESC
    LIMIT 100
  `
  const lower = prompt.toLowerCase()
  const match = clients.find((client: any) => lower.includes(String(client.name || '').toLowerCase()))
  return match?.id || (clients.length === 1 ? clients[0].id : null)
}

export async function executeScheduledTaskThroughOrchestrator(input: {
  task: any
  auth: AuthContext
}) {
  if (!input.auth.tenantId) throw new Error('Scheduled execution requires a tenant.')
  const db = getDb()
  const prompt = String(input.task.prompt || input.task.name || '').trim()
  const deliverableType =
    SCHEDULED_TYPE_MAP[input.task.task_type] ||
    inferDeliverableType(prompt)
  const taskId = uuidv4()
  const clientId = await resolveScheduledClientId(input.auth.tenantId, prompt)

  let leadAgentId: string | null = null
  if (input.task.agent_id) {
    const rows = await db`
      SELECT id FROM agents
      WHERE agency_id = ${input.auth.tenantId}::uuid AND id = ${input.task.agent_id}
      LIMIT 1
    `
    leadAgentId = rows[0]?.id || null
  }

  await db`
    INSERT INTO tasks (
      id, agency_id, client_id, title, summary, deliverable_type, status,
      priority, owner_user_id, lead_agent_id, progress, execution_plan, metadata
    ) VALUES (
      ${taskId}, ${input.auth.tenantId}::uuid, ${clientId},
      ${input.task.name || 'Scheduled task'}, ${prompt}, ${deliverableType},
      'queued', 'normal', ${input.auth.userId}::uuid, ${leadAgentId}, 0,
      ${db.json({ source: 'scheduled-task', scheduledTaskId: input.task.id })},
      ${db.json({ source: 'scheduled-task', scheduledTaskId: input.task.id })}
    )
  `

  await runTaskExecution(taskId, input.auth, 'retry')

  const outputs = await db`
    SELECT content
    FROM outputs
    WHERE agency_id = ${input.auth.tenantId}::uuid AND task_id = ${taskId}
    ORDER BY updated_at DESC
    LIMIT 1
  `
  const output = String(outputs[0]?.content || '').trim()
  if (!output) throw new Error('Scheduled task completed without a usable output.')
  return { taskId, output, deliverableType }
}
