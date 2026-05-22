import "../styles/global.css";
import "../styles/Search.css";
import "../contexts/SidebarContexts";
import { useSidebar } from "../contexts/SidebarContexts";
import "../styles/Dashboard.css";
import Search from "./Search";
import { useNavigate } from "react-router-dom";
import "../styles/Header.css";

const Header = () => {
  const { collapsed, toggleSidebar } = useSidebar();
  const navigate = useNavigate();
  return (
    <div className={`header ${collapsed ? 'collapsed' : ''}`}>
      
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

      <button className="button-primary header-action-btn" onClick={() => navigate('/dashboard/incoming')} title="Загрузка">
        <img src="/icons/header/Upload.png" className="Casual-icon" alt="📩" />
      </button>
      <button className="button-secondary-with-border header-action-btn" title="Сканирование">
        <img src="/icons/header/Scan.png" className="Casual-icon" alt="☐" />
      </button>
      <button className="button-secondary header-action-btn" onClick={() => navigate('/dashboard/notifications')} title="Уведомления">
        <img src="/icons/header/Notifications.png" className="Casual-icon" alt="🔔" />
      </button>

      <div className="profile-block">
        <h5></h5>
        <h6 className="text-secondary"></h6>
      </div>
      <img src="/icons/header/User.png" className="profile-image" alt="👤" title="Профиль" />
    </div>
  );
};

export default Header;