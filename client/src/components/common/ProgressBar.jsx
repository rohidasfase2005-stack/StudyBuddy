import React from 'react';

const ProgressBar = ({
  value = 0,
  label,
  showPercentage = false,
  color = 'indigo',
  size = 'md',
  animated = false,
  className = ''
}) => {
  const normalizedValue = Math.min(Math.max(value, 0), 100);

  const sizeClasses = {
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-4'
  };

  const colorClasses = {
    indigo: 'bg-indigo-600',
    green: 'bg-green-600',
    red: 'bg-red-600',
    blue: 'bg-blue-600',
    yellow: 'bg-yellow-400'
  };

  return (
    <div className={`w-full ${className}`}>
      {(label || showPercentage) && (
        <div className="flex justify-between items-center mb-1">
          {label && <span className="text-sm font-medium text-gray-700">{label}</span>}
          {showPercentage && <span className="text-sm font-medium text-gray-700">{normalizedValue}%</span>}
        </div>
      )}
      <div className={`w-full bg-gray-200 rounded-full overflow-hidden ${sizeClasses[size]}`}>
        <div
          className={`${colorClasses[color]} h-full rounded-full transition-all duration-300 ease-in-out ${animated ? 'animate-pulse' : ''}`}
          style={{ width: `${normalizedValue}%` }}
        />
      </div>
    </div>
  );
};

export default ProgressBar;
