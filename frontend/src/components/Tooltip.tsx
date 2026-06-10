import React from 'react';

interface TooltipProps {
  text: string;
  children: React.ReactNode;
  position?: 'top' | 'bottom';
}

const Tooltip: React.FC<TooltipProps> = ({ text, children, position = 'top' }) => {
  return (
    <span className={`tooltip-wrapper tooltip-${position}`} data-tooltip={text}>
      {children}
    </span>
  );
};

export default Tooltip;