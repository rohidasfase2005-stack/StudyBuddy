import React from 'react';

const Card = ({ children, className = '', title, icon: Icon, value, subtitle, onClick, ...rest }) => {
  const baseClasses = 'bg-white rounded-xl shadow-sm border border-gray-200 p-6';
  const interactionClasses = onClick ? 'cursor-pointer transition-shadow hover:shadow-md' : '';

  if (value !== undefined) {
    return (
      <div className={`${baseClasses} ${interactionClasses} ${className}`} onClick={onClick} {...rest}>
        <div className="flex items-center justify-between mb-4">
          {title && <h3 className="text-sm font-medium text-gray-500 truncate">{title}</h3>}
          {Icon && <Icon className="h-5 w-5 text-gray-400" />}
        </div>
        <div className="text-3xl font-bold text-gray-900">{value}</div>
        {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
        {children}
      </div>
    );
  }

  return (
    <div className={`${baseClasses} ${interactionClasses} ${className}`} onClick={onClick} {...rest}>
      {title && (
        <div className="flex items-center mb-4">
          {Icon && <Icon className="h-6 w-6 text-gray-400 mr-2" />}
          <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
        </div>
      )}
      {children}
    </div>
  );
};

export default Card;
