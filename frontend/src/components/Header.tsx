import "../styles/global.css";
import React, { useState } from "react";
import "../contexts/SidebarContexts";
import { useSidebar } from "../contexts/SidebarContexts";
import "../styles/Dashboard.css";

interface HeaderProps {
  onSearch?: (query: string) => void;
}

const Header: React.FC<HeaderProps> = ({ onSearch }) => {
  const { collapsed, toggleSidebar } = useSidebar();
  const [searchQuery, setSearchQuery] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    if (onSearch) onSearch(value);
  };

  return (
    <div className={`header ${collapsed ? 'collapsed' : ''}`}>
      
      {/* Кнопка-бургер для мобильных */}
      <button className="mobile-header-arrow" onClick={toggleSidebar}>
        <span className="burger-icon">
          <span />
          <span />
          <span />
        </span>
      </button>

      <div className="Search">
        <img src="/DashboardPage_Images/Search.jpg" className="Search-icon" alt="🔍" />
        <input 
          type="text"
          placeholder="Поиск по документам, номерам, отправителям"
          value={searchQuery}
          onChange={handleChange}
          className="Search-input"
        />
      </div>

      <button className="button-primary header-action-btn">
        <img src="/DashboardPage_Images/Upload.png" className="Casual-icon" alt="📩" />
      </button>
      <button className="button-secondary-with-border header-action-btn">
        <img src="/DashboardPage_Images/Scanner.png" className="Casual-icon" alt="☐" />
      </button>
      <button className="button-secondary header-action-btn">
        <img src="/DashboardPage_Images/Notifications.jpg" className="Casual-icon" alt="🔔" />
      </button>

      <div className="profile-block">
        <h5></h5>
        <h6 className="text-secondary"></h6>
      </div>
      <img src="/DashboardPage_Images/Profile.jpg" className="profile-image" alt="👤" />
    </div>
  );
};

export default Header;