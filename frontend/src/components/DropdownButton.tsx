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

type Preset = 'today' | 'last7' | 'all' | 'custom';

interface DateFilterDropdownProps {
  onFilterChange: (range: { from: string | null; to: string | null }) => void;
  defaultLabel?: string;
  icon?: React.ReactNode;
  isOpen: boolean;
  onToggle: () => void;
  selectedLabel?: string;
}

export const DateFilterDropdown: React.FC<DateFilterDropdownProps> = ({
  onFilterChange,
  defaultLabel = 'Дата',
  icon,
  isOpen,
  onToggle,
  selectedLabel,
}) => {
  const [activePreset, setActivePreset] = useState<Preset | null>(null);
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);

  const getStartOfDay = (date: Date) => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
  };

  const getEndOfDay = (date: Date) => {
    const d = new Date(date);
    d.setHours(23, 59, 59, 999);
    return d;
  };

  const presets: Record<Preset, { label: string; getRange: () => { from: Date | null; to: Date | null } }> = {
    today: {
      label: 'Сегодня',
      getRange: () => {
        const now = new Date();
        return { from: getStartOfDay(now), to: getEndOfDay(now) };
      },
    },
    last7: {
      label: 'Последние 7 дней',
      getRange: () => {
        const now = new Date();
        return { from: getStartOfDay(new Date(now.getTime() - 6 * 86400000)), to: getEndOfDay(now) };
      },
    },
    all: {
      label: 'За всё время',
      getRange: () => ({ from: null, to: null }),
    },
    custom: {
      label: 'Свой диапазон',
      getRange: () => {
        const from = customFrom ? getStartOfDay(new Date(customFrom)) : null;
        const to = customTo ? getEndOfDay(new Date(customTo)) : null;
        return { from, to };
      },
    },
  };

  const applyPreset = (preset: Preset) => {
    setActivePreset(preset);
    if (preset !== 'custom') {
      const range = presets[preset].getRange();
      onFilterChange({
        from: range.from ? formatDate(range.from) : null,
        to: range.to ? formatDate(range.to) : null,
      });
      onToggle();
    }
  };

  const applyCustomRange = () => {
    const range = presets.custom.getRange();
    onFilterChange({
      from: range.from ? formatDate(range.from) : null,
      to: range.to ? formatDate(range.to) : null,
    });
    onToggle();
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('.dropdown-button')) return;
      if (containerRef.current && !containerRef.current.contains(target) && isOpen) {
        onToggle();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onToggle]);

  const getCurrentLabel = () => {
    if (selectedLabel) return selectedLabel;
    if (!activePreset) return defaultLabel;
    if (activePreset === 'custom') return 'Диапазон';
    return presets[activePreset].label;
  };

  const toggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggle();
  };

  const formatDate = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
  };

  return (
    <div ref={containerRef} className="date-filter-dropdown">
      <button className="dropdown-button" onClick={toggle}>
        {icon && <span className="DropButt-icon">{icon}</span>}
        {getCurrentLabel()}
        <span className="arrow">{isOpen ? '▲' : '▼'}</span>
      </button>
      <CSSTransition
        in={isOpen}
        timeout={200}
        classNames="dropdown-animation"
        unmountOnExit
        nodeRef={menuRef}>
        <ul ref={menuRef} className="dropdown-menu">
          {Object.entries(presets).map(([key, { label }]) => (
            <li
              key={key}
              className={`dropdown-item ${activePreset === key ? 'active' : ''}`}
              onClick={() => applyPreset(key as Preset)}>
              {label}
            </li>
          ))}
          {activePreset === 'custom' && (
            <li className="no-hover custom-range-panel">
              <input
                type="date"
                className='calendarik'
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                placeholder="с"/>
              <span> – </span>
              <input
                type="date"
                className='calendarik'
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                placeholder="по"/>
              <button onClick={applyCustomRange} className="apply-button">
                Применить
              </button>
            </li>
          )}
        </ul>
      </CSSTransition>
    </div>
  );
};

export default DropdownButton;