import React, {FC} from "react";
import "../styles/global.css"

interface CardProps {
  className?: string;
  title?: React.ReactNode;
  children?: React.ReactNode;
  onClick?: () => void;
}

const Card: FC<CardProps> =
 ({
    className = '',
    title,
    children,
    onClick
  }) => {
  return (
    <div style={{
      }}
      className={`card ${className}`}
      onClick={onClick}>
      <div className="card-header">
        {title && <div className="card-title">{title}</div>}       
      </div>
      {children}
    </div>
  );
};

export default Card
