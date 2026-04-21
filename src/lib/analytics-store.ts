// Analytics Store - Campaign performance, agent productivity, ROI tracking

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface MetricDataPoint {
  date: string
  value: number
}

export interface CampaignMetrics {
  campaignId: string
  campaignName: string
  impressions: MetricDataPoint[]
  clicks: MetricDataPoint[]
  spend: MetricDataPoint[]
  conversions: MetricDataPoint[]
  ctr: MetricDataPoint[]
  cpc: MetricDataPoint[]
  roas: MetricDataPoint[]
}

export interface AgentMetrics {
  agentId: string
  agentName: string
  tasksCompleted: number
  avgTaskDuration: number
  outputQuality: number
  missionsHandled: number
  activityHistory: {
    date: string
    tasksCompleted: number
    outputProduced: string[]
  }[]
}

export interface PipelineMetrics {
  pipelineId: string
  pipelineName: string
  totalRuns: number
  avgCompletionTime: number
  successRate: number
  tasksCompleted: number
  tasksBlocked: number
}

export interface AnalyticsState {
  // Campaign metrics from ad platforms
  campaignMetrics: CampaignMetrics[]
  
  // Agent productivity metrics
  agentMetrics: AgentMetrics[]
  
  // Pipeline performance metrics
  pipelineMetrics: PipelineMetrics[]
  
  // Learning data - patterns identified
  learnedPatterns: {
    id: string
    pattern: string
    description: string
    confidence: number
    evidence: string[]
    recommendations: string[]
  }[]
  
  // A/B test results
  abTests: {
    id: string
    name: string
    hypothesis: string
    variantA: string
    variantB: string
    result: 'A_wins' | 'B_wins' | 'inconclusive'
    statisticalSignificance: number
    sampleSize: number
    metrics: Record<string, { a: number; b: number }>
    createdAt: string
  }[]
  
  // Actions
  addCampaignMetrics: (metrics: CampaignMetrics) => void
  updateAgentMetrics: (agentId: string, metrics: Partial<AgentMetrics>) => void
  recordPipelineRun: (pipelineId: string, success: boolean, duration: number) => void
  addLearnedPattern: (pattern: Omit<AnalyticsState['learnedPatterns'][0], 'id'>) => void
  addABTest: (test: Omit<AnalyticsState['abTests'][0], 'id' | 'createdAt'>) => void
  getROIAnalysis: (campaignId: string) => {
    totalSpend: number
    totalConversions: number
    costPerConversion: number
    roas: number
    trend: 'improving' | 'stable' | 'declining'
  }
  getAgentLeaderboard: () => { agentId: string; agentName: string; score: number }[]
  getPredictiveTimeline: (missionId: string) => {
    estimatedCompletion: string
    confidence: number
    riskFactors: string[]
  } | null
}

export const useAnalyticsStore = create<AnalyticsState>()(
  persist(
    (set, get) => ({
      campaignMetrics: [],
      agentMetrics: [],
      pipelineMetrics: [],
      learnedPatterns: [],
      abTests: [],
      
      addCampaignMetrics: (metrics) => {
        set((state) => {
          const existing = state.campaignMetrics.findIndex(m => m.campaignId === metrics.campaignId)
          if (existing >= 0) {
            const updated = [...state.campaignMetrics]
            updated[existing] = metrics
            return { campaignMetrics: updated }
          }
          return { campaignMetrics: [...state.campaignMetrics, metrics] }
        })
      },
      
      updateAgentMetrics: (agentId, metrics) => {
        set((state) => {
          const existing = state.agentMetrics.findIndex(m => m.agentId === agentId)
          if (existing >= 0) {
            const updated = [...state.agentMetrics]
            updated[existing] = { ...updated[existing], ...metrics }
            return { agentMetrics: updated }
          }
          return { 
            agentMetrics: [...state.agentMetrics, {
              agentId,
              agentName: metrics.agentName || agentId,
              tasksCompleted: 0,
              avgTaskDuration: 0,
              outputQuality: 0,
              missionsHandled: 0,
              activityHistory: [],
              ...metrics,
            }] 
          }
        })
      },
      
      recordPipelineRun: (pipelineId, success, duration) => {
        set((state) => {
          const existing = state.pipelineMetrics.findIndex(m => m.pipelineId === pipelineId)
          const record = {
            date: new Date().toISOString(),
            success,
            duration,
          }
          
          if (existing >= 0) {
            const updated = [...state.pipelineMetrics]
            const current = updated[existing]
            updated[existing] = {
              ...current,
              totalRuns: current.totalRuns + 1,
              successRate: ((current.successRate * current.totalRuns) + (success ? 1 : 0)) / (current.totalRuns + 1),
              avgCompletionTime: ((current.avgCompletionTime * current.totalRuns) + duration) / (current.totalRuns + 1),
              tasksCompleted: current.tasksCompleted + 1,
              tasksBlocked: current.tasksBlocked + (success ? 0 : 1),
            }
            return { pipelineMetrics: updated }
          }
          
          return { 
            pipelineMetrics: [...state.pipelineMetrics, {
              pipelineId,
              pipelineName: pipelineId,
              totalRuns: 1,
              avgCompletionTime: duration,
              successRate: success ? 1 : 0,
              tasksCompleted: 1,
              tasksBlocked: success ? 0 : 1,
            }]
          }
        })
      },
      
      addLearnedPattern: (pattern) => {
        set((state) => ({
          learnedPatterns: [...state.learnedPatterns, {
            ...pattern,
            id: `pattern-${Date.now()}`,
          }]
        }))
      },
      
      addABTest: (test) => {
        set((state) => ({
          abTests: [...state.abTests, {
            ...test,
            id: `test-${Date.now()}`,
            createdAt: new Date().toISOString(),
          }]
        }))
      },
      
      getROIAnalysis: (campaignId) => {
        const metrics = get().campaignMetrics.find(m => m.campaignId === campaignId)
        if (!metrics || metrics.spend.length === 0) {
          return { totalSpend: 0, totalConversions: 0, costPerConversion: 0, roas: 0, trend: 'stable' }
        }
        
        const totalSpend = metrics.spend.reduce((sum, p) => sum + p.value, 0)
        const totalConversions = metrics.conversions.reduce((sum, p) => sum + p.value, 0)
        const costPerConversion = totalConversions > 0 ? totalSpend / totalConversions : 0
        
        // Calculate ROAS (assuming revenue = conversions * avg value)
        const avgConversionValue = 100 // Would be calculated from actual data
        const totalRevenue = totalConversions * avgConversionValue
        const roas = totalSpend > 0 ? totalRevenue / totalSpend : 0
        
        // Calculate trend from last 7 data points
        const recent = metrics.roas.slice(-7)
        if (recent.length < 2) {
          return { totalSpend, totalConversions, costPerConversion, roas, trend: 'stable' }
        }
        
        const firstHalf = recent.slice(0, Math.floor(recent.length / 2))
        const secondHalf = recent.slice(Math.floor(recent.length / 2))
        const avgFirst = firstHalf.reduce((s, p) => s + p.value, 0) / firstHalf.length
        const avgSecond = secondHalf.reduce((s, p) => s + p.value, 0) / secondHalf.length
        
        let trend: 'improving' | 'stable' | 'declining' = 'stable'
        if (avgSecond > avgFirst * 1.1) trend = 'improving'
        else if (avgSecond < avgFirst * 0.9) trend = 'declining'
        
        return { totalSpend, totalConversions, costPerConversion, roas, trend }
      },
      
      getAgentLeaderboard: () => {
        return get().agentMetrics
          .map(m => ({
            agentId: m.agentId,
            agentName: m.agentName,
            score: (m.tasksCompleted * 0.3) + (m.outputQuality * 0.4) + ((100 - m.avgTaskDuration / 60) * 0.3),
          }))
          .sort((a, b) => b.score - a.score)
      },
      
      getPredictiveTimeline: (missionId) => {
        const pipelines = get().pipelineMetrics
        if (pipelines.length === 0) return null
        
        const avgDuration = pipelines.reduce((sum, p) => sum + p.avgCompletionTime, 0) / pipelines.length
        const estimatedCompletion = new Date(Date.now() + avgDuration).toISOString()
        
        const riskFactors: string[] = []
        const lowSuccessPipelines = pipelines.filter(p => p.successRate < 0.8)
        if (lowSuccessPipelines.length > 0) {
          riskFactors.push('Some pipelines have low success rates')
        }
        if (avgDuration > 7 * 24 * 60 * 60 * 1000) {
          riskFactors.push('Long average completion time')
        }
        
        const avgSuccessRate = pipelines.reduce((sum, p) => sum + p.successRate, 0) / pipelines.length
        
        return {
          estimatedCompletion,
          confidence: avgSuccessRate * 100,
          riskFactors,
        }
      },
    }),
    {
      name: 'mission-control-analytics',
    }
  )
)
