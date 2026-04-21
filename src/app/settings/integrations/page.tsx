'use client'

import React, { useState, useEffect } from 'react'
import { ClientShell } from '@/components/ClientShell'
import { useAgentsStore } from '@/lib/agents-store'
import {
  CheckCircle2,
  XCircle,
  ExternalLink,
  RefreshCw,
  Trash2,
  Key,
  Shield,
} from 'lucide-react'
import { clsx } from 'clsx'

interface Integration {
  id: string
  name: string
  description: string
  icon: string
  status: 'connected' | 'disconnected' | 'error'
  lastSync?: string
  scopes?: string[]
}

export default function IntegrationsSettings() {
  const agents = useAgentsStore(state => state.agents)
  const [integrations, setIntegrations] = useState<Integration[]>([
    {
      id: 'google-docs',
      name: 'Google Docs',
      description: 'Create and manage documents',
      icon: '📄',
      status: 'disconnected',
      scopes: ['documents.readwrite', 'drive.readwrite'],
    },
    {
      id: 'google-sheets',
      name: 'Google Sheets',
      description: 'Read and write spreadsheets',
      icon: '📊',
      status: 'disconnected',
      scopes: ['spreadsheets.readwrite', 'drive.readwrite'],
    },
    {
      id: 'google-ads',
      name: 'Google Ads',
      description: 'Campaign data and metrics',
      icon: '🎯',
      status: 'disconnected',
      scopes: ['adwords.readonly'],
    },
    {
      id: 'meta-ads',
      name: 'Meta Ads',
      description: 'Facebook & Instagram ad management',
      icon: '📱',
      status: 'disconnected',
      scopes: ['ads_management', 'ads_read', 'pages_read_engagement'],
    },
  ])

  // Check URL params for OAuth callbacks
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const googleStatus = params.get('google')
    const metaStatus = params.get('meta')
    
    if (googleStatus === 'connected') {
      setIntegrations(prev => prev.map(i => 
        i.id.startsWith('google') ? { ...i, status: 'connected' as const } : i
      ))
    }
    if (metaStatus === 'connected') {
      setIntegrations(prev => prev.map(i => 
        i.id === 'meta-ads' ? { ...i, status: 'connected' as const } : i
      ))
    }
    
    // Clean URL
    if (googleStatus || metaStatus) {
      window.history.replaceState({}, '', '/settings/integrations')
    }
  }, [])

  const connectGoogle = () => {
    window.location.href = '/api/auth/google'
  }

  const connectMeta = () => {
    window.location.href = '/api/auth/meta'
  }

  const disconnect = (id: string) => {
    setIntegrations(prev => prev.map(i => 
      i.id === id ? { ...i, status: 'disconnected' as const } : i
    ))
  }

  const sync = async (id: string) => {
    // Trigger sync
    console.log('Syncing:', id)
  }

  return (
    <ClientShell>
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-6 space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-2xl font-heading font-bold">Integrations</h1>
            <p className="text-sm text-text-secondary mt-1">
              Connect your ad platforms and Google services
            </p>
          </div>

          {/* Integrations Grid */}
          <div className="grid gap-4">
            {integrations.map(integration => (
              <div
                key={integration.id}
                className={clsx(
                  'bg-base-200 rounded-xl p-6 border',
                  integration.status === 'connected' ? 'border-accent-green/30' : 'border-border'
                )}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-base-300 flex items-center justify-center text-2xl">
                      {integration.icon}
                    </div>
                    <div>
                      <h3 className="font-medium flex items-center gap-2">
                        {integration.name}
                        {integration.status === 'connected' && (
                          <span className="flex items-center gap-1 text-xs text-accent-green bg-accent-green/10 px-2 py-0.5 rounded-full">
                            <CheckCircle2 size={12} /> Connected
                          </span>
                        )}
                        {integration.status === 'error' && (
                          <span className="flex items-center gap-1 text-xs text-accent-red bg-accent-red/10 px-2 py-0.5 rounded-full">
                            <XCircle size={12} /> Error
                          </span>
                        )}
                      </h3>
                      <p className="text-sm text-text-secondary mt-0.5">
                        {integration.description}
                      </p>
                      
                      {/* Scopes */}
                      {integration.status === 'connected' && integration.scopes && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {integration.scopes.map(scope => (
                            <span key={scope} className="text-[10px] px-2 py-0.5 bg-base-300 rounded">
                              {scope}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {integration.status === 'connected' ? (
                      <>
                        <button
                          onClick={() => sync(integration.id)}
                          className="p-2 hover:bg-base-300 rounded-lg transition-colors"
                          title="Sync"
                        >
                          <RefreshCw size={18} className="text-text-secondary" />
                        </button>
                        <button
                          onClick={() => disconnect(integration.id)}
                          className="p-2 hover:bg-accent-red/10 rounded-lg transition-colors"
                          title="Disconnect"
                        >
                          <Trash2 size={18} className="text-accent-red" />
                        </button>
                      </>
                    ) : integration.id.startsWith('google') ? (
                      <button
                        onClick={connectGoogle}
                        className="px-4 py-2 bg-accent-purple text-white rounded-lg text-sm font-medium hover:bg-accent-purple/80 transition-colors"
                      >
                        Connect
                      </button>
                    ) : (
                      <button
                        onClick={connectMeta}
                        className="px-4 py-2 bg-accent-purple text-white rounded-lg text-sm font-medium hover:bg-accent-purple/80 transition-colors"
                      >
                        Connect
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Setup Instructions */}
          <div className="bg-base-200 rounded-xl p-6">
            <h3 className="font-medium flex items-center gap-2 mb-4">
              <Shield size={18} />
              API Access Setup
            </h3>
            <div className="space-y-4 text-sm">
              <div>
                <h4 className="font-medium text-text-primary mb-1">Google Cloud Console</h4>
                <p className="text-text-secondary">
                  Enable these APIs: Google Docs API, Google Sheets API, Google Ads API
                </p>
                <a
                  href="https://console.cloud.google.com/apis/library"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-accent-purple text-xs mt-1"
                >
                  Open Google Cloud Console <ExternalLink size={12} />
                </a>
              </div>
              
              <div>
                <h4 className="font-medium text-text-primary mb-1">Meta Developer</h4>
                <p className="text-text-secondary">
                  Your app has Marketing API access. Add redirect URI in Meta developer settings.
                </p>
                <a
                  href="https://developers.facebook.com/apps"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-accent-purple text-xs mt-1"
                >
                  Open Meta Developer <ExternalLink size={12} />
                </a>
              </div>
            </div>
          </div>

          {/* Credentials Info */}
          <div className="bg-base-200 rounded-xl p-4">
            <div className="flex items-center gap-2 text-sm text-text-secondary">
              <Key size={14} />
              <span>API credentials configured in .env.local</span>
            </div>
          </div>
        </div>
      </div>
    </ClientShell>
  )
}
