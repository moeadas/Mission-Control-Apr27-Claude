'use client'

import React, { useState } from 'react'
import { ClientShell } from '@/components/ClientShell'
import { useAgentsStore } from '@/lib/agents-store'
import { HelpCircle, Bug, Lightbulb, MessageSquare, Send, CheckCircle, AlertCircle, ChevronDown } from 'lucide-react'

type IssueType = 'bug' | 'feature' | 'support' | 'other'

const ISSUE_TYPES: { value: IssueType; label: string; icon: React.ReactNode; desc: string }[] = [
  { value: 'bug', label: 'Bug Report', icon: <Bug size={16} />, desc: 'Something is broken or not working as expected' },
  { value: 'feature', label: 'Feature Request', icon: <Lightbulb size={16} />, desc: 'Suggest a new feature or improvement' },
  { value: 'support', label: 'General Support', icon: <HelpCircle size={16} />, desc: 'Need help using the platform' },
  { value: 'other', label: 'Other', icon: <MessageSquare size={16} />, desc: 'Anything else on your mind' },
]

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low — not urgent', color: '#60a5fa' },
  { value: 'medium', label: 'Medium — affecting my work', color: '#fbbf24' },
  { value: 'high', label: 'High — blocking me completely', color: '#fb923c' },
]

export default function SupportPage() {
  const currentUser = useAgentsStore((state) => state.currentUser)

  const [issueType, setIssueType] = useState<IssueType>('support')
  const [subject, setSubject] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState('medium')
  const [email, setEmail] = useState(currentUser?.email || '')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!subject.trim() || !description.trim()) {
      setError('Please fill in the subject and description.')
      return
    }
    setError(null)
    setIsSubmitting(true)

    try {
      // Build a mailto link as a lightweight "submit" since no external integrations are required
      const body = [
        `Type: ${ISSUE_TYPES.find((t) => t.value === issueType)?.label}`,
        `Priority: ${PRIORITY_OPTIONS.find((p) => p.value === priority)?.label}`,
        `From: ${email}`,
        '',
        description,
      ].join('\n')

      const mailtoHref = `mailto:support@missioncontrol.app?subject=${encodeURIComponent(`[${issueType.toUpperCase()}] ${subject}`)}&body=${encodeURIComponent(body)}`

      // Simulate a small delay, then open mailto
      await new Promise((r) => setTimeout(r, 600))
      window.location.href = mailtoHref
      setSubmitted(true)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleReset = () => {
    setSubmitted(false)
    setSubject('')
    setDescription('')
    setPriority('medium')
    setError(null)
  }

  return (
    <ClientShell>
      <div className="flex-1 overflow-y-auto">
        <div className="w-full max-w-3xl mx-auto p-6 space-y-6">

          {/* Header */}
          <div>
            <div className="mission-chip w-fit mb-3">
              <HelpCircle size={12} className="text-[var(--accent-blue)]" />
              Help desk
            </div>
            <h1 className="text-2xl font-black tracking-[-0.03em] text-[var(--text-primary)]">Support</h1>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              Report a bug, request a feature, or get help — we'll get back to you quickly.
            </p>
          </div>

          {submitted ? (
            /* Success state */
            <div className="mission-panel p-10 text-center">
              <div className="w-16 h-16 rounded-full bg-[#00d4aa]/15 flex items-center justify-center mx-auto mb-4">
                <CheckCircle size={32} className="text-[#00d4aa]" />
              </div>
              <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">Request submitted</h2>
              <p className="text-sm text-[var(--text-secondary)] max-w-md mx-auto mb-6">
                Your email client should have opened. If it didn't, please email us directly at{' '}
                <a href="mailto:support@missioncontrol.app" className="text-[var(--accent-blue)] underline">
                  support@missioncontrol.app
                </a>
                .
              </p>
              <button
                onClick={handleReset}
                className="px-5 py-2 rounded-xl text-sm font-medium border border-[var(--border)] hover:border-[var(--border-glow)] bg-white/60 text-[var(--text-primary)] transition-all"
              >
                Submit another request
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mission-panel p-6 space-y-6">

              {/* Issue type */}
              <div>
                <label className="block text-sm font-semibold text-[var(--text-primary)] mb-3">Issue Type</label>
                <div className="grid grid-cols-2 gap-3">
                  {ISSUE_TYPES.map((t) => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setIssueType(t.value)}
                      className={`flex items-start gap-3 p-3 rounded-xl border text-left transition-all ${
                        issueType === t.value
                          ? 'border-[var(--accent-purple)] bg-[var(--accent-purple)]/8'
                          : 'border-[var(--border)] bg-white/50 hover:border-[var(--border-glow)]'
                      }`}
                    >
                      <span className={`mt-0.5 flex-shrink-0 ${issueType === t.value ? 'text-[var(--accent-purple)]' : 'text-[var(--text-dim)]'}`}>
                        {t.icon}
                      </span>
                      <div>
                        <p className={`text-sm font-medium ${issueType === t.value ? 'text-[var(--accent-purple)]' : 'text-[var(--text-primary)]'}`}>
                          {t.label}
                        </p>
                        <p className="text-xs text-[var(--text-dim)] mt-0.5 leading-relaxed">{t.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Subject */}
              <div>
                <label className="block text-sm font-semibold text-[var(--text-primary)] mb-1">
                  Subject <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full rounded-[14px] border border-[var(--border)] bg-white/70 px-4 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-dim)] focus:border-[var(--accent-blue)] focus:outline-none transition-colors"
                  placeholder="Brief summary of the issue…"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-semibold text-[var(--text-primary)] mb-1">
                  Description <span className="text-red-400">*</span>
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={5}
                  className="w-full rounded-[14px] border border-[var(--border)] bg-white/70 px-4 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-dim)] focus:border-[var(--accent-blue)] focus:outline-none transition-colors resize-none"
                  placeholder={
                    issueType === 'bug'
                      ? 'Steps to reproduce:\n1. \n2. \n\nExpected behaviour:\nActual behaviour:'
                      : issueType === 'feature'
                      ? "Describe the feature you'd like and why it would help…"
                      : 'Describe your issue or question in as much detail as possible…'
                  }
                />
              </div>

              {/* Priority + Email */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-[var(--text-primary)] mb-1">Priority</label>
                  <div className="relative">
                    <select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value)}
                      className="w-full rounded-[14px] border border-[var(--border)] bg-white/70 px-4 py-2.5 text-sm text-[var(--text-primary)] focus:border-[var(--accent-blue)] focus:outline-none transition-colors appearance-none pr-8"
                    >
                      {PRIORITY_OPTIONS.map((p) => (
                        <option key={p.value} value={p.value}>{p.label}</option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-dim)] pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[var(--text-primary)] mb-1">Your Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-[14px] border border-[var(--border)] bg-white/70 px-4 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-dim)] focus:border-[var(--accent-blue)] focus:outline-none transition-colors"
                    placeholder="you@example.com"
                  />
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-500 text-sm">
                  <AlertCircle size={16} className="flex-shrink-0" />
                  {error}
                </div>
              )}

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-[0_8px_18px_rgba(79,142,247,0.24)] hover:shadow-[0_12px_24px_rgba(79,142,247,0.32)]"
                  style={{ background: 'linear-gradient(135deg, #4f8ef7, #2dd4bf)' }}
                >
                  <Send size={15} />
                  {isSubmitting ? 'Submitting…' : 'Submit Request'}
                </button>
              </div>
            </form>
          )}

          {/* FAQ */}
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Common Questions</h2>
            {[
              { q: 'How do I add a new agent?', a: 'Go to Company Setup → Agents → click "New Agent". A step-by-step wizard will guide you through the setup.' },
              { q: "Why isn't Iris responding?", a: 'Check your AI provider API key in Settings → Integrations. Iris needs a valid key to generate responses.' },
              { q: 'Where do task outputs go?', a: 'All deliverables land in the Output section. You can export, share, or refine them from there.' },
              { q: 'How do I connect Google Ads or Meta?', a: 'Go to Settings → Integrations and connect your accounts from there.' },
            ].map((faq) => (
              <details key={faq.q} className="group bg-white/60 border border-[var(--border)] rounded-2xl overflow-hidden">
                <summary className="flex items-center justify-between px-5 py-4 cursor-pointer text-sm font-medium text-[var(--text-primary)] list-none">
                  {faq.q}
                  <ChevronDown size={16} className="text-[var(--text-dim)] group-open:rotate-180 transition-transform" />
                </summary>
                <p className="px-5 pb-4 text-sm text-[var(--text-secondary)] leading-relaxed">{faq.a}</p>
              </details>
            ))}
          </div>

        </div>
      </div>
    </ClientShell>
  )
}
