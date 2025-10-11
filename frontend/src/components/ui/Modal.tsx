import React from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: string;
  trigger?: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, size = 'lg', trigger }) => {
  const [internalOpen, setInternalOpen] = React.useState(false)
  const actuallyOpen = isOpen !== undefined ? isOpen : internalOpen
  
  const handleClose = () => {
    if (isOpen === undefined) {
      setInternalOpen(false)
    }
    onClose?.()
  }
  
  if (!actuallyOpen) {
    return trigger ? (
      <div onClick={() => setInternalOpen(true)}>
        {trigger}
      </div>
    ) : null
  }

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl'
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="fixed inset-0 bg-black opacity-50" onClick={handleClose}></div>
        <div className={`relative bg-white rounded-lg shadow-xl ${sizeClasses[size as keyof typeof sizeClasses] || sizeClasses.lg} w-full`}>
          <div className="flex items-center justify-between p-4 border-b">
            <h3 className="text-lg font-semibold">{title}</h3>
            <button onClick={handleClose} className="text-gray-400 hover:text-gray-600">
              ×
            </button>
          </div>
          <div className="p-4">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};