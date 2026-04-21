'use client'

import React from 'react'
import { clsx } from 'clsx'
import { BotAnimation } from '@/lib/types'

interface AgentBotProps {
  name: string
  avatar: string
  color: string
  photoUrl?: string
  variant?: 'default' | 'office'
  animation?: BotAnimation
  status?: 'active' | 'idle' | 'paused'
  size?: number
  showLabel?: boolean
  className?: string
  onClick?: () => void
}

// Cute robot face generator using the agent's unique color
function RobotFace({ color, size, animation }: { color: string; size: number; animation: BotAnimation }) {
  const headSize = size * 0.85
  const eyeY = headSize * 0.38
  const eyeSize = Math.max(3, headSize * 0.1)
  const mouthY = headSize * 0.62
  const antennaY = headSize * 0.08
  const earSize = headSize * 0.08
  const earY = headSize * 0.35

  // Determine expression based on animation
  const isWorking = animation === 'working'
  const isThinking = animation === 'thinking'
  const isAlert = animation === 'alert'

  // Eye style
  const eyeRadius = eyeSize
  const eyeYOffset = isThinking ? -1 : 0

  // Mouth style
  const mouthPath = isAlert
    ? `M ${headSize * 0.35} ${mouthY + 2} Q ${headSize * 0.5} ${mouthY - 2} ${headSize * 0.65} ${mouthY + 2}`
    : isWorking
    ? `M ${headSize * 0.35} ${mouthY + 1} Q ${headSize * 0.5} ${mouthY + 4} ${headSize * 0.65} ${mouthY + 1}`
    : `M ${headSize * 0.35} ${mouthY} Q ${headSize * 0.5} ${mouthY + 3} ${headSize * 0.65} ${mouthY}`

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ overflow: 'visible' }}
    >
      {/* Shadow */}
      <ellipse
        cx={size / 2}
        cy={size - 2}
        rx={headSize * 0.35}
        ry={3}
        fill={color}
        opacity={0.15}
      />

      {/* Ears */}
      <rect
        x={size * 0.08}
        y={earY - earSize / 2}
        width={earSize * 0.8}
        height={earSize}
        rx={earSize * 0.3}
        fill={color}
        opacity={0.7}
      />
      <rect
        x={size - size * 0.08 - earSize * 0.8}
        y={earY - earSize / 2}
        width={earSize * 0.8}
        height={earSize}
        rx={earSize * 0.3}
        fill={color}
        opacity={0.7}
      />

      {/* Head */}
      <rect
        x={(size - headSize) / 2}
        y={(size - headSize) / 2}
        width={headSize}
        height={headSize * 0.8}
        rx={headSize * 0.25}
        fill={color}
      />

      {/* Face screen */}
      <rect
        x={(size - headSize) * 0.5 + headSize * 0.12}
        y={size * 0.22}
        width={headSize * 0.76}
        height={headSize * 0.5}
        rx={headSize * 0.1}
        fill="#09090b"
      />

      {/* Eyes */}
      <circle
        cx={size * 0.38}
        cy={eyeY + eyeYOffset}
        r={eyeRadius}
        fill={color}
        className={isWorking || isThinking ? 'animate-bot-working' : ''}
      />
      <circle
        cx={size * 0.62}
        cy={eyeY + eyeYOffset}
        r={eyeRadius}
        fill={color}
        className={isWorking || isThinking ? 'animate-bot-working' : ''}
      />

      {/* Eye shine */}
      <circle
        cx={size * 0.38 - eyeRadius * 0.3}
        cy={eyeY + eyeYOffset - eyeRadius * 0.3}
        r={eyeRadius * 0.35}
        fill="white"
        opacity={0.5}
      />
      <circle
        cx={size * 0.62 - eyeRadius * 0.3}
        cy={eyeY + eyeYOffset - eyeRadius * 0.3}
        r={eyeRadius * 0.35}
        fill="white"
        opacity={0.5}
      />

      {/* Mouth */}
      <path
        d={mouthPath}
        stroke={color}
        strokeWidth={Math.max(1.5, headSize * 0.04)}
        strokeLinecap="round"
        fill="none"
      />

      {/* Antenna */}
      <line
        x1={size / 2}
        y1={(size - headSize) / 2}
        x2={size / 2}
        y2={antennaY}
        stroke={color}
        strokeWidth={Math.max(1.5, headSize * 0.04)}
        strokeLinecap="round"
        opacity={0.6}
      />
      <circle
        cx={size / 2}
        cy={antennaY}
        r={Math.max(2, headSize * 0.05)}
        fill={color}
        className={isAlert ? 'animate-bot-alert' : ''}
      />

      {/* Cheek blush for friendly look */}
      <circle
        cx={size * 0.24}
        cy={mouthY - headSize * 0.05}
        r={headSize * 0.04}
        fill={color}
        opacity={0.2}
      />
      <circle
        cx={size * 0.76}
        cy={mouthY - headSize * 0.05}
        r={headSize * 0.04}
        fill={color}
        opacity={0.2}
      />
    </svg>
  )
}

const ANIMATION_CLASSES: Record<BotAnimation, string> = {
  idle: 'animate-bot-idle',
  working: 'animate-bot-working',
  thinking: 'animate-bot-thinking',
  resting: '',
  alert: 'animate-bot-alert',
}

export function AgentBot({
  name,
  avatar,
  color,
  photoUrl,
  variant = 'default',
  animation = 'idle',
  status = 'active',
  size = 48,
  showLabel = false,
  className,
  onClick,
}: AgentBotProps) {
  const [imageFailed, setImageFailed] = React.useState(false)
  React.useEffect(() => {
    setImageFailed(false)
  }, [photoUrl])

  const statusColor =
    status === 'active' ? '#2dd4bf' :
    status === 'idle' ? '#fbbf24' : '#52525b'

  const glowOpacity =
    status === 'active' ? 0.25 :
    status === 'idle' ? 0.12 : 0

  const isOfficeVariant = variant === 'office'

  return (
    <div
      className={clsx('flex flex-col items-center gap-1', className)}
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : undefined }}
    >
      {/* Bot container */}
      <div
        className={clsx(
          'relative flex items-center justify-center transition-all duration-200',
          ANIMATION_CLASSES[animation],
          status === 'paused' && 'opacity-40 grayscale',
          status === 'idle' && 'opacity-80',
          onClick && 'hover:scale-110'
        )}
        style={{
          width: isOfficeVariant ? size : size + 4,
          height: isOfficeVariant ? size : size + 4,
          borderRadius: isOfficeVariant ? 0 : (size + 4) * 0.25,
          background: isOfficeVariant
            ? 'transparent'
            : `radial-gradient(circle at 50% 40%, ${color}${Math.round(glowOpacity * 255).toString(16).padStart(2, '0')}, transparent 70%)`,
          boxShadow: isOfficeVariant || status === 'paused' ? undefined : `0 0 ${size * 0.3}px ${color}30`,
        }}
      >
        {/* Status dot */}
        <div
          className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-[var(--bg-card)]"
          style={{
            background: statusColor,
            boxShadow: status === 'active' ? `0 0 6px ${statusColor}` : 'none',
          }}
        />

        {/* Portrait or default robot face */}
        {photoUrl && !imageFailed ? (
          <div
            style={{
              width: size,
              height: size,
              borderRadius: isOfficeVariant ? 0 : size * 0.24,
              overflow: 'hidden',
              border: isOfficeVariant ? 'none' : `1px solid ${color}35`,
              background: isOfficeVariant ? 'transparent' : `linear-gradient(180deg, ${color}18, transparent)`,
              filter: isOfficeVariant ? 'drop-shadow(0 8px 12px rgba(15, 23, 42, 0.22))' : undefined,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photoUrl}
              alt={name}
              onError={() => setImageFailed(true)}
              style={{
                width: '100%',
                height: '100%',
                objectFit: isOfficeVariant ? 'contain' : 'cover',
                display: 'block',
              }}
            />
          </div>
        ) : (
          <RobotFace color={color} size={size} animation={animation} />
        )}

        {/* Working dots */}
        {animation === 'working' && (
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
            {[0, 200, 400].map((delay, i) => (
              <span
                key={i}
                className="w-1 h-1 rounded-full animate-typing-dot"
                style={{
                  background: color,
                  animationDelay: `${delay}ms`,
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Label */}
      {showLabel && (
        <span
          className="text-[10px] font-medium text-[var(--text-secondary)] text-center max-w-full truncate"
          style={{ color: `${color}cc` }}
        >
          {name}
        </span>
      )}
    </div>
  )
}
