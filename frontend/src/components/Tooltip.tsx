import React from 'react';

interface TooltipProps {
  text: string;
  children: React.ReactNode;
}

const Tooltip: React.FC<TooltipProps> = ({ text, children }) => {
  return (
    <span className="tooltip-wrapper" data-tooltip={text}>
      {children}
    </span>
  );
};

export default Tooltip;