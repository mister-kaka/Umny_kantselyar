import React from "react";
import "../styles/global.css"
import { NavLink, useNavigate } from 'react-router-dom';
import { useSidebar } from "../contexts/SidebarContexts";
import "../styles/Dashboard.css"

const Sidebar = () => {
  const { collapsed, toggleSidebar } = useSidebar();
  const navigate = useNavigate();

  const menuItems = [
    {path: "/dashboard/SubPages/MainMenu", label: "Главная", icon: "/Dashboard_Images/MainMenu.jpg", alt: "🏠"},
    {path: "/dashboard/SubPages/IncomingD", label: "Входящие документы", icon: "/Dashboard_Images/Incoming.jpg", alt: "📥"},
    {path: "/dashboard/SubPages/Verification", label: "Очередь проверки", icon: "/Dashboard_Images/Queue.jpg", alt: "🚶🚶🚶🚶🚶🚶🚶"},
    {path: "/dashboard/SubPages/Routing", label: "Маршрутизация", icon: "/Dashboard_Images/Routing.jpg", alt: "☑️"},
    {path: "/dashboard/SubPages/Departments", label: "Подразделения", icon: "/Dashboard_Images/Departments.jpg", alt: "📍"},
    {path: "/dashboard/SubPages/Analytics", label: "Аналитика", icon: "/Dashboard_Images/Analytics.jpg", alt: "🏢"},
    {path: "/dashboard/SubPages/Settings", label: "Настройки", icon: "/Dashboard_Images/Settings.jpg", alt: "📊"},
    {path: "/dashboard/SubPages/Notifications", label: "Уведомления", icon: "/Dashboard_Images/Notifications.jpg", alt: "🔔"},
  ];

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    sessionStorage.removeItem('access_token');
    navigate('/login');
  };

  return (
    <div className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div>
        <button className={`button-hide ${collapsed ? 'collapsed' : ''}`} onClick={toggleSidebar}>
          <img src={collapsed ? "/Dashboard_Images/Right_Arrow.png" 
            : "/Dashboard_Images/Left_Arrow.png"}
            className="Casual-icon" alt={collapsed ? ">" : "<"} />
        </button>
        
        {!collapsed ? (
          <div className="Umny-cantselyar-text">
            <h3>Умный Канцеляр</h3>
            <h6 className="AOD-text">Автоматизация обработки документов</h6>
          </div>
        ) : (
          <div className="Umny-cantselyar-text">
            {/* <h3>Ум. <br/>К.</h3> */}
          </div>
        )}
        
        <div className={`items-margin-top ${collapsed ? "collapsed" : ""}`}>
          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({isActive}) => `sidebar-item ${isActive ? "active" : ""}`}
            >
              <img src={item.icon} className="Casual-icon" alt={item.alt} />
              <span className="item-label">{item.label}</span>
            </NavLink>
          ))}
        </div>
      </div>
      
      <div className={`sidebar-footer ${collapsed ? 'collapsed' : ''}`}>
        <button onClick={handleLogout} className="sidebar-item">
          <img src="/Dashboard_Images/Log_out.jpg" className="Casual-icon" alt="🚪⬅️" />
          <span className="item-label">Выход из системы</span>
        </button>
        <h6 className={`version-text ${collapsed ? "collapsed" : ""}`}>
          Версия 1.0.2<br />© 2026 Умный Канцеляр
        </h6>
      </div>
    </div>
  );
};

export default Sidebar;
