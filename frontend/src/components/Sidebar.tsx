import React, { useState, useEffect } from "react";
import "../styles/global.css";
import { NavLink, useNavigate } from 'react-router-dom';
import { useSidebar } from "../contexts/SidebarContexts";
import "../styles/Sidebar.css";
import { getThemedIcon } from "../utils/getThemedIcon";
import { getAbout } from "../services/api";

const Sidebar = () => {
  const { collapsed, toggleSidebar } = useSidebar();
  const navigate = useNavigate();
  const [themeKey, setThemeKey] = useState(0);
  const [version, setVersion] = useState("1.5.0");

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setThemeKey(prev => prev + 1);
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    getAbout()
      .then(res => setVersion(res.version))
      .catch(() => setVersion("1.5.0"));
  }, []);

  const menuItems = [
    {path: "/dashboard/main", label: "Главная", icon: "/icons/sidebar/MainMenu.png", iconActive: "/icons/sidebar/MainMenu_active.png", alt: "🏠"},
    {path: "/dashboard/incoming", label: "Входящие документы", icon: "/icons/sidebar/Add_document.png", iconActive: "/icons/sidebar/Add_document_active.png", alt: "📥"},
    {path: "/dashboard/verification", label: "Очередь проверки", icon: "/icons/sidebar/Check.png", iconActive: "/icons/sidebar/Check_active.png", alt: "🔍"},
    {path: "/dashboard/routing", label: "Маршрутизация", icon: "/icons/sidebar/Route.png", iconActive: "/icons/sidebar/Route_active.png", alt: "☑️"},
    {path: "/dashboard/documents", label: "Архив документов", icon: "/icons/sidebar/Archive.png", iconActive: "/icons/sidebar/Archive_active.png", alt: "📄"},
    {path: "/dashboard/departments", label: "Подразделения", icon: "/icons/sidebar/Departments.png", iconActive: "/icons/sidebar/Departments_active.png", alt: "📍"},
    {path: "/dashboard/analytics", label: "Аналитика", icon: "/icons/sidebar/Analitics.png", iconActive: "/icons/sidebar/Analitics_active.png", alt: "🏢"},
    {path: "/dashboard/settings", label: "Настройки", icon: "/icons/sidebar/Settings.png", iconActive: "/icons/sidebar/Settings_active.png", alt: "⚙️"},
    {path: "/dashboard/notifications", label: "Уведомления", icon: "/icons/sidebar/Notifications.png", iconActive: "/icons/sidebar/Notifications_active.png", alt: "🔔"},
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
                {({ isActive }) => (
                  <>
                    <img
                      key={themeKey}
                      src={isActive ? item.iconActive : getThemedIcon(item.icon)}
                      className="Casual-icon"
                      alt={item.alt}
                    />
                    <span className="item-label">{item.label}</span>
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </div>

        <div className={`sidebar-footer ${collapsed ? 'collapsed' : ''}`}>
          <button onClick={handleLogout} className="sidebar-item out-button">
            <img
              key={themeKey}
              src={getThemedIcon("/icons/sidebar/Exit.png")}
              className="Casual-icon"
              alt="Выход"
            />
            <span className="item-label">Выход из системы</span>
          </button>
          <h6 className={`version-text ${collapsed ? 'collapsed' : ''}`}>
            Версия {version}<br />© 2026 Умный Канцеляр
          </h6>
        </div>
      </div>
    </>
  );
};

export default Sidebar;