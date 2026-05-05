'use client'

import React, { useState, useRef } from 'react'
import { ClientShell } from '@/components/ClientShell'
import { useAgentsStore } from '@/lib/agents-store'
import { ArrowRight, MessageCircle } from 'lucide-react'

const CATEGORIES = [
  {
    label: 'Content & Copy',
    items: ['30-day content calendar', 'Campaign copy suite', 'Thought leadership article', 'Email nurture sequence'],
  },
  {
    label: 'Strategy & Research',
    items: ['Competitor positioning brief', 'Market research report', 'Brand strategy deck', 'SEO audit'],
  },
  {
    label: 'Creative & Campaigns',
    items: ['Full campaign brief', 'Ad creative concepts', 'Social media campaign', 'Launch plan'],
  },
]

export default function MissionPage() {
  const openIris = useAgentsStore((state) => state.openIris)
  const isIrisOpen = useAgentsStore((state) => state.isIrisOpen)
  const [inputValue, setInputValue] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleLaunch = () => {
    if (!isIrisOpen) openIris()
    if (inputValue.trim()) {
      setTimeout(() => {
        const ev = new CustomEvent('iris:prefill', { detail: { text: inputValue.trim() } })
        window.dispatchEvent(ev)
      }, 150)
    }
  }

  const handlePrompt = (prompt: string) => {
    setInputValue(prompt)
    textareaRef.current?.focus()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleLaunch()
    }
  }

  return (
    <ClientShell>
      <div className="flex-1 overflow-y-auto">
        <div className="w-full max-w-4xl mx-auto px-6 py-10 space-y-12">

          {/* Hero */}
          <div>
            <div className="mission-chip w-fit mb-5">
              <MessageCircle size={11} className="text-[var(--accent-purple)]" />
              Iris is ready
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-[-0.035em] leading-[1.05] text-[var(--text-primary)] mb-4">
              What do you want<br />
              to create today?
            </h1>
            <p className="text-base text-[var(--text-secondary)] leading-relaxed max-w-xl">
              Brief Iris in plain language. She routes your request to the right specialists, coordinates the work, and delivers results you can use.
            </p>
          </div>

          {/* Input */}
          <div
            className="rounded-2xl border overflow-hidden transition-all"
            style={{
              background: 'rgba(255,255,255,0.80)',
              border: '1.5px solid var(--border)',
              boxShadow: '0 16px 48px rgba(45,78,135,0.08)',
            }}
          >
            <textarea
              ref={textareaRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={4}
              placeholder="e.g. Write a 30-day content calendar for our SaaS product targeting startup founders..."
              className="w-full px-5 py-5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-dim)] bg-transparent resize-none focus:outline-none leading-relaxed"
            />
            <div className="flex items-center justify-between px-4 pb-3 pt-1">
              <p className="text-[11px] text-[var(--text-dim)]">
                Press <kbd className="px-1.5 py-0.5 rounded bg-white border border-[var(--border)] text-[10px] font-mono">Enter</kbd> to send, <kbd className="px-1.5 py-0.5 rounded bg-white border border-[var(--border)] text-[10px] font-mono">Shift+Enter</kbd> for new line
              </p>
              <button
                onClick={handleLaunch}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-40"
                style={{
                  background: 'linear-gradient(135deg, #9b6dff, #4f8ef7)',
                  boxShadow: '0 8px 20px rgba(155,109,255,0.28)',
                }}
                disabled={!inputValue.trim()}
              >
                Brief Iris
                <ArrowRight size={15} />
              </button>
            </div>
          </div>

          {/* Prompt starters */}
          <div className="space-y-8">
            {CATEGORIES.map((cat) => (
              <div key={cat.label}>
                <p className="text-[11px] font-mono uppercase tracking-[0.2em] text-[var(--text-dim)] mb-3">
                  {cat.label}
                </p>
                <div className="flex flex-wrap gap-2">
                  {cat.items.map((item) => (
                    <button
                      key={item}
                      onClick={() => handlePrompt(item)}
                      className="px-4 py-2 rounded-xl text-sm font-medium border transition-all hover:scale-[1.01] hover:shadow-[0_4px_12px_rgba(45,78,135,0.10)]"
                      style={{
                        background: 'rgba(255,255,255,0.72)',
                        borderColor: 'var(--border)',
                        color: 'var(--text-secondary)',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = 'rgba(155,109,255,0.4)'
                        e.currentTarget.style.color = 'var(--text-primary)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = 'var(--border)'
                        e.currentTarget.style.color = 'var(--text-secondary)'
                      }}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Footer note */}
          <div className="border-t border-[var(--border)] pt-6">
            <div className="grid grid-cols-3 gap-6 text-center">
              {[
                { num: '01', label: 'Describe your goal', detail: 'Tell Iris what you need in plain language' },
                { num: '02', label: 'Iris routes the work', detail: 'She assigns the right agents and coordinates delivery' },
                { num: '03', label: 'Review your output', detail: 'Deliverables land in Outputs, ready to use' },
              ].map((s) => (
                <div key={s.num} className="space-y-1.5">
                  <p className="text-[10px] font-mono text-[var(--accent-purple)] tracking-[0.2em]">{s.num}</p>
                  <p className="text-xs font-semibold text-[var(--text-primary)]">{s.label}</p>
                  <p className="text-[11px] text-[var(--text-dim)] leading-relaxed">{s.detail}</p>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </ClientShell>
  )
}
