import "../styles/global.css"
import React, { useState } from "react";
import "../contexts/SidebarContexts"
import { useSidebar } from "../contexts/SidebarContexts";

interface HeaderProps {
  onSearch?: (query: string) => void;
}

const Header: React.FC<HeaderProps> = ({ onSearch }) => {
  const { collapsed } = useSidebar();
  const [searchQuery, setSearchQuery] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    if (onSearch) onSearch(value);
  };
  return (
    <div className={`header ${collapsed ? 'collapsed' : ''}`}>
      <div className="Search">
        <img src="" className="Search-icon" alt="" />
        <input 
        type="text"
        placeholder="Поиск по документам, номерам, отправителям"
        value={searchQuery}
        onChange={handleChange}
        className="Search-input">
        </input>
      </div>
      <button className="button-primary" style={{marginRight: "11px"}}>
        <img src="" className="Casual-icon" alt="" />
      </button>
      <button className="button-secondary" style={{border: " 1px solid var(--border-color)", marginRight: "11px"}}>
        <img src="" className="Casual-icon" alt="" />
      </button>
      <button className="button-secondary" style={{marginRight: "11px"}}>
        <img src="" className="Casual-icon" alt="" />
      </button>
      <div 
      style={{
        display: "block",
        alignContent: "center",
        justifyItems: "right",
        paddingLeft: "11px",
        height: "var(--sidebarButtAndHeaderButt-height)",
        borderLeft: "1px solid var(--border-color)"
      }}>
        <h5>{}Иванов И.И.</h5>
        <p><h6 className="text-secondary">{}Администратор</h6></p>
      </div>
      <img src="" style={{width: "38px", height: "38px", marginLeft: "11px"}} />
    </div>
  );
};

export default Header
