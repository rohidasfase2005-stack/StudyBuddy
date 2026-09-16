import React from 'react';
import Button from './Button';

const EmptyState = ({ icon: Icon, title, description, actionLabel, onAction, className = '' }) => {
  return (
    <div className={`text-center py-12 px-4 sm:px-6 lg:px-8 ${className}`}>
      {Icon && (
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100">
          <Icon className="h-6 w-6 text-indigo-600" aria-hidden="true" />
        </div>
      )}
      <h3 className="mt-2 text-sm font-semibold text-gray-900">{title}</h3>
      <p className="mt-1 text-sm text-gray-500">{description}</p>
      {actionLabel && onAction && (
        <div className="mt-6">
          <Button onClick={onAction} variant="primary">
            {actionLabel}
          </Button>
        </div>
      )}
    </div>
  );
};

export default EmptyState;
