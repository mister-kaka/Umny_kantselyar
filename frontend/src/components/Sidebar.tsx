import React, { useState } from "react";
import "../styles/global.css"
import { NavLink } from 'react-router-dom';
import { useSidebar } from "../contexts/SidebarContexts";
import "../styles/Dashboard.css"

const Sidebar = () => {
  const { collapsed, toggleSidebar } = useSidebar();

  const menuItems = [
    {path: "/dashboard/SubPages/MainMenu", label: "Главная", icon: "", alt: "🏠"},
    {path: "/dashboard/SubPages/IncomingD", label: "Входящие документы", icon: "", alt: "📥"},
    {path: "/dashboard/SubPages/Verification", label: "Очередь проверки", icon: "", alt: "🚶🚶🚶🚶🚶🚶🚶"},
    {path: "/dashboard/SubPages/Routing", label: "Маршрутизация", icon: "", alt: "☑️"},
    {path: "/dashboard/SubPages/Departaments", label: "Подразделения", icon: "", alt: "📍"},
    {path: "/dashboard/SubPages/Analytics", label: "Аналитика", icon: "", alt: "🏢"},
    {path: "/dashboard/SubPages/Settings", label: "Настройки", icon: "", alt: "📊"},
    {path: "/dashboard/SubPages/Notifications", label: "Уведомления", icon: "", alt: "🔔"},
  ];

  return (
    <div className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div>
        <button className={`button-hide ${collapsed ? 'collapsed' : ''}`}
        onClick={toggleSidebar}>
          <img src="" className="Casual-icon" alt={collapsed ? ">" : "<"} />
        </button>
        {!collapsed && (
        <div className="Umny-cantselyar-text">
          <h3>
            Умный Канцеляр
          </h3>
          <h6 className="AOD-text">
            Автоматизация обработки документов
          </h6>
        </div>
        ) || (
        <div className="Umny-cantselyar-text">
          <h3>
            {/* Ум. <br/>К. */}
          </h3>
        </div>
        )}
        <div className={`items-margin-top ${collapsed ? "collapsed" : ""}`}>
          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({isActive}) => `sidebar-item
              ${isActive ? "active" : ""}`}>
              <img src={item.icon} className="Casual-icon" alt={item.alt} />
              <span className="item-label">{item.label}</span>
            </NavLink>
          ))}
        </div>
      </div>
      <div className={`sidebar-footer ${collapsed ? 'collapsed' : ''}`}>
        <button
          onClick={() => { }}
          className="sidebar-item">
          <img src="" className="Casual-icon" alt="🚪⬅️" />
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
