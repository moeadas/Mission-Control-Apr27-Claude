import React from 'react'
import { clsx } from 'clsx'

interface BadgeProps {
  children: React.ReactNode
  color?: string
  variant?: 'solid' | 'outline'
  size?: 'sm' | 'md'
  className?: string
}

export function Badge({ children, color = '#4f8ef7', variant = 'solid', size = 'sm', className }: BadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center font-mono font-medium rounded-full',
        size === 'sm' && 'px-2 py-0.5 text-[10px]',
        size === 'md' && 'px-3 py-1 text-xs',
        variant === 'outline' && 'border',
        className
      )}
      style={
        variant === 'solid'
          ? { backgroundColor: `${color}25`, color }
          : { borderColor: `${color}60`, color }
      }
    >
      {children}
    </span>
  )
}
