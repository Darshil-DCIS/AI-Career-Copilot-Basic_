import React from 'react';

interface ProgressBarProps {
  value: number;
  max: number;
  colorClass?: string;
  label?: string;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ value, max, colorClass = 'bg-cyan-500', label }) => {
  const percentage = Math.min(100, (value / max) * 100);

  return (
    <div>
      {label && <div className="flex justify-between text-sm font-medium text-slate-300 mb-1.5">
        <span>{label}</span>
        <span>{value} / {max}</span>
        </div>}
      <div className="w-full bg-slate-700/50 rounded-full h-3">
        <div
          className={`${colorClass} h-3 rounded-full transition-all duration-500 relative overflow-hidden`}
          style={{ width: `${percentage}%` }}
        >
            <div className={`absolute top-0 left-0 h-full w-full opacity-50 ${colorClass} filter blur-md`}></div>
        </div>
      </div>
    </div>
  );
};

export default ProgressBar;