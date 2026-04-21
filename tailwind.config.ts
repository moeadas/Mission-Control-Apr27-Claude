import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        base: 'var(--bg-base)',
        panel: 'var(--bg-panel)',
        card: 'var(--bg-card)',
        elevated: 'var(--bg-elevated)',
        border: 'var(--border)',
        'border-subtle': 'var(--border-subtle)',
        'border-glow': 'var(--border-glow)',
        'text-primary': 'var(--text-primary)',
        'text-secondary': 'var(--text-secondary)',
        'text-dim': 'var(--text-dim)',
        accent: {
          blue: 'var(--accent-blue)',
          purple: 'var(--accent-purple)',
          cyan: 'var(--accent-cyan)',
          orange: 'var(--accent-orange)',
          pink: 'var(--accent-pink)',
          yellow: 'var(--accent-yellow)',
        },
        semantic: {
          success: 'var(--color-success)',
          warning: 'var(--color-warning)',
          danger: 'var(--color-danger)',
          info: 'var(--color-info)',
        },
      },
      fontFamily: {
        heading: ['var(--font-heading)', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
        body: ['var(--font-body)', 'sans-serif'],
      },
      borderRadius: {
        sm: '8px',
        md: '12px',
        lg: '16px',
        xl: '24px',
        full: '9999px',
      },
      boxShadow: {
        card: '0 4px 24px rgba(0, 0, 0, 0.4)',
        'glow-blue': '0 0 20px rgba(79, 142, 247, 0.25)',
        'glow-purple': '0 0 20px rgba(155, 109, 255, 0.25)',
        'glow-cyan': '0 0 20px rgba(0, 212, 170, 0.25)',
      },
      animation: {
        'bot-idle': 'bot-idle 3s ease-in-out infinite',
        'bot-working': 'bot-working 1.2s ease-in-out infinite',
        'bot-thinking': 'bot-thinking 2s ease-in-out infinite',
        'bot-resting': 'bot-resting 4s ease-in-out infinite',
        'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
        'float': 'float 6s ease-in-out infinite',
        'slide-up': 'slide-up 0.2s ease-out',
        'slide-in-right': 'slide-in-right 0.25s ease-out',
        'fade-in': 'fade-in 0.3s ease-out',
        'scale-in': 'scale-in 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
        'shimmer': 'shimmer 1.8s ease-in-out infinite',
        'pulse-ring': 'pulse-ring 2s ease-out infinite',
        'typing-dot': 'typing-dot 1.4s infinite',
        'bubble-pop': 'bubble-pop 0.3s ease-out',
      },
      keyframes: {
        'bot-idle': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-4px)' },
        },
        'bot-working': {
          '0%, 100%': { transform: 'translateY(0) scale(1)' },
          '50%': { transform: 'translateY(-3px) scale(1.03)' },
        },
        'bot-thinking': {
          '0%, 100%': { transform: 'translateY(0)', opacity: '1' },
          '50%': { transform: 'translateY(-2px)', opacity: '0.8' },
        },
        'bot-resting': {
          '0%, 100%': { transform: 'translateY(0)', opacity: '0.5' },
          '50%': { transform: 'translateY(-2px)', opacity: '0.4' },
        },
        'glow-pulse': {
          '0%, 100%': { boxShadow: '0 0 8px var(--glow-color, rgba(79,142,247,0.3))' },
          '50%': { boxShadow: '0 0 20px var(--glow-color, rgba(79,142,247,0.6))' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        'slide-up': {
          '0%': { transform: 'translateY(16px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'slide-in-right': {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'scale-in': {
          '0%': { transform: 'scale(0.92)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        'shimmer': {
          '0%': { backgroundPosition: '200% 0' },
          '100%': { backgroundPosition: '-200% 0' },
        },
        'pulse-ring': {
          '0%': { boxShadow: '0 0 0 0 rgba(79, 142, 247, 0.4)' },
          '70%': { boxShadow: '0 0 0 8px rgba(79, 142, 247, 0)' },
          '100%': { boxShadow: '0 0 0 0 rgba(79, 142, 247, 0)' },
        },
        'typing-dot': {
          '0%, 60%, 100%': { content: '""' },
          '30%': { content: '"."' },
        },
        'bubble-pop': {
          '0%': { transform: 'scale(0.8) translateY(4px)', opacity: '0' },
          '100%': { transform: 'scale(1) translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}

export default config
