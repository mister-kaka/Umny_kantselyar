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
        <img src="" className="Search-icon" alt="🔍" />
        <input 
        type="text"
        placeholder="Поиск по документам, номерам, отправителям"
        value={searchQuery}
        onChange={handleChange}
        className="Search-input">
        </input>
      </div>
      <button className="button-primary">
        <img src="/kartinochki(vremennie)/Upload.png" className="Casual-icon" alt="📩" />
      </button>
      <button className="button-secondary-with-border">
        <img src="/kartinochki(vremennie)/Full_screen.png" className="Casual-icon" alt="☐" />
      </button>
      <button className="button-secondary">
        <img src="/kartinochki(vremennie)/Notifications.jpg" className="Casual-icon" alt="🔔" />
      </button>
      {/* <div className="profile-info">
        <h5>Иванов И.И.</h5>
        <h6 className="text-secondary">Администратор</h6>
      </div> */}
      <img src="https://i.pinimg.com/originals/3e/1d/2c/3e1d2cd96b7c93d45577d630a7fdc129.jpg" className="profile-image" alt="👤" />
    </div>
  );
};

export default Header
