import "../styles/global.css"
import React, { useState } from "react";
import "../contexts/SidebarContexts"
import { useSidebar } from "../contexts/SidebarContexts";
import "../styles/Dashboard.css"

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
        <img src="/Dashboard_Images/Search.jpg" className="Search-icon" alt="🔍" />
        <input 
        type="text"
        placeholder="Поиск по документам, номерам, отправителям"
        value={searchQuery}
        onChange={handleChange}
        className="Search-input">
        </input>
      </div>
      <button className="button-primary">
        <img src="/Dashboard_Images/Upload.png" className="Casual-icon" alt="📩" />
      </button>
      <button className="button-secondary-with-border">
        <img src="/Dashboard_Images/Scanner.png" className="Casual-icon" alt="☐" />
      </button>
      <button className="button-secondary">
        <img src="/Dashboard_Images/Notifications.jpg" className="Casual-icon" alt="🔔" />
      </button>
      <div className="profile-block">
        <h5></h5>
        <p><h6 className="text-secondary"></h6></p>
      </div>
      <img src="/Dashboard_Images/Profile.jpg" className="profile-image" alt="👤" />
    </div>
  );
};

export default Header
