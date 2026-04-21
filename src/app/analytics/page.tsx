'use client'

import React, { useState, useEffect } from 'react'
import { ClientShell } from '@/components/ClientShell'
import { useAnalyticsStore } from '@/lib/analytics-store'
import { useAgentsStore } from '@/lib/agents-store'
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Minus,
  Award,
  Target,
  Clock,
  Zap,
  Brain,
  AlertTriangle,
  CheckCircle2,
  Users,
  Activity,
} from 'lucide-react'
import { clsx } from 'clsx'
import { buildAgentLeaderboard } from '@/lib/live-ops'
import { AgentLeaderboardPanel } from '@/components/analytics/AgentLeaderboardPanel'

// Mock data for demonstration
const MOCK_CAMPAIGNS = [
  { id: 'camp-1', name: 'Summer Sale 2025', spend: 12500, conversions: 342, roas: 3.2 },
  { id: 'camp-2', name: 'Brand Awareness', spend: 8000, conversions: 156, roas: 2.1 },
  { id: 'camp-3', name: 'Product Launch', spend: 15000, conversions: 423, roas: 4.5 },
]

export default function AnalyticsPage() {
  const agents = useAgentsStore(state => state.agents)
  const campaigns = useAgentsStore(state => state.campaigns)
  const missions = useAgentsStore(state => state.missions)
  const artifacts = useAgentsStore(state => state.artifacts)
  const { learnedPatterns, abTests, getAgentLeaderboard, getPredictiveTimeline } = useAnalyticsStore()
  
  const [activeTab, setActiveTab] = useState<'overview' | 'campaigns' | 'agents' | 'intelligence'>('overview')
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d')

  // Calculate mock stats
  const totalSpend = MOCK_CAMPAIGNS.reduce((sum, c) => sum + c.spend, 0)
  const totalConversions = MOCK_CAMPAIGNS.reduce((sum, c) => sum + c.conversions, 0)
  const avgRoas = MOCK_CAMPAIGNS.reduce((sum, c) => sum + c.roas, 0) / MOCK_CAMPAIGNS.length
  const leaderboard = buildAgentLeaderboard({ agents, missions, artifacts })
  const topAgent = leaderboard[0]

  return (
    <ClientShell>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-heading font-bold text-text-primary flex items-center gap-2">
                <BarChart3 size={20} className="text-accent-purple" />
                Analytics & Intelligence
              </h1>
              <p className="text-xs text-text-secondary mt-0.5">
                Performance dashboards, AI insights, and predictive timelines
              </p>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={timeRange}
                onChange={e => setTimeRange(e.target.value as any)}
                className="bg-base border border-border rounded-lg px-3 py-2 text-sm"
              >
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="90d">Last 90 days</option>
              </select>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-6 border-b border-border flex gap-4 flex-shrink-0">
          {[
            { id: 'overview', label: 'Overview', icon: BarChart3 },
            { id: 'campaigns', label: 'Campaigns', icon: Target },
            { id: 'agents', label: 'Agents', icon: Users },
            { id: 'intelligence', label: 'AI Intelligence', icon: Brain },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={clsx(
                'py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5',
                activeTab === tab.id
                  ? 'border-accent-purple text-accent-purple'
                  : 'border-transparent text-text-secondary hover:text-text-primary'
              )}
            >
              <tab.icon size={14} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Key Metrics */}
              <div className="grid grid-cols-4 gap-4">
                <MetricCard
                  label="Total Spend"
                  value={`$${totalSpend.toLocaleString()}`}
                  trend="+12%"
                  trendUp={true}
                  icon={Target}
                  color="#ff5fa0"
                />
                <MetricCard
                  label="Conversions"
                  value={totalConversions.toString()}
                  trend="+8%"
                  trendUp={true}
                  icon={CheckCircle2}
                  color="#22c55e"
                />
                <MetricCard
                  label="Avg ROAS"
                  value={avgRoas.toFixed(2)}
                  trend="+0.3"
                  trendUp={true}
                  icon={TrendingUp}
                  color="#9b6dff"
                />
                <MetricCard
                  label="Top Agent"
                  value={topAgent?.agentName || '—'}
                  trend={topAgent ? `${topAgent.tasksCompleted} completed` : 'No runs yet'}
                  trendUp={true}
                  icon={Zap}
                  color="#00d4aa"
                />
              </div>

              {/* Campaign Performance */}
              <div className="bg-base-200 rounded-xl p-6">
                <h3 className="font-medium mb-4">Campaign Performance</h3>
                <div className="space-y-3">
                  {MOCK_CAMPAIGNS.map(camp => (
                    <div key={camp.id} className="flex items-center justify-between p-4 bg-base rounded-lg">
                      <div>
                        <p className="font-medium">{camp.name}</p>
                        <p className="text-xs text-text-secondary">${camp.spend.toLocaleString()} spend</p>
                      </div>
                      <div className="text-right">
                        <p className={clsx(
                          'font-bold',
                          camp.roas >= 3 ? 'text-accent-green' : camp.roas >= 2 ? 'text-accent-yellow' : 'text-accent-red'
                        )}>
                          {camp.roas}x ROAS
                        </p>
                        <p className="text-xs text-text-secondary">{camp.conversions} conversions</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Agent Leaderboard */}
              <AgentLeaderboardPanel entries={leaderboard} />

              {/* Predicted Timeline */}
              <div className="bg-base-200 rounded-xl p-6">
                <h3 className="font-medium mb-4 flex items-center gap-2">
                  <Clock size={16} />
                  Predicted Timelines
                </h3>
                <div className="space-y-3">
                  {MOCK_CAMPAIGNS.slice(0, 2).map(camp => (
                    <div key={camp.id} className="p-4 bg-base rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-medium">{camp.name}</p>
                        <span className="text-xs text-accent-green bg-accent-green/10 px-2 py-0.5 rounded">
                          92% confidence
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-text-secondary">
                        <span>Est. completion: <strong className="text-text-primary">Mar 28, 2025</strong></span>
                        <span>Risk: <strong className="text-accent-yellow">Medium</strong></span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Campaigns Tab */}
          {activeTab === 'campaigns' && (
            <div className="space-y-6">
              <div className="bg-base-200 rounded-xl p-6">
                <h3 className="font-medium mb-4">Campaign Details</h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-left text-sm text-text-secondary border-b border-border">
                        <th className="pb-3">Campaign</th>
                        <th className="pb-3">Spend</th>
                        <th className="pb-3">Conversions</th>
                        <th className="pb-3">CPC</th>
                        <th className="pb-3">CTR</th>
                        <th className="pb-3">ROAS</th>
                        <th className="pb-3">Trend</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm">
                      {MOCK_CAMPAIGNS.map(camp => (
                        <tr key={camp.id} className="border-b border-border last:border-0">
                          <td className="py-3 font-medium">{camp.name}</td>
                          <td className="py-3">${camp.spend.toLocaleString()}</td>
                          <td className="py-3">{camp.conversions}</td>
                          <td className="py-3">${(camp.spend / camp.conversions).toFixed(2)}</td>
                          <td className="py-3">2.4%</td>
                          <td className="py-3">
                            <span className={clsx(
                              'font-bold',
                              camp.roas >= 3 ? 'text-accent-green' : camp.roas >= 2 ? 'text-accent-yellow' : 'text-accent-red'
                            )}>
                              {camp.roas}x
                            </span>
                          </td>
                          <td className="py-3">
                            <div className="flex items-center gap-1 text-accent-green">
                              <TrendingUp size={14} />
                              +12%
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Agents Tab */}
          {activeTab === 'agents' && (
            <div className="space-y-6">
              <AgentLeaderboardPanel
                entries={leaderboard}
                title="Agent of the Week"
                subtitle="Weighted from completed tasks, lead wins, support contributions, and current streak."
              />
              <div className="grid grid-cols-2 gap-4">
                {leaderboard.map(agent => (
                  <div key={agent.agentId} className="bg-base-200 rounded-xl p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-full bg-accent-purple/20 flex items-center justify-center text-accent-purple font-bold">
                        {agent.agentName[0]}
                      </div>
                      <div>
                        <p className="font-medium">{agent.agentName}</p>
                        <p className="text-xs text-text-secondary">{agent.tasksCompleted} tasks completed</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-text-secondary">Lead Wins</span>
                        <span>{agent.leadWins}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-text-secondary">Support Wins</span>
                        <span className="text-accent-green">{agent.supportWins}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-text-secondary">Momentum</span>
                        <span className="text-accent-blue">{agent.currentHotStreak} recent</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Intelligence Tab */}
          {activeTab === 'intelligence' && (
            <div className="space-y-6">
              {/* Learned Patterns */}
              <div className="bg-base-200 rounded-xl p-6">
                <h3 className="font-medium mb-4 flex items-center gap-2">
                  <Brain size={16} />
                  Learned Patterns
                </h3>
                {learnedPatterns.length === 0 ? (
                  <div className="text-center py-8">
                    <Activity size={48} className="mx-auto text-text-dim mb-3" />
                    <p className="text-text-secondary">No patterns learned yet</p>
                    <p className="text-xs text-text-dim mt-1">
                      AI will identify patterns as you run more campaigns
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {learnedPatterns.map(pattern => (
                      <div key={pattern.id} className="p-4 bg-base rounded-lg">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium">{pattern.pattern}</p>
                            <p className="text-sm text-text-secondary mt-1">{pattern.description}</p>
                          </div>
                          <span className={clsx(
                            'text-xs px-2 py-0.5 rounded',
                            pattern.confidence > 0.8 ? 'bg-accent-green/20 text-accent-green' :
                            'bg-accent-yellow/20 text-accent-yellow'
                          )}>
                            {Math.round(pattern.confidence * 100)}% confidence
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* A/B Tests */}
              <div className="bg-base-200 rounded-xl p-6">
                <h3 className="font-medium mb-4">A/B Test Results</h3>
                {abTests.length === 0 ? (
                  <div className="text-center py-8">
                    <Target size={48} className="mx-auto text-text-dim mb-3" />
                    <p className="text-text-secondary">No A/B tests recorded</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {abTests.map(test => (
                      <div key={test.id} className="p-4 bg-base rounded-lg">
                        <p className="font-medium">{test.name}</p>
                        <p className="text-sm text-text-secondary">{test.hypothesis}</p>
                        <div className="flex gap-4 mt-2">
                          <span className={clsx(
                            'text-sm font-medium',
                            test.result === 'A_wins' ? 'text-accent-purple' : 'text-accent-blue'
                          )}>
                            Variant A: {test.variantA}
                          </span>
                          <span className="text-text-dim">vs</span>
                          <span className="text-sm font-medium">
                            Variant B: {test.variantB}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Recommendations */}
              <div className="bg-base-200 rounded-xl p-6">
                <h3 className="font-medium mb-4 flex items-center gap-2">
                  <Zap size={16} />
                  AI Recommendations
                </h3>
                <div className="space-y-3">
                  <RecommendationCard
                    title="Shift budget to Summer Sale campaign"
                    reason="ROAS is 52% higher than brand awareness campaign"
                    impact="+$2,400 estimated monthly revenue"
                    confidence={85}
                  />
                  <RecommendationCard
                    title="Schedule more posts on Tuesdays"
                    reason="Engagement rates are 34% higher on Tuesdays across all campaigns"
                    impact="+18% reach improvement"
                    confidence={78}
                  />
                  <RecommendationCard
                    title="Add more video content"
                    reason="Video ads show 2.3x higher conversion rates"
                    impact="+15% conversion rate improvement"
                    confidence={72}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </ClientShell>
  )
}

function MetricCard({ label, value, trend, trendUp, icon: Icon, color }: any) {
  return (
    <div className="bg-base-200 rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-text-secondary">{label}</span>
        <Icon size={16} style={{ color }} />
      </div>
      <p className="text-2xl font-bold">{value}</p>
      <div className={clsx(
        'flex items-center gap-1 text-xs mt-1',
        trendUp ? 'text-accent-green' : 'text-accent-red'
      )}>
        {trendUp ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
        {trend}
      </div>
    </div>
  )
}

function RecommendationCard({ title, reason, impact, confidence }: any) {
  return (
    <div className="p-4 bg-base rounded-lg border-l-4 border-accent-purple">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-medium">{title}</p>
          <p className="text-sm text-text-secondary mt-1">{reason}</p>
          <p className="text-sm text-accent-green mt-1">{impact}</p>
        </div>
        <span className="text-xs text-text-dim">{confidence}%</span>
      </div>
    </div>
  )
}
