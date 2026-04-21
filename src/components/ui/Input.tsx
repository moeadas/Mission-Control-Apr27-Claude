import React from 'react'
import { clsx } from 'clsx'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export function Input({ label, error, className, ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-xs font-mono text-text-secondary uppercase tracking-wider">
          {label}
        </label>
      )}
      <input
        className={clsx(
          'w-full bg-base border border-border rounded-lg px-3 py-2 text-sm text-text-primary',
          'placeholder:text-text-dim',
          'focus:outline-none focus:border-accent-blue focus:ring-1 focus:ring-accent-blue/30',
          'transition-colors duration-150',
          error && 'border-red-500',
          className
        )}
        {...props}
      />
      {error && <span className="text-xs text-red-400">{error}</span>}
    </div>
  )
}

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
}

export function Textarea({ label, error, className, ...props }: TextareaProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-xs font-mono text-text-secondary uppercase tracking-wider">
          {label}
        </label>
      )}
      <textarea
        className={clsx(
          'w-full bg-base border border-border rounded-lg px-3 py-2 text-sm text-text-primary',
          'placeholder:text-text-dim font-mono leading-relaxed',
          'focus:outline-none focus:border-accent-blue focus:ring-1 focus:ring-accent-blue/30',
          'transition-colors duration-150',
          error && 'border-red-500',
          className
        )}
        {...props}
      />
      {error && <span className="text-xs text-red-400">{error}</span>}
    </div>
  )
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  options: { value: string; label: string }[]
}

export function Select({ label, options, className, ...props }: SelectProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-xs font-mono text-text-secondary uppercase tracking-wider">
          {label}
        </label>
      )}
      <select
        className={clsx(
          'w-full bg-base border border-border rounded-lg px-3 py-2 text-sm text-text-primary',
          'focus:outline-none focus:border-accent-blue focus:ring-1 focus:ring-accent-blue/30',
          'transition-colors duration-150 cursor-pointer',
          className
        )}
        {...props}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  )
}
