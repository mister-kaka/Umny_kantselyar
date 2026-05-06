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
      <CSSTransition      /*   нужно скачать пару библиотек  npm install react-transition-group и  npm install --save-dev @types/react-transition-group    */
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

// type Preset = 'today' | 'last7' | 'all' | 'custom';

// interface DateFilterDropdownProps {
//   onFilterChange: (range: { from: string | null; to: string | null }) => void;
//   defaultLabel?: string;
//   icon?: React.ReactNode;
//   isOpen: boolean;
//   onToggle: () => void;
// }

// export const DateFilterDropdown: React.FC<DateFilterDropdownProps> = ({
//   onFilterChange,
//   defaultLabel = 'Дата',
//   icon,
//   isOpen,
//   onToggle,
// }) => {
//   const [activePreset, setActivePreset] = useState<Preset | null>(null);
//   const [customFrom, setCustomFrom] = useState('');
//   const [customTo, setCustomTo] = useState('');
//   const containerRef = useRef<HTMLDivElement>(null);
//   const menuRef = useRef<HTMLUListElement>(null);

//   const presets = {
//     today: { label: 'Сегодня', getRange: () => ({ from: new Date(), to: new Date() }) },
//     last7: { label: 'За последние 7 дней', getRange: () => ({ from: new Date(Date.now() - 6 * 86400000), to: new Date() }) },
//     all: { label: 'За всё время', getRange: () => ({ from: null, to: null }) },
//     custom: { label: 'Выберите свой диапазон', getRange: () => ({ from: customFrom || null, to: customTo || null }) },
//   };

//   const applyPreset = (preset: Preset) => {
//     setActivePreset(preset);
//     if (preset !== 'custom') {
//       const range = presets[preset].getRange();
//       onFilterChange({
//         from: range.from?.toISOString?.() || null,
//         to: range.to?.toISOString?.() || null,
//       });
//       onToggle();
//     }
//   };

//   const applyCustomRange = () => {
//     onFilterChange({ from: customFrom, to: customTo });
//     onToggle();
//   };

//   useEffect(() => {
//     const handleClickOutside = (e: MouseEvent) => {
//       const target = e.target as HTMLElement;
//       if (target.closest('.dropdown-button')) return;
//       if (containerRef.current && !containerRef.current.contains(target) && isOpen) {
//         onToggle();
//       }
//     };
//     document.addEventListener('mousedown', handleClickOutside);
//     return () => document.removeEventListener('mousedown', handleClickOutside);
//   }, [isOpen, onToggle]);

//   const getCurrentLabel = () => {
//     if (!activePreset) return defaultLabel;
//     if (activePreset === 'custom') return 'Диапазон';
//     return presets[activePreset].label;
//   };

//   const toggle = (e: React.MouseEvent) => {
//     e.stopPropagation();
//     onToggle();
//   };

//   return (
//     <div ref={containerRef} className="date-filter-dropdown">
//       <button className="dropdown-button" onClick={toggle}>
//         {icon && <span className="DropButt-icon">{icon}</span>}
//         {getCurrentLabel()}
//         <span className="arrow">{isOpen ? '▲' : '▼'}</span>
//       </button>
//       <CSSTransition       /*   нужно скачать пару библиотек  npm install react-transition-group и  npm install --save-dev @types/react-transition-group    */
//         in={isOpen}
//         timeout={200}
//         classNames="dropdown-animation"
//         unmountOnExit
//         nodeRef={menuRef}> 
//         <ul ref={menuRef} className="dropdown-menu">
//           {Object.entries(presets).map(([key, { label }]) => (
//             <li
//               key={key}
//               className={`dropdown-item ${activePreset === key ? 'active' : ''}`}
//               onClick={() => applyPreset(key as Preset)}>
//               {label}
//             </li>
//           ))}
//           {activePreset === 'custom' && (
//             <li className="no-hover custom-range-panel">
//               <input
//                 type="date"
//                 value={customFrom}
//                 onChange={(e) => setCustomFrom(e.target.value)}
//                 placeholder="с"/>
//               <span> – </span>
//               <input
//                 type="date"
//                 value={customTo}
//                 onChange={(e) => setCustomTo(e.target.value)}
//                 placeholder="по"/>
//               <button onClick={applyCustomRange} className="apply-button">
//                 Применить
//               </button>
//             </li>
//           )}
//         </ul>
//       </CSSTransition>
//     </div>
//   );
// };

export default DropdownButton;
