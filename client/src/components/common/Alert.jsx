import React from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

const Alert = ({ type = 'info', message, onClose, className = '' }) => {
  const typeConfig = {
    success: {
      icon: CheckCircle,
      colors: 'bg-green-50 text-green-800 border-green-200',
      iconColor: 'text-green-400',
      closeColor: 'text-green-500 hover:bg-green-100'
    },
    error: {
      icon: XCircle,
      colors: 'bg-red-50 text-red-800 border-red-200',
      iconColor: 'text-red-400',
      closeColor: 'text-red-500 hover:bg-red-100'
    },
    warning: {
      icon: AlertTriangle,
      colors: 'bg-yellow-50 text-yellow-800 border-yellow-200',
      iconColor: 'text-yellow-400',
      closeColor: 'text-yellow-500 hover:bg-yellow-100'
    },
    info: {
      icon: Info,
      colors: 'bg-blue-50 text-blue-800 border-blue-200',
      iconColor: 'text-blue-400',
      closeColor: 'text-blue-500 hover:bg-blue-100'
    }
  };

  const config = typeConfig[type] || typeConfig.info;
  const Icon = config.icon;

  return (
    <div className={`rounded-md border p-4 ${config.colors} ${className}`}>
      <div className="flex">
        <div className="flex-shrink-0">
          <Icon className={`h-5 w-5 ${config.iconColor}`} aria-hidden="true" />
        </div>
        <div className="ml-3 flex-1 md:flex md:justify-between">
          <p className="text-sm">{message}</p>
        </div>
        {onClose && (
          <div className="ml-auto pl-3">
            <div className="-mx-1.5 -my-1.5">
              <button
                type="button"
                onClick={onClose}
                className={`inline-flex rounded-md p-1.5 focus:outline-none focus:ring-2 focus:ring-offset-2 ${config.closeColor}`}
              >
                <span className="sr-only">Dismiss</span>
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Alert;
