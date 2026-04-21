import React from 'react'
import { clsx } from 'clsx'

interface SliderProps {
  label?: string
  value: number
  onChange: (v: number) => void
  min?: number
  max?: number
  step?: number
  showValue?: boolean
  className?: string
}

export function Slider({
  label,
  value,
  onChange,
  min = 0,
  max = 2,
  step = 0.1,
  showValue = true,
  className,
}: SliderProps) {
  return (
    <div className={clsx('flex flex-col gap-2', className)}>
      <div className="flex items-center justify-between">
        {label && (
          <label className="text-xs font-mono text-text-secondary uppercase tracking-wider">
            {label}
          </label>
        )}
        {showValue && (
          <span className="text-xs font-mono text-accent-blue">{value.toFixed(1)}</span>
        )}
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-1.5 bg-border rounded-full appearance-none cursor-pointer accent-accent-blue"
        style={{
          background: `linear-gradient(to right, var(--accent-blue) 0%, var(--accent-blue) ${
            ((value - min) / (max - min)) * 100
          }%, var(--border) ${((value - min) / (max - min)) * 100}%, var(--border) 100%)`,
        }}
      />
    </div>
  )
}
