import "../styles/global.css";
import React, { useState } from "react";
import "../contexts/SidebarContexts";
import { useSidebar } from "../contexts/SidebarContexts";
import "../styles/Dashboard.css";

interface HeaderProps {
  onSearch?: (query: string) => void;
}

const Header: React.FC<HeaderProps> = ({ onSearch }) => {
  // ДОБАВЛЕНО: достаем toggleSidebar для мобильной кнопки
  const { collapsed, toggleSidebar } = useSidebar();
  const [searchQuery, setSearchQuery] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    if (onSearch) onSearch(value);
  };

  return (
    <div className={`header ${collapsed ? 'collapsed' : ''}`}>
      
      {/* ДОБАВЛЕНО: мобильная кнопка (показывается только на экранах < 720px) */}
      <button className="mobile-header-arrow" onClick={toggleSidebar}>
        <img src="/DashboardPage_Images/Arrow.svg" alt="←" />
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
      <button className="button-primary">
        <img src="/DashboardPage_Images/Upload.png" className="Casual-icon" alt="📩" />
      </button>
      <button className="button-secondary-with-border">
        <img src="/DashboardPage_Images/Scanner.png" className="Casual-icon" alt="☐" />
      </button>
      <button className="button-secondary">
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