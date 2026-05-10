import React from 'react';
import { AlertTriangle, Trash2, XCircle, CheckCircle, Info } from 'lucide-react';

type ConfirmVariant = 'danger' | 'warning' | 'info' | 'success';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmVariant;
  onConfirm: () => void;
  onCancel: () => void;
}

const VARIANT_CONFIG: Record<ConfirmVariant, { icon: React.ElementType; iconColor: string; btnColor: string }> = {
  danger:  { icon: Trash2,         iconColor: 'text-red-500',    btnColor: 'bg-red-600 hover:bg-red-700 text-white' },
  warning: { icon: AlertTriangle,  iconColor: 'text-amber-500',  btnColor: 'bg-amber-500 hover:bg-amber-600 text-white' },
  info:    { icon: Info,           iconColor: 'text-blue-500',   btnColor: 'bg-blue-600 hover:bg-blue-700 text-white' },
  success: { icon: CheckCircle,    iconColor: 'text-green-500',  btnColor: 'bg-green-600 hover:bg-green-700 text-white' },
};

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen, title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel',
  variant = 'danger', onConfirm, onCancel,
}) => {
  if (!isOpen) return null;
  const { icon: Icon, iconColor, btnColor } = VARIANT_CONFIG[variant];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md mx-4 p-6 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-start gap-4">
          <div className={`mt-0.5 shrink-0 ${iconColor}`}>
            <Icon className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">{title}</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{message}</p>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${btnColor}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
