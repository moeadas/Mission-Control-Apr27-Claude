import React, { useEffect } from 'react'
import { clsx } from 'clsx'
import { X } from 'lucide-react'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

export function Modal({ isOpen, onClose, title, children, size = 'md' }: ModalProps) {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) {
      document.addEventListener('keydown', handleEsc)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleEsc)
      document.body.style.overflow = ''
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div className="form-backdrop" onClick={onClose}>
      {/* Panel */}
      <div
        className={clsx(
          'form-panel max-h-[85vh]',
          size === 'sm' && 'max-w-sm',
          size === 'md' && 'max-w-lg',
          size === 'lg' && 'max-w-2xl',
          size === 'xl' && 'max-w-4xl'
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div className="form-header">
            <p className="form-header-title">{title}</p>
            <button onClick={onClose} className="form-close-btn">
              <X size={18} />
            </button>
          </div>
        )}
        <div className="form-body">{children}</div>
      </div>
    </div>
  )
}
