import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

interface ModalProps {
  open?: boolean
  isOpen?: boolean
  visible?: boolean
  onClose: () => void
  title?: string | React.ReactNode
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl'
  className?: string
  overlayClassName?: string
  maskClosable?: boolean
  disableEsc?: boolean
  keepMounted?: boolean
  trigger?: React.ReactNode
  footer?: React.ReactNode
  scope?: 'window' | 'content'
  bodyClassName?: string
}

const sizeClasses: Record<NonNullable<ModalProps['size']>, string> = {
  sm: 'md:max-w-sm',
  md: 'md:max-w-lg',
  lg: 'md:max-w-2xl',
  xl: 'md:max-w-4xl',
  '2xl': 'md:max-w-5xl',
  '3xl': 'md:max-w-6xl',
  '4xl': 'md:max-w-7xl'
}

function getModalRoot(scope: 'window' | 'content') {
  if (scope === 'content') {
    return document.getElementById('content-modal-root') || document.getElementById('main-content') || document.body
  }
  return document.getElementById('modal-root') || document.body
}

export const Modal: React.FC<ModalProps> = ({ 
  open,
  isOpen,
  visible,
  onClose, 
  title, 
  children, 
  size = 'xl',
  className = '',
  overlayClassName = '',
  maskClosable = true,
  disableEsc = false,
  keepMounted = false,
  trigger,
  footer,
  scope = 'content',
  bodyClassName = ''
}) => {
  const [internalOpen, setInternalOpen] = React.useState(false)
  const [contentRect, setContentRect] = useState<DOMRect | null>(null)
  const modalRef = useRef<HTMLDivElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)
  const titleIdRef = useRef(`modal-title-${Math.random().toString(36).slice(2)}`)

  // Support multiple open prop names for backward compatibility
  const isModalOpen = open ?? isOpen ?? visible ?? internalOpen

  const handleClose = useCallback(() => {
    if (open === undefined && isOpen === undefined && visible === undefined) {
      setInternalOpen(false)
    }
    onClose?.()
  }, [open, isOpen, visible, onClose])

  // Get content bounds for content-scoped modals
  useEffect(() => {
    if (!isModalOpen || scope !== 'content') {
      setContentRect(null)
      return
    }

    const mainContent = document.getElementById('main-content')
    if (!mainContent) {
      setContentRect(null)
      return
    }

    let frameId: number | null = null
    const updateContentRect = () => {
      if (frameId) return
      frameId = window.requestAnimationFrame(() => {
        frameId = null
        setContentRect(mainContent.getBoundingClientRect())
      })
    }

    updateContentRect()

    window.addEventListener('resize', updateContentRect)
    window.addEventListener('scroll', updateContentRect, true)

    const resizeObserver = new ResizeObserver(updateContentRect)
    resizeObserver.observe(mainContent)

    return () => {
      if (frameId) {
        window.cancelAnimationFrame(frameId)
      }
      window.removeEventListener('resize', updateContentRect)
      window.removeEventListener('scroll', updateContentRect, true)
      resizeObserver.disconnect()
    }
  }, [isModalOpen, scope])

  // Body scroll lock
  useEffect(() => {
    if (isModalOpen) {
      previousFocusRef.current = document.activeElement as HTMLElement
      const prevOverflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'

      // Focus first focusable element
      setTimeout(() => {
        const firstFocusable = modalRef.current?.querySelector(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        ) as HTMLElement
        firstFocusable?.focus()
      }, 100)

      return () => {
        document.body.style.overflow = prevOverflow
        previousFocusRef.current?.focus()
      }
    }
  }, [isModalOpen])

  // ESC key handler
  useEffect(() => {
    if (!isModalOpen || disableEsc) return

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose()
      }
    }

    document.addEventListener('keydown', handleEsc)
    return () => document.removeEventListener('keydown', handleEsc)
  }, [isModalOpen, disableEsc, handleClose])

  // Focus trap
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== 'Tab') return

    const focusableElements = modalRef.current?.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    if (!focusableElements?.length) return

    const firstElement = focusableElements[0] as HTMLElement
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement

    if (e.shiftKey) {
      if (document.activeElement === firstElement) {
        lastElement.focus()
        e.preventDefault()
      }
    } else {
      if (document.activeElement === lastElement) {
        firstElement.focus()
        e.preventDefault()
      }
    }
  }

  if (!isModalOpen && !keepMounted) {
    return trigger ? (
      <div onClick={() => setInternalOpen(true)}>
        {trigger}
      </div>
    ) : null
  }

  if (!isModalOpen && keepMounted) {
    return null
  }

  const wrapperStyle = useMemo(() => {
    if (scope === 'content' && contentRect) {
      return {
        position: 'fixed' as const,
        left: contentRect.left,
        top: contentRect.top,
        width: contentRect.width,
        height: contentRect.height
      }
    }
    return {
      position: 'fixed' as const,
      inset: 0
    }
  }, [scope, contentRect])

  const modalContent = (
    <div
      className={`z-[var(--z-modal)] ${overlayClassName}`}
      style={wrapperStyle}
      aria-modal="true"
      role="dialog"
      aria-labelledby={title ? titleIdRef.current : undefined}
      onKeyDown={handleKeyDown}
    >
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/40 z-[var(--z-modal)]"
        onClick={maskClosable ? handleClose : undefined}
      />

      {/* Modal Container */}
      <div className="absolute inset-0 flex items-center justify-center z-[var(--z-modal)] overflow-auto" style={{ padding: 'var(--space-4) var(--space-6)' }}>
        <div
          ref={modalRef}
          className={`w-full max-w-[92%] ${sizeClasses[size]} max-h-[calc(100vh-64px)] flex flex-col overflow-hidden rounded-xl bg-white dark:bg-gray-800 shadow-lg z-[var(--z-modal-panel)] my-auto ${className}`}
          onClick={(e) => e.stopPropagation()}
        >
          {title && (
            <div className="border-b border-gray-200 dark:border-gray-700 flex items-center justify-between shrink-0" style={{ padding: 'var(--space-6) var(--space-6) var(--space-4) var(--space-6)' }}>
              <div id={titleIdRef.current} className="text-lg font-semibold text-gray-900 dark:text-white">
                {title}
              </div>
              <button
                onClick={handleClose}
                className="p-1 text-gray-400 hover:text-gray-600 dark:text-gray-300 dark:hover:text-gray-100 rounded"
                aria-label="Close modal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          )}

          <div className={`overflow-auto flex-1 ${bodyClassName}`} style={{ padding: 'var(--space-5) var(--space-6)' }}>
            {children}
          </div>

          {footer && (
            <div className="border-t border-gray-200 dark:border-gray-700 flex justify-end shrink-0" style={{ padding: 'var(--space-3) var(--space-6)' }}>
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  )

  return createPortal(modalContent, getModalRoot(scope))
}
