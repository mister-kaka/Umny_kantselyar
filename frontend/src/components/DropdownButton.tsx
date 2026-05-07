import React, { useState, useRef, useEffect } from 'react';
import { CSSTransition } from 'react-transition-group';

interface DropdownButtonProps {
  options: string[];
  onSelect: (option: string) => void;
  icon?: React.ReactNode;
  defaultLabel?: string;
  isOpen: boolean;
  onToggle: () => void;
  selectedLabel?: string; 
}

 const DropdownButton: React.FC<DropdownButtonProps> = ({
  options,
  onSelect,
  defaultLabel = 'Выберите',
  icon,
  isOpen,
  onToggle,
  selectedLabel,
}) => {
  const [internalSelected, setInternalSelected] = useState(defaultLabel);
  const containerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);
  const selected = selectedLabel !== undefined ? selectedLabel : internalSelected

  const handleSelect = (option: string) => {
    if (selectedLabel === undefined) {
      setInternalSelected(option);
    }
    onSelect(option);
    onToggle(); 
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node) && isOpen) {
        onToggle();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onToggle]);

  const toggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggle();
  };

  return (
    <div ref={containerRef} className="dropdown">
      <button className="dropdown-button" onClick={toggle}>
        {icon && <span className="DropButt-icon">{icon}</span>}
        {selected}
        <span className="arrow">{isOpen ? '▲' : '▼'}</span>
      </button>
      <CSSTransition
        in={isOpen}
        timeout={200}
        classNames="dropdown-animation"
        unmountOnExit
        nodeRef={menuRef}>
        <ul ref={menuRef} className="dropdown-menu">
          {options.map((option, idx) => (
            <li
              key={idx}
              className={selected === option ? 'active' : ''}
              onClick={() => handleSelect(option)}>
              {option}
            </li>
          ))}
        </ul>
      </CSSTransition>
    </div>
  );
};

export default DropdownButton;
