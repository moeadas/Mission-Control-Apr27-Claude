import React from 'react'
import { clsx } from 'clsx'

interface CardProps {
  children: React.ReactNode
  className?: string
  hover?: boolean
  onClick?: () => void
  style?: React.CSSProperties
  padding?: 'none' | 'sm' | 'md' | 'lg'
}

export function Card({ 
  children, 
  className, 
  hover, 
  onClick, 
  style,
  padding = 'md',
}: CardProps) {
  const paddingClass = {
    none: '',
    sm: 'p-3',
    md: 'p-5',
    lg: 'p-6',
  }[padding]

  return (
    <div
      onClick={onClick}
      className={clsx(
        'mission-panel',
        paddingClass,
        hover && 'cursor-pointer transition-all duration-200 hover:border-[var(--border-glow)] hover:bg-[var(--bg-elevated)] hover:shadow-[var(--shadow-elevated)] hover:-translate-y-0.5',
        onClick && 'cursor-pointer',
        className
      )}
      style={style}
    >
      {children}
    </div>
  )
}
