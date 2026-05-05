'use client'

import React, { useState } from 'react'
import { AlertCircle, CheckCircle2 } from 'lucide-react'

import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { toast } from '@/components/ui/Toast'
import { setStoredToken } from '@/lib/auth/browser'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [feedback, setFeedback] = useState<{ type: 'error' | 'success'; message: string } | null>(null)
  const [saving, setSaving] = useState(false)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setSaving(true)
    setFeedback(null)

    try {
      if (password.length < 8) {
        throw new Error('Password must be at least 8 characters.')
      }

      const res = await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Invalid email or password.')
      }

      setStoredToken(data.token)
      toast.success('Signed in successfully.')

      if (typeof window !== 'undefined') {
        const url = new URL('/dashboard', window.location.origin)
        url.searchParams.set('refresh', String(Date.now()))
        window.location.replace(url.toString())
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to continue.'
      setFeedback({ type: 'error', message })
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-base flex items-center justify-center p-6">
      <Card className="w-full max-w-md p-6 space-y-6">
        <div>
          <p className="text-[11px] font-mono uppercase text-text-dim">Mission Control</p>
          <h1 className="text-2xl font-heading font-bold text-text-primary mt-2">Sign In</h1>
          <p className="text-sm text-text-secondary mt-2">
            Access your clients, tasks, and outputs.
          </p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <label className="block space-y-1">
            <span className="text-[11px] text-text-secondary">Email</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-xl border border-border bg-base px-3 py-2 text-sm text-text-primary"
              placeholder="name@company.com"
              required
            />
          </label>

          <label className="block space-y-1">
            <span className="text-[11px] text-text-secondary">Password</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-xl border border-border bg-base px-3 py-2 text-sm text-text-primary"
              placeholder="••••••••"
              required
            />
          </label>

          {feedback ? (
            <div
              className={`rounded-xl border px-3 py-2 text-sm flex items-start gap-2 ${
                feedback.type === 'error'
                  ? 'border-red-500/30 bg-red-500/10 text-red-400'
                  : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
              }`}
            >
              {feedback.type === 'error'
                ? <AlertCircle size={16} className="mt-0.5 shrink-0" />
                : <CheckCircle2 size={16} className="mt-0.5 shrink-0" />}
              <span>{feedback.message}</span>
            </div>
          ) : null}

          <Button type="submit" className="w-full" disabled={saving}>
            {saving ? 'Signing in…' : 'Sign In'}
          </Button>
        </form>
      </Card>
    </div>
  )
}
