import React, { useState } from "react";
import "../styles/global.css"
import { NavLink } from 'react-router-dom';
import { useSidebar } from "../contexts/SidebarContexts";
import "../styles/Dashboard.css"

const Sidebar = () => {
  const { collapsed, toggleSidebar } = useSidebar();

  const menuItems = [
    {path: "../SubPages/MainMenu", label: "Главная"},
    {path: "../SubPages/IncomingD", label: "Входящие документы"},
    {path: "../SubPages/Verification", label: "Очередь проверки"},
    {path: "../SubPages/Routing", label: "Маршрутизация"},
    {path: "../SubPages/Departaments", label: "Подразделения"},
    {path: "../SubPages/Analytics", label: "Аналитика"},
    {path: "../SubPages/Settings", label: "Настройки"},
    {path: "../SubPages/Notifications", label: "Уведомления"},
  ];

  return (
    <div className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div>
        <button className={`button-hide ${collapsed ? 'collapsed' : ''}`}
        onClick={toggleSidebar}>
          <img src="" className="Casual-icon" alt="" />
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
              <img src="" className="Casual-icon" alt="" />
              <span className="item-label">{item.label}</span>
            </NavLink>
          ))}
        </div>
      </div>
      <div className={`sidebar-footer ${collapsed ? 'collapsed' : ''}`}>
        <button
          onClick={() => { }}
          className="sidebar-item">
          <img src="" className="Casual-icon" alt="" />
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
