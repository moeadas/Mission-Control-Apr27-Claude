'use client'

import React, { useMemo, useState } from 'react'
import { AlertCircle, CheckCircle2 } from 'lucide-react'

import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { toast } from '@/components/ui/Toast'
import { getSupabaseBrowserClient } from '@/lib/supabase/browser'

export default function LoginPage() {
  const supabase = useMemo(() => getSupabaseBrowserClient(), [])
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [feedback, setFeedback] = useState<{ type: 'error' | 'success'; message: string } | null>(null)
  const [saving, setSaving] = useState(false)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setSaving(true)
    setFeedback(null)

    try {
      if (mode === 'signup') {
        if (!fullName.trim()) {
          throw new Error('Please add a full name.')
        }
        if (password.length < 8) {
          throw new Error('Password must be at least 8 characters.')
        }

        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              full_name: fullName.trim(),
            },
          },
        })
        if (error) throw error
        const message = 'Account created. If email confirmation is enabled, confirm it first, then sign in.'
        setFeedback({ type: 'success', message })
        toast.success(message)
        setMode('login')
        setPassword('')
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        })
        if (error) throw error
        toast.success('Signed in successfully.')
        if (typeof window !== 'undefined') {
          const url = new URL('/dashboard', window.location.origin)
          url.searchParams.set('refresh', String(Date.now()))
          window.location.replace(url.toString())
          return
        }
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
          <h1 className="text-2xl font-heading font-bold text-text-primary mt-2">
            {mode === 'login' ? 'Sign In' : 'Create Account'}
          </h1>
          <p className="text-sm text-text-secondary mt-2">
            {mode === 'login'
              ? 'Access your clients, tasks, and outputs.'
              : 'Create a user account in the shared agency workspace.'}
          </p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          {mode === 'signup' ? (
            <label className="block space-y-1">
              <span className="text-[11px] text-text-secondary">Full name</span>
              <input
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                className="w-full rounded-xl border border-border bg-base px-3 py-2 text-sm text-text-primary"
                placeholder="Jane Smith"
              />
            </label>
          ) : null}

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
              {feedback.type === 'error' ? <AlertCircle size={16} className="mt-0.5 shrink-0" /> : <CheckCircle2 size={16} className="mt-0.5 shrink-0" />}
              <span>{feedback.message}</span>
            </div>
          ) : null}

          <Button type="submit" className="w-full" disabled={saving}>
            {saving ? 'Working…' : mode === 'login' ? 'Sign In' : 'Create Account'}
          </Button>
        </form>

        <button
          type="button"
          onClick={() => setMode((current) => (current === 'login' ? 'signup' : 'login'))}
          className="text-xs text-accent-blue hover:underline"
        >
          {mode === 'login' ? 'Need an account? Create one' : 'Already have an account? Sign in'}
        </button>
      </Card>
    </div>
  )
}
