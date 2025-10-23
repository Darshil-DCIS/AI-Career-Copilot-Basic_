import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

const Card: React.FC<CardProps> = ({ children, className = '' }) => {
  return (
    <div 
      className={`bg-slate-800/60 bg-gradient-to-br from-slate-800/60 to-slate-900/50 border border-slate-700/80 rounded-2xl shadow-2xl shadow-black/20 backdrop-blur-lg p-6 ${className}`}
    >
      {children}
    </div>
  );
};

export default Card;