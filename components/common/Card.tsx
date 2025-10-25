import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  // FIX: Added optional onClick handler to CardProps to allow the component to be clickable.
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
}

const Card: React.FC<CardProps> = ({ children, className = '', onClick }) => {
  return (
    <div 
      onClick={onClick}
      className={`bg-slate-800/60 bg-gradient-to-br from-slate-800/60 to-slate-900/50 border border-slate-700/80 rounded-2xl shadow-2xl shadow-black/20 backdrop-blur-lg p-6 transition-all duration-300 ${onClick ? 'hover:border-teal-500/60 hover:shadow-2xl hover:shadow-teal-500/10 cursor-pointer' : ''} ${className}`}
    >
      {children}
    </div>
  );
};

export default Card;
