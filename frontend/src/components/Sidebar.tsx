import React, { useState } from "react";
import "../styles/global.css"
import { NavLink } from 'react-router-dom';

const Sidebar = () => {
  const [selectedButton, setSelectedButton] = useState<string>("Главная");

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
    <div className="sidebar" style={{display:"grid"}}>
      <div>
        <div style={{margin: "18px"}}>
          <h3>
            Умный Канцеляр
          </h3>
          <h6 className="text-secondary">
            Автоматизация обработки документов
          </h6>
        </div>
        <div style={{marginTop: "33.5px"}}>
          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({isActive}) => `sidebar-item ${isActive ? "active" : ""}`}>
              <img src="" className="Casual-icon" alt="" />
              {item.label}
            </NavLink>
          ))}
        </div>
      </div>
      <div style={{height: "50px", borderTop: "1px solid var(--border-color)", paddingTop: "16px"}}>
        <button
          onClick={() => { }}
          className="sidebar-item">
          <img src="" className="Casual-icon" alt="" />
          Выход из системы
        </button>
        <h6 className="text-secondary" style={{margin: "15px"}}>
          Версия 1.0.2<br />© 2026 Умный Канцеляр
        </h6>
      </div>
    </div>
  );
};

export default Sidebar;
