import React, { useState } from "react";
import "../styles/global.css"
import { NavLink } from 'react-router-dom';
import { useSidebar } from "../contexts/SidebarContexts";
import "../styles/Dashboard.css"

const Sidebar = () => {
  const { collapsed, toggleSidebar } = useSidebar();

  const menuItems = [
    {path: "../SubPages/MainMenu", label: "Главная", icon: "/kartinochki(vremennie)/MainMenu.jpg", alt: "🏠"},
    {path: "../SubPages/IncomingD", label: "Входящие документы", icon: "/kartinochki(vremennie)/Incoming.jpg", alt: "📥"},
    {path: "../SubPages/Verification", label: "Очередь проверки", icon: "/kartinochki(vremennie)/Queue.jpg", alt: "🚶🚶🚶🚶🚶🚶🚶"},
    {path: "../SubPages/Routing", label: "Маршрутизация", icon: "/kartinochki(vremennie)/Routing.jpg", alt: "☑️"},
    {path: "../SubPages/Departments", label: "Подразделения", icon: "/kartinochki(vremennie)/Departments.jpg", alt: "📍"},
    {path: "../SubPages/Analytics", label: "Аналитика", icon: "/kartinochki(vremennie)/Analytics.jpg", alt: "🏢"},
    {path: "../SubPages/Settings", label: "Настройки", icon: "/kartinochki(vremennie)/Settings.jpg", alt: "📊"},
    {path: "../SubPages/Notifications", label: "Уведомления", icon: "/kartinochki(vremennie)/Notifications.jpg", alt: "🔔"},
  ];

  return (
    <div className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div>
        <button className={`button-hide ${collapsed ? 'collapsed' : ''}`}
        onClick={toggleSidebar}>
          <img src={collapsed ? "https://cdn-icons-png.freepik.com/256/98/98703.png" : "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Small_arrow_pointing_left.svg/1280px-Small_arrow_pointing_left.svg.png"}
           className="Casual-icon" alt={collapsed ? ">" : "<"} />
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
            Ум. <br/>К.
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
          <img src="/kartinochki(vremennie)/Log_out.jpg" className="Casual-icon" alt="🚪⬅️" />
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
