import "../styles/global.css";
import "../styles/Search.css";
import "../contexts/SidebarContexts";
import { useSidebar } from "../contexts/SidebarContexts";
import "../styles/Dashboard.css";
import Search from "./Search";
import { useNavigate } from "react-router-dom";
import "../styles/Header.css";
import { useState } from "react";
import Scanner from "./SubPages/Scanner";
import Tooltip from "./Tooltip";

const Header = () => {
  const { collapsed, toggleSidebar } = useSidebar();
  const navigate = useNavigate();
  const [showScanner, setShowScanner] = useState(false);
  
  return (
    <div className={`header ${collapsed ? 'collapsed' : ''}`}>

      {showScanner && <Scanner onClose={() => setShowScanner(false)} />}
      
      <button className="mobile-header-arrow" onClick={toggleSidebar}>
        <span className="burger-icon">
          <span />
          <span />
          <span />
        </span>
      </button>

      <div className="header-search-wrapper">
        <Search />
      </div>

      <Tooltip text="Загрузка документов" position="bottom">
        <button className="button-primary header-action-btn" onClick={() => navigate('/dashboard/incoming')}>
          <img src="/icons/header/Upload.png" className="Casual-icon" alt="📩" />
        </button>
      </Tooltip>
      <Tooltip text="Сканировать документ с камеры" position="bottom">
        <button className="button-secondary-with-border header-action-btn" onClick={() => setShowScanner(true)}>
          <img src="/icons/header/Scan.png" className="Casual-icon" alt="☐" />
        </button>
      </Tooltip>
      <Tooltip text="Уведомления" position="bottom">
        <button className="button-secondary header-action-btn" onClick={() => navigate('/dashboard/notifications')}>
          <img src="/icons/header/Notifications.png" className="Casual-icon" alt="🔔" />
        </button>
      </Tooltip>

      <div className="profile-block">
        <h5></h5>
        <h6 className="text-secondary"></h6>
      </div>
      <Tooltip text="Профиль пользователя" position="bottom">
        <img src="/icons/header/User.png" className="profile-image" alt="👤" />
      </Tooltip>
    </div>
  );
};

export default Header;