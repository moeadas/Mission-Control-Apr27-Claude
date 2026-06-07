'use client'

import React, { useMemo, useState, useEffect } from 'react'
import { ClientShell } from '@/components/ClientShell'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Input'
import { Download, KeyRound, RefreshCcw, Settings, Sparkles, SunMedium, Upload, ExternalLink, Check } from 'lucide-react'
import { toast } from '@/components/ui/Toast'
import { useAgentsStore } from '@/lib/agents-store'
import { getProviderModels, MODEL_OPTIONS, PROVIDER_OPTIONS } from '@/lib/providers'
import { ProviderFallback, ThemeMode } from '@/lib/types'
import { META_MARKET_OPTIONS } from '@/lib/meta-ads-intelligence'
import { getAuthToken } from '@/lib/auth/browser'
import { Lock } from 'lucide-react'
import Link from 'next/link'
import { BuildVersionBadge } from '@/components/BuildVersionBadge'

type ProviderHealth = 'idle' | 'testing' | 'connected' | 'invalid'
type GeminiHealth = ProviderHealth
type VisualHealth = ProviderHealth

// ─── Password Change Card ─────────────────────────────────────────────────────
function PasswordChangeCard() {
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPw !== confirmPw) {
      toast.error('New passwords do not match')
      return
    }
    if (newPw.length < 8) {
      toast.error('New password must be at least 8 characters')
      return
    }
    setSaving(true)
    try {
      const token = await getAuthToken()
      const res = await fetch('/api/auth/password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Password change failed')
      } else {
        toast.success('Password changed successfully')
        setCurrentPw('')
        setNewPw('')
        setConfirmPw('')
      }
    } catch {
      toast.error('Password change failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <div className="flex items-center gap-2 mb-4">
        <Lock size={16} className="text-text-secondary" />
        <h2 className="text-sm font-heading font-semibold text-text-primary">Change Password</h2>
      </div>
      <form onSubmit={handleSubmit} className="grid md:grid-cols-3 gap-4">
        <Input
          label="Current Password"
          type="password"
          value={currentPw}
          onChange={(e) => setCurrentPw(e.target.value)}
          placeholder="Your current password"
          required
        />
        <Input
          label="New Password"
          type="password"
          value={newPw}
          onChange={(e) => setNewPw(e.target.value)}
          placeholder="At least 8 characters"
          required
        />
        <Input
          label="Confirm New Password"
          type="password"
          value={confirmPw}
          onChange={(e) => setConfirmPw(e.target.value)}
          placeholder="Repeat new password"
          required
        />
        <div className="md:col-span-3 flex justify-end">
          <Button type="submit" variant="primary" disabled={saving}>
            {saving ? 'Saving…' : 'Update Password'}
          </Button>
        </div>
      </form>
    </Card>
  )
}

export default function SettingsPage() {
  const agents = useAgentsStore((state) => state.agents)
  const campaigns = useAgentsStore((state) => state.campaigns)
  const clients = useAgentsStore((state) => state.clients)
  const missions = useAgentsStore((state) => state.missions)
  const artifacts = useAgentsStore((state) => state.artifacts)
  const agencySettings = useAgentsStore((state) => state.agencySettings)
  const providerSettings = useAgentsStore((state) => state.providerSettings)
  const agentMemories = useAgentsStore((state) => state.agentMemories)
  const currentUser = useAgentsStore((state) => state.currentUser)
  const updateAgencySettings = useAgentsStore((state) => state.updateAgencySettings)
  const updateProviderSettings = useAgentsStore((state) => state.updateProviderSettings)
  const saveGeminiKey = useAgentsStore((state) => state.saveGeminiKey)
  const hydrateAppState = useAgentsStore((state) => state.hydrateAppState)

  const [geminiKeyInput, setGeminiKeyInput] = useState('')
  const [anthropicKeyInput, setAnthropicKeyInput] = useState('')
  const [openAiKeyInput, setOpenAiKeyInput] = useState('')
  const [isVerifyingGemini, setIsVerifyingGemini] = useState(false)
  const [isVerifyingOllama, setIsVerifyingOllama] = useState(false)
  const [isVerifyingVisual, setIsVerifyingVisual] = useState(false)
  const [isVerifyingAnthropic, setIsVerifyingAnthropic] = useState(false)
  const [isVerifyingOpenAi, setIsVerifyingOpenAi] = useState(false)
  const [geminiHealth, setGeminiHealth] = useState<GeminiHealth>(providerSettings.gemini.verified ? 'connected' : 'idle')
  const [geminiHealthMessage, setGeminiHealthMessage] = useState<string>(
    providerSettings.gemini.verified ? 'Gemini connected' : 'Gemini not verified yet'
  )
  const [anthropicHealth, setAnthropicHealth] = useState<ProviderHealth>(providerSettings.anthropic?.verified ? 'connected' : 'idle')
  const [anthropicHealthMessage, setAnthropicHealthMessage] = useState<string>(
    providerSettings.anthropic?.verified ? 'Anthropic connected' : 'Anthropic not verified yet'
  )
  const [openAiHealth, setOpenAiHealth] = useState<ProviderHealth>(providerSettings.openai?.verified ? 'connected' : 'idle')
  const [openAiHealthMessage, setOpenAiHealthMessage] = useState<string>(
    providerSettings.openai?.verified ? 'OpenAI connected' : 'OpenAI not verified yet'
  )
  const [metaTokenInput, setMetaTokenInput] = useState('')
  const [metaAccountIdInput, setMetaAccountIdInput] = useState(providerSettings.meta?.adAccountId || '')
  const [metaPrimaryMarketInput, setMetaPrimaryMarketInput] = useState(providerSettings.meta?.primaryMarket || 'JO')
  const [metaDiscoveredAccounts, setMetaDiscoveredAccounts] = useState<{ id: string; name: string }[]>([])
  const [showMetaGuide, setShowMetaGuide] = useState(false)
  const [isVerifyingMeta, setIsVerifyingMeta] = useState(false)
  const [metaHealth, setMetaHealth] = useState<ProviderHealth>(providerSettings.meta?.verified ? 'connected' : 'idle')
  const [metaHealthMessage, setMetaHealthMessage] = useState<string>(
    providerSettings.meta?.verified ? 'Meta Ads connected' : 'Meta access token not verified yet'
  )
  const [higgsKeyInput, setHiggsKeyInput] = useState('')
  const [isVerifyingHiggs, setIsVerifyingHiggs] = useState(false)
  const [higgsHealth, setHiggsHealth] = useState<ProviderHealth>(providerSettings.higgsfield?.verified ? 'connected' : 'idle')
  const [higgsHealthMessage, setHiggsHealthMessage] = useState<string>(
    providerSettings.higgsfield?.verified ? 'Higgsfield connected' : 'Higgsfield API key not verified yet'
  )
  const [serperKeyInput, setSerperKeyInput] = useState('')
  const [serperCountryInput, setSerperCountryInput] = useState(providerSettings.serper?.country || 'us')
  const [serperLanguageInput, setSerperLanguageInput] = useState(providerSettings.serper?.language || 'en')
  const [serperTestQueryInput, setSerperTestQueryInput] = useState(providerSettings.serper?.testQuery || 'content marketing strategy')
  const [isVerifyingSerper, setIsVerifyingSerper] = useState(false)
  const [serperHealth, setSerperHealth] = useState<ProviderHealth>(providerSettings.serper?.verified ? 'connected' : 'idle')
  const [serperHealthMessage, setSerperHealthMessage] = useState<string>(
    providerSettings.serper?.verified ? 'Serper connected' : 'Serper API key not verified yet'
  )
  const [googleClientIdInput, setGoogleClientIdInput] = useState(providerSettings.google?.clientId || '')
  const [googleClientSecretInput, setGoogleClientSecretInput] = useState('')
  const [googleRedirectUri, setGoogleRedirectUri] = useState(providerSettings.google?.redirectUri || '')
  const [isVerifyingGoogleOAuth, setIsVerifyingGoogleOAuth] = useState(false)
  const [googleOAuthHealth, setGoogleOAuthHealth] = useState<ProviderHealth>(providerSettings.google?.verified ? 'connected' : 'idle')
  const [googleOAuthHealthMessage, setGoogleOAuthHealthMessage] = useState<string>(
    providerSettings.google?.verified ? 'Google OAuth app connected' : 'Google OAuth app not verified yet'
  )
  const [visualHealth, setVisualHealth] = useState<VisualHealth>(providerSettings.visual?.verified ? 'connected' : 'idle')
  const [visualHealthMessage, setVisualHealthMessage] = useState<string>(
    providerSettings.visual?.verified ? 'Visual generation connected' : 'Visual generation not verified yet'
  )
  const [dbStatus, setDbStatus] = useState<'checking' | 'connected' | 'client-only' | 'not-configured' | 'error'>('checking')
  const [dbUpdatedAt, setDbUpdatedAt] = useState<string | null>(null)
  const [oauthConnections, setOauthConnections] = useState<Record<string, boolean>>({
    google_docs: false,
    google_sheets: false,
    google_ads: false,
    google_analytics: false,
    meta_facebook: false,
    meta_instagram: false,
  })

  const markGoogleConnected = (accountEmail?: string | null) => {
    setOauthConnections(prev => ({
      ...prev,
      google_docs: true,
      google_sheets: true,
      google_ads: true,
      google_analytics: true,
    }))
    setGoogleOAuthHealth('connected')
    setGoogleOAuthHealthMessage(
      accountEmail
        ? `Google account connected · ${accountEmail}`
        : 'Google account connected · Analytics, Docs, Sheets, and Drive are ready'
    )
  }

  const markMetaConnected = (accountEmail?: string | null) => {
    setOauthConnections(prev => ({
      ...prev,
      meta_facebook: true,
      meta_instagram: true,
    }))
    if (accountEmail) setMetaHealthMessage(`Meta account connected · ${accountEmail}`)
  }

  const resetOAuthConnections = () => {
    setOauthConnections({
      google_docs: false,
      google_sheets: false,
      google_ads: false,
      google_analytics: false,
      meta_facebook: false,
      meta_instagram: false,
    })
  }

  // Handle OAuth callback on page load
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const oauthSuccess = params.get('oauth')
    const oauthScope = params.get('scope')
    const googleStatus = params.get('google')
    const metaStatus = params.get('meta')
    let handled = false

    if (googleStatus === 'connected') {
      setGoogleOAuthHealth('testing')
      setGoogleOAuthHealthMessage('Google returned successfully. Verifying the saved account connection...')
      toast.success('Google returned successfully. Verifying connection...')
      handled = true
    } else if (googleStatus) {
      const googleMessages: Record<string, string> = {
        denied: 'Google consent was cancelled.',
        missing_params: 'Google did not return the expected OAuth parameters.',
        invalid_state: 'Google connection expired before completion. Please try Connect Google again.',
        misconfigured: 'Google OAuth app settings are missing or invalid.',
        exchange_failed: 'Google returned the user to Mission Control, but token exchange failed.',
        no_access_token: 'Google did not return an access token. Please try Connect Google again.',
        save_failed: 'Google returned tokens, but Mission Control could not save the connection. Please try again.',
      }
      toast.error(googleMessages[googleStatus] || `Google connection failed: ${googleStatus}`)
      setGoogleOAuthHealth('invalid')
      setGoogleOAuthHealthMessage(googleMessages[googleStatus] || `Google connection failed: ${googleStatus}`)
      handled = true
    }

    if (metaStatus === 'connected') {
      markMetaConnected()
      toast.success('Meta account connected')
      handled = true
    }

    if (oauthSuccess === 'success' && oauthScope) {
      setOauthConnections(prev => ({ ...prev, [oauthScope]: true }))
      toast.success(`Successfully connected ${oauthScope.replace('_', ' ')}`)
      handled = true
    }

    if (handled) {
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [])

  useEffect(() => {
    const loadOAuthConnections = async () => {
      const token = await getAuthToken()
      if (!token) return
      const response = await fetch('/api/auth/connections', {
        cache: 'no-store',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!response.ok) return
      const payload = await response.json().catch(() => null)
      resetOAuthConnections()
      if (payload?.google?.connected) {
        markGoogleConnected(payload.google.accountEmail)
      } else {
        setGoogleOAuthHealth(providerSettings.google?.verified ? 'connected' : 'idle')
        setGoogleOAuthHealthMessage(
          providerSettings.google?.verified
            ? 'Google OAuth app verified · connect a Google account to enable Analytics'
            : 'Add your OAuth Web App Client ID and Client Secret, then verify'
        )
      }
      if (payload?.meta?.connected) markMetaConnected(payload.meta.accountEmail)
    }

    loadOAuthConnections().catch(() => {})
  }, [])

  useEffect(() => {
    setGeminiHealth(providerSettings.gemini.verified ? 'connected' : geminiKeyInput.trim() ? 'idle' : 'idle')
    setGeminiHealthMessage(providerSettings.gemini.verified ? 'Gemini connected' : providerSettings.gemini.maskedKey ? 'Saved key not verified in this session' : 'Gemini not verified yet')
  }, [providerSettings.gemini.maskedKey, providerSettings.gemini.verified, geminiKeyInput])

  useEffect(() => {
    setVisualHealth(providerSettings.visual?.verified ? 'connected' : 'idle')
    setVisualHealthMessage(
      providerSettings.visual?.verified
        ? `Visual generation connected · ${providerSettings.visual.model}`
        : providerSettings.gemini.maskedKey
          ? 'Uses the saved Gemini key to generate branded images.'
          : 'Add and verify a Gemini key first.'
    )
  }, [providerSettings.visual?.verified, providerSettings.visual?.model, providerSettings.gemini.maskedKey])

  useEffect(() => {
    setSerperCountryInput(providerSettings.serper?.country || 'us')
    setSerperLanguageInput(providerSettings.serper?.language || 'en')
    setSerperTestQueryInput(providerSettings.serper?.testQuery || 'content marketing strategy')
    setSerperHealth(providerSettings.serper?.verified ? 'connected' : 'idle')
    setSerperHealthMessage(
      providerSettings.serper?.verified
        ? 'Serper connected · live SERP research ready'
        : providerSettings.serper?.maskedKey
          ? 'Saved settings are not verified in this session'
          : 'Add a Serper API key, then verify'
    )
  }, [
    providerSettings.serper?.country,
    providerSettings.serper?.language,
    providerSettings.serper?.maskedKey,
    providerSettings.serper?.testQuery,
    providerSettings.serper?.verified,
  ])

  useEffect(() => {
    setMetaAccountIdInput(providerSettings.meta?.adAccountId || '')
    setMetaPrimaryMarketInput(providerSettings.meta?.primaryMarket || 'JO')
    setMetaHealth(providerSettings.meta?.verified ? 'connected' : 'idle')
    setMetaHealthMessage(
      providerSettings.meta?.verified
        ? `Meta Ads connected · ${providerSettings.meta?.primaryMarket || 'JO'} benchmark market`
        : providerSettings.meta?.maskedToken
          ? 'Saved token is not verified in this session'
          : 'Meta access token not verified yet'
    )
  }, [
    providerSettings.meta?.adAccountId,
    providerSettings.meta?.maskedToken,
    providerSettings.meta?.primaryMarket,
    providerSettings.meta?.verified,
  ])

  useEffect(() => {
    setGoogleClientIdInput(providerSettings.google?.clientId || '')
    setGoogleRedirectUri(
      providerSettings.google?.redirectUri ||
        (typeof window !== 'undefined' ? `${window.location.origin}/api/auth/google/callback` : '')
    )
    const googleAccountConnected = oauthConnections.google_analytics
    setGoogleOAuthHealth(providerSettings.google?.verified || googleAccountConnected ? 'connected' : 'idle')
    setGoogleOAuthHealthMessage(
      googleAccountConnected
        ? 'Google account connected · Analytics, Docs, Sheets, and Drive are ready'
        : providerSettings.google?.verified
        ? 'Google OAuth app connected · ready for Analytics, Docs, Sheets, and Drive'
        : providerSettings.google?.maskedClientSecret
          ? 'Saved Google OAuth settings are not verified in this session'
          : 'Add your OAuth Web App Client ID and Client Secret, then verify'
    )
  }, [
    providerSettings.google?.clientId,
    providerSettings.google?.maskedClientSecret,
    providerSettings.google?.redirectUri,
    providerSettings.google?.verified,
    oauthConnections.google_analytics,
  ])

  useEffect(() => {
    const loadStatus = async () => {
      const token = await getAuthToken()
      const response = await fetch('/api/state', {
        cache: 'no-store',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      return response.ok ? response.json() : null
    }

    loadStatus()
      .then((payload) => {
        if (payload?.connected) {
          setDbStatus('connected')
          setDbUpdatedAt(payload.updatedAt || null)
        } else if (payload?.browserConfigured) {
          setDbStatus('client-only')
        } else {
          setDbStatus('not-configured')
        }
      })
      .catch(() => {
        setDbStatus('error')
      })
  }, [])

  useEffect(() => {
    const loadProviderSettings = async () => {
      const token = await getAuthToken()
      if (!token) return
      const response = await fetch('/api/providers/settings', {
        cache: 'no-store',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!response.ok) return
      const payload = await response.json().catch(() => null)
      if (payload?.providerSettings) {
        hydrateAppState({ providerSettings: payload.providerSettings } as any)
      }
    }

    loadProviderSettings().catch(() => {})
  }, [hydrateAppState])

  const modelOptions = useMemo(
    () => getProviderModels(agencySettings.defaultProvider).map((option) => ({ value: option.id, label: option.label })),
    [agencySettings.defaultProvider]
  )

  // Sort models from most capable to least capable based on param count + tier keywords
  const sortModelsByCapability = (models: string[]): string[] => {
    const score = (name: string): number => {
      const lower = name.toLowerCase()
      const m = lower.match(/[:\-](\d+(?:\.\d+)?)b(?:\b|$)/)
      const billions = m ? parseFloat(m[1]) : 0
      let tierBonus = 0
      if (/-next\b/.test(lower)) tierBonus = 900
      else if (/-ultra\b/.test(lower)) tierBonus = 800
      else if (/-pro\b/.test(lower)) tierBonus = 700
      else if (/-large\b/.test(lower)) tierBonus = 300
      else if (/-flash\b/.test(lower)) tierBonus = 200
      else if (/-mini\b/.test(lower)) tierBonus = -200
      else if (/-small\b/.test(lower)) tierBonus = -200
      else if (/-nano\b/.test(lower)) tierBonus = -300
      return billions * 10 + tierBonus
    }
    return [...models].sort((a, b) => score(b) - score(a) || a.localeCompare(b))
  }

  // Save model selection for a provider to provider-secrets
  const saveModelSelection = async (provider: 'ollama' | 'anthropic' | 'openai', model: string) => {
    const token = await getAuthToken()
    if (!token) return
    const nextProviderSettings = {
      ...providerSettings,
      [provider]: { ...providerSettings[provider], model },
    }
    await fetch('/api/providers/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ providerSettings: nextProviderSettings }),
    })
  }

  const verifyOllama = async () => {
    setIsVerifyingOllama(true)
    try {
      const token = await getAuthToken()
      const response = await fetch('/api/providers/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({
          provider: 'ollama',
          baseUrl: providerSettings.ollama.baseUrl,
          apiKey: providerSettings.ollama.apiKey || '',
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Verification failed')
      const returnedModels: string[] = data.models || []
      // Preserve user's current model selection if it exists in the new model list
      const currentModel = providerSettings.ollama.model || ''
      const selectedModel = currentModel && returnedModels.includes(currentModel)
        ? currentModel
        : (returnedModels[0] || currentModel)
      const nextOllamaSettings = {
        verified: true,
        verifiedAt: new Date().toISOString(),
        enabled: true,
        availableModels: sortModelsByCapability(returnedModels),
        model: selectedModel,
      }
      updateProviderSettings('ollama', nextOllamaSettings)
      const nextProviderSettings = {
        ...providerSettings,
        ollama: {
          ...providerSettings.ollama,
          ...nextOllamaSettings,
        },
      }
      const saveResponse = await fetch('/api/providers/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ providerSettings: nextProviderSettings }),
      })
      if (!saveResponse.ok) {
        const savePayload = await saveResponse.json().catch(() => null)
        throw new Error(savePayload?.error || 'Ollama verified, but settings could not be persisted.')
      }
      toast.success(`Ollama connected${data.models?.length ? ` · ${data.models.length} model(s)` : ''} and saved`)
    } catch (error: any) {
      updateProviderSettings('ollama', { verified: false })
      toast.error(error.message || 'Could not verify Ollama')
    } finally {
      setIsVerifyingOllama(false)
    }
  }

  const verifyGemini = async () => {
    if (!geminiKeyInput.trim()) {
      toast.error('Paste a Gemini API key first')
      return
    }
    setIsVerifyingGemini(true)
    setGeminiHealth('testing')
    setGeminiHealthMessage('Testing Gemini connection…')
    try {
      const token = await getAuthToken()
      const response = await fetch('/api/providers/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ provider: 'gemini', apiKey: geminiKeyInput.trim() }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Verification failed')
      const nextGeminiSettings = {
        enabled: true,
        verified: true,
        verifiedAt: new Date().toISOString(),
        availableModels: data.models || [],
        model: data.models?.find((item: string) => item.includes('2.5-flash')) || data.models?.[0] || providerSettings.gemini.model,
      }
      saveGeminiKey(geminiKeyInput.trim())
      updateProviderSettings('gemini', nextGeminiSettings)
      const nextProviderSettings = {
        ...providerSettings,
        gemini: {
          ...providerSettings.gemini,
          ...nextGeminiSettings,
          apiKey: geminiKeyInput.trim(),
          maskedKey: `${geminiKeyInput.trim().slice(0, 4)}...${geminiKeyInput.trim().slice(-4)}`,
        },
      }
      const saveResponse = await fetch('/api/providers/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ providerSettings: nextProviderSettings }),
      })
      if (!saveResponse.ok) {
        const savePayload = await saveResponse.json().catch(() => null)
        throw new Error(savePayload?.error || 'Gemini verified, but provider settings could not be persisted.')
      }
      setGeminiHealth('connected')
      setGeminiHealthMessage(data.sample ? `Gemini connected · "${data.sample}"` : `Gemini connected · ${data.testModel || data.models?.[0] || 'API responding'}`)
      setGeminiKeyInput('')
      toast.success('Gemini verified and saved to your user profile')
    } catch (error: any) {
      updateProviderSettings('gemini', { verified: false })
      setGeminiHealth('invalid')
      setGeminiHealthMessage(error.message || 'Gemini verification failed')
      toast.error(error.message || 'Could not verify Gemini')
    } finally {
      setIsVerifyingGemini(false)
    }
  }

  const verifyAnthropic = async () => {
    if (!anthropicKeyInput.trim()) {
      toast.error('Paste an Anthropic API key first')
      return
    }
    setIsVerifyingAnthropic(true)
    setAnthropicHealth('testing')
    setAnthropicHealthMessage('Testing Anthropic connection…')
    try {
      const token = await getAuthToken()
      const response = await fetch('/api/providers/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ provider: 'anthropic', apiKey: anthropicKeyInput.trim() }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Verification failed')
      const nextSettings = {
        enabled: true,
        verified: true,
        verifiedAt: new Date().toISOString(),
        availableModels: data.models || providerSettings.anthropic?.availableModels || [],
        model: providerSettings.anthropic?.model || data.models?.[0] || 'claude-sonnet-4-5',
      }
      updateProviderSettings('anthropic', nextSettings)
      const nextProviderSettings = {
        ...providerSettings,
        anthropic: {
          ...providerSettings.anthropic,
          ...nextSettings,
          apiKey: anthropicKeyInput.trim(),
          maskedKey: `${anthropicKeyInput.trim().slice(0, 6)}...${anthropicKeyInput.trim().slice(-4)}`,
        },
      }
      const saveResponse = await fetch('/api/providers/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ providerSettings: nextProviderSettings }),
      })
      if (!saveResponse.ok) {
        const savePayload = await saveResponse.json().catch(() => null)
        throw new Error(savePayload?.error || 'Anthropic verified, but settings could not be persisted.')
      }
      setAnthropicHealth('connected')
      setAnthropicHealthMessage(`Anthropic connected · ${nextSettings.model}`)
      setAnthropicKeyInput('')
      toast.success('Anthropic verified and saved')
    } catch (error: any) {
      updateProviderSettings('anthropic', { verified: false })
      setAnthropicHealth('invalid')
      setAnthropicHealthMessage(error.message || 'Anthropic verification failed')
      toast.error(error.message || 'Could not verify Anthropic')
    } finally {
      setIsVerifyingAnthropic(false)
    }
  }

  const verifyOpenAi = async () => {
    if (!openAiKeyInput.trim()) {
      toast.error('Paste an OpenAI API key first')
      return
    }
    setIsVerifyingOpenAi(true)
    setOpenAiHealth('testing')
    setOpenAiHealthMessage('Testing OpenAI connection…')
    try {
      const token = await getAuthToken()
      const response = await fetch('/api/providers/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({
          provider: 'openai',
          apiKey: openAiKeyInput.trim(),
          baseUrl: providerSettings.openai?.baseUrl || 'https://api.openai.com',
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Verification failed')
      const nextSettings = {
        enabled: true,
        verified: true,
        verifiedAt: new Date().toISOString(),
        availableModels: data.models?.length ? data.models : (providerSettings.openai?.availableModels || ['gpt-4o', 'gpt-4o-mini']),
        model: providerSettings.openai?.model || data.models?.[0] || 'gpt-4o',
      }
      updateProviderSettings('openai', nextSettings)
      const nextProviderSettings = {
        ...providerSettings,
        openai: {
          ...providerSettings.openai,
          ...nextSettings,
          apiKey: openAiKeyInput.trim(),
          maskedKey: `${openAiKeyInput.trim().slice(0, 6)}...${openAiKeyInput.trim().slice(-4)}`,
        },
      }
      const saveResponse = await fetch('/api/providers/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ providerSettings: nextProviderSettings }),
      })
      if (!saveResponse.ok) {
        const savePayload = await saveResponse.json().catch(() => null)
        throw new Error(savePayload?.error || 'OpenAI verified, but settings could not be persisted.')
      }
      setOpenAiHealth('connected')
      setOpenAiHealthMessage(`OpenAI connected · ${nextSettings.model}`)
      setOpenAiKeyInput('')
      toast.success('OpenAI verified and saved')
    } catch (error: any) {
      updateProviderSettings('openai', { verified: false })
      setOpenAiHealth('invalid')
      setOpenAiHealthMessage(error.message || 'OpenAI verification failed')
      toast.error(error.message || 'Could not verify OpenAI')
    } finally {
      setIsVerifyingOpenAi(false)
    }
  }

  const saveMeta = async () => {
    const token = metaTokenInput.trim()
    const accountId = metaAccountIdInput.trim()
    const primaryMarket = metaPrimaryMarketInput || providerSettings.meta?.primaryMarket || 'JO'
    if (!token && !providerSettings.meta?.maskedToken) {
      toast.error('Paste a Meta access token first')
      return
    }
    setIsVerifyingMeta(true)
    setMetaHealth('testing')
    setMetaHealthMessage(token ? 'Verifying Meta token…' : 'Saving Meta preferences…')
    try {
      const authToken = await getAuthToken()
      let accounts: { id: string; name: string }[] = []
      if (token) {
        const verifyRes = await fetch('/api/providers/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}) },
          body: JSON.stringify({ provider: 'meta', accessToken: token }),
        })
        const verifyData = await verifyRes.json().catch(() => null)
        if (!verifyRes.ok || !verifyData?.ok) {
          throw new Error(verifyData?.error || 'Invalid Meta access token')
        }
        accounts = verifyData.accounts || []
      }
      setMetaDiscoveredAccounts(accounts)
      // Auto-select first account if nothing set yet
      const defaultAccountId = accountId || providerSettings.meta?.adAccountId || accounts[0]?.id || ''
      if (defaultAccountId && !metaAccountIdInput) setMetaAccountIdInput(defaultAccountId)
      const maskedToken = token
        ? `${token.slice(0, 6)}…${token.slice(-4)}`
        : providerSettings.meta?.maskedToken || ''
      const nextMeta = {
        enabled: true,
        verified: true,
        verifiedAt: new Date().toISOString(),
        accessToken: token || providerSettings.meta?.accessToken || '',
        maskedToken,
        adAccountId: defaultAccountId,
        businessId: providerSettings.meta?.businessId || '',
        primaryMarket,
      }
      updateProviderSettings('meta' as any, nextMeta)
      const nextSettings = { ...providerSettings, meta: nextMeta }
      const saveRes = await fetch('/api/providers/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}) },
        body: JSON.stringify({ providerSettings: nextSettings }),
      })
      if (!saveRes.ok) throw new Error('Token verified but settings could not be saved')
      setMetaHealth('connected')
      setMetaHealthMessage(
        token
          ? `Meta connected · ${accounts.length} ad account(s) found · ${primaryMarket} benchmark market`
          : `Meta preferences saved · ${primaryMarket} benchmark market`
      )
      setMetaTokenInput('')
      toast.success(token ? `Meta Ads connected · ${accounts.length} account(s) available` : 'Meta Ads preferences saved')
    } catch (err: any) {
      setMetaHealth('invalid')
      setMetaHealthMessage(err.message || 'Meta verification failed')
      toast.error(err.message || 'Could not verify Meta token')
    } finally {
      setIsVerifyingMeta(false)
    }
  }

  const saveHiggsfield = async () => {
    const key = higgsKeyInput.trim()
    if (!key && !providerSettings.higgsfield?.apiKey) {
      toast.error('Paste a Higgsfield API key first')
      return
    }
    setIsVerifyingHiggs(true)
    setHiggsHealth('testing')
    setHiggsHealthMessage('Verifying Higgsfield key…')
    try {
      const authToken = await getAuthToken()
      // Verify by listing workspaces
      const verifyRes = await fetch('https://api.higgsfield.ai/v1/workspaces', {
        headers: { Authorization: `Bearer ${key || providerSettings.higgsfield?.apiKey}` },
      })
      // Accept 200 or 401 (we get 401 only on truly invalid keys; 403 means valid key but no permission)
      if (verifyRes.status === 401) {
        throw new Error('Invalid Higgsfield API key')
      }
      const maskedKey = key ? `${key.slice(0, 6)}…${key.slice(-4)}` : providerSettings.higgsfield?.maskedKey || ''
      const nextHiggs = {
        enabled: true,
        verified: true,
        verifiedAt: new Date().toISOString(),
        apiKey: key || providerSettings.higgsfield?.apiKey || '',
        maskedKey,
        workspaceId: providerSettings.higgsfield?.workspaceId || '',
      }
      updateProviderSettings('higgsfield' as any, nextHiggs)
      const nextSettings = { ...providerSettings, higgsfield: nextHiggs }
      const saveRes = await fetch('/api/providers/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}) },
        body: JSON.stringify({ providerSettings: nextSettings }),
      })
      if (!saveRes.ok) throw new Error('Key verified but settings could not be saved')
      setHiggsHealth('connected')
      setHiggsHealthMessage('Higgsfield connected · Video generation ready')
      setHiggsKeyInput('')
      toast.success('Higgsfield connected and saved')
    } catch (err: any) {
      setHiggsHealth('invalid')
      setHiggsHealthMessage(err.message || 'Higgsfield verification failed')
      toast.error(err.message || 'Could not verify Higgsfield key')
    } finally {
      setIsVerifyingHiggs(false)
    }
  }

  const saveSerper = async () => {
    const key = serperKeyInput.trim()
    const country = serperCountryInput.trim().toLowerCase() || 'us'
    const language = serperLanguageInput.trim().toLowerCase() || 'en'
    const testQuery = serperTestQueryInput.trim() || 'content marketing strategy'
    if (!key && !providerSettings.serper?.apiKey) {
      toast.error('Paste a Serper API key first')
      return
    }

    setIsVerifyingSerper(true)
    setSerperHealth('testing')
    setSerperHealthMessage('Running a live Serper search test…')
    try {
      const authToken = await getAuthToken()
      const response = await fetch('/api/providers/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}) },
        body: JSON.stringify({
          provider: 'serper',
          apiKey: key || providerSettings.serper?.apiKey || '',
          country,
          language,
          resultCount: providerSettings.serper?.resultCount || 10,
          testQuery,
        }),
      })
      const data = await response.json().catch(() => null)
      if (!response.ok) throw new Error(data?.error || 'Serper verification failed')

      const nextSerper = {
        enabled: true,
        verified: true,
        verifiedAt: new Date().toISOString(),
        apiKey: key || providerSettings.serper?.apiKey || '',
        maskedKey: key ? `${key.slice(0, 6)}...${key.slice(-4)}` : providerSettings.serper?.maskedKey || '',
        country,
        language,
        resultCount: providerSettings.serper?.resultCount || 10,
        testQuery,
      }
      updateProviderSettings('serper', nextSerper)
      const nextSettings = { ...providerSettings, serper: nextSerper }
      const saveRes = await fetch('/api/providers/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}) },
        body: JSON.stringify({ providerSettings: nextSettings }),
      })
      if (!saveRes.ok) throw new Error('Serper verified but settings could not be saved')
      setSerperHealth('connected')
      setSerperHealthMessage(
        data?.sampleTitle
          ? `Connected · sample result: ${data.sampleTitle}`
          : `Connected · ${data?.totalResults ?? 0} result(s) available for the test query`
      )
      setSerperKeyInput('')
      toast.success('Serper verified and saved')
    } catch (err: any) {
      updateProviderSettings('serper', { verified: false })
      setSerperHealth('invalid')
      setSerperHealthMessage(err.message || 'Serper verification failed')
      toast.error(err.message || 'Could not verify Serper')
    } finally {
      setIsVerifyingSerper(false)
    }
  }

  const saveGoogleOAuth = async () => {
    const clientId = googleClientIdInput.trim()
    const clientSecret = googleClientSecretInput.trim()
    const existingSecret = providerSettings.google?.maskedClientSecret
    const redirectUri = googleRedirectUri || (typeof window !== 'undefined' ? `${window.location.origin}/api/auth/google/callback` : '')

    if (!clientId) {
      toast.error('Paste the Google OAuth Client ID first')
      return
    }
    if (!clientSecret && !existingSecret) {
      toast.error('Paste the Google OAuth Client Secret first')
      return
    }

    setIsVerifyingGoogleOAuth(true)
    setGoogleOAuthHealth('testing')
    setGoogleOAuthHealthMessage('Checking Google OAuth app settings…')
    try {
      const authToken = await getAuthToken()
      const verifyRes = await fetch('/api/providers/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}) },
        body: JSON.stringify({
          provider: 'google-oauth',
          clientId,
          clientSecret: clientSecret || providerSettings.google?.clientSecret || '',
          redirectUri,
        }),
      })
      const verifyData = await verifyRes.json().catch(() => null)
      if (!verifyRes.ok || !verifyData?.ok) {
        throw new Error(verifyData?.error || 'Google OAuth validation failed')
      }

      const nextGoogle = {
        enabled: true,
        verified: true,
        verifiedAt: new Date().toISOString(),
        clientId,
        clientSecret: clientSecret || providerSettings.google?.clientSecret || '',
        maskedClientSecret: clientSecret
          ? `${clientSecret.slice(0, 6)}...${clientSecret.slice(-4)}`
          : providerSettings.google?.maskedClientSecret || '',
        redirectUri,
      }
      updateProviderSettings('google', nextGoogle as any)
      const nextSettings = { ...providerSettings, google: nextGoogle }
      const saveRes = await fetch('/api/providers/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}) },
        body: JSON.stringify({ providerSettings: nextSettings }),
      })
      if (!saveRes.ok) throw new Error('Google OAuth verified but settings could not be saved')
      setGoogleOAuthHealth('connected')
      setGoogleOAuthHealthMessage('Google OAuth app connected · you can now connect your Google account')
      setGoogleClientSecretInput('')
      toast.success('Google OAuth app settings verified and saved')
    } catch (err: any) {
      updateProviderSettings('google', { verified: false } as any)
      setGoogleOAuthHealth('invalid')
      setGoogleOAuthHealthMessage(err.message || 'Google OAuth validation failed')
      toast.error(err.message || 'Could not verify Google OAuth settings')
    } finally {
      setIsVerifyingGoogleOAuth(false)
    }
  }

  const verifyVisualGeneration = async () => {
    const geminiKey = providerSettings.gemini.apiKey || geminiKeyInput.trim()
    if (!geminiKey) {
      toast.error('Save and verify a Gemini API key first')
      return
    }

    setIsVerifyingVisual(true)
    setVisualHealth('testing')
    setVisualHealthMessage('Testing branded image generation…')
    try {
      const token = await getAuthToken()
      const response = await fetch('/api/providers/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({
          provider: 'gemini-image',
          apiKey: geminiKey,
          model: providerSettings.visual.model,
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Visual verification failed')

      const nextVisualSettings = {
        enabled: true,
        verified: true,
        verifiedAt: new Date().toISOString(),
      }

      updateProviderSettings('visual', nextVisualSettings)
      const nextProviderSettings = {
        ...providerSettings,
        gemini: {
          ...providerSettings.gemini,
          apiKey: geminiKey,
          maskedKey: providerSettings.gemini.maskedKey || `${geminiKey.slice(0, 4)}...${geminiKey.slice(-4)}`,
        },
        visual: {
          ...providerSettings.visual,
          ...nextVisualSettings,
        },
      }
      const saveResponse = await fetch('/api/providers/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ providerSettings: nextProviderSettings }),
      })
      if (!saveResponse.ok) {
        const payload = await saveResponse.json().catch(() => null)
        throw new Error(payload?.error || 'Visual settings could not be saved.')
      }
      setVisualHealth('connected')
      setVisualHealthMessage(`Visual generation connected · ${data.model || providerSettings.visual.model}`)
      toast.success('Branded image generation verified and saved')
    } catch (error: any) {
      updateProviderSettings('visual', { verified: false })
      setVisualHealth('invalid')
      setVisualHealthMessage(error.message || 'Visual verification failed')
      toast.error(error.message || 'Could not verify visual generation')
    } finally {
      setIsVerifyingVisual(false)
    }
  }

  useEffect(() => {
    if (!geminiKeyInput.trim() || geminiKeyInput.trim().length < 20 || providerSettings.gemini.verified) return

    const timer = setTimeout(() => {
      verifyGemini()
    }, 900)

    return () => clearTimeout(timer)
  }, [geminiKeyInput])

  const handleExport = () => {
    const data = {
      version: '2.0',
      exported: new Date().toISOString(),
      agents,
      campaigns,
      clients,
      missions,
      artifacts,
      agencySettings,
      providerSettings,
      agentMemories,
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `mission-control-config-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Configuration exported')
  }

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string)
        hydrateAppState(data)
        toast.success(`Imported ${data.agents?.length || 0} agents and ${data.missions?.length || 0} missions`)
      } catch {
        toast.error('Invalid config file')
      }
    }
    reader.readAsText(file)
  }

  const resetLocalBrowserState = () => {
    try {
      window.localStorage.removeItem('moes-mission-control')
      toast.success('Local browser state cleared. Reloading fresh shared data…')
      window.location.href = `/dashboard?refresh=${Date.now()}`
    } catch {
      toast.error('Could not clear local browser state')
    }
  }

  return (
    <ClientShell>
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-border flex-shrink-0">
          <div>
            <h1 className="text-xl font-heading font-bold text-text-primary flex items-center gap-2">
              <Settings size={20} className="text-text-secondary" />
              Settings
            </h1>
            <p className="text-xs text-text-secondary mt-0.5">Workspace defaults, providers, and presentation mode</p>
          </div>
          {/* Build version chip so the user can confirm which build they're testing. */}
          <BuildVersionBadge />
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-4xl space-y-6">
            <Card>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-sm font-heading font-semibold text-text-primary">Internal Tools</h2>
                  <p className="text-xs text-text-secondary mt-1">Admin-only utilities that are useful for testing and manual operations, but don’t need to live in the main navigation.</p>
                </div>
                <Link href="/pipeline/run">
                  <Button variant="secondary" className="gap-2">
                    Open Runner
                  </Button>
                </Link>
              </div>
            </Card>

            <Card>
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <h2 className="text-sm font-heading font-semibold text-text-primary">Serper Search</h2>
                  <p className="text-xs text-text-secondary mt-1">
                    Per-user live Google SERP research through Serper.dev for blog writing, SEO planning, and content-gap discovery.
                  </p>
                </div>
                <Badge
                  color={serperHealth === 'connected' ? '#00d4aa' : serperHealth === 'invalid' ? '#ff5b7f' : '#8b92a8'}
                  variant="outline"
                >
                  {serperHealth === 'connected' ? 'Verified' : serperHealth === 'testing' ? 'Testing' : 'Not verified'}
                </Badge>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Input
                  label="Serper API Key"
                  type="password"
                  value={serperKeyInput}
                  placeholder={providerSettings.serper?.maskedKey || 'Serper API key'}
                  onChange={(e) => {
                    setSerperKeyInput(e.target.value)
                    updateProviderSettings('serper', {
                      ...(providerSettings.serper || {}),
                      verified: false,
                    } as any)
                  }}
                />
                <Input
                  label="Country"
                  value={serperCountryInput}
                  placeholder="us"
                  onChange={(e) => {
                    setSerperCountryInput(e.target.value)
                    updateProviderSettings('serper', {
                      ...(providerSettings.serper || {}),
                      country: e.target.value,
                      verified: false,
                    } as any)
                  }}
                />
                <Input
                  label="Language"
                  value={serperLanguageInput}
                  placeholder="en"
                  onChange={(e) => {
                    setSerperLanguageInput(e.target.value)
                    updateProviderSettings('serper', {
                      ...(providerSettings.serper || {}),
                      language: e.target.value,
                      verified: false,
                    } as any)
                  }}
                />
                <Input
                  label="Test Query"
                  value={serperTestQueryInput}
                  placeholder="content marketing strategy"
                  onChange={(e) => {
                    setSerperTestQueryInput(e.target.value)
                    updateProviderSettings('serper', {
                      ...(providerSettings.serper || {}),
                      testQuery: e.target.value,
                      verified: false,
                    } as any)
                  }}
                />
              </div>

              <div className="mt-4 grid lg:grid-cols-[1fr_auto] gap-3 items-end">
                <div className="rounded-xl border border-border bg-base px-3 py-2">
                  <p className="text-[11px] font-mono uppercase text-text-dim">Status</p>
                  <p className="mt-1 text-sm text-text-primary">{serperHealthMessage}</p>
                  <p className="mt-1 text-xs text-text-secondary">
                    Iris uses this only after a successful live validation. The real key is stored server-side and never returned to the browser.
                  </p>
                </div>
                <Button variant="secondary" onClick={saveSerper} disabled={isVerifyingSerper}>
                  <RefreshCcw size={14} />
                  {isVerifyingSerper ? 'Checking...' : 'Save & Verify'}
                </Button>
              </div>
            </Card>

            <Card>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-sm font-heading font-semibold text-text-primary">Shared Persistence</h2>
                  <p className="text-xs text-text-secondary mt-1">
                    Workspace database keeps tasks, outputs, and clients in sync across browsers and team members.
                  </p>
                </div>
                <span className={`text-[11px] font-mono ${
                  dbStatus === 'connected'
                    ? 'text-accent-cyan'
                    : dbStatus === 'client-only'
                    ? 'text-amber-400'
                    : dbStatus === 'not-configured'
                    ? 'text-text-dim'
                    : 'text-red-400'
                }`}>
                  {dbStatus === 'checking'
                    ? 'Checking…'
                    : dbStatus === 'connected'
                    ? 'Connected'
                    : dbStatus === 'client-only'
                    ? 'Client Only'
                    : dbStatus === 'not-configured'
                    ? 'Not Configured'
                    : 'Error'}
                </span>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="rounded-xl border border-border bg-base p-4">
                  <p className="text-xs font-mono text-text-dim uppercase mb-1">Backend status</p>
                  <p className="text-sm text-text-primary">
                    {dbStatus === 'connected'
                      ? 'Shared workspace database is connected.'
                      : dbStatus === 'client-only'
                      ? 'Local browser state only — server sync is unavailable.'
                      : 'DATABASE_URL is not configured; the workspace is running in local-only mode.'}
                  </p>
                </div>
                <div className="rounded-xl border border-border bg-base p-4">
                  <p className="text-xs font-mono text-text-dim uppercase mb-1">Last remote update</p>
                  <p className="text-sm text-text-primary">{dbUpdatedAt ? new Date(dbUpdatedAt).toLocaleString() : 'No remote state yet'}</p>
                </div>
              </div>
              <p className="mt-4 text-[11px] text-text-dim">
                Required env var: <code>DATABASE_URL</code> (PostgreSQL connection string).
              </p>
              <div className="mt-4 rounded-xl border border-border bg-base p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-xs font-mono text-text-dim uppercase mb-1">Local recovery</p>
                  <p className="text-sm text-text-primary">
                    If a browser gets stuck on stale cached state, clear only this device&apos;s local Mission Control cache and reload from the shared workspace database.
                  </p>
                </div>
                <Button variant="secondary" onClick={resetLocalBrowserState} className="gap-2">
                  <RefreshCcw size={16} />
                  Reset Local Browser State
                </Button>
              </div>
            </Card>

            <Card>
              <h2 className="text-sm font-heading font-semibold text-text-primary mb-4">Agency Profile</h2>
              <div className="grid md:grid-cols-2 gap-4">
                <Input
                  label="Agency Name"
                  value={agencySettings.agencyName}
                  onChange={(e) => updateAgencySettings({ agencyName: e.target.value })}
                />
                <Select
                  label="Theme Mode"
                  options={[
                    { value: 'dark', label: 'Dark Command Center' },
                    { value: 'light', label: 'Light Studio Mode' },
                  ]}
                  value={agencySettings.themeMode}
                  onChange={(e) => updateAgencySettings({ themeMode: e.target.value as ThemeMode })}
                />
                <Select
                  label="Default Provider"
                  options={PROVIDER_OPTIONS}
                  value={agencySettings.defaultProvider}
                  onChange={(e) =>
                    updateAgencySettings({
                      defaultProvider: e.target.value as typeof agencySettings.defaultProvider,
                      defaultModel: getProviderModels(e.target.value as typeof agencySettings.defaultProvider)[0]?.id || agencySettings.defaultModel,
                    })
                  }
                />
                <Select
                  label="Default Model"
                  options={modelOptions}
                  value={agencySettings.defaultModel}
                  onChange={(e) => updateAgencySettings({ defaultModel: e.target.value as typeof agencySettings.defaultModel })}
                />
              </div>
            </Card>

            <PasswordChangeCard />

            <Card>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-sm font-heading font-semibold text-text-primary">Provider Connections</h2>
                  <p className="text-xs text-text-secondary mt-1">Each user keeps their own Ollama and Gemini runtime settings.</p>
                </div>
                <span className="text-[11px] font-mono text-text-dim">
                  {[providerSettings.ollama, providerSettings.gemini, providerSettings.anthropic, providerSettings.openai].filter((s) => s?.verified).length} verified
                </span>
              </div>

              <div className="mb-4 grid md:grid-cols-3 gap-4">
                <Select
                  label="Runtime Mode"
                  options={[
                    { value: 'fast', label: 'Fast' },
                    { value: 'thinking', label: 'Thinking' },
                    { value: 'compare', label: 'Compare Drafts' },
                  ]}
                  value={providerSettings.routing.runtimeMode}
                  onChange={(e) =>
                    updateProviderSettings('routing', {
                      runtimeMode: e.target.value as typeof providerSettings.routing.runtimeMode,
                    })
                  }
                />
                <Select
                  label="Primary Runtime"
                  options={PROVIDER_OPTIONS}
                  value={providerSettings.routing.primaryProvider}
                  onChange={(e) =>
                    updateProviderSettings('routing', {
                      primaryProvider: e.target.value as typeof providerSettings.routing.primaryProvider,
                    })
                  }
                />
                <Select
                  label="Fallback Runtime"
                  options={[
                    { value: 'ollama', label: 'Ollama' },
                    { value: 'gemini', label: 'Google Gemini' },
                    { value: 'anthropic', label: 'Anthropic Claude' },
                    { value: 'openai', label: 'OpenAI' },
                    { value: 'none', label: 'No fallback' },
                  ]}
                  value={providerSettings.routing.fallbackProvider}
                  onChange={(e) =>
                    updateProviderSettings('routing', {
                      fallbackProvider: e.target.value as ProviderFallback,
                    })
                  }
                />
                <label className="rounded-2xl border border-border bg-base/60 px-4 py-3 flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={providerSettings.routing.useGeminiForThinking}
                    onChange={(e) =>
                      updateProviderSettings('routing', {
                        useGeminiForThinking: e.target.checked,
                      })
                    }
                  />
                  <div>
                    <p className="text-sm text-text-primary">Use Gemini for thinking tasks</p>
                    <p className="text-[11px] text-text-secondary">Strategy, research, SEO, and heavier reasoning can prefer Gemini automatically.</p>
                  </div>
                </label>
              </div>

                <div className="mb-4 rounded-xl border border-border bg-base p-4">
                  <p className="text-xs font-mono text-text-dim uppercase mb-1">User Runtime Profile</p>
                  <p className="text-sm text-text-primary">
                    {currentUser?.email || 'Current user'} uses <strong>{providerSettings.routing.primaryProvider}</strong> as the main runtime
                  {providerSettings.routing.fallbackProvider !== 'none' ? (
                    <> with <strong>{providerSettings.routing.fallbackProvider}</strong> as fallback.</>
                  ) : (
                    <> with no fallback enabled.</>
                  )}
                </p>
                <p className="text-[11px] text-text-secondary mt-1">
                  Mode: <strong>{providerSettings.routing.runtimeMode}</strong>. Ollama should run locally on each user computer. Gemini only becomes active after a valid key is saved and verified.
                </p>
              </div>

              <div className="grid lg:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl border border-border bg-base/60 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-medium text-text-primary">Ollama</h3>
                      <p className="text-xs text-text-secondary">Local or self-hosted AI runtime. Each user can configure their own Ollama endpoint.</p>
                    </div>
                    <span className={`text-[11px] font-mono ${providerSettings.ollama.verified ? 'text-accent-cyan' : 'text-text-dim'}`}>
                      {providerSettings.ollama.verified ? 'Verified' : 'Unverified'}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <Input
                      label="Ollama Base URL"
                      value={providerSettings.ollama.baseUrl}
                      onChange={(e) => updateProviderSettings('ollama', { baseUrl: e.target.value, verified: false })}
                      placeholder="http://localhost:11434"
                    />
                    <p className="text-[11px] text-text-dim leading-relaxed">
                      Running on a <strong>VPS/server?</strong> Install Ollama on your server and the app will reach it automatically. Or point to any publicly accessible Ollama instance (e.g. <code className="bg-surface px-1 rounded">http://your-server-ip:11434</code>).
                    </p>
                  </div>
                  <div className="space-y-1">
                    <Input
                      label="API Key (Ollama Cloud)"
                      type="password"
                      placeholder={providerSettings.ollama.maskedKey || 'Optional — for paid Ollama cloud accounts'}
                      value={providerSettings.ollama.apiKey || ''}
                      onChange={(e) => updateProviderSettings('ollama', { apiKey: e.target.value, maskedKey: e.target.value ? `${e.target.value.slice(0, 4)}...${e.target.value.slice(-4)}` : '', verified: false })}
                    />
                    <p className="text-[11px] text-text-dim">Leave blank for local Ollama. Required for Ollama Cloud paid accounts (sends <code className="bg-surface px-1 rounded">Authorization: Bearer &lt;key&gt;</code>).</p>
                  </div>
                  <Input
                    label="Context Window Override"
                    type="number"
                    min="2048"
                    step="1024"
                    placeholder="Model default"
                    value={providerSettings.ollama.contextWindow ? String(providerSettings.ollama.contextWindow) : ''}
                    onChange={(e) =>
                      updateProviderSettings('ollama', {
                        contextWindow: e.target.value ? Math.max(2048, Number(e.target.value)) : undefined,
                      })
                    }
                  />
                  {providerSettings.ollama.model ? (
                    <p className="text-[11px] text-text-secondary">Active model: <strong>{providerSettings.ollama.model}</strong></p>
                  ) : null}
                  {providerSettings.ollama.availableModels?.length ? (
                    <div className="flex flex-wrap gap-1">
                      {sortModelsByCapability(providerSettings.ollama.availableModels).map((m) => (
                        <button
                          key={m}
                          onClick={() => {
                            updateProviderSettings('ollama', { model: m })
                            saveModelSelection('ollama', m)
                            toast.success(`Active model set to ${m}`)
                          }}
                          className={`text-[11px] px-2 py-0.5 rounded-full border transition-colors ${
                            providerSettings.ollama.model === m
                              ? 'border-accent-cyan text-accent-cyan bg-accent-cyan/10'
                              : 'border-border text-text-dim hover:border-text-secondary'
                          }`}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                  ) : null}
                  <Button variant="secondary" onClick={verifyOllama} disabled={isVerifyingOllama}>
                    <RefreshCcw size={14} />
                    {isVerifyingOllama ? 'Checking…' : 'Verify & Fetch Models'}
                  </Button>
                </div>

                <div className="p-4 rounded-2xl border border-border bg-base/60 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-medium text-text-primary">Gemini</h3>
                      <p className="text-xs text-text-secondary">Fallback and thinking runtime for strategy, research, and heavier reasoning tasks.</p>
                    </div>
                    <span className={`text-[11px] font-mono ${geminiHealth === 'connected' ? 'text-accent-cyan' : geminiHealth === 'testing' ? 'text-amber-400' : geminiHealth === 'invalid' ? 'text-red-400' : 'text-text-dim'}`}>
                      {geminiHealth === 'connected' ? 'Connected' : geminiHealth === 'testing' ? 'Testing…' : geminiHealth === 'invalid' ? 'Invalid' : 'Unverified'}
                    </span>
                  </div>
                  <Input
                    label="Gemini API Key"
                    type="password"
                    placeholder={providerSettings.gemini.maskedKey || 'Paste API key'}
                    value={geminiKeyInput}
                    onChange={(e) => setGeminiKeyInput(e.target.value)}
                  />
                  {providerSettings.gemini.maskedKey && (
                    <p className="text-[11px] font-mono text-text-dim flex items-center gap-1.5">
                      <KeyRound size={12} />
                      Saved to your user profile as {providerSettings.gemini.maskedKey}
                    </p>
                  )}
                  {providerSettings.gemini.model ? (
                    <p className="text-[11px] text-text-secondary">Preferred model: {providerSettings.gemini.model}</p>
                  ) : null}
                  <div className="rounded-xl border border-border bg-base px-3 py-2">
                    <p className="text-[11px] font-mono uppercase text-text-dim">Status</p>
                    <p className="mt-1 text-sm text-text-primary">{geminiHealthMessage}</p>
                  </div>
                  <Button variant="secondary" onClick={verifyGemini} disabled={isVerifyingGemini}>
                    <Sparkles size={14} />
                    {isVerifyingGemini ? 'Checking...' : 'Save & Verify Gemini'}
                  </Button>
                </div>

                {/* Anthropic */}
                <div className="p-4 rounded-2xl border border-border bg-base/60 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-medium text-text-primary">Anthropic Claude</h3>
                      <p className="text-xs text-text-secondary">claude-opus-4-5, claude-sonnet-4-5, claude-haiku-4-5 and future models.</p>
                    </div>
                    <span className={`text-[11px] font-mono ${anthropicHealth === 'connected' ? 'text-accent-cyan' : anthropicHealth === 'testing' ? 'text-amber-400' : anthropicHealth === 'invalid' ? 'text-red-400' : 'text-text-dim'}`}>
                      {anthropicHealth === 'connected' ? 'Connected' : anthropicHealth === 'testing' ? 'Testing…' : anthropicHealth === 'invalid' ? 'Invalid' : 'Unverified'}
                    </span>
                  </div>
                  <Input
                    label="Anthropic API Key"
                    type="password"
                    placeholder={providerSettings.anthropic?.maskedKey || 'Paste sk-ant-... key'}
                    value={anthropicKeyInput}
                    onChange={(e) => setAnthropicKeyInput(e.target.value)}
                  />
                  {providerSettings.anthropic?.maskedKey && (
                    <p className="text-[11px] font-mono text-text-dim flex items-center gap-1.5">
                      <KeyRound size={12} />
                      Saved as {providerSettings.anthropic.maskedKey}
                    </p>
                  )}
                  {providerSettings.anthropic?.verified && providerSettings.anthropic.availableModels?.length ? (
                    <div className="flex flex-wrap gap-1">
                      {providerSettings.anthropic.availableModels.map((m) => (
                        <button
                          key={m}
                          onClick={() => {
                            updateProviderSettings('anthropic', { model: m })
                            saveModelSelection('anthropic', m)
                            toast.success(`Anthropic model set to ${m}`)
                          }}
                          className={`text-[11px] px-2 py-0.5 rounded-full border transition-colors ${
                            providerSettings.anthropic?.model === m
                              ? 'border-accent-cyan text-accent-cyan bg-accent-cyan/10'
                              : 'border-border text-text-dim hover:border-text-secondary'
                          }`}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                  ) : null}
                  <div className="rounded-xl border border-border bg-base px-3 py-2">
                    <p className="text-[11px] font-mono uppercase text-text-dim">Status</p>
                    <p className="mt-1 text-sm text-text-primary">{anthropicHealthMessage}</p>
                  </div>
                  <Button variant="secondary" onClick={verifyAnthropic} disabled={isVerifyingAnthropic}>
                    <Sparkles size={14} />
                    {isVerifyingAnthropic ? 'Checking...' : 'Save & Verify Anthropic'}
                  </Button>
                </div>

                {/* OpenAI */}
                <div className="p-4 rounded-2xl border border-border bg-base/60 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-medium text-text-primary">OpenAI</h3>
                      <p className="text-xs text-text-secondary">GPT-4o, GPT-4o-mini, and OpenAI-compatible endpoints (Groq, Together, etc.).</p>
                    </div>
                    <span className={`text-[11px] font-mono ${openAiHealth === 'connected' ? 'text-accent-cyan' : openAiHealth === 'testing' ? 'text-amber-400' : openAiHealth === 'invalid' ? 'text-red-400' : 'text-text-dim'}`}>
                      {openAiHealth === 'connected' ? 'Connected' : openAiHealth === 'testing' ? 'Testing…' : openAiHealth === 'invalid' ? 'Invalid' : 'Unverified'}
                    </span>
                  </div>
                  <Input
                    label="OpenAI API Key"
                    type="password"
                    placeholder={providerSettings.openai?.maskedKey || 'Paste sk-... key'}
                    value={openAiKeyInput}
                    onChange={(e) => setOpenAiKeyInput(e.target.value)}
                  />
                  {providerSettings.openai?.maskedKey && (
                    <p className="text-[11px] font-mono text-text-dim flex items-center gap-1.5">
                      <KeyRound size={12} />
                      Saved as {providerSettings.openai.maskedKey}
                    </p>
                  )}
                  <Input
                    label="Base URL (optional — for compatible endpoints)"
                    placeholder="https://api.openai.com"
                    value={providerSettings.openai?.baseUrl || ''}
                    onChange={(e) => updateProviderSettings('openai', { baseUrl: e.target.value || 'https://api.openai.com' })}
                  />
                  {providerSettings.openai?.verified && providerSettings.openai.availableModels?.length ? (
                    <div className="flex flex-wrap gap-1">
                      {providerSettings.openai.availableModels.map((m) => (
                        <button
                          key={m}
                          onClick={() => {
                            updateProviderSettings('openai', { model: m })
                            saveModelSelection('openai', m)
                            toast.success(`OpenAI model set to ${m}`)
                          }}
                          className={`text-[11px] px-2 py-0.5 rounded-full border transition-colors ${
                            providerSettings.openai?.model === m
                              ? 'border-accent-cyan text-accent-cyan bg-accent-cyan/10'
                              : 'border-border text-text-dim hover:border-text-secondary'
                          }`}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                  ) : null}
                  <div className="rounded-xl border border-border bg-base px-3 py-2">
                    <p className="text-[11px] font-mono uppercase text-text-dim">Status</p>
                    <p className="mt-1 text-sm text-text-primary">{openAiHealthMessage}</p>
                  </div>
                  <Button variant="secondary" onClick={verifyOpenAi} disabled={isVerifyingOpenAi}>
                    <Sparkles size={14} />
                    {isVerifyingOpenAi ? 'Checking...' : 'Save & Verify OpenAI'}
                  </Button>
                </div>

                {/* Meta Business */}
                <div className="p-4 rounded-2xl border border-border bg-base/60 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-medium text-text-primary">Meta Business</h3>
                      <p className="text-xs text-text-secondary">Connect via a long-lived access token. All ad accounts linked to that token are available in the Ads dashboard.</p>
                    </div>
                    <span className={`text-[11px] font-mono ${metaHealth === 'connected' ? 'text-accent-cyan' : metaHealth === 'testing' ? 'text-amber-400' : metaHealth === 'invalid' ? 'text-red-400' : 'text-text-dim'}`}>
                      {metaHealth === 'connected' ? 'Connected' : metaHealth === 'testing' ? 'Testing…' : metaHealth === 'invalid' ? 'Invalid' : 'Unverified'}
                    </span>
                  </div>

                  {/* How to get a token — collapsible guide */}
                  <div className="rounded-xl border border-border bg-base overflow-hidden">
                    <button
                      onClick={() => setShowMetaGuide(v => !v)}
                      className="w-full flex items-center justify-between px-3 py-2 text-xs text-text-secondary hover:text-text-primary transition-colors"
                    >
                      <span className="flex items-center gap-1.5">
                        <Download size={11} />
                        How to get a Meta access token
                      </span>
                      <span className="font-mono text-[10px]">{showMetaGuide ? '▲' : '▼'}</span>
                    </button>
                    {showMetaGuide && (
                      <div className="px-3 pb-3 space-y-2 border-t border-border text-[11px] text-text-secondary leading-relaxed">
                        <p className="mt-2"><strong className="text-text-primary">Option A — Graph API Explorer (quickest):</strong></p>
                        <ol className="list-decimal list-inside space-y-1 pl-1">
                          <li>Go to <a href="https://developers.facebook.com/tools/explorer/" target="_blank" rel="noopener noreferrer" className="text-accent-blue underline">developers.facebook.com/tools/explorer</a></li>
                          <li>Select your Meta App (or create one at developers.facebook.com)</li>
                          <li>Click <strong className="text-text-primary">Generate Access Token</strong> and grant <code className="bg-base px-1 rounded">ads_read</code>, <code className="bg-base px-1 rounded">ads_management</code>, <code className="bg-base px-1 rounded">business_management</code></li>
                          <li>Copy the token — note: it expires in ~1 hour</li>
                        </ol>
                        <p className="mt-2"><strong className="text-text-primary">Option B — Long-lived token (recommended for production):</strong></p>
                        <ol className="list-decimal list-inside space-y-1 pl-1">
                          <li>Get a short-lived user token from the Explorer (step above)</li>
                          <li>Exchange it: <code className="bg-base px-1 rounded text-[10px]">GET /oauth/access_token?grant_type=fb_exchange_token&client_id=APP_ID&client_secret=APP_SECRET&fb_exchange_token=SHORT_TOKEN</code></li>
                          <li>Result is valid for 60 days — paste it here</li>
                        </ol>
                        <p className="mt-2"><strong className="text-text-primary">Option C — System User token (never expires):</strong></p>
                        <ol className="list-decimal list-inside space-y-1 pl-1">
                          <li>In Meta Business Manager → Settings → System Users</li>
                          <li>Create a System User with <strong className="text-text-primary">Analyst</strong> or <strong className="text-text-primary">Admin</strong> role</li>
                          <li>Click <strong className="text-text-primary">Generate New Token</strong> → select your app → grant ads permissions</li>
                          <li>This token never expires — ideal for Mission Control</li>
                        </ol>
                        <p className="text-text-dim mt-1">All accounts accessible to the token will appear in the Ads dashboard automatically — no need to specify account IDs manually.</p>
                      </div>
                    )}
                  </div>

                  <Input
                    label="Meta Access Token"
                    type="password"
                    placeholder={providerSettings.meta?.maskedToken || 'Paste EAAxxxxxxx… token'}
                    value={metaTokenInput}
                    onChange={(e) => setMetaTokenInput(e.target.value)}
                  />
                  {providerSettings.meta?.maskedToken && (
                    <p className="text-[11px] font-mono text-text-dim flex items-center gap-1.5">
                      <KeyRound size={12} />
                      Saved as {providerSettings.meta.maskedToken}
                    </p>
                  )}

                  {/* Default account — shown after verify or if accounts discovered */}
                  {(metaDiscoveredAccounts.length > 0 || providerSettings.meta?.verified) && (
                    <div>
                      <label className="text-xs font-mono text-text-secondary uppercase tracking-wider block mb-1.5">
                        Default Ad Account <span className="text-text-dim normal-case">(optional — dashboard shows all accounts)</span>
                      </label>
                      {metaDiscoveredAccounts.length > 0 ? (
                        <select
                          value={metaAccountIdInput}
                          onChange={(e) => setMetaAccountIdInput(e.target.value)}
                          className="w-full bg-base border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent-blue"
                        >
                          <option value="">— None (use first available) —</option>
                          {metaDiscoveredAccounts.map(a => (
                            <option key={a.id} value={a.id}>{a.name} ({a.id})</option>
                          ))}
                        </select>
                      ) : (
                        <Input
                          placeholder="act_123456789 (optional)"
                          value={metaAccountIdInput}
                          onChange={(e) => setMetaAccountIdInput(e.target.value)}
                        />
                      )}
                      {metaDiscoveredAccounts.length > 0 && (
                        <p className="text-[11px] text-text-dim mt-1">{metaDiscoveredAccounts.length} account(s) found — all are available in the Ads dashboard regardless of this default.</p>
                      )}
                    </div>
                  )}

                  <Select
                    label="Primary Benchmark Market"
                    value={metaPrimaryMarketInput}
                    onChange={(e) => setMetaPrimaryMarketInput(e.target.value)}
                    options={META_MARKET_OPTIONS.map((market) => ({ value: market.value, label: market.label }))}
                  />
                  <p className="text-[11px] text-text-dim">
                    Used by the Ads dashboard to judge CPC, CPM, CTR, CPL, and CPA against local MENA benchmarks.
                  </p>

                  <div className="rounded-xl border border-border bg-base px-3 py-2">
                    <p className="text-[11px] font-mono uppercase text-text-dim">Status</p>
                    <p className="mt-1 text-sm text-text-primary">{metaHealthMessage}</p>
                  </div>
                  <div className="flex gap-3 flex-wrap">
                    <Button variant="secondary" onClick={saveMeta} disabled={isVerifyingMeta}>
                      <Check size={14} />
                      {isVerifyingMeta ? 'Verifying…' : 'Save & Verify Meta'}
                    </Button>
                    {providerSettings.meta?.verified && (
                      <Button variant="secondary" onClick={() => window.location.href = '/ads'}>
                        <ExternalLink size={13} />
                        Open Ads Dashboard
                      </Button>
                    )}
                  </div>
                </div>

                {/* Higgsfield AI */}
                <div className="p-4 rounded-2xl border border-border bg-base/60 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-medium text-text-primary">Higgsfield AI</h3>
                      <p className="text-xs text-text-secondary">AI video generation for ad creatives, brand content, and social media. Generate videos directly from the Ads page.</p>
                    </div>
                    <span className={`text-[11px] font-mono ${higgsHealth === 'connected' ? 'text-accent-cyan' : higgsHealth === 'testing' ? 'text-amber-400' : higgsHealth === 'invalid' ? 'text-red-400' : 'text-text-dim'}`}>
                      {higgsHealth === 'connected' ? 'Connected' : higgsHealth === 'testing' ? 'Testing…' : higgsHealth === 'invalid' ? 'Invalid' : 'Unverified'}
                    </span>
                  </div>
                  <Input
                    label="Higgsfield API Key"
                    type="password"
                    placeholder={providerSettings.higgsfield?.maskedKey || 'Paste hf_… key'}
                    value={higgsKeyInput}
                    onChange={(e) => setHiggsKeyInput(e.target.value)}
                  />
                  {providerSettings.higgsfield?.maskedKey && (
                    <p className="text-[11px] font-mono text-text-dim flex items-center gap-1.5">
                      <KeyRound size={12} />
                      Saved as {providerSettings.higgsfield.maskedKey}
                    </p>
                  )}
                  <div className="rounded-xl border border-border bg-base px-3 py-2">
                    <p className="text-[11px] font-mono uppercase text-text-dim">Status</p>
                    <p className="mt-1 text-sm text-text-primary">{higgsHealthMessage}</p>
                  </div>
                  <Button variant="secondary" onClick={saveHiggsfield} disabled={isVerifyingHiggs}>
                    <Sparkles size={14} />
                    {isVerifyingHiggs ? 'Verifying…' : 'Save & Verify Higgsfield'}
                  </Button>
                </div>
              </div>

              <div className="mt-4 p-4 rounded-2xl border border-border bg-base/60 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-text-primary">Branded Image Generation</h3>
                    <p className="text-xs text-text-secondary">Uses Gemini image models to produce real artwork from Lyra&apos;s production pack while following uploaded brand references and templates.</p>
                  </div>
                  <span className={`text-[11px] font-mono ${visualHealth === 'connected' ? 'text-accent-cyan' : visualHealth === 'testing' ? 'text-amber-400' : visualHealth === 'invalid' ? 'text-red-400' : 'text-text-dim'}`}>
                    {visualHealth === 'connected' ? 'Connected' : visualHealth === 'testing' ? 'Testing…' : visualHealth === 'invalid' ? 'Invalid' : 'Unverified'}
                  </span>
                </div>
                <Select
                  label="Image model"
                  value={providerSettings.visual.model}
                  onChange={(e) => updateProviderSettings('visual', { model: e.target.value })}
                  options={providerSettings.visual.availableModels.map((model) => ({
                    value: model,
                    label: model,
                  }))}
                />
                <div className="grid md:grid-cols-3 gap-3">
                  <label className="rounded-xl border border-border bg-base px-3 py-3 text-xs text-text-primary flex items-start gap-2">
                    <input
                      type="checkbox"
                      checked={providerSettings.visual.enabled}
                      onChange={(e) => updateProviderSettings('visual', { enabled: e.target.checked })}
                    />
                    <span>Enable real image production</span>
                  </label>
                  <label className="rounded-xl border border-border bg-base px-3 py-3 text-xs text-text-primary flex items-start gap-2">
                    <input
                      type="checkbox"
                      checked={providerSettings.visual.useReferenceImages}
                      onChange={(e) => updateProviderSettings('visual', { useReferenceImages: e.target.checked })}
                    />
                    <span>Use uploaded reference images and templates</span>
                  </label>
                  <label className="rounded-xl border border-border bg-base px-3 py-3 text-xs text-text-primary flex items-start gap-2">
                    <input
                      type="checkbox"
                      checked={providerSettings.visual.strictBrandMode}
                      onChange={(e) => updateProviderSettings('visual', { strictBrandMode: e.target.checked })}
                    />
                    <span>Strict brand-identity mode</span>
                  </label>
                </div>
                <div className="rounded-xl border border-border bg-base px-3 py-2">
                  <p className="text-[11px] font-mono uppercase text-text-dim">Status</p>
                  <p className="mt-1 text-sm text-text-primary">{visualHealthMessage}</p>
                </div>
                <Button variant="secondary" onClick={verifyVisualGeneration} disabled={isVerifyingVisual}>
                  <Sparkles size={14} />
                  {isVerifyingVisual ? 'Checking...' : 'Save & Verify Visual Generation'}
                </Button>
              </div>
            </Card>

            <Card>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-sm font-heading font-semibold text-text-primary">Audit MCP Connectors</h2>
                  <p className="text-xs text-text-secondary mt-1">Optional MCP endpoints for browser-backed UI and SEO audits.</p>
                </div>
                <span className="text-[11px] font-mono text-text-dim">
                  {Object.values(providerSettings.mcp || {}).filter((connector) => connector.enabled && connector.endpoint).length} ready
                </span>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                {[
                  ['browserInspector', 'Browser Inspector MCP', 'Screenshots, DOM capture, interaction states'],
                  ['seoCrawler', 'SEO Crawler MCP', 'Metadata, links, canonicals, crawl findings'],
                  ['searchConsole', 'Search Console MCP', 'Search Console evidence and performance context'],
                  ['accessibilityProbe', 'Accessibility Probe MCP', 'Contrast, keyboard, aria, WCAG checks'],
                ].map(([key, label, description]) => {
                  const connector = providerSettings.mcp[key as keyof typeof providerSettings.mcp]
                  return (
                    <div key={key} className="rounded-xl border border-border bg-base p-4 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-text-primary">{label}</p>
                          <p className="text-xs text-text-secondary mt-1">{description}</p>
                        </div>
                        <Badge
                          color={connector.enabled && connector.endpoint ? '#00d4aa' : '#8b92a8'}
                          variant="outline"
                        >
                          {connector.enabled && connector.endpoint ? 'Ready' : 'Optional'}
                        </Badge>
                      </div>

                      <Input
                        label="Endpoint"
                        value={connector.endpoint}
                        placeholder="http://localhost:3001/mcp"
                        onChange={(e) =>
                          updateProviderSettings('mcp', {
                            [key]: {
                              ...connector,
                              endpoint: e.target.value,
                            },
                          } as any)
                        }
                      />

                      <label className="flex items-center gap-2 text-sm text-text-primary">
                        <input
                          type="checkbox"
                          checked={connector.enabled}
                          onChange={(e) =>
                            updateProviderSettings('mcp', {
                              [key]: {
                                ...connector,
                                enabled: e.target.checked,
                              },
                            } as any)
                          }
                        />
                        Enable this connector for audit routing
                      </label>
                    </div>
                  )
                })}
              </div>
            </Card>

            <Card>
              <h2 className="text-sm font-heading font-semibold text-text-primary mb-4">Agency System Defaults</h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: 'Total Agents', value: agents.length },
                  { label: 'Programs', value: campaigns.length },
                  { label: 'Clients', value: clients.length },
                  { label: 'Missions', value: missions.length },
                ].map((stat) => (
                  <div key={stat.label} className="text-center p-4 rounded-xl bg-base border border-border">
                    <p className="text-2xl font-heading font-bold text-text-primary">{stat.value}</p>
                    <p className="text-xs text-text-dim mt-1">{stat.label}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 grid md:grid-cols-2 gap-3">
                <div className="rounded-xl border border-border bg-base p-4">
                  <p className="text-xs font-mono text-text-dim uppercase mb-1">Theme posture</p>
                  <p className="text-sm text-text-primary flex items-center gap-2">
                    <SunMedium size={14} className="text-accent-yellow" />
                    {agencySettings.themeMode === 'dark' ? 'Dark command center' : 'Light studio mode'}
                  </p>
                </div>
                <div className="rounded-xl border border-border bg-base p-4">
                  <p className="text-xs font-mono text-text-dim uppercase mb-1">Model registry</p>
                  <p className="text-sm text-text-primary">
                    {MODEL_OPTIONS.length} configured model options across Ollama and Gemini
                  </p>
                </div>
              </div>
            </Card>

            <Card>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-sm font-heading font-semibold text-text-primary">OAuth Integrations</h2>
                  <p className="text-xs text-text-secondary mt-1">Connect Google and Meta accounts for seamless data access.</p>
                </div>
                <span className="text-[11px] font-mono text-text-dim">
                  {Object.values(oauthConnections).filter(Boolean).length} connected
                </span>
              </div>

              <div className="grid lg:grid-cols-2 gap-6">
                {/* Google integrations */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 mb-2">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                    <span className="text-xs font-medium text-text-secondary">Google</span>
                  </div>

                  <div className="rounded-xl border border-border bg-base p-4 space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-text-primary">Google OAuth App</p>
                        <p className="text-[11px] text-text-secondary mt-1">
                          Save your OAuth Web Application credentials before connecting Google Analytics, Docs, Sheets, or Drive.
                        </p>
                      </div>
                      <Badge
                        color={googleOAuthHealth === 'connected' ? '#00d4aa' : googleOAuthHealth === 'invalid' ? '#ff5b7f' : '#8b92a8'}
                        variant="outline"
                      >
                        {googleOAuthHealth === 'connected' ? 'Verified' : googleOAuthHealth === 'testing' ? 'Testing' : 'Not verified'}
                      </Badge>
                    </div>

                    <Input
                      label="Google OAuth Client ID"
                      value={googleClientIdInput}
                      placeholder={providerSettings.google?.clientId || 'xxxxx.apps.googleusercontent.com'}
                      onChange={(e) => {
                        setGoogleClientIdInput(e.target.value)
                        updateProviderSettings('google', {
                          ...(providerSettings.google || {}),
                          clientId: e.target.value,
                          verified: false,
                        } as any)
                      }}
                    />
                    <Input
                      label="Google OAuth Client Secret"
                      type="password"
                      value={googleClientSecretInput}
                      placeholder={providerSettings.google?.maskedClientSecret || 'GOCSPX-...'}
                      onChange={(e) => {
                        setGoogleClientSecretInput(e.target.value)
                        updateProviderSettings('google', {
                          ...(providerSettings.google || {}),
                          verified: false,
                        } as any)
                      }}
                    />
                    {providerSettings.google?.maskedClientSecret && (
                      <p className="text-[11px] font-mono text-text-dim flex items-center gap-1.5">
                        <KeyRound size={12} />
                        Saved secret as {providerSettings.google.maskedClientSecret}
                      </p>
                    )}

                    <div className="rounded-xl border border-border bg-surface px-3 py-2">
                      <p className="text-[11px] font-mono uppercase text-text-dim">Authorized redirect URI</p>
                      <p className="mt-1 break-all text-xs text-text-primary">
                        {googleRedirectUri || providerSettings.google?.redirectUri || '/api/auth/google/callback'}
                      </p>
                      <p className="mt-1 text-[11px] text-text-secondary">
                        Add this exact value in Google Cloud under Authorized redirect URIs. The origin should be this domain without the path.
                      </p>
                    </div>

                    <div className="rounded-xl border border-border bg-base px-3 py-2">
                      <p className="text-[11px] font-mono uppercase text-text-dim">Status</p>
                      <p className="mt-1 text-sm text-text-primary">{googleOAuthHealthMessage}</p>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <Button variant="secondary" onClick={saveGoogleOAuth} disabled={isVerifyingGoogleOAuth}>
                        <Check size={14} />
                        {isVerifyingGoogleOAuth ? 'Checking...' : 'Save & Verify OAuth App'}
                      </Button>
                      {providerSettings.google?.verified && (
                        <Button variant="secondary" onClick={() => window.location.href = '/api/auth/google'}>
                          <ExternalLink size={13} />
                          Connect Google
                        </Button>
                      )}
                    </div>
                  </div>

                  {[
                    { key: 'google_docs', label: 'Google Docs', desc: 'Access documents and briefs' },
                    { key: 'google_sheets', label: 'Google Sheets', desc: 'Sync campaign data and reports' },
                    { key: 'google_analytics', label: 'Google Analytics', desc: 'Read GA4 properties and dashboard reports' },
                    { key: 'google_ads', label: 'Google Ads', desc: 'Import campaign performance' },
                  ].map((item) => (
                    <div key={item.key} className="flex items-center justify-between p-3 rounded-xl bg-base border border-border">
                      <div>
                        <p className="text-sm text-text-primary">{item.label}</p>
                        <p className="text-[10px] text-text-dim">{item.desc}</p>
                      </div>
                      <button
                        onClick={() => window.location.href = `/api/auth/google?scope=${item.key}`}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          oauthConnections[item.key as keyof typeof oauthConnections]
                            ? 'bg-[var(--accent-cyan)]/20 text-[var(--accent-cyan)] border border-[var(--accent-cyan)]/30'
                            : 'bg-base border border-border text-text-secondary hover:text-text-primary hover:border-[var(--border-glow)]'
                        }`}
                      >
                        {oauthConnections[item.key as keyof typeof oauthConnections] ? (
                          <span className="flex items-center gap-1"><Check size={12} />Connected</span>
                        ) : (
                          <span className="flex items-center gap-1"><ExternalLink size={12} />Connect</span>
                        )}
                      </button>
                    </div>
                  ))}
                </div>

                {/* Meta integrations */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 mb-2">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" fill="#1877F2"/>
                    </svg>
                    <span className="text-xs font-medium text-text-secondary">Meta</span>
                  </div>

                  {[
                    { key: 'meta_facebook', label: 'Facebook Ads', desc: 'Import ad performance data' },
                    { key: 'meta_instagram', label: 'Instagram Ads', desc: 'Social campaign metrics' },
                  ].map((item) => (
                    <div key={item.key} className="flex items-center justify-between p-3 rounded-xl bg-base border border-border">
                      <div>
                        <p className="text-sm text-text-primary">{item.label}</p>
                        <p className="text-[10px] text-text-dim">{item.desc}</p>
                      </div>
                      <button
                        onClick={() => window.location.href = `/api/auth/meta?scope=${item.key}`}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          oauthConnections[item.key as keyof typeof oauthConnections]
                            ? 'bg-[var(--accent-cyan)]/20 text-[var(--accent-cyan)] border border-[var(--accent-cyan)]/30'
                            : 'bg-base border border-border text-text-secondary hover:text-text-primary hover:border-[var(--border-glow)]'
                        }`}
                      >
                        {oauthConnections[item.key as keyof typeof oauthConnections] ? (
                          <span className="flex items-center gap-1"><Check size={12} />Connected</span>
                        ) : (
                          <span className="flex items-center gap-1"><ExternalLink size={12} />Connect</span>
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </Card>

            <Card>
              <h2 className="text-sm font-heading font-semibold text-text-primary mb-4">Import / Export</h2>
              <p className="text-xs text-text-secondary mb-4">Export or hydrate the full agency state, including tasks, clients, outputs, optional programs, and provider settings.</p>
              <div className="flex gap-3">
                <Button variant="secondary" onClick={handleExport}>
                  <Download size={14} />
                  Export Config
                </Button>
                <label>
                  <input type="file" accept=".json" onChange={handleImport} className="hidden" />
                  <span className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-base border border-border text-sm text-text-secondary hover:border-border-glow hover:text-text-primary transition-all cursor-pointer">
                    <Upload size={14} />
                    Import Config
                  </span>
                </label>
              </div>
            </Card>

            <Card>
              <h2 className="text-sm font-heading font-semibold text-text-primary mb-4">Integrations</h2>
              <p className="text-xs text-text-secondary mb-4">Connect your external accounts to enable seamless data sync and reporting.</p>

              <div className="space-y-4">
                <div>
                  <h3 className="text-xs font-medium text-text-secondary uppercase tracking-wider mb-3">Google</h3>
                  <div className="space-y-2">
                    {[
                      { label: 'Google Docs', service: 'google-docs', key: 'google_docs' },
                      { label: 'Google Sheets', service: 'google-sheets', key: 'google_sheets' },
                      { label: 'Google Analytics', service: 'google-analytics', key: 'google_analytics' },
                      { label: 'Google Ads', service: 'google-ads', key: 'google_ads' },
                    ].map(({ label, service, key }) => {
                      const connected = oauthConnections[key as keyof typeof oauthConnections]
                      return (
                        <div key={service} className="flex items-center justify-between py-2 px-3 rounded-lg bg-base/60 border border-border">
                          <span className="text-sm text-text-primary">{label}</span>
                          <div className="flex items-center gap-3">
                            <Badge color={connected ? '#00d4aa' : '#6b7280'} variant="outline">
                              {connected ? 'Connected' : 'Disconnected'}
                            </Badge>
                            <Button
                              variant="secondary"
                              onClick={() => window.location.href = `/api/auth/google?service=${service}`}
                            >
                              {connected ? 'Reconnect' : 'Connect'}
                            </Button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                <div>
                  <h3 className="text-xs font-medium text-text-secondary uppercase tracking-wider mb-3">Meta</h3>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-base/60 border border-border">
                      <span className="text-sm text-text-primary">Meta Ads</span>
                      <div className="flex items-center gap-3">
                        <Badge color={oauthConnections.meta_facebook ? '#00d4aa' : '#6b7280'} variant="outline">
                          {oauthConnections.meta_facebook ? 'Connected' : 'Disconnected'}
                        </Badge>
                        <Button
                          variant="secondary"
                          onClick={() => window.location.href = '/api/auth/meta'}
                        >
                          Connect
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </ClientShell>
  )
}
