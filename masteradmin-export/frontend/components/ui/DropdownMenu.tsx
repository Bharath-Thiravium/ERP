import React, { useState, useRef, useEffect, createContext, useContext } from 'react'
import { createPortal } from 'react-dom'

const DropdownContext = createContext<{
  closeDropdown: () => void
} | null>(null)

interface DropdownMenuProps {
  trigger: React.ReactNode
  children: React.ReactNode
  align?: 'left' | 'right'
  className?: string
}

interface DropdownMenuItemProps {
  children: React.ReactNode
  onClick?: () => void
  className?: string
  variant?: 'default' | 'danger'
  disabled?: boolean
}

export const DropdownMenu: React.FC<DropdownMenuProps> = ({
  trigger,
  children,
  align = 'right',
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [position, setPosition] = useState({ top: 0, left: 0 })
  const triggerRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  
  const closeDropdown = () => setIsOpen(false)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    const handleScroll = () => {
      setIsOpen(false)
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleEscape)
      document.addEventListener('scroll', handleScroll, true)
      
      // Calculate position with better viewport handling
      if (triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect()
        const menuWidth = 220
        const menuHeight = 250
        const viewportWidth = window.innerWidth
        const viewportHeight = window.innerHeight
        const scrollY = window.scrollY
        const scrollX = window.scrollX
        const padding = 16
        
        // Default position below trigger
        let top = rect.bottom + scrollY + 8
        let left = align === 'right' 
          ? rect.right + scrollX - menuWidth
          : rect.left + scrollX
        
        // Adjust horizontal position if menu would go off-screen
        if (left + menuWidth > viewportWidth + scrollX - padding) {
          left = rect.right + scrollX - menuWidth
        }
        if (left < scrollX + padding) {
          left = scrollX + padding
        }
        
        // Adjust vertical position if menu would go off-screen
        const spaceBelow = viewportHeight + scrollY - rect.bottom
        const spaceAbove = rect.top + scrollY - scrollY
        
        if (spaceBelow < menuHeight + padding && spaceAbove > menuHeight + padding) {
          // Show above if there's more space above
          top = rect.top + scrollY - menuHeight - 8
        } else if (spaceBelow < menuHeight + padding) {
          // If not enough space above or below, position to fit in viewport
          top = Math.max(scrollY + padding, viewportHeight + scrollY - menuHeight - padding)
        }
        
        setPosition({ top, left })
      }
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
      document.removeEventListener('scroll', handleScroll, true)
    }
  }, [isOpen, align])

  const handleTriggerClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsOpen(!isOpen)
  }

  return (
    <>
      <div ref={triggerRef} onClick={handleTriggerClick} className="cursor-pointer inline-block">
        {trigger}
      </div>
      {isOpen &&
        createPortal(
          <div
            ref={menuRef}
            className={`fixed min-w-[220px] max-w-[280px] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl py-2 ${className}`}
            style={{
              top: position.top,
              left: position.left,
              zIndex: 'var(--z-dropdown)'
            }}
          >
            <DropdownContext.Provider value={{ closeDropdown }}>
              {children}
            </DropdownContext.Provider>
          </div>,
          document.body
        )}
    </>
  )
}

export const DropdownMenuItem: React.FC<DropdownMenuItemProps> = ({
  children,
  onClick,
  className = '',
  variant = 'default',
  disabled = false
}) => {
  const context = useContext(DropdownContext)
  const baseClasses = 'w-full px-4 py-3 text-left text-sm transition-all duration-200 flex items-center gap-3 font-medium'
  const variantClasses = {
    default: 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white',
    danger: 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-700 dark:hover:text-red-300'
  }
  const disabledClasses = 'opacity-50 cursor-not-allowed'

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!disabled && onClick) {
      onClick()
      // Close dropdown after click
      context?.closeDropdown()
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      className={`${baseClasses} ${variantClasses[variant]} ${disabled ? disabledClasses : ''} ${className}`}
    >
      {children}
    </button>
  )
}

export const DropdownMenuSeparator: React.FC = () => (
  <div className="h-px bg-gray-200 dark:bg-gray-700 my-2 mx-2" />
)
