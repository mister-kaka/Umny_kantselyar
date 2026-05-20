import React from "react";
import "../styles/global.css"
import { NavLink, useNavigate } from 'react-router-dom';
import { useSidebar } from "../contexts/SidebarContexts";
import "../styles/Dashboard.css"

const Sidebar = () => {
  const { collapsed, toggleSidebar } = useSidebar();
  const navigate = useNavigate();

  const menuItems = [
    {path: "/dashboard/main", label: "Главная", icon: "/DashboardPage_Images/MainMenu.jpg", alt: "🏠"},
    {path: "/dashboard/incoming", label: "Входящие документы", icon: "/DashboardPage_Images/Incoming.jpg", alt: "📥"},
    {path: "/dashboard/verification", label: "Очередь проверки", icon: "/DashboardPage_Images/Queue.jpg", alt: "🔍"},
    {path: "/dashboard/routing", label: "Маршрутизация", icon: "/DashboardPage_Images/Routing.jpg", alt: "☑️"},
    {path: "/dashboard/documents", label: "Архив документов", icon: "/DashboardPage_Images/DocumentType.png", alt: "📄"},
    {path: "/dashboard/departments", label: "Подразделения", icon: "/DashboardPage_Images/Departments.jpg", alt: "📍"},
    {path: "/dashboard/analytics", label: "Аналитика", icon: "/DashboardPage_Images/Analytics.jpg", alt: "🏢"},
    {path: "/dashboard/settings", label: "Настройки", icon: "/DashboardPage_Images/Settings.jpg", alt: "⚙️"},
    {path: "/dashboard/notifications", label: "Уведомления", icon: "/DashboardPage_Images/Notifications.jpg", alt: "🔔"},
  ];

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    sessionStorage.removeItem('access_token');
    navigate('/login');
  };

  return (
    <>
      <div
        className={`mobile-overlay ${!collapsed ? 'active' : ''}`}
        onClick={toggleSidebar}
      />

      <div className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
        <div>
          <button
            className={`button-hide ${collapsed ? 'collapsed' : ''}`}
            onClick={toggleSidebar}
            aria-label={collapsed ? 'Развернуть меню' : 'Свернуть меню'}
          >
            <svg
              className="sidebar-arrow-icon"
              width="22"
              height="22"
              viewBox="0 0 16 16"
              fill="none"
              aria-hidden="true"
            >
              {collapsed ? (
                <path
                  d="M6 3l5 5-5 5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ) : (
                <path
                  d="M10 3L5 8l5 5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}
            </svg>
          </button>

          {!collapsed && (
            <div className="Umny-cantselyar-text">
              <h3>Умный Канцеляр</h3>
              <h6 className="AOD-text">Автоматизация обработки документов</h6>
            </div>
          )}

          <div className={`items-margin-top ${collapsed ? 'collapsed' : ''}`}>
            {menuItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
              >
                <img src={item.icon} className="Casual-icon" alt={item.alt} />
                <span className="item-label">{item.label}</span>
              </NavLink>
            ))}
          </div>
        </div>

        <div className={`sidebar-footer ${collapsed ? 'collapsed' : ''}`}>
          <button onClick={handleLogout} className="sidebar-item">
            <img src="/DashboardPage_Images/Log_out.jpg" className="Casual-icon" alt="Выход" />
            <span className="item-label">Выход из системы</span>
          </button>
          <h6 className={`version-text ${collapsed ? 'collapsed' : ''}`}>
            Версия 1.0.2<br />© 2026 Умный Канцеляр
          </h6>
        </div>
      </div>
    </>
  );
};

export default Sidebar;