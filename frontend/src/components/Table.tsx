import React, {FC} from "react";
import "../styles/global.css"
import "../styles/Dashboard.css"

interface TableProps {
  className?: string;
  title?: React.ReactNode;
  rightTitle?: React.ReactNode;
  children?: React.ReactNode;
  onClick?: () => void;
}

const Table: FC<TableProps> =
 ({
    className = '',
    title,
    rightTitle,
    children,
    onClick
  }) => {
  return (
    <div
      className={className}
      onClick={onClick}>
      {(title || rightTitle) && (
        <div className="table-header">
          {title && <div className="table-title">{title}</div>}
          {rightTitle && <div className="table-right-title">{rightTitle}</div>}
        </div>
      )}
      <div className="table-wrapper">
        <table className="data-table">{children}</table>
      </div>
    </div>
  );
};

export default Table
